// src/extension/batchEngine.ts
var BatchUnsubscribeEngine = class {
  constructor() {
    this.paused = false;
    this.stopped = false;
    this.running = false;
    this.resumeResolvers = [];
    this.sleepAbortController = null;
  }
  isRunning() {
    return this.running;
  }
  isPaused() {
    return this.paused;
  }
  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
  }
  resume() {
    if (!this.running || !this.paused) return;
    this.paused = false;
    const resolvers = this.resumeResolvers.splice(0, this.resumeResolvers.length);
    resolvers.forEach((resolve) => resolve());
  }
  stop() {
    if (!this.running) return;
    this.stopped = true;
    this.paused = false;
    this.sleepAbortController?.abort();
    const resolvers = this.resumeResolvers.splice(0, this.resumeResolvers.length);
    resolvers.forEach((resolve) => resolve());
  }
  waitIfPaused() {
    if (!this.paused) return Promise.resolve();
    return new Promise((resolve) => {
      this.resumeResolvers.push(resolve);
    });
  }
  waitWithDelay(ms) {
    if (ms <= 0 || this.stopped) return Promise.resolve();
    this.sleepAbortController = new AbortController();
    const { signal } = this.sleepAbortController;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(timer);
        resolve();
      };
      signal.addEventListener("abort", onAbort, { once: true });
    });
  }
  async run(queue, settings, executor, callbacks = {}) {
    this.running = true;
    this.paused = false;
    this.stopped = false;
    this.resumeResolvers = [];
    const results = {};
    for (const ch of queue) {
      results[ch.id] = {
        channelId: ch.id,
        channelName: ch.name,
        status: "queued",
        timestamp: Date.now()
      };
    }
    const progress = {
      phase: "running",
      total: queue.length,
      processed: 0,
      unsubscribed: 0,
      failed: 0,
      skipped: 0,
      currentChannelId: null,
      currentChannelName: null,
      startedAt: Date.now(),
      finishedAt: null
    };
    callbacks.onProgress?.({ ...progress }, { ...results });
    for (let i = 0; i < queue.length; i++) {
      if (this.stopped) break;
      if (this.paused) {
        progress.phase = "paused";
        callbacks.onProgress?.({ ...progress }, { ...results });
        await this.waitIfPaused();
        if (this.stopped) break;
        progress.phase = "running";
        callbacks.onProgress?.({ ...progress }, { ...results });
      }
      const channel = queue[i];
      progress.currentChannelId = channel.id;
      progress.currentChannelName = channel.name;
      results[channel.id] = {
        channelId: channel.id,
        channelName: channel.name,
        status: "processing",
        timestamp: Date.now()
      };
      callbacks.onChannelStart?.(channel, i, queue.length);
      callbacks.onProgress?.({ ...progress }, { ...results });
      let outcome;
      if (settings.skipAlreadyUnsubscribed && !channel.isSubscribed) {
        outcome = {
          channelId: channel.id,
          channelName: channel.name,
          status: "skipped",
          reason: "Already unsubscribed before batch started",
          timestamp: Date.now()
        };
      } else {
        try {
          outcome = await executor(channel);
        } catch (err) {
          outcome = {
            channelId: channel.id,
            channelName: channel.name,
            status: "failed",
            reason: err instanceof Error ? err.message : "Unexpected execution error",
            timestamp: Date.now()
          };
        }
      }
      results[channel.id] = outcome;
      progress.processed += 1;
      if (outcome.status === "unsubscribed") progress.unsubscribed += 1;
      else if (outcome.status === "failed") progress.failed += 1;
      else if (outcome.status === "skipped") progress.skipped += 1;
      callbacks.onChannelComplete?.(outcome);
      callbacks.onProgress?.({ ...progress }, { ...results });
      if (i < queue.length - 1 && !this.stopped) {
        const jitter = settings.jitterMs > 0 ? Math.floor(Math.random() * settings.jitterMs) : 0;
        await this.waitWithDelay(settings.delayMs + jitter);
      }
    }
    progress.currentChannelId = null;
    progress.currentChannelName = null;
    progress.finishedAt = Date.now();
    progress.phase = this.stopped ? "stopped" : "completed";
    this.running = false;
    this.paused = false;
    callbacks.onProgress?.({ ...progress }, { ...results });
    callbacks.onFinish?.({ ...progress }, { ...results });
    return { progress, results };
  }
};

// src/extension/types.ts
var DEFAULT_SETTINGS = {
  delayMs: 1200,
  jitterMs: 300,
  autoScrollOnScan: true,
  maxScrollAttempts: 25,
  skipAlreadyUnsubscribed: true
};

// src/extension/storage.ts
var STORAGE_KEY = "ytbu_extension_state_v1";
var SETTINGS_KEY = "ytbu_extension_settings_v1";
function createInitialProgress() {
  return {
    phase: "idle",
    total: 0,
    processed: 0,
    unsubscribed: 0,
    failed: 0,
    skipped: 0,
    currentChannelId: null,
    currentChannelName: null,
    startedAt: null,
    finishedAt: null
  };
}
function createInitialState() {
  return {
    channels: [],
    selectedIds: [],
    results: {},
    progress: createInitialProgress(),
    settings: { ...DEFAULT_SETTINGS },
    lastScannedAt: null
  };
}
function isChromeExtensionContext() {
  return typeof chrome !== "undefined" && typeof chrome.storage !== "undefined" && typeof chrome.storage.local !== "undefined";
}
async function loadPersistedState() {
  if (isChromeExtensionContext()) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY, SETTINGS_KEY], (items) => {
        const fallback = createInitialState();
        const storedState = items[STORAGE_KEY];
        const storedSettings = items[SETTINGS_KEY];
        resolve({
          ...fallback,
          ...storedState,
          progress: {
            ...fallback.progress,
            ...storedState?.progress ?? {}
          },
          settings: {
            ...DEFAULT_SETTINGS,
            ...storedState?.settings ?? {},
            ...storedSettings ?? {}
          }
        });
      });
    });
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    const fallback = createInitialState();
    return {
      ...fallback,
      ...parsed,
      progress: { ...fallback.progress, ...parsed.progress ?? {} },
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings ?? {} }
    };
  } catch {
    return createInitialState();
  }
}
async function savePersistedState(state) {
  if (isChromeExtensionContext()) {
    return new Promise((resolve) => {
      chrome.storage.local.set(
        {
          [STORAGE_KEY]: state,
          [SETTINGS_KEY]: state.settings
        },
        () => resolve()
      );
    });
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
  }
}

// src/extension/youtube/selectors.ts
var YOUTUBE_CHANNELS_URL = "https://www.youtube.com/feed/channels";

// src/extension/background.ts
var engine = new BatchUnsubscribeEngine();
async function getActiveYouTubeTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  if (activeTab?.url && /youtube\.com/i.test(activeTab.url)) {
    return activeTab;
  }
  const ytTabs = await chrome.tabs.query({ url: "https://www.youtube.com/*" });
  const channelsTab = ytTabs.find((t) => t.url?.includes("/feed/channels"));
  return channelsTab ?? ytTabs[0] ?? null;
}
async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "CHECK_YOUTUBE_TAB" });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["contentScript.js"]
    });
  }
}
function broadcastState(state) {
  chrome.runtime.sendMessage({ type: "STATE_UPDATED", state }).catch(() => {
  });
}
async function getTabStatus() {
  const tab = await getActiveYouTubeTab();
  if (!tab?.id || !tab.url) {
    return {
      connected: false,
      isYouTube: false,
      isChannelsPage: false,
      url: "",
      mode: "chrome"
    };
  }
  const isYouTube = /^https:\/\/(www\.|m\.)?youtube\.com/i.test(tab.url);
  const isChannelsPage = /youtube\.com\/feed\/channels/i.test(tab.url);
  return {
    connected: true,
    isYouTube,
    isChannelsPage,
    url: tab.url,
    tabId: tab.id,
    mode: "chrome"
  };
}
chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse) => {
    if (message.type === "GET_STATE") {
      loadPersistedState().then((state) => sendResponse({ ok: true, state }));
      return true;
    }
    if (message.type === "CHECK_YOUTUBE_TAB") {
      getTabStatus().then((status) => sendResponse(status));
      return true;
    }
    if (message.type === "OPEN_CHANNELS_PAGE") {
      getActiveYouTubeTab().then(async (existing) => {
        if (existing?.id) {
          await chrome.tabs.update(existing.id, {
            url: YOUTUBE_CHANNELS_URL,
            active: true
          });
        } else {
          await chrome.tabs.create({ url: YOUTUBE_CHANNELS_URL, active: true });
        }
        sendResponse({ ok: true });
      }).catch((err) => {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : "Unable to open YouTube channels page"
        });
      });
      return true;
    }
    if (message.type === "UPDATE_SETTINGS") {
      loadPersistedState().then(async (state) => {
        const next = { ...state, settings: message.settings };
        await savePersistedState(next);
        broadcastState(next);
        sendResponse({ ok: true, state: next });
      }).catch((err) => {
        sendResponse({ ok: false, error: String(err) });
      });
      return true;
    }
    if (message.type === "SCAN_CHANNELS") {
      (async () => {
        const tab = await getActiveYouTubeTab();
        if (!tab?.id || !tab.url?.includes("/feed/channels")) {
          sendResponse({
            ok: false,
            error: "Open youtube.com/feed/channels in an active tab before scanning."
          });
          return;
        }
        await ensureContentScript(tab.id);
        const currentState = await loadPersistedState();
        const scanningState = {
          ...currentState,
          progress: {
            ...createInitialProgress(),
            phase: "scanning"
          }
        };
        await savePersistedState(scanningState);
        broadcastState(scanningState);
        const response = await chrome.tabs.sendMessage(tab.id, message);
        if (!response?.ok || !response.channels) {
          const resetState = {
            ...currentState,
            progress: {
              ...createInitialProgress(),
              phase: "idle"
            }
          };
          await savePersistedState(resetState);
          broadcastState(resetState);
          sendResponse({ ok: false, error: response?.error ?? "Scan failed" });
          return;
        }
        const nextState = {
          ...currentState,
          channels: response.channels,
          selectedIds: [],
          results: {},
          lastScannedAt: Date.now(),
          progress: {
            ...createInitialProgress(),
            phase: response.channels.length > 0 ? "ready" : "idle"
          }
        };
        await savePersistedState(nextState);
        broadcastState(nextState);
        sendResponse({ ok: true, state: nextState });
      })().catch((err) => {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : "Unexpected scan error"
        });
      });
      return true;
    }
    if (message.type === "START_BATCH") {
      if (engine.isRunning()) {
        sendResponse({ ok: false, error: "A batch operation is already running." });
        return false;
      }
      (async () => {
        const tab = await getActiveYouTubeTab();
        if (!tab?.id || !tab.url?.includes("/feed/channels")) {
          sendResponse({
            ok: false,
            error: "YouTube Subscriptions page (/feed/channels) must be open."
          });
          return;
        }
        await ensureContentScript(tab.id);
        const tabId = tab.id;
        const currentState = await loadPersistedState();
        const selectedSet = new Set(message.channelIds);
        const queue = currentState.channels.filter((ch) => selectedSet.has(ch.id));
        if (queue.length === 0) {
          sendResponse({ ok: false, error: "No channels selected." });
          return;
        }
        sendResponse({ ok: true });
        await engine.run(
          queue,
          message.settings,
          async (channel) => {
            const resp = await chrome.tabs.sendMessage(tabId, {
              type: "UNSUBSCRIBE_CHANNEL",
              channel
            });
            return resp.result;
          },
          {
            onProgress: async (progress, results) => {
              const latest = await loadPersistedState();
              const updatedChannels = latest.channels.map((ch) => {
                const res = results[ch.id];
                if (res?.status === "unsubscribed") {
                  return { ...ch, isSubscribed: false };
                }
                return ch;
              });
              const nextState = {
                ...latest,
                channels: updatedChannels,
                results: { ...latest.results, ...results },
                progress,
                settings: message.settings
              };
              await savePersistedState(nextState);
              broadcastState(nextState);
            }
          }
        );
      })().catch((err) => {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : "Unable to start batch"
        });
      });
      return true;
    }
    if (message.type === "PAUSE_BATCH") {
      engine.pause();
      loadPersistedState().then(async (state) => {
        const next = {
          ...state,
          progress: { ...state.progress, phase: "paused" }
        };
        await savePersistedState(next);
        broadcastState(next);
        sendResponse({ ok: true });
      });
      return true;
    }
    if (message.type === "RESUME_BATCH") {
      engine.resume();
      loadPersistedState().then(async (state) => {
        const next = {
          ...state,
          progress: { ...state.progress, phase: "running" }
        };
        await savePersistedState(next);
        broadcastState(next);
        sendResponse({ ok: true });
      });
      return true;
    }
    if (message.type === "STOP_BATCH") {
      engine.stop();
      sendResponse({ ok: true });
      return false;
    }
    return false;
  }
);

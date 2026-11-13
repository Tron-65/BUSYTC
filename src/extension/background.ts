import { BatchUnsubscribeEngine } from './batchEngine';
import {
  createInitialProgress,
  loadPersistedState,
  mergeUnsubscribeHistory,
  savePersistedState,
} from './storage';
import {
  ChannelRecord,
  ChannelResult,
  ExtensionMessage,
  PersistedExtensionState,
  YouTubeTabStatus,
} from './types';
import { YOUTUBE_CHANNELS_URL } from './youtube/selectors';

const engine = new BatchUnsubscribeEngine();

async function getActiveYouTubeTab(): Promise<chrome.tabs.Tab | null> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];
  if (activeTab?.url && /youtube\.com/i.test(activeTab.url)) {
    return activeTab;
  }

  const ytTabs = await chrome.tabs.query({ url: 'https://www.youtube.com/*' });
  const channelsTab = ytTabs.find((t) => t.url?.includes('/feed/channels'));
  return channelsTab ?? ytTabs[0] ?? null;
}

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'CHECK_YOUTUBE_TAB' });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['contentScript.js'],
    });
  }
}

function broadcastState(state: PersistedExtensionState): void {
  chrome.runtime.sendMessage({ type: 'STATE_UPDATED', state }).catch(() => {
    // Popup may be closed; state is already persisted in chrome.storage.local
  });
}

async function getTabStatus(): Promise<YouTubeTabStatus> {
  const tab = await getActiveYouTubeTab();
  if (!tab?.id || !tab.url) {
    return {
      connected: false,
      isYouTube: false,
      isChannelsPage: false,
      url: '',
      mode: 'chrome',
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
    mode: 'chrome',
  };
}

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse): boolean => {
    if (message.type === 'GET_STATE') {
      loadPersistedState().then((state) => sendResponse({ ok: true, state }));
      return true;
    }

    if (message.type === 'CHECK_YOUTUBE_TAB') {
      getTabStatus().then((status) => sendResponse(status));
      return true;
    }

    if (message.type === 'OPEN_CHANNELS_PAGE') {
      getActiveYouTubeTab()
        .then(async (existing) => {
          if (existing?.id) {
            await chrome.tabs.update(existing.id, {
              url: YOUTUBE_CHANNELS_URL,
              active: true,
            });
          } else {
            await chrome.tabs.create({ url: YOUTUBE_CHANNELS_URL, active: true });
          }
          sendResponse({ ok: true });
        })
        .catch((err) => {
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : 'Unable to open YouTube channels page',
          });
        });
      return true;
    }

    if (message.type === 'UPDATE_SETTINGS') {
      loadPersistedState()
        .then(async (state) => {
          const next = { ...state, settings: message.settings };
          await savePersistedState(next);
          broadcastState(next);
          sendResponse({ ok: true, state: next });
        })
        .catch((err) => {
          sendResponse({ ok: false, error: String(err) });
        });
      return true;
    }

    if (message.type === 'SCAN_CHANNELS') {
      (async () => {
        const tab = await getActiveYouTubeTab();
        if (!tab?.id || !tab.url?.includes('/feed/channels')) {
          sendResponse({
            ok: false,
            error: 'Open youtube.com/feed/channels in an active tab before scanning.',
          });
          return;
        }

        await ensureContentScript(tab.id);

        const currentState = await loadPersistedState();
        const scanningState: PersistedExtensionState = {
          ...currentState,
          progress: {
            ...createInitialProgress(),
            phase: 'scanning',
          },
        };
        await savePersistedState(scanningState);
        broadcastState(scanningState);

        const response = (await chrome.tabs.sendMessage(tab.id, message)) as {
          ok: boolean;
          channels?: ChannelRecord[];
          error?: string;
        };

        if (!response?.ok || !response.channels) {
          const resetState: PersistedExtensionState = {
            ...currentState,
            progress: {
              ...createInitialProgress(),
              phase: 'idle',
            },
          };
          await savePersistedState(resetState);
          broadcastState(resetState);
          sendResponse({ ok: false, error: response?.error ?? 'Scan failed' });
          return;
        }

        const nextState: PersistedExtensionState = {
          ...currentState,
          channels: response.channels,
          selectedIds: [],
          results: {},
          lastScannedAt: Date.now(),
          progress: {
            ...createInitialProgress(),
            phase: response.channels.length > 0 ? 'ready' : 'idle',
          },
        };
        await savePersistedState(nextState);
        broadcastState(nextState);
        sendResponse({ ok: true, state: nextState });
      })().catch((err) => {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : 'Unexpected scan error',
        });
      });

      return true;
    }

    if (message.type === 'START_BATCH') {
      if (engine.isRunning()) {
        sendResponse({ ok: false, error: 'A batch operation is already running.' });
        return false;
      }

      (async () => {
        const tab = await getActiveYouTubeTab();
        if (!tab?.id || !tab.url?.includes('/feed/channels')) {
          sendResponse({
            ok: false,
            error: 'YouTube Subscriptions page (/feed/channels) must be open.',
          });
          return;
        }

        await ensureContentScript(tab.id);
        const tabId = tab.id;
        const currentState = await loadPersistedState();
        const selectedSet = new Set(message.channelIds);
        const queue = currentState.channels.filter((ch) => selectedSet.has(ch.id));

        if (queue.length === 0) {
          sendResponse({ ok: false, error: 'No channels selected.' });
          return;
        }

        sendResponse({ ok: true });

        await engine.run(
          queue,
          message.settings,
          async (channel): Promise<ChannelResult> => {
            const resp = (await chrome.tabs.sendMessage(tabId, {
              type: 'UNSUBSCRIBE_CHANNEL',
              channel,
            })) as { ok: boolean; result: ChannelResult };

            return resp.result;
          },
          {
            onProgress: async (progress, results) => {
              const latest = await loadPersistedState();
              const updatedChannels = latest.channels.map((ch) => {
                const res = results[ch.id];
                if (res?.status === 'unsubscribed') {
                  return { ...ch, isSubscribed: false };
                }
                return ch;
              });

              const nextHistory = mergeUnsubscribeHistory(
                latest.history,
                updatedChannels,
                results,
              );

              const nextState: PersistedExtensionState = {
                ...latest,
                channels: updatedChannels,
                results: { ...latest.results, ...results },
                history: nextHistory,
                progress,
                settings: message.settings,
              };
              await savePersistedState(nextState);
              broadcastState(nextState);
            },
          },
        );
      })().catch((err) => {
        sendResponse({
          ok: false,
          error: err instanceof Error ? err.message : 'Unable to start batch',
        });
      });

      return true;
    }

    if (message.type === 'PAUSE_BATCH') {
      engine.pause();
      loadPersistedState().then(async (state) => {
        const next: PersistedExtensionState = {
          ...state,
          progress: { ...state.progress, phase: 'paused' },
        };
        await savePersistedState(next);
        broadcastState(next);
        sendResponse({ ok: true });
      });
      return true;
    }

    if (message.type === 'RESUME_BATCH') {
      engine.resume();
      loadPersistedState().then(async (state) => {
        const next: PersistedExtensionState = {
          ...state,
          progress: { ...state.progress, phase: 'running' },
        };
        await savePersistedState(next);
        broadcastState(next);
        sendResponse({ ok: true });
      });
      return true;
    }

    if (message.type === 'STOP_BATCH') {
      engine.stop();
      sendResponse({ ok: true });
      return false;
    }

    if (message.type === 'CLEAR_HISTORY') {
      loadPersistedState().then(async (state) => {
        const next: PersistedExtensionState = {
          ...state,
          history: [],
        };
        await savePersistedState(next);
        broadcastState(next);
        sendResponse({ ok: true, state: next });
      });
      return true;
    }

    return false;
  },
);

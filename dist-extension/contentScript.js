(() => {
  // src/extension/youtube/selectors.ts
  var YOUTUBE_SELECTORS = {
    channelItems: [
      "ytd-channel-renderer",
      "ytd-grid-channel-renderer",
      "[data-ytbu-channel]"
    ],
    channelTitle: [
      "#main-link #text.ytd-channel-name",
      "ytd-channel-name #text",
      "#channel-title #text",
      "#channel-title",
      "yt-formatted-string#text.ytd-channel-name",
      "[data-ytbu-name]"
    ],
    channelHandle: [
      "#metadata #subscribers",
      "#subscribers",
      "#metadata-line span:first-child",
      "[data-ytbu-handle]"
    ],
    channelSubscribers: [
      "#video-count",
      "#metadata #video-count",
      "#metadata-line span:nth-child(2)",
      "[data-ytbu-subs]"
    ],
    channelLink: [
      "a#main-link",
      "a#avatar-section",
      "a.channel-link",
      'a[href*="/@"]',
      'a[href*="/channel/"]'
    ],
    channelAvatar: [
      "#avatar img#img",
      "#avatar-section img#img",
      "#avatar img",
      "yt-img-shadow img",
      "[data-ytbu-avatar]"
    ],
    subscribeButtonContainer: [
      "#subscribe-button ytd-subscribe-button-renderer",
      "ytd-subscribe-button-renderer",
      "#subscribe-button",
      "[data-ytbu-sub-btn-wrap]"
    ],
    subscribeButtonClickable: [
      "yt-button-shape button",
      "tp-yt-paper-button",
      'button[aria-label*="Unsubscribe" i]',
      'button[aria-label*="Subscribe" i]',
      "[data-ytbu-sub-btn]",
      "button"
    ],
    menuPopup: [
      'tp-yt-iron-dropdown:not([aria-hidden="true"]) ytd-menu-popup-renderer',
      "ytd-menu-popup-renderer",
      "tp-yt-paper-listbox",
      "[data-ytbu-menu]"
    ],
    menuItems: [
      "ytd-menu-service-item-renderer",
      "tp-yt-paper-item",
      '[role="menuitem"]',
      "[data-ytbu-menu-item]"
    ],
    confirmDialog: [
      'tp-yt-paper-dialog:not([aria-hidden="true"]) yt-confirm-dialog-renderer',
      "yt-confirm-dialog-renderer",
      "[data-ytbu-confirm-dialog]"
    ],
    confirmButton: [
      "#confirm-button yt-button-shape button",
      "#confirm-button button",
      "yt-button-renderer#confirm-button button",
      "yt-button-renderer#confirm-button",
      "[data-ytbu-confirm-btn]"
    ],
    cancelButton: [
      "#cancel-button yt-button-shape button",
      "#cancel-button button",
      "yt-button-renderer#cancel-button button",
      "[data-ytbu-cancel-btn]"
    ]
  };
  var SUBSCRIBED_LABEL_PATTERNS = [
    /^subscribed$/i,
    /^current subscription/i,
    /unsubscribe from/i,
    /subscribed/i
  ];
  var UNSUBSCRIBED_LABEL_PATTERNS = [
    /^subscribe$/i,
    /^subscribe to /i
  ];
  var UNSUBSCRIBE_ACTION_PATTERNS = [
    /^unsubscribe$/i,
    /unsubscribe/i
  ];
  function queryFirst(root, selectors) {
    for (const selector of selectors) {
      const found = root.querySelector(selector);
      if (found) return found;
    }
    return null;
  }
  function queryAllFirst(root, selectors) {
    for (const selector of selectors) {
      const found = Array.from(root.querySelectorAll(selector));
      if (found.length > 0) return found;
    }
    return [];
  }
  function isElementVisible(el) {
    if (!el) return false;
    const htmlEl = el;
    if (htmlEl.hidden) return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    const style = window.getComputedStyle(htmlEl);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }
    return true;
  }

  // src/extension/youtube/channelParser.ts
  function normalizeWhitespace(value) {
    return (value ?? "").replace(/\s+/g, " ").trim();
  }
  function deriveChannelId(url, handle, name, index) {
    if (url) {
      const handleMatch = url.match(/\/(@[^/?#]+)/);
      if (handleMatch?.[1]) return handleMatch[1].toLowerCase();
      const channelMatch = url.match(/\/channel\/([^/?#]+)/);
      if (channelMatch?.[1]) return channelMatch[1];
      const customMatch = url.match(/\/(?:c|user)\/([^/?#]+)/);
      if (customMatch?.[1]) return customMatch[1].toLowerCase();
    }
    if (handle && handle.startsWith("@")) {
      return handle.toLowerCase();
    }
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return slug ? `${slug}-${index}` : `channel-${index}`;
  }
  function detectSubscriptionState(buttonEl) {
    if (!buttonEl) return false;
    const explicitAttr = buttonEl.getAttribute("data-subscribed");
    if (explicitAttr === "true") return true;
    if (explicitAttr === "false") return false;
    const subscribedAttr = buttonEl.getAttribute("subscribed");
    if (subscribedAttr !== null) return true;
    const text = normalizeWhitespace(buttonEl.textContent);
    const ariaLabel = normalizeWhitespace(buttonEl.getAttribute("aria-label"));
    const combined = `${text} ${ariaLabel}`.trim();
    if (UNSUBSCRIBED_LABEL_PATTERNS.some((pattern) => pattern.test(text))) {
      return false;
    }
    if (SUBSCRIBED_LABEL_PATTERNS.some(
      (pattern) => pattern.test(text) || pattern.test(ariaLabel) || pattern.test(combined)
    )) {
      return true;
    }
    return false;
  }
  function findSubscribeButton(channelEl) {
    const container = queryFirst(channelEl, YOUTUBE_SELECTORS.subscribeButtonContainer);
    const searchRoot = container ?? channelEl;
    const clickable = queryFirst(searchRoot, YOUTUBE_SELECTORS.subscribeButtonClickable);
    return clickable ?? container;
  }
  function parseChannelElement(el, index) {
    const titleEl = queryFirst(el, YOUTUBE_SELECTORS.channelTitle);
    const name = normalizeWhitespace(titleEl?.textContent);
    if (!name) return null;
    const linkEl = queryFirst(el, YOUTUBE_SELECTORS.channelLink);
    const rawHref = linkEl?.getAttribute("href") ?? "";
    const url = rawHref ? rawHref.startsWith("http") ? rawHref : `https://www.youtube.com${rawHref.startsWith("/") ? "" : "/"}${rawHref}` : "";
    const handleEl = queryFirst(el, YOUTUBE_SELECTORS.channelHandle);
    const rawHandle = normalizeWhitespace(handleEl?.textContent);
    const subsEl = queryFirst(el, YOUTUBE_SELECTORS.channelSubscribers);
    const rawSubs = normalizeWhitespace(subsEl?.textContent);
    let handle = "";
    let subscriberText = "";
    if (rawHandle.includes("@")) {
      const parts = rawHandle.split(/[•·]/).map((s) => s.trim());
      handle = parts.find((p) => p.startsWith("@")) ?? rawHandle;
      subscriberText = parts.find((p) => !p.startsWith("@")) ?? rawSubs;
    } else {
      subscriberText = rawSubs || rawHandle;
      const urlHandle = url.match(/\/(@[^/?#]+)/);
      handle = urlHandle?.[1] ?? "";
    }
    const avatarEl = queryFirst(el, YOUTUBE_SELECTORS.channelAvatar);
    const avatarUrl = avatarEl?.getAttribute("src") ?? "";
    const subButton = findSubscribeButton(el);
    const isSubscribed = detectSubscriptionState(subButton);
    const id = deriveChannelId(url, handle, name, index);
    return {
      id,
      name,
      handle,
      url,
      subscriberText,
      avatarUrl,
      isSubscribed,
      index
    };
  }

  // src/extension/youtube/subscriptionScanner.ts
  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException("Scan aborted", "AbortError"));
        return;
      }
      const timer = window.setTimeout(() => {
        signal?.removeEventListener("abort", onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        window.clearTimeout(timer);
        reject(new DOMException("Scan aborted", "AbortError"));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  }
  function collectVisibleChannels(root = document) {
    const elements = queryAllFirst(root, YOUTUBE_SELECTORS.channelItems);
    const deduped = /* @__PURE__ */ new Map();
    elements.forEach((el, index) => {
      const parsed = parseChannelElement(el, index);
      if (parsed && !deduped.has(parsed.id)) {
        deduped.set(parsed.id, parsed);
      }
    });
    return Array.from(deduped.values());
  }
  async function scanSubscriptions(options = {}) {
    const {
      root = document,
      scrollContainer = null,
      autoScroll = true,
      maxScrollAttempts = 25,
      scrollWaitMs = 950,
      onProgress,
      signal
    } = options;
    let channels = collectVisibleChannels(root);
    onProgress?.(channels.length);
    if (!autoScroll) {
      return channels;
    }
    let stablePasses = 0;
    let lastCount = channels.length;
    for (let attempt = 0; attempt < maxScrollAttempts; attempt++) {
      if (signal?.aborted) break;
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth"
        });
      } else {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "smooth"
        });
      }
      try {
        await sleep(scrollWaitMs, signal);
      } catch {
        break;
      }
      channels = collectVisibleChannels(root);
      onProgress?.(channels.length);
      if (channels.length === lastCount) {
        stablePasses += 1;
        if (stablePasses >= 2) {
          break;
        }
      } else {
        stablePasses = 0;
        lastCount = channels.length;
      }
    }
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    } else if (typeof window !== "undefined" && root === document) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return channels;
  }

  // src/extension/youtube/unsubscribeAction.ts
  function sleep2(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
  async function waitFor(predicate, timeoutMs, pollIntervalMs = 80) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const result = predicate();
      if (result) return result;
      await sleep2(pollIntervalMs);
    }
    return null;
  }
  function findChannelElementById(channelId, root = document) {
    const elements = queryAllFirst(root, YOUTUBE_SELECTORS.channelItems);
    for (let i = 0; i < elements.length; i++) {
      const parsed = parseChannelElement(elements[i], i);
      if (parsed && parsed.id === channelId) {
        return elements[i];
      }
    }
    return null;
  }
  function findVisibleConfirmButton(root) {
    for (const dialogSelector of YOUTUBE_SELECTORS.confirmDialog) {
      const dialogs = Array.from(root.querySelectorAll(dialogSelector));
      const visibleDialog = dialogs.find((d) => isElementVisible(d));
      if (!visibleDialog) continue;
      for (const btnSelector of YOUTUBE_SELECTORS.confirmButton) {
        const btn = visibleDialog.querySelector(btnSelector);
        if (btn && isElementVisible(btn)) {
          return btn;
        }
      }
    }
    return null;
  }
  function findVisibleUnsubscribeMenuItem(root) {
    for (const menuSelector of YOUTUBE_SELECTORS.menuPopup) {
      const menus = Array.from(root.querySelectorAll(menuSelector));
      const visibleMenu = menus.find((m) => isElementVisible(m));
      if (!visibleMenu) continue;
      for (const itemSelector of YOUTUBE_SELECTORS.menuItems) {
        const items = Array.from(visibleMenu.querySelectorAll(itemSelector));
        const match = items.find((item) => {
          const text = (item.textContent ?? "").replace(/\s+/g, " ").trim();
          return UNSUBSCRIBE_ACTION_PATTERNS.some((pattern) => pattern.test(text));
        });
        if (match) return match;
      }
    }
    return null;
  }
  async function unsubscribeFromChannel(channel, options = {}) {
    const { root = document, dialogTimeoutMs = 3500, settleDelayMs = 250 } = options;
    const channelEl = findChannelElementById(channel.id, root);
    if (!channelEl) {
      return {
        channelId: channel.id,
        channelName: channel.name,
        status: "failed",
        reason: "Channel row not found in current page DOM",
        timestamp: Date.now()
      };
    }
    const subButton = findSubscribeButton(channelEl);
    if (!subButton) {
      return {
        channelId: channel.id,
        channelName: channel.name,
        status: "failed",
        reason: "Subscribe button element could not be located",
        timestamp: Date.now()
      };
    }
    if (!detectSubscriptionState(subButton)) {
      return {
        channelId: channel.id,
        channelName: channel.name,
        status: "skipped",
        reason: "Channel is already unsubscribed",
        timestamp: Date.now()
      };
    }
    channelEl.scrollIntoView({ behavior: "smooth", block: "center" });
    await sleep2(160);
    subButton.click();
    const dialogOrMenu = await waitFor(
      () => {
        if (findVisibleConfirmButton(root)) return "dialog";
        if (findVisibleUnsubscribeMenuItem(root)) return "menu";
        return null;
      },
      Math.min(1800, dialogTimeoutMs),
      60
    );
    if (dialogOrMenu === "menu") {
      const menuItem = findVisibleUnsubscribeMenuItem(root);
      if (!menuItem) {
        return {
          channelId: channel.id,
          channelName: channel.name,
          status: "failed",
          reason: "Unsubscribe option missing inside subscription dropdown menu",
          timestamp: Date.now()
        };
      }
      menuItem.click();
    }
    const confirmBtn = await waitFor(
      () => findVisibleConfirmButton(root),
      dialogTimeoutMs,
      70
    );
    if (!confirmBtn) {
      if (!detectSubscriptionState(findSubscribeButton(channelEl))) {
        return {
          channelId: channel.id,
          channelName: channel.name,
          status: "unsubscribed",
          timestamp: Date.now()
        };
      }
      return {
        channelId: channel.id,
        channelName: channel.name,
        status: "failed",
        reason: "Timed out waiting for YouTube unsubscribe confirmation dialog",
        timestamp: Date.now()
      };
    }
    confirmBtn.click();
    await sleep2(settleDelayMs);
    const verifiedUnsubscribed = await waitFor(
      () => {
        const currentBtn = findSubscribeButton(channelEl);
        if (!currentBtn) return null;
        return !detectSubscriptionState(currentBtn) ? true : null;
      },
      1800,
      80
    );
    if (!verifiedUnsubscribed) {
      return {
        channelId: channel.id,
        channelName: channel.name,
        status: "failed",
        reason: "Clicked confirm, but YouTube button remained in Subscribed state",
        timestamp: Date.now()
      };
    }
    return {
      channelId: channel.id,
      channelName: channel.name,
      status: "unsubscribed",
      timestamp: Date.now()
    };
  }

  // src/extension/youtube/youtubeAdapter.ts
  var youtubeAdapter = {
    getPageStatus(url = typeof window !== "undefined" ? window.location.href : "") {
      const isYouTube = /^https:\/\/(www\.|m\.)?youtube\.com/i.test(url);
      const isChannelsPage = /youtube\.com\/feed\/channels/i.test(url);
      return {
        connected: true,
        isYouTube,
        isChannelsPage,
        url,
        mode: "chrome"
      };
    },
    scanSubscriptions(options) {
      return scanSubscriptions(options);
    },
    unsubscribeChannel(channel, options) {
      return unsubscribeFromChannel(channel, options);
    },
    scrollToChannel(channelId, root = document) {
      const el = findChannelElementById(channelId, root);
      if (!el) return false;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      return true;
    }
  };

  // src/extension/contentScript.ts
  var activeScanController = null;
  chrome.runtime.onMessage.addListener(
    (message, _sender, sendResponse) => {
      if (message.type === "CHECK_YOUTUBE_TAB") {
        sendResponse(youtubeAdapter.getPageStatus(window.location.href));
        return false;
      }
      if (message.type === "ABORT_SCAN") {
        activeScanController?.abort();
        activeScanController = null;
        sendResponse({ ok: true });
        return false;
      }
      if (message.type === "SCAN_CHANNELS") {
        activeScanController?.abort();
        activeScanController = new AbortController();
        youtubeAdapter.scanSubscriptions({
          autoScroll: message.autoScroll,
          maxScrollAttempts: message.maxScrollAttempts,
          signal: activeScanController.signal
        }).then((channels) => {
          sendResponse({ ok: true, channels });
        }).catch((err) => {
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : "Failed to scan YouTube subscriptions"
          });
        }).finally(() => {
          activeScanController = null;
        });
        return true;
      }
      if (message.type === "UNSUBSCRIBE_CHANNEL") {
        youtubeAdapter.unsubscribeChannel(message.channel).then((result) => {
          sendResponse({ ok: true, result });
        }).catch((err) => {
          sendResponse({
            ok: false,
            result: {
              channelId: message.channel.id,
              channelName: message.channel.name,
              status: "failed",
              reason: err instanceof Error ? err.message : "Content script error",
              timestamp: Date.now()
            }
          });
        });
        return true;
      }
      return false;
    }
  );
})();

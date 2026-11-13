/**
 * Centralized DOM selector registry for YouTube's Subscriptions Management page
 * (/feed/channels). Keeping all Polymer/Lit selectors in one module isolates
 * future YouTube DOM changes from the rest of the extension.
 */

export const YOUTUBE_CHANNELS_URL = 'https://www.youtube.com/feed/channels';

export const YOUTUBE_SELECTORS = {
  channelItems: [
    'ytd-channel-renderer',
    'ytd-grid-channel-renderer',
    '[data-ytbu-channel]',
  ],
  channelTitle: [
    '#main-link #text.ytd-channel-name',
    'ytd-channel-name #text',
    '#channel-title #text',
    '#channel-title',
    'yt-formatted-string#text.ytd-channel-name',
    '[data-ytbu-name]',
  ],
  channelHandle: [
    '#metadata #subscribers',
    '#subscribers',
    '#metadata-line span:first-child',
    '[data-ytbu-handle]',
  ],
  channelSubscribers: [
    '#video-count',
    '#metadata #video-count',
    '#metadata-line span:nth-child(2)',
    '[data-ytbu-subs]',
  ],
  channelLink: [
    'a#main-link',
    'a#avatar-section',
    'a.channel-link',
    'a[href*="/@"]',
    'a[href*="/channel/"]',
  ],
  channelAvatar: [
    '#avatar img#img',
    '#avatar-section img#img',
    '#avatar img',
    'yt-img-shadow img',
    '[data-ytbu-avatar]',
  ],
  subscribeButtonContainer: [
    '#subscribe-button ytd-subscribe-button-renderer',
    'ytd-subscribe-button-renderer',
    '#subscribe-button',
    '[data-ytbu-sub-btn-wrap]',
  ],
  subscribeButtonClickable: [
    'yt-button-shape button',
    'tp-yt-paper-button',
    'button[aria-label*="Unsubscribe" i]',
    'button[aria-label*="Subscribe" i]',
    '[data-ytbu-sub-btn]',
    'button',
  ],
  menuPopup: [
    'tp-yt-iron-dropdown:not([aria-hidden="true"]) ytd-menu-popup-renderer',
    'ytd-menu-popup-renderer',
    'tp-yt-paper-listbox',
    '[data-ytbu-menu]',
  ],
  menuItems: [
    'ytd-menu-service-item-renderer',
    'tp-yt-paper-item',
    '[role="menuitem"]',
    '[data-ytbu-menu-item]',
  ],
  confirmDialog: [
    'tp-yt-paper-dialog:not([aria-hidden="true"]) yt-confirm-dialog-renderer',
    'yt-confirm-dialog-renderer',
    '[data-ytbu-confirm-dialog]',
  ],
  confirmButton: [
    '#confirm-button yt-button-shape button',
    '#confirm-button button',
    'yt-button-renderer#confirm-button button',
    'yt-button-renderer#confirm-button',
    '[data-ytbu-confirm-btn]',
  ],
  cancelButton: [
    '#cancel-button yt-button-shape button',
    '#cancel-button button',
    'yt-button-renderer#cancel-button button',
    '[data-ytbu-cancel-btn]',
  ],
} as const;

export const SUBSCRIBED_LABEL_PATTERNS = [
  /^subscribed$/i,
  /^current subscription/i,
  /unsubscribe from/i,
  /subscribed/i,
];

export const UNSUBSCRIBED_LABEL_PATTERNS = [
  /^subscribe$/i,
  /^subscribe to /i,
];

export const UNSUBSCRIBE_ACTION_PATTERNS = [
  /^unsubscribe$/i,
  /unsubscribe/i,
];

export function queryFirst<T extends Element = Element>(
  root: ParentNode,
  selectors: readonly string[],
): T | null {
  for (const selector of selectors) {
    const found = root.querySelector<T>(selector);
    if (found) return found;
  }
  return null;
}

export function queryAllFirst<T extends Element = Element>(
  root: ParentNode,
  selectors: readonly string[],
): T[] {
  for (const selector of selectors) {
    const found = Array.from(root.querySelectorAll<T>(selector));
    if (found.length > 0) return found;
  }
  return [];
}

export function isElementVisible(el: Element | null): boolean {
  if (!el) return false;
  const htmlEl = el as HTMLElement;
  if (htmlEl.hidden) return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;
  const style = window.getComputedStyle(htmlEl);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  return true;
}

import { ChannelRecord } from '../types';
import {
  SUBSCRIBED_LABEL_PATTERNS,
  UNSUBSCRIBED_LABEL_PATTERNS,
  YOUTUBE_SELECTORS,
  queryFirst,
} from './selectors';

function normalizeWhitespace(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

export function deriveChannelId(url: string, handle: string, name: string, index: number): string {
  if (url) {
    const handleMatch = url.match(/\/(@[^/?#]+)/);
    if (handleMatch?.[1]) return handleMatch[1].toLowerCase();

    const channelMatch = url.match(/\/channel\/([^/?#]+)/);
    if (channelMatch?.[1]) return channelMatch[1];

    const customMatch = url.match(/\/(?:c|user)\/([^/?#]+)/);
    if (customMatch?.[1]) return customMatch[1].toLowerCase();
  }

  if (handle && handle.startsWith('@')) {
    return handle.toLowerCase();
  }

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return slug ? `${slug}-${index}` : `channel-${index}`;
}

export function detectSubscriptionState(buttonEl: Element | null): boolean {
  if (!buttonEl) return false;

  const explicitAttr = buttonEl.getAttribute('data-subscribed');
  if (explicitAttr === 'true') return true;
  if (explicitAttr === 'false') return false;

  const subscribedAttr = buttonEl.getAttribute('subscribed');
  if (subscribedAttr !== null) return true;

  const text = normalizeWhitespace(buttonEl.textContent);
  const ariaLabel = normalizeWhitespace(buttonEl.getAttribute('aria-label'));
  const combined = `${text} ${ariaLabel}`.trim();

  // Check explicit unsubscribed state first ("Subscribe" vs "Subscribed")
  if (UNSUBSCRIBED_LABEL_PATTERNS.some((pattern) => pattern.test(text))) {
    return false;
  }

  if (
    SUBSCRIBED_LABEL_PATTERNS.some(
      (pattern) => pattern.test(text) || pattern.test(ariaLabel) || pattern.test(combined),
    )
  ) {
    return true;
  }

  return false;
}

export function findSubscribeButton(channelEl: Element): HTMLElement | null {
  const container = queryFirst<HTMLElement>(channelEl, YOUTUBE_SELECTORS.subscribeButtonContainer);
  const searchRoot = container ?? channelEl;
  const clickable = queryFirst<HTMLElement>(searchRoot, YOUTUBE_SELECTORS.subscribeButtonClickable);
  return clickable ?? container;
}

export function parseChannelElement(el: Element, index: number): ChannelRecord | null {
  const titleEl = queryFirst(el, YOUTUBE_SELECTORS.channelTitle);
  const name = normalizeWhitespace(titleEl?.textContent);
  if (!name) return null;

  const linkEl = queryFirst<HTMLAnchorElement>(el, YOUTUBE_SELECTORS.channelLink);
  const rawHref = linkEl?.getAttribute('href') ?? '';
  const url = rawHref
    ? rawHref.startsWith('http')
      ? rawHref
      : `https://www.youtube.com${rawHref.startsWith('/') ? '' : '/'}${rawHref}`
    : '';

  const handleEl = queryFirst(el, YOUTUBE_SELECTORS.channelHandle);
  const rawHandle = normalizeWhitespace(handleEl?.textContent);
  const subsEl = queryFirst(el, YOUTUBE_SELECTORS.channelSubscribers);
  const rawSubs = normalizeWhitespace(subsEl?.textContent);

  // YouTube sometimes places "@handle • 1.2M subscribers" in #subscribers
  let handle = '';
  let subscriberText = '';
  if (rawHandle.includes('@')) {
    const parts = rawHandle.split(/[•·]/).map((s) => s.trim());
    handle = parts.find((p) => p.startsWith('@')) ?? rawHandle;
    subscriberText = parts.find((p) => !p.startsWith('@')) ?? rawSubs;
  } else {
    subscriberText = rawSubs || rawHandle;
    const urlHandle = url.match(/\/(@[^/?#]+)/);
    handle = urlHandle?.[1] ?? '';
  }

  const avatarEl = queryFirst<HTMLImageElement>(el, YOUTUBE_SELECTORS.channelAvatar);
  const avatarUrl = avatarEl?.getAttribute('src') ?? '';

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
    index,
  };
}

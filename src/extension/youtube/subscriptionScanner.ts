import { ChannelRecord } from '../types';
import { parseChannelElement } from './channelParser';
import { YOUTUBE_SELECTORS, queryAllFirst } from './selectors';

export interface ScanOptions {
  root?: ParentNode;
  scrollContainer?: HTMLElement | null;
  autoScroll?: boolean;
  maxScrollAttempts?: number;
  scrollWaitMs?: number;
  onProgress?: (count: number) => void;
  signal?: AbortSignal;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Scan aborted', 'AbortError'));
      return;
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new DOMException('Scan aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function collectVisibleChannels(root: ParentNode = document): ChannelRecord[] {
  const elements = queryAllFirst(root, YOUTUBE_SELECTORS.channelItems);
  const deduped = new Map<string, ChannelRecord>();

  elements.forEach((el, index) => {
    const parsed = parseChannelElement(el, index);
    if (parsed && !deduped.has(parsed.id)) {
      deduped.set(parsed.id, parsed);
    }
  });

  return Array.from(deduped.values());
}

export async function scanSubscriptions(options: ScanOptions = {}): Promise<ChannelRecord[]> {
  const {
    root = document,
    scrollContainer = null,
    autoScroll = true,
    maxScrollAttempts = 25,
    scrollWaitMs = 950,
    onProgress,
    signal,
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
        behavior: 'smooth',
      });
    } else {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth',
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

  // Return scroll back to top after scan completes
  if (scrollContainer) {
    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (typeof window !== 'undefined' && root === document) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return channels;
}

import { ChannelRecord, ChannelResult } from '../types';
import {
  detectSubscriptionState,
  findSubscribeButton,
  parseChannelElement,
} from './channelParser';
import {
  UNSUBSCRIBE_ACTION_PATTERNS,
  YOUTUBE_SELECTORS,
  isElementVisible,
  queryAllFirst,
} from './selectors';

export interface UnsubscribeOptions {
  root?: ParentNode;
  dialogTimeoutMs?: number;
  settleDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitFor<T>(
  predicate: () => T | null,
  timeoutMs: number,
  pollIntervalMs = 80,
): Promise<T | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const result = predicate();
    if (result) return result;
    await sleep(pollIntervalMs);
  }
  return null;
}

export function findChannelElementById(
  channelId: string,
  root: ParentNode = document,
): Element | null {
  const elements = queryAllFirst(root, YOUTUBE_SELECTORS.channelItems);
  for (let i = 0; i < elements.length; i++) {
    const parsed = parseChannelElement(elements[i], i);
    if (parsed && parsed.id === channelId) {
      return elements[i];
    }
  }
  return null;
}

function findVisibleConfirmButton(root: ParentNode): HTMLElement | null {
  for (const dialogSelector of YOUTUBE_SELECTORS.confirmDialog) {
    const dialogs = Array.from(root.querySelectorAll(dialogSelector));
    const visibleDialog = dialogs.find((d) => isElementVisible(d));
    if (!visibleDialog) continue;

    for (const btnSelector of YOUTUBE_SELECTORS.confirmButton) {
      const btn = visibleDialog.querySelector<HTMLElement>(btnSelector);
      if (btn && isElementVisible(btn)) {
        return btn;
      }
    }
  }
  return null;
}

function findVisibleUnsubscribeMenuItem(root: ParentNode): HTMLElement | null {
  for (const menuSelector of YOUTUBE_SELECTORS.menuPopup) {
    const menus = Array.from(root.querySelectorAll(menuSelector));
    const visibleMenu = menus.find((m) => isElementVisible(m));
    if (!visibleMenu) continue;

    for (const itemSelector of YOUTUBE_SELECTORS.menuItems) {
      const items = Array.from(visibleMenu.querySelectorAll<HTMLElement>(itemSelector));
      const match = items.find((item) => {
        const text = (item.textContent ?? '').replace(/\s+/g, ' ').trim();
        return UNSUBSCRIBE_ACTION_PATTERNS.some((pattern) => pattern.test(text));
      });
      if (match) return match;
    }
  }
  return null;
}

export async function unsubscribeFromChannel(
  channel: ChannelRecord,
  options: UnsubscribeOptions = {},
): Promise<ChannelResult> {
  const { root = document, dialogTimeoutMs = 3500, settleDelayMs = 250 } = options;

  const channelEl = findChannelElementById(channel.id, root);
  if (!channelEl) {
    return {
      channelId: channel.id,
      channelName: channel.name,
      status: 'failed',
      reason: 'Channel row not found in current page DOM',
      timestamp: Date.now(),
    };
  }

  const subButton = findSubscribeButton(channelEl);
  if (!subButton) {
    return {
      channelId: channel.id,
      channelName: channel.name,
      status: 'failed',
      reason: 'Subscribe button element could not be located',
      timestamp: Date.now(),
    };
  }

  if (!detectSubscriptionState(subButton)) {
    return {
      channelId: channel.id,
      channelName: channel.name,
      status: 'skipped',
      reason: 'Channel is already unsubscribed',
      timestamp: Date.now(),
    };
  }

  // Bring target row smoothly into view so Polymer event handlers remain active
  channelEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await sleep(160);

  // Step 1: Click the "Subscribed" button
  subButton.click();

  // Step 2: Check if a notification dropdown menu opened first (YouTube shows Bell / Unsubscribe menu)
  const dialogOrMenu = await waitFor<'dialog' | 'menu'>(
    () => {
      if (findVisibleConfirmButton(root)) return 'dialog';
      if (findVisibleUnsubscribeMenuItem(root)) return 'menu';
      return null;
    },
    Math.min(1800, dialogTimeoutMs),
    60,
  );

  if (dialogOrMenu === 'menu') {
    const menuItem = findVisibleUnsubscribeMenuItem(root);
    if (!menuItem) {
      return {
        channelId: channel.id,
        channelName: channel.name,
        status: 'failed',
        reason: 'Unsubscribe option missing inside subscription dropdown menu',
        timestamp: Date.now(),
      };
    }
    menuItem.click();
  }

  // Step 3: Wait for YouTube's confirmation modal ("Unsubscribe from <Channel>?")
  const confirmBtn = await waitFor<HTMLElement>(
    () => findVisibleConfirmButton(root),
    dialogTimeoutMs,
    70,
  );

  if (!confirmBtn) {
    // Check if the click already unsubscribed without a modal
    if (!detectSubscriptionState(findSubscribeButton(channelEl))) {
      return {
        channelId: channel.id,
        channelName: channel.name,
        status: 'unsubscribed',
        timestamp: Date.now(),
      };
    }

    return {
      channelId: channel.id,
      channelName: channel.name,
      status: 'failed',
      reason: 'Timed out waiting for YouTube unsubscribe confirmation dialog',
      timestamp: Date.now(),
    };
  }

  // Step 4: Confirm unsubscribe
  confirmBtn.click();
  await sleep(settleDelayMs);

  // Step 5: Verify button transitioned from "Subscribed" to "Subscribe"
  const verifiedUnsubscribed = await waitFor<boolean>(
    () => {
      const currentBtn = findSubscribeButton(channelEl);
      if (!currentBtn) return null;
      return !detectSubscriptionState(currentBtn) ? true : null;
    },
    1800,
    80,
  );

  if (!verifiedUnsubscribed) {
    return {
      channelId: channel.id,
      channelName: channel.name,
      status: 'failed',
      reason: 'Clicked confirm, but YouTube button remained in Subscribed state',
      timestamp: Date.now(),
    };
  }

  return {
    channelId: channel.id,
    channelName: channel.name,
    status: 'unsubscribed',
    timestamp: Date.now(),
  };
}

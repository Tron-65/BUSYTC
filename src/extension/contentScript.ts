import { ExtensionMessage } from './types';
import { youtubeAdapter } from './youtube/youtubeAdapter';

let activeScanController: AbortController | null = null;

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse): boolean => {
    if (message.type === 'CHECK_YOUTUBE_TAB') {
      sendResponse(youtubeAdapter.getPageStatus(window.location.href));
      return false;
    }

    if (message.type === 'ABORT_SCAN') {
      activeScanController?.abort();
      activeScanController = null;
      sendResponse({ ok: true });
      return false;
    }

    if (message.type === 'SCAN_CHANNELS') {
      activeScanController?.abort();
      activeScanController = new AbortController();

      youtubeAdapter
        .scanSubscriptions({
          autoScroll: message.autoScroll,
          maxScrollAttempts: message.maxScrollAttempts,
          signal: activeScanController.signal,
        })
        .then((channels) => {
          sendResponse({ ok: true, channels });
        })
        .catch((err) => {
          sendResponse({
            ok: false,
            error: err instanceof Error ? err.message : 'Failed to scan YouTube subscriptions',
          });
        })
        .finally(() => {
          activeScanController = null;
        });

      return true;
    }

    if (message.type === 'UNSUBSCRIBE_CHANNEL') {
      youtubeAdapter
        .unsubscribeChannel(message.channel)
        .then((result) => {
          sendResponse({ ok: true, result });
        })
        .catch((err) => {
          sendResponse({
            ok: false,
            result: {
              channelId: message.channel.id,
              channelName: message.channel.name,
              status: 'failed',
              reason: err instanceof Error ? err.message : 'Content script error',
              timestamp: Date.now(),
            },
          });
        });

      return true;
    }

    return false;
  },
);

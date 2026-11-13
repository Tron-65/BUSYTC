import { ChannelRecord, ChannelResult, YouTubeTabStatus } from '../types';
import { ScanOptions, scanSubscriptions } from './subscriptionScanner';
import {
  UnsubscribeOptions,
  findChannelElementById,
  unsubscribeFromChannel,
} from './unsubscribeAction';

export interface YouTubeAdapter {
  getPageStatus: (url?: string) => YouTubeTabStatus;
  scanSubscriptions: (options?: ScanOptions) => Promise<ChannelRecord[]>;
  unsubscribeChannel: (
    channel: ChannelRecord,
    options?: UnsubscribeOptions,
  ) => Promise<ChannelResult>;
  scrollToChannel: (channelId: string, root?: ParentNode) => boolean;
}

export const youtubeAdapter: YouTubeAdapter = {
  getPageStatus(url = typeof window !== 'undefined' ? window.location.href : ''): YouTubeTabStatus {
    const isYouTube = /^https:\/\/(www\.|m\.)?youtube\.com/i.test(url);
    const isChannelsPage = /youtube\.com\/feed\/channels/i.test(url);
    return {
      connected: true,
      isYouTube,
      isChannelsPage,
      url,
      mode: 'chrome',
    };
  },

  scanSubscriptions(options?: ScanOptions): Promise<ChannelRecord[]> {
    return scanSubscriptions(options);
  },

  unsubscribeChannel(
    channel: ChannelRecord,
    options?: UnsubscribeOptions,
  ): Promise<ChannelResult> {
    return unsubscribeFromChannel(channel, options);
  },

  scrollToChannel(channelId: string, root: ParentNode = document): boolean {
    const el = findChannelElementById(channelId, root);
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  },
};

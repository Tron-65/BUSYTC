export type ChannelOutcomeStatus =
  | 'idle'
  | 'queued'
  | 'processing'
  | 'unsubscribed'
  | 'failed'
  | 'skipped';

export interface ChannelRecord {
  id: string;
  name: string;
  handle: string;
  url: string;
  subscriberText: string;
  avatarUrl: string;
  isSubscribed: boolean;
  index: number;
}

export interface ChannelResult {
  channelId: string;
  channelName: string;
  status: ChannelOutcomeStatus;
  reason?: string;
  timestamp: number;
}

export type BatchPhase =
  | 'idle'
  | 'scanning'
  | 'ready'
  | 'running'
  | 'paused'
  | 'stopped'
  | 'completed';

export interface ExtensionSettings {
  delayMs: number;
  jitterMs: number;
  autoScrollOnScan: boolean;
  maxScrollAttempts: number;
  skipAlreadyUnsubscribed: boolean;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  delayMs: 1200,
  jitterMs: 300,
  autoScrollOnScan: true,
  maxScrollAttempts: 25,
  skipAlreadyUnsubscribed: true,
};

export interface BatchProgress {
  phase: BatchPhase;
  total: number;
  processed: number;
  unsubscribed: number;
  failed: number;
  skipped: number;
  currentChannelId: string | null;
  currentChannelName: string | null;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface YouTubeTabStatus {
  connected: boolean;
  isYouTube: boolean;
  isChannelsPage: boolean;
  url: string;
  tabId?: number;
  mode: 'chrome' | 'sandbox';
}

export interface UnsubscribeHistoryEntry {
  id: string;
  channelId: string;
  name: string;
  handle: string;
  url: string;
  subscriberText: string;
  unsubscribedAt: number;
}

export interface PersistedExtensionState {
  channels: ChannelRecord[];
  selectedIds: string[];
  results: Record<string, ChannelResult>;
  history: UnsubscribeHistoryEntry[];
  progress: BatchProgress;
  settings: ExtensionSettings;
  lastScannedAt: number | null;
}

export type ExtensionMessage =
  | { type: 'CHECK_YOUTUBE_TAB' }
  | { type: 'OPEN_CHANNELS_PAGE' }
  | { type: 'SCAN_CHANNELS'; autoScroll: boolean; maxScrollAttempts: number }
  | { type: 'ABORT_SCAN' }
  | { type: 'UNSUBSCRIBE_CHANNEL'; channel: ChannelRecord }
  | { type: 'START_BATCH'; channelIds: string[]; settings: ExtensionSettings }
  | { type: 'PAUSE_BATCH' }
  | { type: 'RESUME_BATCH' }
  | { type: 'STOP_BATCH' }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'GET_STATE' }
  | { type: 'UPDATE_SETTINGS'; settings: ExtensionSettings }
  | { type: 'STATE_UPDATED'; state: PersistedExtensionState };

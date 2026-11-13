import {
  BatchProgress,
  ChannelRecord,
  ChannelResult,
  DEFAULT_SETTINGS,
  ExtensionSettings,
  PersistedExtensionState,
  UnsubscribeHistoryEntry,
} from './types';

const STORAGE_KEY = 'ytbu_extension_state_v1';
const SETTINGS_KEY = 'ytbu_extension_settings_v1';

export function createInitialProgress(): BatchProgress {
  return {
    phase: 'idle',
    total: 0,
    processed: 0,
    unsubscribed: 0,
    failed: 0,
    skipped: 0,
    currentChannelId: null,
    currentChannelName: null,
    startedAt: null,
    finishedAt: null,
  };
}

export function createInitialState(): PersistedExtensionState {
  return {
    channels: [],
    selectedIds: [],
    results: {},
    history: [],
    progress: createInitialProgress(),
    settings: { ...DEFAULT_SETTINGS },
    lastScannedAt: null,
  };
}

export function mergeUnsubscribeHistory(
  existingHistory: UnsubscribeHistoryEntry[],
  channels: ChannelRecord[],
  results: Record<string, ChannelResult>,
): UnsubscribeHistoryEntry[] {
  const channelMap = new Map(channels.map((ch) => [ch.id, ch]));
  const existingKeys = new Set(
    existingHistory.map((item) => `${item.channelId}:${item.unsubscribedAt}`),
  );
  const additions: UnsubscribeHistoryEntry[] = [];

  for (const res of Object.values(results)) {
    if (res.status !== 'unsubscribed') continue;
    const key = `${res.channelId}:${res.timestamp}`;
    if (existingKeys.has(key)) continue;

    // Also prevent duplicate recording for the same channel within the same batch
    const alreadyRecordedForTimestamp = existingHistory.some(
      (item) =>
        item.channelId === res.channelId &&
        Math.abs(item.unsubscribedAt - res.timestamp) < 2000,
    );
    if (alreadyRecordedForTimestamp) continue;

    const ch = channelMap.get(res.channelId);
    additions.push({
      id: key,
      channelId: res.channelId,
      name: ch?.name ?? res.channelName,
      handle: ch?.handle ?? '',
      url: ch?.url ?? '',
      subscriberText: ch?.subscriberText ?? '',
      unsubscribedAt: res.timestamp,
    });
    existingKeys.add(key);
  }

  if (additions.length === 0) return existingHistory;

  return [...additions, ...existingHistory]
    .sort((a, b) => b.unsubscribedAt - a.unsubscribedAt)
    .slice(0, 2000);
}

export function isChromeExtensionContext(): boolean {
  return (
    typeof chrome !== 'undefined' &&
    typeof chrome.storage !== 'undefined' &&
    typeof chrome.storage.local !== 'undefined'
  );
}

export async function loadPersistedState(): Promise<PersistedExtensionState> {
  if (isChromeExtensionContext()) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY, SETTINGS_KEY], (items) => {
        const fallback = createInitialState();
        const storedState = items[STORAGE_KEY] as Partial<PersistedExtensionState> | undefined;
        const storedSettings = items[SETTINGS_KEY] as Partial<ExtensionSettings> | undefined;

        resolve({
          ...fallback,
          ...storedState,
          history: Array.isArray(storedState?.history) ? storedState.history : [],
          progress: {
            ...fallback.progress,
            ...(storedState?.progress ?? {}),
          },
          settings: {
            ...DEFAULT_SETTINGS,
            ...(storedState?.settings ?? {}),
            ...(storedSettings ?? {}),
          },
        });
      });
    });
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw) as Partial<PersistedExtensionState>;
    const fallback = createInitialState();
    return {
      ...fallback,
      ...parsed,
      history: Array.isArray(parsed.history) ? parsed.history : [],
      progress: { ...fallback.progress, ...(parsed.progress ?? {}) },
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return createInitialState();
  }
}

export async function savePersistedState(state: PersistedExtensionState): Promise<void> {
  if (isChromeExtensionContext()) {
    return new Promise((resolve) => {
      chrome.storage.local.set(
        {
          [STORAGE_KEY]: state,
          [SETTINGS_KEY]: state.settings,
        },
        () => resolve(),
      );
    });
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors in browser preview mode
  }
}

export async function saveSettingsOnly(settings: ExtensionSettings): Promise<void> {
  const current = await loadPersistedState();
  await savePersistedState({
    ...current,
    settings,
  });
}

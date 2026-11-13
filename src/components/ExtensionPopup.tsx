import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Filter,
  History,
  ListChecks,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Search,
  SkipForward,
  SlidersHorizontal,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import {
  BatchProgress,
  ChannelRecord,
  ChannelResult,
  ExtensionSettings,
  UnsubscribeHistoryEntry,
  YouTubeTabStatus,
} from '../extension/types';
import { UnsubscribeHistoryChart } from './UnsubscribeHistoryChart';

export interface ExtensionPopupProps {
  tabStatus: YouTubeTabStatus;
  channels: ChannelRecord[];
  selectedIds: string[];
  results: Record<string, ChannelResult>;
  history: UnsubscribeHistoryEntry[];
  progress: BatchProgress;
  settings: ExtensionSettings;
  errorMessage: string | null;
  onDismissError: () => void;
  onOpenChannelsPage: () => void;
  onScanChannels: () => void;
  onToggleSelect: (channelId: string) => void;
  onSelectIds: (ids: string[]) => void;
  onUpdateSettings: (settings: ExtensionSettings) => void;
  onStartBatch: () => void;
  onPauseBatch: () => void;
  onResumeBatch: () => void;
  onStopBatch: () => void;
  onResetResults: () => void;
  onClearHistory: () => void;
  isPopupWindow?: boolean;
}

type PopupViewTab = 'channels' | 'history';
type StatusFilterMode = 'all' | 'subscribed' | 'selected' | 'processed' | 'failed';
type SizeFilterMode = 'any' | 'under100k' | '100k_1m' | 'over1m';
type SortOrderMode = 'default' | 'name_asc' | 'name_desc' | 'subs_asc' | 'subs_desc';

const AVATAR_TONES = [
  'bg-zinc-200 text-zinc-800',
  'bg-red-100 text-red-800',
  'bg-amber-100 text-amber-800',
  'bg-emerald-100 text-emerald-800',
  'bg-sky-100 text-sky-800',
  'bg-indigo-100 text-indigo-800',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getToneClass(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function formatHistoryTimestamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function parseSubscriberCount(text: string): number | null {
  if (!text) return null;
  const cleaned = text.replace(/,/g, '').trim();
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*([kmb])?/i);
  if (!match) return null;
  const base = Number.parseFloat(match[1]);
  if (Number.isNaN(base)) return null;
  const suffix = (match[2] ?? '').toLowerCase();
  if (suffix === 'k') return Math.round(base * 1_000);
  if (suffix === 'm') return Math.round(base * 1_000_000);
  if (suffix === 'b') return Math.round(base * 1_000_000_000);
  return Math.round(base);
}

export const ExtensionPopup: React.FC<ExtensionPopupProps> = ({
  tabStatus,
  channels,
  selectedIds,
  results,
  history,
  progress,
  settings,
  errorMessage,
  onDismissError,
  onOpenChannelsPage,
  onScanChannels,
  onToggleSelect,
  onSelectIds,
  onUpdateSettings,
  onStartBatch,
  onPauseBatch,
  onResumeBatch,
  onStopBatch,
  onResetResults,
  onClearHistory,
  isPopupWindow = false,
}) => {
  const [popupTab, setPopupTab] = useState<PopupViewTab>('channels');
  const [searchQuery, setSearchQuery] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterMode>('all');
  const [sizeFilter, setSizeFilter] = useState<SizeFilterMode>('any');
  const [sortOrder, setSortOrder] = useState<SortOrderMode>('default');
  const [showBulkFilters, setShowBulkFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmingBatch, setConfirmingBatch] = useState(false);
  const [confirmingClearHistory, setConfirmingClearHistory] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const isScanning = progress.phase === 'scanning';
  const isRunning = progress.phase === 'running';
  const isPaused = progress.phase === 'paused';
  const isBatchActive = isRunning || isPaused;
  const hasFinishedSummary =
    (progress.phase === 'completed' || progress.phase === 'stopped') && progress.total > 0;
  const showProgressSummary = isBatchActive || hasFinishedSummary;

  const subscribedCount = useMemo(
    () => channels.filter((c) => c.isSubscribed).length,
    [channels],
  );
  const processedCount = useMemo(
    () => Object.keys(results).length,
    [results],
  );
  const failedCount = useMemo(
    () => Object.values(results).filter((r) => r.status === 'failed').length,
    [results],
  );

  const filteredChannels = useMemo(() => {
    const rawTerms = searchQuery
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const matching = channels.filter((ch) => {
      if (statusFilter === 'subscribed' && !ch.isSubscribed) return false;
      if (statusFilter === 'selected' && !selectedSet.has(ch.id)) return false;
      if (statusFilter === 'processed' && !results[ch.id]) return false;
      if (statusFilter === 'failed' && results[ch.id]?.status !== 'failed') return false;

      if (sizeFilter !== 'any') {
        const count = parseSubscriberCount(ch.subscriberText);
        if (count === null) return false;
        if (sizeFilter === 'under100k' && count >= 100_000) return false;
        if (sizeFilter === '100k_1m' && (count < 100_000 || count >= 1_000_000)) return false;
        if (sizeFilter === 'over1m' && count < 1_000_000) return false;
      }

      if (rawTerms.length > 0) {
        const nameLower = ch.name.toLowerCase();
        const handleLower = ch.handle.toLowerCase();
        const matchesAny = rawTerms.some(
          (term) => nameLower.includes(term) || handleLower.includes(term),
        );
        if (!matchesAny) return false;
      }

      return true;
    });

    if (sortOrder === 'default') return matching;

    const sorted = [...matching];
    sorted.sort((a, b) => {
      if (sortOrder === 'name_asc') return a.name.localeCompare(b.name);
      if (sortOrder === 'name_desc') return b.name.localeCompare(a.name);
      const countA = parseSubscriberCount(a.subscriberText) ?? -1;
      const countB = parseSubscriberCount(b.subscriberText) ?? -1;
      return sortOrder === 'subs_asc' ? countA - countB : countB - countA;
    });
    return sorted;
  }, [channels, results, searchQuery, selectedSet, sizeFilter, sortOrder, statusFilter]);

  const filteredHistory = useMemo(() => {
    const query = historyQuery.trim().toLowerCase();
    const sorted = [...history].sort((a, b) => b.unsubscribedAt - a.unsubscribedAt);
    if (!query) return sorted;
    return sorted.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.handle.toLowerCase().includes(query),
    );
  }, [history, historyQuery]);

  const selectableFiltered = useMemo(
    () =>
      filteredChannels.filter(
        (ch) => ch.isSubscribed || !settings.skipAlreadyUnsubscribed,
      ),
    [filteredChannels, settings.skipAlreadyUnsubscribed],
  );

  const allFilteredSelected =
    selectableFiltered.length > 0 &&
    selectableFiltered.every((ch) => selectedSet.has(ch.id));

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    statusFilter !== 'all' ||
    sizeFilter !== 'any' ||
    sortOrder !== 'default';

  const handleSelectFiltered = () => {
    const next = new Set(selectedIds);
    if (allFilteredSelected) {
      filteredChannels.forEach((ch) => next.delete(ch.id));
    } else {
      selectableFiltered.forEach((ch) => next.add(ch.id));
    }
    onSelectIds(Array.from(next));
  };

  const handleInvertFiltered = () => {
    const next = new Set(selectedIds);
    selectableFiltered.forEach((ch) => {
      if (next.has(ch.id)) next.delete(ch.id);
      else next.add(ch.id);
    });
    onSelectIds(Array.from(next));
  };

  const handleSelectAllSubscribed = () => {
    const ids = channels.filter((ch) => ch.isSubscribed).map((ch) => ch.id);
    onSelectIds(ids);
  };

  const handleClearSelection = () => {
    onSelectIds([]);
    setConfirmingBatch(false);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSizeFilter('any');
    setSortOrder('default');
  };

  const handleExportCsv = () => {
    const rows = [
      ['Channel Name', 'Handle', 'URL', 'Status', 'Reason', 'Timestamp'],
      ...channels
        .filter((ch) => results[ch.id])
        .map((ch) => {
          const r = results[ch.id];
          return [
            ch.name,
            ch.handle,
            ch.url,
            r.status,
            r.reason ?? '',
            new Date(r.timestamp).toISOString(),
          ];
        }),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `youtube-unsubscribe-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportHistoryCsv = () => {
    const rows = [
      ['Channel Name', 'Handle', 'URL', 'Subscribers', 'Unsubscribed At'],
      ...history.map((item) => [
        item.name,
        item.handle,
        item.url,
        item.subscriberText,
        new Date(item.unsubscribedAt).toISOString(),
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','),
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `youtube-unsubscribe-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const progressPercent =
    progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0;
  const unsubscribedPct =
    progress.total > 0 ? (progress.unsubscribed / progress.total) * 100 : 0;
  const failedPct =
    progress.total > 0 ? (progress.failed / progress.total) * 100 : 0;
  const skippedPct =
    progress.total > 0 ? (progress.skipped / progress.total) * 100 : 0;
  const remainingCount = Math.max(0, progress.total - progress.processed);
  const etaSeconds = Math.ceil(
    (remainingCount * (settings.delayMs + settings.jitterMs / 2 + 250)) / 1000,
  );

  return (
    <div
      className={`flex flex-col bg-white text-zinc-900 border border-zinc-200 overflow-hidden ${
        isPopupWindow ? 'w-[420px] h-[600px]' : 'w-full max-w-[420px] h-[640px] rounded-xl'
      }`}
    >
      {/* Popup Top Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-200 bg-zinc-50/70 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-[5px] bg-red-600 text-white shrink-0">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                <path d="M5 6.5v11l7-5.5-7-5.5Z" />
                <rect x="13" y="8" width="6" height="2.4" rx="1" />
                <rect x="13" y="13.6" width="6" height="2.4" rx="1" />
              </svg>
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-zinc-900 truncate">
              ChannelSweep for YouTube
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 truncate">
            {tabStatus.isChannelsPage
              ? 'Ready on youtube.com/feed/channels'
              : tabStatus.isYouTube
                ? 'On YouTube · Open Subscriptions page'
                : 'Not on YouTube Subscriptions'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSettings((prev) => !prev)}
          aria-label="Toggle extension settings"
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors shrink-0 ${
            showSettings
              ? 'border-zinc-900 bg-zinc-900 text-white'
              : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* Primary Popup Navigation Tabs (Channels vs History) */}
      <div className="flex items-center border-b border-zinc-200 bg-white px-4 gap-5 shrink-0">
        <button
          type="button"
          onClick={() => setPopupTab('channels')}
          className={`inline-flex items-center gap-1.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            popupTab === 'channels'
              ? 'border-red-600 text-zinc-900 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <ListChecks className="h-3.5 w-3.5" />
          <span>Subscriptions</span>
          {channels.length > 0 && (
            <span className="text-zinc-400 tabular-nums">({channels.length})</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setPopupTab('history')}
          className={`inline-flex items-center gap-1.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            popupTab === 'history'
              ? 'border-red-600 text-zinc-900 font-semibold'
              : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>History</span>
          <span className="text-zinc-400 tabular-nums">({history.length})</span>
        </button>
      </div>

      {/* Inline Error Banner */}
      {errorMessage && (
        <div className="flex items-start justify-between gap-2 px-4 py-2.5 bg-red-50 border-b border-red-200 text-xs text-red-800 shrink-0">
          <div className="flex items-start gap-2 min-w-0">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={onDismissError}
            aria-label="Dismiss error"
            className="p-0.5 text-red-600 hover:text-red-900 shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Settings Drawer */}
      {showSettings && (
        <div className="px-4 py-3.5 bg-zinc-50 border-b border-zinc-200 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-900">
              Batch &amp; Rate-Limit Settings
            </span>
            <span className="text-[11px] text-zinc-500">Saved locally</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="delay-slider" className="text-zinc-700">
                Delay between unsubscribes
              </label>
              <span className="font-mono text-zinc-900 tabular-nums">
                {(settings.delayMs / 1000).toFixed(1)}s
              </span>
            </div>
            <input
              id="delay-slider"
              type="range"
              min={300}
              max={5000}
              step={100}
              value={settings.delayMs}
              disabled={isBatchActive}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  delayMs: Number(e.target.value),
                })
              }
              className="w-full accent-red-600 cursor-pointer"
            />
            <div className="flex items-center justify-between gap-1.5">
              {[500, 1200, 2500, 4000].map((ms) => (
                <button
                  key={ms}
                  type="button"
                  disabled={isBatchActive}
                  onClick={() => onUpdateSettings({ ...settings, delayMs: ms })}
                  className={`flex-1 py-1 text-[11px] font-mono tabular-nums rounded border transition-colors ${
                    settings.delayMs === ms
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100'
                  }`}
                >
                  {(ms / 1000).toFixed(1)}s
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoScrollOnScan}
                disabled={isBatchActive}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    autoScrollOnScan: e.target.checked,
                  })
                }
                className="h-3.5 w-3.5 rounded border-zinc-300 accent-red-600"
              />
              <span>Auto-scroll scan</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.skipAlreadyUnsubscribed}
                disabled={isBatchActive}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    skipAlreadyUnsubscribed: e.target.checked,
                  })
                }
                className="h-3.5 w-3.5 rounded border-zinc-300 accent-red-600"
              />
              <span>Skip unsubscribed</span>
            </label>
          </div>
        </div>
      )}

      {popupTab === 'history' ? (
        /* History Tab View */
        <div className="flex-1 flex flex-col min-h-0">
          {history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
              <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 mb-3">
                <History className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-zinc-900">
                No unsubscribed channels recorded yet
              </p>
              <p className="mt-1 text-xs text-zinc-500 max-w-[260px] leading-relaxed">
                Channels you unsubscribe from will appear here with timestamps and
                a timeline chart.
              </p>
              <button
                type="button"
                onClick={() => setPopupTab('channels')}
                className="mt-4 px-3.5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Go to Subscriptions
              </button>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 space-y-3 shrink-0">
                <UnsubscribeHistoryChart entries={history} />

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={historyQuery}
                      onChange={(e) => setHistoryQuery(e.target.value)}
                      placeholder="Filter history by channel..."
                      aria-label="Filter unsubscribe history"
                      className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
                    />
                    {historyQuery && (
                      <button
                        type="button"
                        onClick={() => setHistoryQuery('')}
                        aria-label="Clear history search"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleExportHistoryCsv}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>CSV</span>
                  </button>

                  {confirmingClearHistory ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClearHistory();
                        setConfirmingClearHistory(false);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Confirm
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingClearHistory(true)}
                      className="px-2.5 py-1.5 text-xs font-medium text-zinc-600 bg-white border border-zinc-200 hover:text-red-600 hover:border-red-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
                {filteredHistory.length === 0 ? (
                  <div className="py-10 px-6 text-center text-xs text-zinc-500">
                    No history entries match &ldquo;{historyQuery}&rdquo;.
                  </div>
                ) : (
                  filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-50/70 transition-colors"
                    >
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${getToneClass(
                          item.channelId,
                        )}`}
                      >
                        {getInitials(item.name)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-zinc-900 truncate">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate">
                          {[item.handle, item.subscriberText]
                            .filter(Boolean)
                            .join(' · ') || item.channelId}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Removed</span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 tabular-nums mt-0.5">
                          {formatHistoryTimestamp(item.unsubscribedAt)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        /* Channels & Batch Execution Tab View */
        <>
          {/* Connection Gate or Scan, Search & Bulk Filtering Controls */}
          {!tabStatus.isChannelsPage ? (
            <div className="px-4 py-4 border-b border-zinc-200 bg-zinc-50/50 shrink-0">
              <p className="text-xs text-zinc-600 leading-relaxed">
                Open your YouTube Subscriptions manager so the extension can detect
                your channels directly in the browser without API keys or login.
              </p>
              <button
                type="button"
                onClick={onOpenChannelsPage}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors whitespace-nowrap"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open youtube.com/feed/channels</span>
              </button>
            </div>
          ) : (
            <div className="px-4 py-3 border-b border-zinc-200 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-zinc-600 tabular-nums">
                  <span className="font-semibold text-zinc-900">
                    {channels.length}
                  </span>{' '}
                  detected
                  <span className="mx-1.5 text-zinc-300" aria-hidden="true">
                    ·
                  </span>
                  <span>{subscribedCount} subscribed</span>
                  {hasActiveFilters && channels.length > 0 && (
                    <>
                      <span className="mx-1.5 text-zinc-300" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-zinc-900 font-medium">
                        {filteredChannels.length} shown
                      </span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onScanChannels}
                  disabled={isScanning || isBatchActive}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-900 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>{channels.length > 0 ? 'Rescan' : 'Scan Subscriptions'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Search Input + Bulk Filter Toggle */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1 min-w-0">
                  <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, @handle, or comma-separated terms..."
                    aria-label="Search channels"
                    className="w-full pl-8 pr-8 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 focus:bg-white transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setShowBulkFilters((prev) => !prev)}
                  aria-label="Toggle bulk filters and sorting"
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    showBulkFilters || sizeFilter !== 'any' || sortOrder !== 'default'
                      ? 'border-zinc-900 bg-zinc-900 text-white'
                      : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <Filter className="h-3.5 w-3.5" />
                  <span>Filter</span>
                </button>
              </div>

              {/* Expandable Bulk Filter & Sort Controls */}
              {showBulkFilters && (
                <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-zinc-600">
                      Channel size
                    </span>
                    <div className="flex items-center gap-1 p-0.5 bg-zinc-200/70 rounded-md">
                      {(
                        [
                          { id: 'any', label: 'Any' },
                          { id: 'under100k', label: '<100K' },
                          { id: '100k_1m', label: '100K–1M' },
                          { id: 'over1m', label: '1M+' },
                        ] as const
                      ).map((tier) => (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => setSizeFilter(tier.id)}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap tabular-nums ${
                            sizeFilter === tier.id
                              ? 'bg-white text-zinc-900 shadow-xs'
                              : 'text-zinc-600 hover:text-zinc-900'
                          }`}
                        >
                          {tier.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="bulk-sort-select"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600"
                    >
                      <ArrowUpDown className="h-3 w-3" />
                      <span>Sort order</span>
                    </label>
                    <select
                      id="bulk-sort-select"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as SortOrderMode)}
                      className="px-2 py-1 text-[11px] font-medium bg-white border border-zinc-200 rounded-md text-zinc-800 focus:outline-none focus:border-zinc-400"
                    >
                      <option value="default">YouTube scan order</option>
                      <option value="name_asc">Name (A to Z)</option>
                      <option value="name_desc">Name (Z to A)</option>
                      <option value="subs_asc">Subscribers (Low to High)</option>
                      <option value="subs_desc">Subscribers (High to Low)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 p-0.5 bg-zinc-100 rounded-md overflow-x-auto">
                {(
                  [
                    { id: 'all', label: `All (${channels.length})` },
                    { id: 'subscribed', label: `Active (${subscribedCount})` },
                    { id: 'selected', label: `Selected (${selectedIds.length})` },
                    { id: 'processed', label: `Log (${processedCount})` },
                    ...(failedCount > 0
                      ? [{ id: 'failed', label: `Failed (${failedCount})` }]
                      : []),
                  ] as Array<{ id: StatusFilterMode; label: string }>
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap tabular-nums shrink-0 ${
                      statusFilter === tab.id
                        ? 'bg-white text-zinc-900 shadow-xs'
                        : 'text-zinc-600 hover:text-zinc-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Bulk Selection Actions Row */}
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={selectableFiltered.length === 0 || isBatchActive}
                    onClick={handleSelectFiltered}
                    className="font-medium text-zinc-800 hover:text-zinc-950 disabled:opacity-40 whitespace-nowrap tabular-nums"
                  >
                    {allFilteredSelected
                      ? `Uncheck shown (${selectableFiltered.length})`
                      : `Select shown (${selectableFiltered.length})`}
                  </button>
                  <span className="text-zinc-300" aria-hidden="true">
                    ·
                  </span>
                  <button
                    type="button"
                    disabled={selectableFiltered.length === 0 || isBatchActive}
                    onClick={handleInvertFiltered}
                    className="font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-40 whitespace-nowrap"
                  >
                    Invert
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="font-medium text-red-600 hover:text-red-700 whitespace-nowrap"
                    >
                      Reset filters
                    </button>
                  )}
                  {selectedIds.length > 0 && (
                    <>
                      {hasActiveFilters && (
                        <span className="text-zinc-300" aria-hidden="true">
                          /
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={isBatchActive}
                        onClick={handleClearSelection}
                        className="font-medium text-zinc-500 hover:text-zinc-900 disabled:opacity-40 whitespace-nowrap"
                      >
                        Clear ({selectedIds.length})
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Channel List Viewport */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
            {channels.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 py-10">
                <div className="h-10 w-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 mb-3">
                  <Search className="h-4 w-4" />
                </div>
                <p className="text-xs font-medium text-zinc-900">
                  {tabStatus.isChannelsPage
                    ? 'No channels scanned yet'
                    : 'Waiting for YouTube Subscriptions tab'}
                </p>
                <p className="mt-1 text-xs text-zinc-500 max-w-[260px] leading-relaxed">
                  {tabStatus.isChannelsPage
                    ? 'Click Scan Subscriptions above to load channels from the page.'
                    : 'Navigate to your Subscriptions page to scan and select channels.'}
                </p>
                {tabStatus.isChannelsPage && (
                  <button
                    type="button"
                    onClick={onScanChannels}
                    disabled={isScanning}
                    className="mt-4 px-3.5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    Scan Subscriptions
                  </button>
                )}
              </div>
            ) : filteredChannels.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <p className="text-xs font-medium text-zinc-800">
                  No channels match your current filters
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-2 text-xs font-medium text-red-600 hover:text-red-700"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              filteredChannels.map((ch) => {
                const isSelected = selectedSet.has(ch.id);
                const result = results[ch.id];
                const isCurrentlyProcessing = result?.status === 'processing';

                return (
                  <label
                    key={ch.id}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                      isCurrentlyProcessing
                        ? 'bg-red-50/70'
                        : isSelected
                          ? 'bg-zinc-50'
                          : 'hover:bg-zinc-50/80'
                    }`}
                  >
                    <div className="relative flex items-center justify-center shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isBatchActive}
                        onChange={() => onToggleSelect(ch.id)}
                        className="sr-only"
                      />
                      <span
                        className={`h-4 w-4 rounded flex items-center justify-center border transition-colors ${
                          isSelected
                            ? 'bg-red-600 border-red-600 text-white'
                            : 'bg-white border-zinc-300'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[2.5]" />}
                      </span>
                    </div>

                    {/* Channel Avatar */}
                    {ch.avatarUrl ? (
                      <img
                        src={ch.avatarUrl}
                        alt={ch.name}
                        referrerPolicy="no-referrer"
                        className="h-8 w-8 rounded-full object-cover bg-zinc-100 shrink-0"
                      />
                    ) : (
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${getToneClass(
                          ch.id,
                        )}`}
                      >
                        {getInitials(ch.name)}
                      </div>
                    )}

                    {/* Channel Title + Unboxed Metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-zinc-900 truncate">
                        {ch.name}
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate">
                        {[ch.handle, ch.subscriberText].filter(Boolean).join(' · ') ||
                          (ch.isSubscribed ? 'Subscribed' : 'Unsubscribed')}
                      </div>
                      {result?.status === 'failed' && result.reason && (
                        <div className="mt-0.5 text-[11px] text-red-600 truncate">
                          {result.reason}
                        </div>
                      )}
                    </div>

                    {/* Explicit Status Indicator (Icon + Text, No Color-Only, No Pills) */}
                    <div className="shrink-0 text-right">
                      {result?.status === 'unsubscribed' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Unsubscribed</span>
                        </span>
                      ) : result?.status === 'failed' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Failed</span>
                        </span>
                      ) : result?.status === 'skipped' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                          <SkipForward className="h-3.5 w-3.5" />
                          <span>Skipped</span>
                        </span>
                      ) : result?.status === 'processing' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Removing</span>
                        </span>
                      ) : result?.status === 'queued' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Queued</span>
                        </span>
                      ) : !ch.isSubscribed ? (
                        <span className="text-[11px] text-zinc-400">Unsubscribed</span>
                      ) : null}
                    </div>
                  </label>
                );
              })
            )}
          </div>

          {/* Bottom Real-Time Progress Bar, Visual Count Summary & Batch Controls */}
          <div className="border-t border-zinc-200 bg-zinc-50/95 px-4 py-3 space-y-2.5 shrink-0">
            {showProgressSummary && (
              <div
                className="space-y-2 pb-2 border-b border-zinc-200/80"
                aria-live="polite"
              >
                {/* Primary Real-Time Count Summary */}
                <div className="flex items-baseline justify-between gap-2">
                  <div className="text-xs font-semibold text-zinc-900 tabular-nums">
                    {progress.processed}/{progress.total} channels processed
                  </div>
                  <div className="text-[11px] font-mono text-zinc-600 tabular-nums shrink-0">
                    {progressPercent}%
                    {isRunning && remainingCount > 0 && (
                      <span className="text-zinc-400"> · ~{etaSeconds}s left</span>
                    )}
                  </div>
                </div>

                {/* Multi-Segment Visual Progress Bar */}
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={progress.total}
                  aria-valuenow={progress.processed}
                  aria-label={`${progress.processed} of ${progress.total} channels processed`}
                  className="h-2 w-full rounded-full bg-zinc-200 overflow-hidden flex"
                >
                  {unsubscribedPct > 0 && (
                    <div
                      className="h-full bg-emerald-600 transition-[width] duration-200"
                      style={{ width: `${unsubscribedPct}%` }}
                    />
                  )}
                  {failedPct > 0 && (
                    <div
                      className="h-full bg-red-600 transition-[width] duration-200"
                      style={{ width: `${failedPct}%` }}
                    />
                  )}
                  {skippedPct > 0 && (
                    <div
                      className="h-full bg-amber-500 transition-[width] duration-200"
                      style={{ width: `${skippedPct}%` }}
                    />
                  )}
                </div>

                {/* Active Channel + Visual Breakdown Strip */}
                <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-600 tabular-nums">
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      <span>{progress.unsubscribed}</span>
                    </span>
                    <span className="text-zinc-300" aria-hidden="true">
                      ·
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 ${
                        progress.failed > 0 ? 'text-red-600 font-medium' : 'text-zinc-500'
                      }`}
                    >
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>{progress.failed}</span>
                    </span>
                    <span className="text-zinc-300" aria-hidden="true">
                      ·
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 ${
                        progress.skipped > 0 ? 'text-amber-700 font-medium' : 'text-zinc-500'
                      }`}
                    >
                      <SkipForward className="h-3 w-3 shrink-0" />
                      <span>{progress.skipped}</span>
                    </span>
                    <span className="text-zinc-300" aria-hidden="true">
                      ·
                    </span>
                    <span className="truncate text-zinc-500">
                      {isPaused
                        ? 'Paused'
                        : isRunning
                          ? `Now: ${progress.currentChannelName ?? '...'}`
                          : progress.phase === 'stopped'
                            ? 'Stopped'
                            : 'Done'}
                    </span>
                  </div>

                  {hasFinishedSummary && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleExportCsv}
                        className="inline-flex items-center gap-1 font-medium text-zinc-700 hover:text-zinc-900"
                      >
                        <Download className="h-3 w-3" />
                        <span>CSV</span>
                      </button>
                      <button
                        type="button"
                        onClick={onResetResults}
                        className="font-medium text-zinc-500 hover:text-zinc-900"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Active Batch Playback Controls */}
            {isBatchActive ? (
              <div className="flex items-center gap-2">
                {isPaused ? (
                  <button
                    type="button"
                    onClick={onResumeBatch}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Resume</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onPauseBatch}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-900 bg-white border border-zinc-300 hover:bg-zinc-100 rounded-lg transition-colors"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    <span>Pause</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onStopBatch}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <Square className="h-3.5 w-3.5" />
                  <span>Stop</span>
                </button>
              </div>
            ) : confirmingBatch ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2.5">
                <p className="text-xs text-red-900 leading-relaxed">
                  Unsubscribe sequentially from{' '}
                  <span className="font-semibold tabular-nums">{selectedIds.length}</span>{' '}
                  channel{selectedIds.length === 1 ? '' : 's'} with a{' '}
                  <span className="font-mono tabular-nums">
                    {(settings.delayMs / 1000).toFixed(1)}s
                  </span>{' '}
                  delay between actions?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingBatch(false)}
                    className="flex-1 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmingBatch(false);
                      onStartBatch();
                    }}
                    className="flex-1 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                  >
                    Confirm Unsubscribe
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-zinc-600 tabular-nums">
                  <span className="font-semibold text-zinc-900">
                    {selectedIds.length}
                  </span>{' '}
                  selected
                  {channels.length > 0 && selectedIds.length === 0 && (
                    <>
                      <span className="mx-1.5 text-zinc-300" aria-hidden="true">
                        ·
                      </span>
                      <button
                        type="button"
                        onClick={handleSelectAllSubscribed}
                        className="font-medium text-zinc-700 hover:text-zinc-900 underline underline-offset-2"
                      >
                        Select all ({subscribedCount})
                      </button>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  disabled={selectedIds.length === 0 || !tabStatus.isChannelsPage}
                  onClick={() => setConfirmingBatch(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-zinc-300 disabled:text-zinc-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Unsubscribe Selected</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

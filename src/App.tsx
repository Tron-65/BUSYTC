import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { ExtensionPopup } from './components/ExtensionPopup';
import { ExtensionSourceExplorer } from './components/ExtensionSourceExplorer';
import { InstallGuide } from './components/InstallGuide';
import { YouTubeSandbox } from './components/YouTubeSandbox';
import { BatchUnsubscribeEngine } from './extension/batchEngine';
import {
  createInitialProgress,
  createInitialState,
  loadPersistedState,
  mergeUnsubscribeHistory,
  savePersistedState,
} from './extension/storage';
import {
  ExtensionSettings,
  PersistedExtensionState,
  YouTubeTabStatus,
} from './extension/types';
import { youtubeAdapter } from './extension/youtube/youtubeAdapter';

type WorkspaceTab = 'simulator' | 'source' | 'install';

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('simulator');
  const [isChannelsPage, setIsChannelsPage] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [state, setState] = useState<PersistedExtensionState>(createInitialState);

  const sandboxRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<BatchUnsubscribeEngine>(new BatchUnsubscribeEngine());

  useEffect(() => {
    void loadPersistedState().then((loaded) => {
      // Do not resume stale running state across full browser reload in simulator
      const normalizedPhase =
        loaded.progress.phase === 'running' || loaded.progress.phase === 'scanning'
          ? loaded.channels.length > 0
            ? 'ready'
            : 'idle'
          : loaded.progress.phase;

      setState({
        ...loaded,
        progress: {
          ...loaded.progress,
          phase: normalizedPhase,
          currentChannelId: null,
          currentChannelName: null,
        },
      });
    });
  }, []);

  const persist = useCallback((next: PersistedExtensionState) => {
    setState(next);
    void savePersistedState(next);
  }, []);

  const tabStatus: YouTubeTabStatus = {
    connected: true,
    isYouTube: true,
    isChannelsPage,
    url: isChannelsPage
      ? 'https://www.youtube.com/feed/channels'
      : 'https://www.youtube.com/',
    mode: 'sandbox',
  };

  const handleOpenChannelsPage = () => {
    setIsChannelsPage(true);
    setErrorMessage(null);
  };

  const handleScanChannels = async () => {
    if (!isChannelsPage || !sandboxRef.current) {
      setErrorMessage('Navigate to youtube.com/feed/channels before scanning.');
      return;
    }

    setErrorMessage(null);
    const scanningState: PersistedExtensionState = {
      ...state,
      progress: {
        ...createInitialProgress(),
        phase: 'scanning',
      },
    };
    setState(scanningState);

    try {
      const scanned = await youtubeAdapter.scanSubscriptions({
        root: sandboxRef.current,
        scrollContainer: sandboxRef.current,
        autoScroll: state.settings.autoScrollOnScan,
        maxScrollAttempts: 2,
        scrollWaitMs: 280,
      });

      const nextState: PersistedExtensionState = {
        ...state,
        channels: scanned,
        selectedIds: [],
        results: {},
        lastScannedAt: Date.now(),
        progress: {
          ...createInitialProgress(),
          phase: scanned.length > 0 ? 'ready' : 'idle',
        },
      };
      persist(nextState);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to scan sandbox subscriptions.',
      );
      setState((prev) => ({
        ...prev,
        progress: {
          ...createInitialProgress(),
          phase: prev.channels.length > 0 ? 'ready' : 'idle',
        },
      }));
    }
  };

  const handleToggleSelect = (channelId: string) => {
    const exists = state.selectedIds.includes(channelId);
    const nextIds = exists
      ? state.selectedIds.filter((id) => id !== channelId)
      : [...state.selectedIds, channelId];
    persist({ ...state, selectedIds: nextIds });
  };

  const handleSelectIds = (ids: string[]) => {
    persist({ ...state, selectedIds: ids });
  };

  const handleUpdateSettings = (settings: ExtensionSettings) => {
    persist({ ...state, settings });
  };

  const handleStartBatch = async () => {
    if (engineRef.current.isRunning()) return;
    if (!isChannelsPage || !sandboxRef.current) {
      setErrorMessage('Open youtube.com/feed/channels before starting batch removal.');
      return;
    }

    const selectedSet = new Set(state.selectedIds);
    const queue = state.channels.filter((ch) => selectedSet.has(ch.id));
    if (queue.length === 0) return;

    setErrorMessage(null);
    const rootNode = sandboxRef.current;

    await engineRef.current.run(
      queue,
      state.settings,
      (channel) =>
        youtubeAdapter.unsubscribeChannel(channel, {
          root: rootNode,
          dialogTimeoutMs: 1100,
          settleDelayMs: 180,
        }),
      {
        onProgress: (progress, results) => {
          setState((prev) => {
            const updatedChannels = prev.channels.map((ch) => {
              const res = results[ch.id];
              if (res?.status === 'unsubscribed') {
                return { ...ch, isSubscribed: false };
              }
              return ch;
            });

            const nextHistory = mergeUnsubscribeHistory(
              prev.history,
              updatedChannels,
              results,
            );

            const next: PersistedExtensionState = {
              ...prev,
              channels: updatedChannels,
              results: { ...prev.results, ...results },
              history: nextHistory,
              progress,
            };
            void savePersistedState(next);
            return next;
          });
        },
      },
    );
  };

  const handlePauseBatch = () => {
    engineRef.current.pause();
    setState((prev) => ({
      ...prev,
      progress: { ...prev.progress, phase: 'paused' },
    }));
  };

  const handleResumeBatch = () => {
    engineRef.current.resume();
    setState((prev) => ({
      ...prev,
      progress: { ...prev.progress, phase: 'running' },
    }));
  };

  const handleStopBatch = () => {
    engineRef.current.stop();
  };

  const handleResetResults = () => {
    persist({
      ...state,
      results: {},
      selectedIds: [],
      progress: {
        ...createInitialProgress(),
        phase: state.channels.length > 0 ? 'ready' : 'idle',
      },
    });
  };

  const handleClearHistory = () => {
    persist({
      ...state,
      history: [],
    });
  };

  const [downloadingExt, setDownloadingExt] = useState(false);

  const handleDownloadExtension = async () => {
    if (downloadingExt) return;
    setDownloadingExt(true);
    setErrorMessage(null);

    try {
      const response = await fetch('./youtube-batch-unsubscribe-extension.zip', {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const isZipSignature =
        bytes.length > 4 &&
        bytes[0] === 0x50 &&
        bytes[1] === 0x4b &&
        bytes[2] === 0x03 &&
        bytes[3] === 0x04;

      if (!isZipSignature) {
        throw new Error(
          'Downloaded response was not a valid ZIP archive. Run "npm run build:extension" locally to generate dist-extension/.',
        );
      }

      const blob = new Blob([buffer], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'youtube-batch-unsubscribe-extension.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to download extension ZIP archive.',
      );
    } finally {
      setDownloadingExt(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-900">
      {/* Three-Zone Top Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-zinc-200">
        <div className="max-w-[1280px] mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('simulator');
            }}
            className="text-base font-bold tracking-tight text-zinc-900 whitespace-nowrap shrink-0"
          >
            YouTube Batch Unsubscribe
          </a>

          <nav
            aria-label="Workspace sections"
            className="flex items-center gap-6 text-sm font-medium text-zinc-600 overflow-x-auto"
          >
            {(
              [
                { id: 'simulator', label: 'Interactive Simulator' },
                { id: 'source', label: 'Extension Source' },
                { id: 'install', label: 'Load in Chrome' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === item.id
                    ? 'border-red-600 text-zinc-900 font-semibold'
                    : 'border-transparent hover:text-zinc-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              disabled={downloadingExt}
              onClick={() => void handleDownloadExtension()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{downloadingExt ? 'Preparing ZIP...' : 'Download Extension'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1280px] w-full mx-auto px-6 py-8 space-y-6">
        {errorMessage && activeTab !== 'simulator' && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="font-semibold text-red-700 hover:text-red-900 shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-200">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 text-balance">
              {activeTab === 'simulator'
                ? 'Sequential YouTube subscription cleanup, built on Manifest V3'
                : activeTab === 'source'
                  ? 'Modular Manifest V3 architecture with an isolated YouTube adapter'
                  : 'Unpack and run locally in Chrome or Microsoft Edge'}
            </h1>
            <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed">
              {activeTab === 'simulator'
                ? 'Test the real React popup, YouTube DOM adapter, and sequential batch engine side-by-side against a live simulated /feed/channels page.'
                : activeTab === 'source'
                  ? 'Inspect the full extension source tree. All CSS selectors and Polymer fallbacks are centralized inside src/extension/youtube/.'
                  : 'No external servers, Google OAuth, or YouTube Data API keys required. Every action runs inside your own browser session.'}
            </p>
          </div>

          <div className="text-xs text-zinc-500 whitespace-nowrap shrink-0">
            Manifest V3 · React + TypeScript · Local storage only
          </div>
        </div>

        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7">
              <YouTubeSandbox
                sandboxRef={sandboxRef}
                isChannelsPage={isChannelsPage}
                onTogglePage={setIsChannelsPage}
                activeChannelId={state.progress.currentChannelId}
              />
            </div>

            <div className="lg:col-span-5 flex justify-center lg:justify-end">
              <ExtensionPopup
                tabStatus={tabStatus}
                channels={state.channels}
                selectedIds={state.selectedIds}
                results={state.results}
                history={state.history}
                progress={state.progress}
                settings={state.settings}
                errorMessage={errorMessage}
                onDismissError={() => setErrorMessage(null)}
                onOpenChannelsPage={handleOpenChannelsPage}
                onScanChannels={() => void handleScanChannels()}
                onToggleSelect={handleToggleSelect}
                onSelectIds={handleSelectIds}
                onUpdateSettings={handleUpdateSettings}
                onStartBatch={() => void handleStartBatch()}
                onPauseBatch={handlePauseBatch}
                onResumeBatch={handleResumeBatch}
                onStopBatch={handleStopBatch}
                onResetResults={handleResetResults}
                onClearHistory={handleClearHistory}
              />
            </div>
          </div>
        )}

        {activeTab === 'source' && <ExtensionSourceExplorer />}

        {activeTab === 'install' && (
          <InstallGuide onDownloadExtension={handleDownloadExtension} />
        )}
      </main>
    </div>
  );
}

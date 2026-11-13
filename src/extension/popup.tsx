import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ExtensionPopup } from '../components/ExtensionPopup';
import './popup.css';
import {
  createInitialProgress,
  createInitialState,
  savePersistedState,
} from './storage';
import {
  ExtensionMessage,
  ExtensionSettings,
  PersistedExtensionState,
  YouTubeTabStatus,
} from './types';

function PopupApp() {
  const [state, setState] = useState<PersistedExtensionState>(createInitialState);
  const [tabStatus, setTabStatus] = useState<YouTubeTabStatus>({
    connected: false,
    isYouTube: false,
    isChannelsPage: false,
    url: '',
    mode: 'chrome',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshState = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'GET_STATE' } satisfies ExtensionMessage, (res) => {
      if (chrome.runtime.lastError) {
        setErrorMessage(chrome.runtime.lastError.message ?? 'Background connection error');
        return;
      }
      if (res?.ok && res.state) {
        setState(res.state as PersistedExtensionState);
      }
    });

    chrome.runtime.sendMessage(
      { type: 'CHECK_YOUTUBE_TAB' } satisfies ExtensionMessage,
      (status) => {
        if (!chrome.runtime.lastError && status) {
          setTabStatus(status as YouTubeTabStatus);
        }
      },
    );
  }, []);

  useEffect(() => {
    refreshState();

    const listener = (message: ExtensionMessage) => {
      if (message.type === 'STATE_UPDATED') {
        setState(message.state);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [refreshState]);

  const handleOpenChannelsPage = () => {
    chrome.runtime.sendMessage({ type: 'OPEN_CHANNELS_PAGE' } satisfies ExtensionMessage);
  };

  const handleScanChannels = () => {
    setErrorMessage(null);
    chrome.runtime.sendMessage(
      {
        type: 'SCAN_CHANNELS',
        autoScroll: state.settings.autoScrollOnScan,
        maxScrollAttempts: state.settings.maxScrollAttempts,
      } satisfies ExtensionMessage,
      (res) => {
        if (chrome.runtime.lastError) {
          setErrorMessage(chrome.runtime.lastError.message ?? 'Scan failed');
          return;
        }
        if (!res?.ok) {
          setErrorMessage(res?.error ?? 'Unable to scan YouTube subscriptions.');
        } else if (res.state) {
          setState(res.state as PersistedExtensionState);
        }
      },
    );
  };

  const updateSelectedIds = async (nextIds: string[]) => {
    const nextState: PersistedExtensionState = {
      ...state,
      selectedIds: nextIds,
    };
    setState(nextState);
    await savePersistedState(nextState);
  };

  const handleToggleSelect = (channelId: string) => {
    const exists = state.selectedIds.includes(channelId);
    const nextIds = exists
      ? state.selectedIds.filter((id) => id !== channelId)
      : [...state.selectedIds, channelId];
    void updateSelectedIds(nextIds);
  };

  const handleUpdateSettings = (settings: ExtensionSettings) => {
    setState((prev) => ({ ...prev, settings }));
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings,
    } satisfies ExtensionMessage);
  };

  const handleStartBatch = () => {
    setErrorMessage(null);
    chrome.runtime.sendMessage(
      {
        type: 'START_BATCH',
        channelIds: state.selectedIds,
        settings: state.settings,
      } satisfies ExtensionMessage,
      (res) => {
        if (chrome.runtime.lastError) {
          setErrorMessage(chrome.runtime.lastError.message ?? 'Failed to start batch');
          return;
        }
        if (!res?.ok) {
          setErrorMessage(res?.error ?? 'Unable to start batch unsubscribe.');
        }
      },
    );
  };

  const handlePauseBatch = () => {
    chrome.runtime.sendMessage({ type: 'PAUSE_BATCH' } satisfies ExtensionMessage);
  };

  const handleResumeBatch = () => {
    chrome.runtime.sendMessage({ type: 'RESUME_BATCH' } satisfies ExtensionMessage);
  };

  const handleStopBatch = () => {
    chrome.runtime.sendMessage({ type: 'STOP_BATCH' } satisfies ExtensionMessage);
  };

  const handleResetResults = async () => {
    const nextState: PersistedExtensionState = {
      ...state,
      results: {},
      selectedIds: [],
      progress: {
        ...createInitialProgress(),
        phase: state.channels.length > 0 ? 'ready' : 'idle',
      },
    };
    setState(nextState);
    await savePersistedState(nextState);
  };

  return (
    <ExtensionPopup
      isPopupWindow
      tabStatus={tabStatus}
      channels={state.channels}
      selectedIds={state.selectedIds}
      results={state.results}
      progress={state.progress}
      settings={state.settings}
      errorMessage={errorMessage}
      onDismissError={() => setErrorMessage(null)}
      onOpenChannelsPage={handleOpenChannelsPage}
      onScanChannels={handleScanChannels}
      onToggleSelect={handleToggleSelect}
      onSelectIds={(ids) => void updateSelectedIds(ids)}
      onUpdateSettings={handleUpdateSettings}
      onStartBatch={handleStartBatch}
      onPauseBatch={handlePauseBatch}
      onResumeBatch={handleResumeBatch}
      onStopBatch={handleStopBatch}
      onResetResults={() => void handleResetResults()}
    />
  );
}

const rootEl = document.getElementById('popup-root');
if (rootEl) {
  createRoot(rootEl).render(<PopupApp />);
}

import React, { useState } from 'react';
import { Check, Copy, FileCode2, FolderTree } from 'lucide-react';

import manifestRaw from '../extension/manifest.json?raw';
import popupHtmlRaw from '../extension/popup.html?raw';
import popupTsxRaw from '../extension/popup.tsx?raw';
import backgroundRaw from '../extension/background.ts?raw';
import contentScriptRaw from '../extension/contentScript.ts?raw';
import batchEngineRaw from '../extension/batchEngine.ts?raw';
import storageRaw from '../extension/storage.ts?raw';
import typesRaw from '../extension/types.ts?raw';
import selectorsRaw from '../extension/youtube/selectors.ts?raw';
import channelParserRaw from '../extension/youtube/channelParser.ts?raw';
import subscriptionScannerRaw from '../extension/youtube/subscriptionScanner.ts?raw';
import unsubscribeActionRaw from '../extension/youtube/unsubscribeAction.ts?raw';
import youtubeAdapterRaw from '../extension/youtube/youtubeAdapter.ts?raw';

interface SourceEntry {
  path: string;
  role: string;
  content: string;
}

const SOURCE_FILES: SourceEntry[] = [
  {
    path: 'manifest.json',
    role: 'Manifest V3 permissions, service worker, popup, and youtube.com content script registration',
    content: manifestRaw,
  },
  {
    path: 'background.ts',
    role: 'MV3 Service Worker coordinating sequential queue execution and storage persistence',
    content: backgroundRaw,
  },
  {
    path: 'contentScript.ts',
    role: 'Runs on youtube.com/* and bridges extension messages to the YouTube adapter layer',
    content: contentScriptRaw,
  },
  {
    path: 'batchEngine.ts',
    role: 'Sequential queue processor with configurable delay, jitter, pause, resume, and stop',
    content: batchEngineRaw,
  },
  {
    path: 'youtube/youtubeAdapter.ts',
    role: 'Adapter facade unifying scanning, unsubscribing, and page detection',
    content: youtubeAdapterRaw,
  },
  {
    path: 'youtube/selectors.ts',
    role: 'Centralized YouTube Polymer/Lit CSS selector fallbacks and ARIA label matchers',
    content: selectorsRaw,
  },
  {
    path: 'youtube/channelParser.ts',
    role: 'Parses channel name, @handle, subscriber count, URL, and current subscription state',
    content: channelParserRaw,
  },
  {
    path: 'youtube/subscriptionScanner.ts',
    role: 'Auto-scrolls /feed/channels, triggers lazy loading, and deduplicates channels',
    content: subscriptionScannerRaw,
  },
  {
    path: 'youtube/unsubscribeAction.ts',
    role: 'Clicks Subscribed button, handles optional bell menu, confirms dialog, and verifies state',
    content: unsubscribeActionRaw,
  },
  {
    path: 'storage.ts',
    role: 'Persists settings, scanned channels, and batch progress in chrome.storage.local',
    content: storageRaw,
  },
  {
    path: 'types.ts',
    role: 'Shared TypeScript interfaces and message contracts',
    content: typesRaw,
  },
  {
    path: 'popup.tsx',
    role: 'React entry point for the 420px browser action popup',
    content: popupTsxRaw,
  },
  {
    path: 'popup.html',
    role: 'Popup HTML shell loading compiled popup.js and popup.css',
    content: popupHtmlRaw,
  },
];

export const ExtensionSourceExplorer: React.FC = () => {
  const [selectedPath, setSelectedPath] = useState<string>('youtube/selectors.ts');
  const [copied, setCopied] = useState(false);

  const activeFile =
    SOURCE_FILES.find((f) => f.path === selectedPath) ?? SOURCE_FILES[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked in some embedded contexts
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 border border-zinc-200 rounded-xl bg-white overflow-hidden min-h-[640px]">
      {/* File Tree Sidebar */}
      <aside className="lg:col-span-4 xl:col-span-3 border-b lg:border-b-0 lg:border-r border-zinc-200 bg-zinc-50/70 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 pb-3 border-b border-zinc-200">
          <FolderTree className="h-4 w-4 text-zinc-600" />
          <span>src/extension/</span>
        </div>

        <nav className="mt-3 space-y-0.5" aria-label="Extension source files">
          {SOURCE_FILES.map((file) => {
            const isActive = file.path === activeFile.path;
            return (
              <button
                key={file.path}
                type="button"
                onClick={() => setSelectedPath(file.path)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs font-mono rounded-md transition-colors ${
                  isActive
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-700 hover:bg-zinc-200/70 hover:text-zinc-900'
                }`}
              >
                <FileCode2 className="h-3.5 w-3.5 shrink-0 opacity-75" />
                <span className="truncate">{file.path}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Code Viewer Pane */}
      <div className="lg:col-span-8 xl:col-span-9 flex flex-col min-w-0">
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-zinc-200 bg-white">
          <div className="min-w-0">
            <h3 className="text-sm font-mono font-semibold text-zinc-900 truncate">
              src/extension/{activeFile.path}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5 truncate">
              {activeFile.role}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-700" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy file</span>
              </>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-zinc-950 text-zinc-100 p-5">
          <pre className="text-xs font-mono leading-relaxed whitespace-pre">
            <code>{activeFile.content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};

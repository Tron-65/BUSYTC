import React from 'react';
import { Download, Lock, ShieldCheck, Terminal } from 'lucide-react';

interface InstallGuideProps {
  onDownloadExtension: () => void;
}

export const InstallGuide: React.FC<InstallGuideProps> = ({
  onDownloadExtension,
}) => {
  return (
    <div className="space-y-8">
      {/* Architecture & Privacy Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="flex items-center gap-2.5 text-zinc-900 font-semibold text-sm">
            <Lock className="h-4 w-4 text-zinc-700" />
            <span>No Passwords or API Keys</span>
          </div>
          <p className="mt-2 text-xs text-zinc-600 leading-relaxed">
            Operates directly inside your already-authenticated YouTube browser
            session on <span className="font-mono">youtube.com/feed/channels</span>.
            No OAuth tokens, YouTube Data API keys, or Google credentials required.
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="flex items-center gap-2.5 text-zinc-900 font-semibold text-sm">
            <ShieldCheck className="h-4 w-4 text-zinc-700" />
            <span>Local-Only Storage</span>
          </div>
          <p className="mt-2 text-xs text-zinc-600 leading-relaxed">
            Settings, scanned channel lists, and batch execution progress stay
            strictly inside <span className="font-mono">chrome.storage.local</span>{' '}
            with zero external servers or analytics endpoints.
          </p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <div className="flex items-center gap-2.5 text-zinc-900 font-semibold text-sm">
            <Terminal className="h-4 w-4 text-zinc-700" />
            <span>Isolated YouTube Adapter</span>
          </div>
          <p className="mt-2 text-xs text-zinc-600 leading-relaxed">
            All Polymer and Lit DOM selectors live inside{' '}
            <span className="font-mono">youtube/selectors.ts</span> so future
            YouTube layout updates can be patched in one place.
          </p>
        </div>
      </div>

      {/* Step-by-Step Load Unpacked Instructions */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Load Unpacked in Chrome or Microsoft Edge
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Download the compiled Manifest V3 bundle or build directly from source.
            </p>
          </div>
          <button
            type="button"
            onClick={onDownloadExtension}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Extension (.zip)</span>
          </button>
        </div>

        <ol className="space-y-5 text-sm text-zinc-700">
          <li className="flex gap-4">
            <span className="font-mono text-xs font-semibold text-zinc-900 bg-zinc-100 border border-zinc-200 h-6 w-6 rounded flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
              1
            </span>
            <div className="space-y-1">
              <p className="font-semibold text-zinc-900 text-sm">
                Download and unzip the extension package
              </p>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Click <strong>Download Extension (.zip)</strong> above and extract
                it to a folder (for example{' '}
                <span className="font-mono">youtube-batch-unsubscribe/</span>), or
                run <span className="font-mono">npm run build:extension</span>{' '}
                from the project root to generate <span className="font-mono">dist-extension/</span>.
              </p>
            </div>
          </li>

          <li className="flex gap-4">
            <span className="font-mono text-xs font-semibold text-zinc-900 bg-zinc-100 border border-zinc-200 h-6 w-6 rounded flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
              2
            </span>
            <div className="space-y-1">
              <p className="font-semibold text-zinc-900 text-sm">
                Open your browser extensions page
              </p>
              <p className="text-xs text-zinc-600 leading-relaxed">
                In Google Chrome navigate to{' '}
                <span className="font-mono text-zinc-900">chrome://extensions</span>,
                or in Microsoft Edge navigate to{' '}
                <span className="font-mono text-zinc-900">edge://extensions</span>.
                Toggle <strong>Developer mode</strong> on in the corner.
              </p>
            </div>
          </li>

          <li className="flex gap-4">
            <span className="font-mono text-xs font-semibold text-zinc-900 bg-zinc-100 border border-zinc-200 h-6 w-6 rounded flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
              3
            </span>
            <div className="space-y-1">
              <p className="font-semibold text-zinc-900 text-sm">
                Click &ldquo;Load unpacked&rdquo; and select the folder
              </p>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Choose the extracted folder containing{' '}
                <span className="font-mono">manifest.json</span>,{' '}
                <span className="font-mono">background.js</span>,{' '}
                <span className="font-mono">contentScript.js</span>, and{' '}
                <span className="font-mono">popup.html</span>. Pin the extension
                icon to your toolbar.
              </p>
            </div>
          </li>

          <li className="flex gap-4">
            <span className="font-mono text-xs font-semibold text-zinc-900 bg-zinc-100 border border-zinc-200 h-6 w-6 rounded flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
              4
            </span>
            <div className="space-y-1">
              <p className="font-semibold text-zinc-900 text-sm">
                Open YouTube Subscriptions and run a batch
              </p>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Visit{' '}
                <span className="font-mono text-zinc-900">
                  https://www.youtube.com/feed/channels
                </span>
                , open the extension popup, click <strong>Scan Subscriptions</strong>,
                filter or select channels, set a safe delay (recommended 1.2s–2.5s),
                and click <strong>Unsubscribe Selected</strong>.
              </p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
};

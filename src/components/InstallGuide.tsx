import React from 'react';
import { Download, GitBranch, Globe, Lock, ShieldCheck, Terminal } from 'lucide-react';

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
            Settings, scanned channel lists, and unsubscribe history stay strictly
            inside <span className="font-mono">chrome.storage.local</span> with zero
            external servers or analytics endpoints.
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
              Load Unpacked in Chrome, Brave, or Edge ($0)
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              ChannelSweep for YouTube v1.0.0 — install directly from ZIP or build from source.
            </p>
          </div>
          <button
            type="button"
            onClick={onDownloadExtension}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download v1.0.0 ZIP</span>
          </button>
        </div>

        <ol className="space-y-5 text-sm text-zinc-700">
          <li className="flex gap-4">
            <span className="font-mono text-xs font-semibold text-zinc-900 bg-zinc-100 border border-zinc-200 h-6 w-6 rounded flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
              1
            </span>
            <div className="space-y-1">
              <p className="font-semibold text-zinc-900 text-sm">
                Download and unzip ChannelSweep for YouTube
              </p>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Click <strong>Download v1.0.0 ZIP</strong> above and extract it to a
                permanent folder (for example{' '}
                <span className="font-mono">channelsweep-for-youtube/</span>), or run{' '}
                <span className="font-mono">npm run build:extension</span> from the
                project root to generate <span className="font-mono">dist-extension/</span>.
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
                Navigate to{' '}
                <span className="font-mono text-zinc-900">chrome://extensions</span>{' '}
                (Chrome / Brave / Arc / Vivaldi) or{' '}
                <span className="font-mono text-zinc-900">edge://extensions</span>{' '}
                (Microsoft Edge), and enable <strong>Developer mode</strong>.
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
                <span className="font-mono">popup.html</span>. Pin ChannelSweep to
                your browser toolbar.
              </p>
            </div>
          </li>
        </ol>
      </div>

      {/* Free ($0) Public Store & GitHub Publishing Guide */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-5">
        <div className="pb-4 border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-900">
            Free Ways to Publish &amp; Share (Without Paying $5)
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Google charges a $5 developer registration fee for the Chrome Web Store,
            but these official distribution channels are 100% free.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-zinc-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Globe className="h-4 w-4 text-zinc-700" />
              <span>1. Microsoft Edge Add-ons Store ($0 Fee)</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Microsoft Partner Center does not charge any registration fee. Upload{' '}
              <span className="font-mono">channelsweep-for-youtube-v1.0.0.zip</span>{' '}
              directly—Edge runs the exact same Chromium Manifest V3 bundle with zero
              code changes, and gives you a public store URL to share.
            </p>
          </div>

          <div className="border border-zinc-200 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <GitBranch className="h-4 w-4 text-zinc-700" />
              <span>2. GitHub Releases + Automated Workflow ($0)</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Push the project to GitHub and run{' '}
              <span className="font-mono text-zinc-900">
                git tag v1.0.0 &amp;&amp; git push origin v1.0.0
              </span>
              . The included{' '}
              <span className="font-mono">.github/workflows/release-extension.yml</span>{' '}
              workflow automatically builds and attaches the release ZIP for anyone to
              download and load unpacked.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Download,
  GitBranch,
  Globe,
  ShieldCheck,
} from 'lucide-react';
import icon128Url from '../extension/icons/icon128.png';

interface LandingPageProps {
  downloadingExt: boolean;
  onDownloadExtension: () => void;
  onOpenSimulator: () => void;
  onOpenSource: () => void;
  onOpenInstall: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  downloadingExt,
  onDownloadExtension,
  onOpenSimulator,
  onOpenSource,
  onOpenInstall,
}) => {
  const [iconFailed, setIconFailed] = useState(false);

  return (
    <div className="space-y-14 pb-8">
      {/* Hero Proposition Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch pt-2">
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="text-xs font-medium text-zinc-500">
            Manifest V3 Extension · Version 1.0.0 · MIT Open Source
          </div>

          <h1 className="mt-3 text-[clamp(2.25rem,4vw,3.35rem)] font-bold tracking-tight text-zinc-950 leading-[1.08] text-balance">
            Clean up hundreds of YouTube subscriptions in one calm pass.
          </h1>

          <p className="mt-4 text-base text-zinc-600 leading-relaxed max-w-xl">
            ChannelSweep for YouTube scans your Subscriptions page inside your
            active browser session, lets you bulk-filter by subscriber size or
            keywords, and unsubscribes sequentially with configurable rate-limit
            delays.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <button
              type="button"
              disabled={downloadingExt}
              onClick={onDownloadExtension}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="h-4 w-4" />
              <span>
                {downloadingExt ? 'Preparing v1.0.0 ZIP...' : 'Download v1.0.0 ZIP'}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenSimulator}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-zinc-800 hover:text-zinc-950 underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              <span>Try Interactive Simulator</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-zinc-200 grid grid-cols-3 gap-6 max-w-lg">
            <div>
              <div className="text-lg font-bold text-zinc-900 font-mono tabular-nums">
                0
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                API keys or passwords
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-zinc-900 font-mono tabular-nums">
                0.3–5.0s
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Configurable pacing
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-zinc-900 font-mono tabular-nums">
                100%
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Local browser storage
              </div>
            </div>
          </div>
        </div>

        {/* Visual Mechanism Showcase */}
        <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl p-6 flex flex-col justify-between">
          <div className="flex items-center gap-4 pb-5 border-b border-zinc-100">
            {iconFailed ? (
              <div className="h-14 w-14 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                CS
              </div>
            ) : (
              <img
                src={icon128Url}
                alt="ChannelSweep for YouTube extension icon"
                referrerPolicy="no-referrer"
                onError={() => setIconFailed(true)}
                className="h-14 w-14 rounded-xl object-contain shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="text-base font-bold text-zinc-900 truncate">
                ChannelSweep for YouTube
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Chrome &amp; Microsoft Edge · Manifest V3 · v1.0.0
              </div>
            </div>
          </div>

          <ol className="my-5 space-y-4">
            <li className="flex items-start gap-3">
              <span className="font-mono text-xs font-semibold text-zinc-900 bg-zinc-100 border border-zinc-200 h-6 w-6 rounded flex items-center justify-center shrink-0 tabular-nums">
                1
              </span>
              <div>
                <div className="text-xs font-semibold text-zinc-900">
                  Scan youtube.com/feed/channels
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                  Auto-scrolls and parses every subscribed channel directly from
                  your authenticated DOM.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-mono text-xs font-semibold text-zinc-900 bg-zinc-100 border border-zinc-200 h-6 w-6 rounded flex items-center justify-center shrink-0 tabular-nums">
                2
              </span>
              <div>
                <div className="text-xs font-semibold text-zinc-900">
                  Filter by size, keywords, or sort order
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                  Target channels under 100K, match comma-separated names, and
                  bulk-select with one click.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-mono text-xs font-semibold text-zinc-900 bg-zinc-100 border border-zinc-200 h-6 w-6 rounded flex items-center justify-center shrink-0 tabular-nums">
                3
              </span>
              <div>
                <div className="text-xs font-semibold text-zinc-900">
                  Sequential removal with D3 history tracking
                </div>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                  Watch real-time progress, pause or resume anytime, and review
                  timestamped history in D3 charts.
                </p>
              </div>
            </li>
          </ol>

          <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1.5 text-zinc-700 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
              <span>Ready for GitHub &amp; Edge Store</span>
            </span>
            <button
              type="button"
              onClick={onOpenSource}
              className="font-medium text-zinc-700 hover:text-zinc-950 underline underline-offset-2"
            >
              Inspect source
            </button>
          </div>
        </div>
      </section>

      {/* Asymmetric Capabilities Bento */}
      <section className="space-y-5">
        <div className="flex items-baseline justify-between border-b border-zinc-200 pb-3">
          <h2 className="text-lg font-bold tracking-tight text-zinc-900">
            Built for predictable bulk cleanup
          </h2>
          <span className="text-xs text-zinc-500">Four core subsystems</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 bg-white border border-zinc-200 rounded-xl p-6">
            <div className="text-xs font-mono text-zinc-500">01. Isolated Adapter Layer</div>
            <h3 className="mt-1.5 text-base font-semibold text-zinc-900">
              Resilient YouTube DOM automation without credentials
            </h3>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed max-w-2xl">
              Instead of requesting broad Google OAuth scopes or hitting YouTube Data
              API quota limits, ChannelSweep isolates all Polymer and Lit selectors inside{' '}
              <span className="font-mono text-xs text-zinc-800">
                src/extension/youtube/selectors.ts
              </span>
              . When YouTube tweaks a button or confirmation dialog, only one file needs
              updating.
            </p>
          </div>

          <div className="md:col-span-1 bg-white border border-zinc-200 rounded-xl p-6">
            <div className="text-xs font-mono text-zinc-500">02. Bulk Filtering</div>
            <h3 className="mt-1.5 text-base font-semibold text-zinc-900">
              Slice large subscription lists fast
            </h3>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
              Combine comma-separated search queries with subscriber-tier filters
              (&lt;100K, 100K–1M, 1M+) and sorting before clicking Select shown or
              Invert.
            </p>
          </div>

          <div className="md:col-span-1 bg-white border border-zinc-200 rounded-xl p-6">
            <div className="text-xs font-mono text-zinc-500">03. Sequential Queue</div>
            <h3 className="mt-1.5 text-base font-semibold text-zinc-900">
              Pause, resume, and rate-limit
            </h3>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
              Runs strictly one channel at a time in the background service worker
              with a 0.3s–5.0s configurable delay, random jitter, and live segmented
              progress.
            </p>
          </div>

          <div className="md:col-span-2 bg-white border border-zinc-200 rounded-xl p-6">
            <div className="text-xs font-mono text-zinc-500">04. Persistent History</div>
            <h3 className="mt-1.5 text-base font-semibold text-zinc-900">
              D3 timeline chart and timestamped CSV audit log
            </h3>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed max-w-2xl">
              Every removed channel is recorded locally in{' '}
              <span className="font-mono text-xs text-zinc-800">
                chrome.storage.local
              </span>{' '}
              with its handle and timestamp. Switch to the History tab anytime to view
              cumulative or interval D3 charts and export your cleanup log as CSV.
            </p>
          </div>
        </div>
      </section>

      {/* Zero-Cost Publishing Channels */}
      <section className="bg-white border border-zinc-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-zinc-900">
              Publish and share completely free ($0)
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Skip Google&apos;s $5 Chrome Web Store fee using official zero-cost
              distribution options.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenInstall}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <span>Open Publishing Guide</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Globe className="h-4 w-4 text-zinc-700" />
              <span>Microsoft Edge Add-ons ($0)</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Microsoft Partner Center has zero registration fee. Upload the exact
              same Manifest V3 ZIP to get an official store listing with automatic
              updates.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <GitBranch className="h-4 w-4 text-zinc-700" />
              <span>GitHub Releases + Pages ($0)</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Push tag <span className="font-mono text-zinc-900">v1.0.0</span> to
              trigger the included GitHub Actions release workflow, then share the
              ZIP download for Load Unpacked in Chrome.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <ShieldCheck className="h-4 w-4 text-zinc-700" />
              <span>Mozilla AMO ($0)</span>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Mozilla&apos;s Firefox Add-ons store is also completely free if you add
              a <span className="font-mono text-zinc-900">gecko</span> manifest
              target alongside Chrome/Edge.
            </p>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="pt-6 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
        <div>
          <span className="font-semibold text-zinc-800">
            ChannelSweep for YouTube
          </span>{' '}
          · v1.0.0 · MIT License
        </div>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={onOpenSimulator}
            className="hover:text-zinc-900 transition-colors"
          >
            Interactive Simulator
          </button>
          <button
            type="button"
            onClick={onOpenSource}
            className="hover:text-zinc-900 transition-colors"
          >
            Source Tree
          </button>
          <button
            type="button"
            onClick={onOpenInstall}
            className="hover:text-zinc-900 transition-colors"
          >
            Free Install &amp; Publish
          </button>
        </div>
      </footer>
    </div>
  );
};

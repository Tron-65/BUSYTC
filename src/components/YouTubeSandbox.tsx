import React, { useState } from 'react';
import { Bell, Check, RotateCcw } from 'lucide-react';

export interface SandboxChannelSeed {
  id: string;
  name: string;
  handle: string;
  subscriberText: string;
  initiallySubscribed: boolean;
  simulateDialogFailure?: boolean;
}

export const DEFAULT_SANDBOX_CHANNELS: SandboxChannelSeed[] = [
  { id: '@veritasium', name: 'Veritasium', handle: '@veritasium', subscriberText: '16.4M subscribers', initiallySubscribed: true },
  { id: '@fireship', name: 'Fireship', handle: '@fireship', subscriberText: '3.4M subscribers', initiallySubscribed: true },
  { id: '@3blue1brown', name: '3Blue1Brown', handle: '@3blue1brown', subscriberText: '6.8M subscribers', initiallySubscribed: true },
  { id: '@mkbhd', name: 'Marques Brownlee', handle: '@mkbhd', subscriberText: '19.7M subscribers', initiallySubscribed: true },
  { id: '@kurzgesagt', name: 'Kurzgesagt – In a Nutshell', handle: '@kurzgesagt', subscriberText: '23.1M subscribers', initiallySubscribed: true },
  { id: '@theo', name: 'Theo - t3.gg', handle: '@t3dotgg', subscriberText: '390K subscribers', initiallySubscribed: true },
  { id: '@smartereveryday', name: 'SmarterEveryDay', handle: '@smartereveryday', subscriberText: '11.6M subscribers', initiallySubscribed: true },
  { id: '@numberphile', name: 'Numberphile', handle: '@numberphile', subscriberText: '4.6M subscribers', initiallySubscribed: true },
  { id: '@computerphile', name: 'Computerphile', handle: '@computerphile', subscriberText: '2.5M subscribers', initiallySubscribed: true },
  { id: '@linustechtips', name: 'Linus Tech Tips', handle: '@LinusTechTips', subscriberText: '16.1M subscribers', initiallySubscribed: true },
  { id: '@markrober', name: 'Mark Rober', handle: '@MarkRober', subscriberText: '59.2M subscribers', initiallySubscribed: true },
  { id: '@two-minute-papers', name: 'Two Minute Papers', handle: '@TwoMinutePapers', subscriberText: '1.6M subscribers', initiallySubscribed: true },
  { id: '@nilered', name: 'NileRed', handle: '@NileRed', subscriberText: '7.4M subscribers', initiallySubscribed: true },
  { id: '@technologyconnections', name: 'Technology Connections', handle: '@TechnologyConnections', subscriberText: '2.7M subscribers', initiallySubscribed: true },
  { id: '@wendoverproductions', name: 'Wendover Productions', handle: '@Wendoverproductions', subscriberText: '4.7M subscribers', initiallySubscribed: true },
  { id: '@cgpgrey', name: 'CGP Grey', handle: '@CGPGrey', subscriberText: '6.5M subscribers', initiallySubscribed: false },
  { id: '@broken-dialog-demo', name: 'Legacy Archived Channel', handle: '@legacyarchive', subscriberText: '82K subscribers', initiallySubscribed: true, simulateDialogFailure: true },
  { id: '@vox', name: 'Vox', handle: '@Vox', subscriberText: '12.3M subscribers', initiallySubscribed: true },
];

interface YouTubeSandboxProps {
  sandboxRef: React.RefObject<HTMLDivElement | null>;
  isChannelsPage: boolean;
  onTogglePage: (isChannelsPage: boolean) => void;
  activeChannelId: string | null;
}

export const YouTubeSandbox: React.FC<YouTubeSandboxProps> = ({
  sandboxRef,
  isChannelsPage,
  onTogglePage,
  activeChannelId,
}) => {
  const [subscribedMap, setSubscribedMap] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    DEFAULT_SANDBOX_CHANNELS.forEach((ch) => {
      initial[ch.id] = ch.initiallySubscribed;
    });
    return initial;
  });

  const [pendingConfirmChannel, setPendingConfirmChannel] =
    useState<SandboxChannelSeed | null>(null);

  const handleResetSandbox = () => {
    const reset: Record<string, boolean> = {};
    DEFAULT_SANDBOX_CHANNELS.forEach((ch) => {
      reset[ch.id] = ch.initiallySubscribed;
    });
    setSubscribedMap(reset);
    setPendingConfirmChannel(null);
  };

  const handleChannelButtonClick = (channel: SandboxChannelSeed) => {
    const isSub = subscribedMap[channel.id];
    if (!isSub) {
      setSubscribedMap((prev) => ({ ...prev, [channel.id]: true }));
      return;
    }

    if (channel.simulateDialogFailure) {
      // Intentionally omit opening confirmation dialog to exercise Failed state handling
      return;
    }

    setPendingConfirmChannel(channel);
  };

  const handleConfirmUnsubscribe = () => {
    if (!pendingConfirmChannel) return;
    const id = pendingConfirmChannel.id;
    setSubscribedMap((prev) => ({ ...prev, [id]: false }));
    setPendingConfirmChannel(null);
  };

  const remainingSubscribed = Object.values(subscribedMap).filter(Boolean).length;

  return (
    <div className="flex flex-col bg-white border border-zinc-200 rounded-xl overflow-hidden h-[640px]">
      {/* Simulated Browser Chrome Bar */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-zinc-50 border-b border-zinc-200 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-zinc-200 rounded-md text-xs font-mono text-zinc-700 truncate flex-1 max-w-[360px]">
            <span className="text-zinc-400">https://www.</span>
            <span className="text-zinc-900 font-medium">
              {isChannelsPage ? 'youtube.com/feed/channels' : 'youtube.com/'}
            </span>
          </div>
          <div className="flex items-center gap-1 p-0.5 bg-zinc-200/70 rounded-md shrink-0">
            <button
              type="button"
              onClick={() => onTogglePage(true)}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                isChannelsPage
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              /feed/channels
            </button>
            <button
              type="button"
              onClick={() => onTogglePage(false)}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                !isChannelsPage
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Home
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetSandbox}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Demo</span>
        </button>
      </div>

      {/* Simulated YouTube Page Content */}
      <div ref={sandboxRef} className="relative flex-1 overflow-y-auto bg-white">
        {!isChannelsPage ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm font-semibold text-zinc-900">
              YouTube Home Feed (Simulated)
            </p>
            <p className="mt-1.5 text-xs text-zinc-500 max-w-sm leading-relaxed">
              The extension detects that this tab is not on{' '}
              <span className="font-mono text-zinc-700">/feed/channels</span>. Click
              &ldquo;Open youtube.com/feed/channels&rdquo; inside the popup to
              navigate here automatically.
            </p>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-baseline justify-between pb-3 mb-3 border-b border-zinc-200">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">
                  All subscriptions
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
                  {remainingSubscribed} active · includes 1 pre-unsubscribed channel and 1 timeout edge case
                </p>
              </div>
            </div>

            <div className="divide-y divide-zinc-100">
              {DEFAULT_SANDBOX_CHANNELS.map((ch) => {
                const isSub = subscribedMap[ch.id];
                const isTargeted = activeChannelId === ch.id;

                return (
                  <div
                    key={ch.id}
                    data-ytbu-channel="true"
                    className={`flex items-center justify-between gap-4 py-3 px-2 rounded-lg transition-colors ${
                      isTargeted ? 'bg-red-50/70' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-semibold text-zinc-700 shrink-0">
                        {ch.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <a
                          href={`https://www.youtube.com/${ch.handle}`}
                          onClick={(e) => e.preventDefault()}
                          className="block text-sm font-semibold text-zinc-900 truncate"
                          data-ytbu-name="true"
                        >
                          {ch.name}
                        </a>
                        <div className="text-xs text-zinc-500 truncate">
                          <span data-ytbu-handle="true">{ch.handle}</span>
                          <span className="mx-1.5 text-zinc-300" aria-hidden="true">
                            ·
                          </span>
                          <span data-ytbu-subs="true">{ch.subscriberText}</span>
                        </div>
                      </div>
                    </div>

                    <div data-ytbu-sub-btn-wrap="true" className="shrink-0">
                      <button
                        type="button"
                        data-ytbu-sub-btn="true"
                        data-subscribed={isSub ? 'true' : 'false'}
                        aria-label={
                          isSub
                            ? `Unsubscribe from ${ch.name}`
                            : `Subscribe to ${ch.name}`
                        }
                        onClick={() => handleChannelButtonClick(ch)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                          isSub
                            ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                            : 'bg-zinc-900 text-white hover:bg-zinc-800'
                        }`}
                      >
                        {isSub ? (
                          <>
                            <Bell className="h-3.5 w-3.5 text-zinc-700" />
                            <span>Subscribed</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Subscribe</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Realistic YouTube Confirmation Modal driven by DOM clicks */}
        {pendingConfirmChannel && (
          <div
            className="sticky bottom-4 mx-auto max-w-sm bg-white border border-zinc-300 rounded-xl shadow-lg p-4 z-20"
            data-ytbu-confirm-dialog="true"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm unsubscribe"
          >
            <p className="text-sm font-semibold text-zinc-900">
              Unsubscribe from {pendingConfirmChannel.name}?
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Simulated YouTube confirmation dialog triggered by the DOM adapter.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                data-ytbu-cancel-btn="true"
                onClick={() => setPendingConfirmChannel(null)}
                className="px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                data-ytbu-confirm-btn="true"
                onClick={handleConfirmUnsubscribe}
                className="px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-md"
              >
                Unsubscribe
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

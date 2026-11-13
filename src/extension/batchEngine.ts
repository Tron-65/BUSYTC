import {
  BatchProgress,
  ChannelRecord,
  ChannelResult,
  ExtensionSettings,
} from './types';

export interface BatchEngineCallbacks {
  onChannelStart?: (channel: ChannelRecord, index: number, total: number) => void;
  onChannelComplete?: (result: ChannelResult) => void;
  onProgress?: (progress: BatchProgress, results: Record<string, ChannelResult>) => void;
  onFinish?: (progress: BatchProgress, results: Record<string, ChannelResult>) => void;
}

export class BatchUnsubscribeEngine {
  private paused = false;
  private stopped = false;
  private running = false;
  private resumeResolvers: Array<() => void> = [];
  private sleepAbortController: AbortController | null = null;

  public isRunning(): boolean {
    return this.running;
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
  }

  public resume(): void {
    if (!this.running || !this.paused) return;
    this.paused = false;
    const resolvers = this.resumeResolvers.splice(0, this.resumeResolvers.length);
    resolvers.forEach((resolve) => resolve());
  }

  public stop(): void {
    if (!this.running) return;
    this.stopped = true;
    this.paused = false;
    this.sleepAbortController?.abort();
    const resolvers = this.resumeResolvers.splice(0, this.resumeResolvers.length);
    resolvers.forEach((resolve) => resolve());
  }

  private waitIfPaused(): Promise<void> {
    if (!this.paused) return Promise.resolve();
    return new Promise((resolve) => {
      this.resumeResolvers.push(resolve);
    });
  }

  private waitWithDelay(ms: number): Promise<void> {
    if (ms <= 0 || this.stopped) return Promise.resolve();
    this.sleepAbortController = new AbortController();
    const { signal } = this.sleepAbortController;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);

      const onAbort = () => {
        clearTimeout(timer);
        resolve();
      };

      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  public async run(
    queue: ChannelRecord[],
    settings: ExtensionSettings,
    executor: (channel: ChannelRecord) => Promise<ChannelResult>,
    callbacks: BatchEngineCallbacks = {},
  ): Promise<{ progress: BatchProgress; results: Record<string, ChannelResult> }> {
    this.running = true;
    this.paused = false;
    this.stopped = false;
    this.resumeResolvers = [];

    const results: Record<string, ChannelResult> = {};
    for (const ch of queue) {
      results[ch.id] = {
        channelId: ch.id,
        channelName: ch.name,
        status: 'queued',
        timestamp: Date.now(),
      };
    }

    const progress: BatchProgress = {
      phase: 'running',
      total: queue.length,
      processed: 0,
      unsubscribed: 0,
      failed: 0,
      skipped: 0,
      currentChannelId: null,
      currentChannelName: null,
      startedAt: Date.now(),
      finishedAt: null,
    };

    callbacks.onProgress?.({ ...progress }, { ...results });

    for (let i = 0; i < queue.length; i++) {
      if (this.stopped) break;

      if (this.paused) {
        progress.phase = 'paused';
        callbacks.onProgress?.({ ...progress }, { ...results });
        await this.waitIfPaused();
        if (this.stopped) break;
        progress.phase = 'running';
        callbacks.onProgress?.({ ...progress }, { ...results });
      }

      const channel = queue[i];
      progress.currentChannelId = channel.id;
      progress.currentChannelName = channel.name;
      results[channel.id] = {
        channelId: channel.id,
        channelName: channel.name,
        status: 'processing',
        timestamp: Date.now(),
      };

      callbacks.onChannelStart?.(channel, i, queue.length);
      callbacks.onProgress?.({ ...progress }, { ...results });

      let outcome: ChannelResult;

      if (settings.skipAlreadyUnsubscribed && !channel.isSubscribed) {
        outcome = {
          channelId: channel.id,
          channelName: channel.name,
          status: 'skipped',
          reason: 'Already unsubscribed before batch started',
          timestamp: Date.now(),
        };
      } else {
        try {
          outcome = await executor(channel);
        } catch (err) {
          outcome = {
            channelId: channel.id,
            channelName: channel.name,
            status: 'failed',
            reason: err instanceof Error ? err.message : 'Unexpected execution error',
            timestamp: Date.now(),
          };
        }
      }

      results[channel.id] = outcome;
      progress.processed += 1;
      if (outcome.status === 'unsubscribed') progress.unsubscribed += 1;
      else if (outcome.status === 'failed') progress.failed += 1;
      else if (outcome.status === 'skipped') progress.skipped += 1;

      callbacks.onChannelComplete?.(outcome);
      callbacks.onProgress?.({ ...progress }, { ...results });

      // Wait between channels unless this was the final item or stopped
      if (i < queue.length - 1 && !this.stopped) {
        const jitter =
          settings.jitterMs > 0 ? Math.floor(Math.random() * settings.jitterMs) : 0;
        await this.waitWithDelay(settings.delayMs + jitter);
      }
    }

    progress.currentChannelId = null;
    progress.currentChannelName = null;
    progress.finishedAt = Date.now();
    progress.phase = this.stopped ? 'stopped' : 'completed';

    this.running = false;
    this.paused = false;

    callbacks.onProgress?.({ ...progress }, { ...results });
    callbacks.onFinish?.({ ...progress }, { ...results });

    return { progress, results };
  }
}

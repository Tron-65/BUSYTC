# Changelog

All notable changes to **ChannelSweep for YouTube** are documented here.

## [1.0.0] - 2026-11-13

### Added
- Manifest V3 Chrome & Microsoft Edge extension (`ChannelSweep for YouTube`).
- Isolated YouTube DOM adapter (`selectors.ts`, `channelParser.ts`, `subscriptionScanner.ts`, `unsubscribeAction.ts`, `youtubeAdapter.ts`).
- Sequential batch unsubscribe engine (`batchEngine.ts`) with configurable delay (`0.3s`–`5.0s`), jitter, Pause, Resume, and Stop.
- Multi-term search, subscriber tier bulk filtering (`<100K`, `100K–1M`, `1M+`), sorting, and bulk selection controls (`Select shown`, `Invert`, `Clear`).
- Real-time segmented progress bar (`X/Y channels processed`) and CSV report export.
- Persistent **History** tab with a **D3** time-series chart (`Cumulative` & `Intervals`) and timestamped removal log.
- Custom `16x16`, `48x48`, and `128x128` transparent PNG extension icons and automated GitHub Release workflow.

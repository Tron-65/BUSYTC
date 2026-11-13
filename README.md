# ChannelSweep for YouTube

**Version:** `1.0.0` (Manifest V3)

ChannelSweep for YouTube is a privacy-first Chrome and Microsoft Edge browser extension for searching, bulk-filtering, and sequentially unsubscribing from YouTube channels directly inside your authenticated Subscriptions manager (`youtube.com/feed/channels`).

No YouTube password, OAuth login, YouTube Data API key, or external server is ever required.

---

## Features

- **In-Browser Subscription Scanner**: Auto-scrolls `youtube.com/feed/channels` to load and deduplicate your subscribed channels without API quotas.
- **Search & Bulk Filtering**:
  - Multi-term search by channel name or `@handle` (comma-separated keywords supported).
  - Filter by subscriber size (`<100K`, `100K–1M`, `1M+`) or status (`All`, `Active`, `Selected`, `Log`, `Failed`).
  - Sort by scan order, channel name (`A–Z` / `Z–A`), or subscriber count.
  - Bulk actions: **Select shown**, **Invert**, and **Clear**.
- **Rate-Safe Sequential Batch Engine**:
  - Configurable inter-action delay (`0.3s` – `5.0s`) with jitter to avoid hammering YouTube.
  - Real-time **Pause**, **Resume**, and **Stop** controls persisted in `chrome.storage.local`.
  - Real-time segmented progress bar (`X/Y channels processed`) showing **Unsubscribed**, **Failed**, and **Skipped** counts.
- **Persistent History & D3 Visualization**:
  - Dedicated **History** tab recording every unsubscribed channel with exact timestamps across scans and restarts.
  - Interactive **D3** timeline chart supporting **Cumulative** and **Intervals** views plus CSV export.
- **Isolated YouTube DOM Adapter**:
  - All Polymer/Lit selectors and ARIA matchers live in `src/extension/youtube/` so future YouTube DOM changes can be patched in one place.

---

## Free Installation (No Chrome Web Store Fee Required)

### Option A: Load Unpacked from GitHub Releases ($0)

1. Download the latest `channelsweep-for-youtube-v1.0.0.zip` from the **Releases** page (or run `npm run build:extension` locally).
2. Extract the ZIP to a permanent folder on your computer.
3. Open `chrome://extensions` (Chrome / Brave / Arc / Vivaldi) or `edge://extensions` (Microsoft Edge).
4. Enable **Developer mode** in the top-right corner.
5. Click **Load unpacked** and select the extracted folder containing `manifest.json`.

### Option B: Microsoft Edge Add-ons Store ($0)

Microsoft Partner Center charges **$0** to register and publish Manifest V3 extensions. You can upload the exact same `channelsweep-for-youtube.zip` package directly to the Edge Add-ons Store without modifying the code.

---

## Project Architecture

```text
src/
├── components/
│   ├── ExtensionPopup.tsx          # Shared 420x600 popup UI (Subscriptions + History tabs)
│   ├── UnsubscribeHistoryChart.tsx # D3 cumulative & interval timeline chart
│   ├── LandingPage.tsx             # Product landing page & free distribution guide
│   ├── YouTubeSandbox.tsx          # Live /feed/channels DOM sandbox for testing
│   └── ExtensionSourceExplorer.tsx # Interactive source tree browser
└── extension/
    ├── manifest.json               # Manifest V3 configuration (v1.0.0)
    ├── background.ts               # MV3 Service Worker coordinating sequential queue
    ├── contentScript.ts            # Content script injected on youtube.com/*
    ├── batchEngine.ts              # Pause/Resume/Stop sequential queue engine
    ├── storage.ts                  # chrome.storage.local persistence + history merge
    ├── popup.html / popup.tsx      # Browser action popup entry point
    └── youtube/                    # Isolated YouTube DOM adapter layer
        ├── selectors.ts
        ├── channelParser.ts
        ├── subscriptionScanner.ts
        ├── unsubscribeAction.ts
        └── youtubeAdapter.ts
```

---

## Local Development & Building

```bash
# Install dependencies
npm install

# Build the unpacked Chrome/Edge MV3 extension into dist-extension/
# and package public/channelsweep-for-youtube.zip
npm run build:extension

# Run the interactive simulator, landing page, and source studio on port 3000
npm run dev

# Type-check and build the web studio
npm run lint
npm run build
```

---

## Automated GitHub Releases

Push a semantic version tag matching `v*` (for example `v1.0.0`):

```bash
git tag v1.0.0
git push origin v1.0.0
```

The included `.github/workflows/release-extension.yml` workflow builds `dist-extension/` and publishes `channelsweep-for-youtube-v1.0.0.zip` as a downloadable GitHub Release asset automatically.

---

## Privacy & License

- **100% Local**: Channel lists, delay settings, and unsubscribe history are stored only in `chrome.storage.local`. Zero telemetry or external servers.
- **License**: [MIT](./LICENSE)

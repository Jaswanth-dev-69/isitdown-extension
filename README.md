<div align="center">

# 🔍 IsItDown — Site Outage Checker

### One click: is this site down for everyone, or just you?

Find out in 3 seconds — right from the toolbar.

![Chrome Extension](https://img.shields.io/badge/Platform-Chrome%20Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?style=for-the-badge&logo=googlechrome&logoColor=white)
![Version](https://img.shields.io/badge/Version-1.0.0-6366F1?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-8B5CF6?style=for-the-badge)

---

</div>

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Screenshots](#-screenshots)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Usage Guide](#-usage-guide)
- [How It Works](#-how-it-works)
- [Permissions Explained](#-permissions-explained)
- [Configuration](#-configuration)
- [Contributing](#-contributing)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## 🌐 Overview

**IsItDown** is a premium Chrome extension that lets you instantly check whether a website is down for everyone or just you. It uses a dual-check engine (direct HTTP fetch + Google DNS resolution) to determine whether a site is truly offline, experiencing performance degradation, or if the issue is on your end.

No external backend. No accounts. No subscriptions. **100% free and fully local.**

---

## ✨ Features

### 🎯 One-Click Site Check
- Instantly checks the active tab's website status
- Returns a clear **Up / Down / Slow** verdict within seconds
- Displays HTTP status code, response time (ms), and DNS resolution status

### 🛡️ Dual-Check Engine
- **Local HTTP Probe** — Sends a direct `HEAD`/`GET` request to the target domain with configurable timeout
- **DNS Verification** — Cross-references with Google Public DNS (`dns.google`) to differentiate between DNS failures and server-side outages

### 🚦 Passive Toolbar Badge
- Automatically monitors page load times on every navigation
- Shows a **yellow `!` badge** when a page loads slowly (>4s)
- Shows a **red `?` badge** when a page fails to load entirely
- Zero-config — works silently in the background

### 🔔 Recovery Watcher
- When a site is detected as down, you can opt to **watch for recovery**
- The extension polls the site every 30 seconds in the background
- Sends a **desktop notification** when the site comes back online, including how long it was down

### 📊 Site Monitoring Dashboard
- Add up to **10 sites** to a persistent monitor list
- Background checks run every **5 minutes** automatically
- View live status of all monitored sites from the popup
- Global alert badge when any monitored site goes down

### 🩺 Intelligent Fix Suggestions
- Context-aware troubleshooting steps based on the specific error (DNS failure, timeout, HTTP 403/401, etc.)
- One-click **copy fix steps** to clipboard
- Quick **open in incognito** to rule out extension/cookie conflicts

### 📋 Diagnostic Report
- Generate a full diagnostic report with one click
- Includes domain, verdict, HTTP code, response time, DNS status, and timestamp
- Copy to clipboard for easy sharing or support tickets

### 📜 Check History
- Automatically logs the last **50 checks** with full metadata
- View recent history directly in the popup
- **Export to CSV** for external analysis
- Clear history with one click

### 🎨 Premium Dark UI
- Sleek, modern dark theme built with the [Inter](https://fonts.google.com/specimen/Inter) typeface
- Color-coded status indicators with glowing accents (green/red/amber)
- Smooth micro-animations and transitions throughout
- Custom scrollbar and polished attention to detail

---

## 🖼️ Screenshots

> Screenshots will be added after the extension is loaded in Chrome. The UI features:
> - A dark-themed popup with gradient verdict card
> - Color-coded status dots (🟢 Up / 🔴 Down / 🟡 Slow)
> - Stats grid showing Response time, HTTP status, and DNS status
> - Fix suggestions panel with numbered steps
> - History and Monitor panels with live data

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Chrome Browser                     │
│                                                      │
│  ┌──────────────┐    chrome.runtime     ┌──────────┐ │
│  │  Popup UI    │ ◄──── messages ────► │ Service  │ │
│  │  (popup/)    │                      │ Worker   │ │
│  │              │                      │(background│ │
│  │ • popup.html │                      │  .js)    │ │
│  │ • popup.css  │                      │          │ │
│  │ • popup.js   │                      │ • HTTP   │ │
│  │              │                      │   Probe  │ │
│  └──────┬───────┘                      │ • DNS    │ │
│         │                              │   Check  │ │
│         │ imports                       │ • Alarms │ │
│  ┌──────▼───────┐                      │ • Notify │ │
│  │ Storage Lib  │                      └──────────┘ │
│  │  (lib/)      │                                    │
│  │ • storage.js │ ◄──── chrome.storage.local ───►    │
│  └──────────────┘                                    │
│                                                      │
│  External:  dns.google/resolve (DNS verification)    │
└──────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | File | Role |
|-----------|------|------|
| **Service Worker** | `background/service-worker.js` | Core check engine, passive badge, recovery watcher, monitor scheduler, alarm router, message handler |
| **Popup UI** | `popup/popup.html` | Extension popup markup and layout |
| **Popup Styles** | `popup/popup.css` | Premium dark theme with design tokens, animations, and responsive styling |
| **Popup Controller** | `popup/popup.js` | UI logic, event binding, rendering, domain detection, clipboard operations |
| **Storage Helpers** | `lib/storage.js` | History CRUD, CSV export, centralized storage key management |
| **Assets** | `assets/icons/` | Extension icons (16px, 48px, 128px PNG + SVG source) |

---

## 📁 Project Structure

```
isitdown-extension/
├── manifest.json              # Chrome Extension manifest (MV3)
├── README.md                  # This file
│
├── assets/
│   └── icons/
│       ├── icon.svg           # Source vector icon
│       ├── icon16.png         # Toolbar icon (16×16)
│       ├── icon48.png         # Extension management icon (48×48)
│       └── icon128.png        # Chrome Web Store icon (128×128)
│
├── background/
│   └── service-worker.js      # Background service worker
│       ├── Passive toolbar badge (webNavigation listeners)
│       ├── Site check engine (HTTP + DNS dual-check)
│       ├── Recovery watcher (alarm-based polling)
│       ├── Monitor list manager (background checks)
│       ├── Alarm router (recovery + monitor dispatching)
│       └── Message handler (popup ⟷ background IPC)
│
├── lib/
│   └── storage.js             # Storage helpers (history, CSV export)
│
└── popup/
    ├── popup.html             # Popup UI markup
    ├── popup.css              # Premium dark theme styles
    └── popup.js               # Popup controller logic
```

---

## 🚀 Installation

### From Source (Developer Mode)

1. **Clone the repository**
   ```bash
   git clone https://github.com/Jaswanth-dev-69/isitdown-extension.git
   ```

2. **Open Chrome Extensions page**
   - Navigate to `chrome://extensions/`
   - Or: Menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle the **Developer mode** switch in the top-right corner

4. **Load the extension**
   - Click **"Load unpacked"**
   - Select the cloned `isitdown-extension` folder

5. **Pin the extension**
   - Click the puzzle icon (🧩) in Chrome's toolbar
   - Click the pin icon next to **IsItDown — Site Outage Checker**

> ✅ The extension is now ready to use! Navigate to any website and click the IsItDown icon.

---

## 📘 Usage Guide

### Checking a Website

1. **Navigate** to any website you want to check
2. **Click** the IsItDown icon in your toolbar
3. **Click** the **"Check now"** button
4. **View** the verdict:
   - 🟢 **All Good** — Site is up and responsive
   - 🔴 **Appears Down** / **Server Error** / **Site Unreachable** — Something's wrong
   - 🟡 **Degraded Performance** — Site is responding slowly (>3 seconds)

### Understanding the Stats Grid

| Stat | Meaning |
|------|---------|
| **Response** | Round-trip time in milliseconds (or "Timeout" if unreachable) |
| **HTTP** | HTTP status code returned by the server (200, 403, 500, etc.) |
| **DNS** | Whether the domain resolved successfully via Google DNS |

### Watching for Recovery

When a site is down:
1. Click **🔔 Watch for recovery**
2. The extension will check the site every **30 seconds** in the background
3. When the site comes back up, you'll receive a **desktop notification**
4. Click **🔔 Watching…** again to stop watching

### Adding Sites to Monitor

1. Navigate to any website
2. Open the IsItDown popup
3. Click **"+ Add current site"** in the Monitored Sites section
4. The extension will check all monitored sites every **5 minutes**
5. A red **`!`** badge appears if any monitored site goes down

### Exporting History

1. Open the IsItDown popup
2. Scroll to **Recent Checks**
3. Click **"Export CSV"** to download a full history report
4. The CSV includes: Domain, Verdict, HTTP Status, Response time, DNS status, Timestamp

---

## ⚙️ How It Works

### Check Flow

```
User clicks "Check now"
        │
        ▼
┌───────────────────┐
│   Popup sends     │
│  { type: 'check', │
│    domain: '...'} │
│   to background   │
└────────┬──────────┘
         │
         ▼
┌────────────────────────────┐
│   Background runs          │
│   Promise.allSettled([     │
│     performLocalCheck(),   │  ← HEAD then GET with 8s timeout
│     performDnsCheck()      │  ← dns.google/resolve?name=...
│   ])                       │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│   buildVerdict()           │
│   Categorizes result:      │
│   • up (ok + fast)         │
│   • slow (ok + >3000ms)    │
│   • down (HTTP 5xx)        │
│   • down (unreachable)     │
│   • down (DNS fail)        │
└────────┬───────────────────┘
         │
         ▼
┌────────────────────────────┐
│  Result sent back to popup │
│  • Renders verdict card    │
│  • Updates stats grid      │
│  • Shows fix suggestions   │
│  • Saves to history        │
└────────────────────────────┘
```

### Verdict Logic

| Condition | Verdict | Label |
|-----------|---------|-------|
| HTTP response received, status ≥ 500 | `down` | Server Error |
| HTTP response received, response >3000ms | `slow` | Degraded Performance |
| HTTP response received, all normal | `up` | All Good |
| HTTP failed, DNS resolves | `down` | Appears Down |
| HTTP failed, DNS also failed | `down` | Site Unreachable |

### Passive Badge Logic

| Event | Badge | Color |
|-------|-------|-------|
| Page loads in >4 seconds | `!` | 🟡 Amber |
| Page navigation error | `?` | 🔴 Red |
| Normal page load | *(cleared)* | — |

---

## 🔒 Permissions Explained

| Permission | Why It's Needed |
|------------|----------------|
| `storage` | Persist check history, monitor list, and recovery watch state |
| `alarms` | Schedule background checks for recovery watcher (30s) and site monitor (5 min) |
| `notifications` | Send desktop notifications when a watched site recovers |
| `webNavigation` | Track page load timing for the passive toolbar badge |
| `activeTab` | Read the URL of the currently active tab to auto-detect the domain |
| `<all_urls>` (host) | Send HTTP probe requests to any website for status checking |

> **Privacy:** IsItDown does **not** collect, transmit, or store any personal data. All checks run entirely from your browser. The only external service contacted is `dns.google` for DNS verification.

---

## ⚡ Configuration

The following constants can be adjusted in `background/service-worker.js`:

| Constant | Default | Description |
|----------|---------|-------------|
| `CHECK_TIMEOUT` | `8000` (8s) | Maximum time to wait for an HTTP response |
| `SLOW_THRESHOLD` | `3000` (3s) | Response time above which a site is marked "slow" |
| `BADGE_SLOW_THRESHOLD` | `4000` (4s) | Page load time above which the toolbar badge activates |
| `MONITOR_INTERVAL` | `5` (min) | How often monitored sites are checked |
| `RECOVERY_INTERVAL` | `0.5` (min) | How often the recovery watcher polls a downed site |

History is capped at **50 entries** (configurable via `MAX_HISTORY` in `lib/storage.js`).  
The monitor list supports up to **10 sites**.

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

### Setup

```bash
# Clone the repo
git clone https://github.com/Jaswanth-dev-69/isitdown-extension.git
cd isitdown-extension

# Load in Chrome as described in the Installation section
# Make your changes and reload the extension to test
```

### Guidelines

1. **No build tools required** — This is a pure HTML/CSS/JS Chrome extension
2. **Keep it zero-dependency** — No npm packages, no bundlers, no frameworks
3. **Follow existing code style** — Consistent formatting, clear comments
4. **Test your changes** — Load the extension, verify all features work
5. **One feature per PR** — Keep pull requests focused and reviewable

### Reporting Issues

- Use [GitHub Issues](https://github.com/Jaswanth-dev-69/isitdown-extension/issues)
- Include your Chrome version, OS, and steps to reproduce
- Check existing issues before creating a new one

---

## 🔧 Troubleshooting

<details>
<summary><strong>Extension shows "Not a checkable page"</strong></summary>

The extension only works on regular web pages (`http://` or `https://`). It cannot check:
- `chrome://` pages
- `chrome-extension://` pages
- `about:blank`
- Local files (`file://`)
- The Chrome Web Store
</details>

<details>
<summary><strong>Badge not appearing on slow pages</strong></summary>

The badge only appears when a page takes longer than **4 seconds** to fully load. This is by design to avoid false positives. You can adjust `BADGE_SLOW_THRESHOLD` in the service worker.
</details>

<details>
<summary><strong>Recovery notification not firing</strong></summary>

- Ensure Chrome notifications are enabled for the extension
- Check that Chrome is running (service worker suspends when browser closes)
- The recovery watcher checks every 30 seconds — allow time for the poll cycle
</details>

<details>
<summary><strong>"Check Failed" error</strong></summary>

This typically means the service worker couldn't reach the site at all. Common causes:
1. You're offline or behind a restrictive firewall
2. The domain doesn't exist
3. CORS or CSP policies are blocking the request (rare with the service worker approach)
</details>

<details>
<summary><strong>Monitor not updating</strong></summary>

Background monitor checks run every 5 minutes via Chrome Alarms. If results seem stale:
1. Close and reopen the popup to force a UI refresh
2. Ensure Chrome hasn't suspended the service worker (navigate to `chrome://serviceworker-internals/`)
</details>

---

## 📄 License

This project is licensed under the **MIT License** — you are free to use, modify, and distribute it.

---

<div align="center">

**Built with AI by [Jaswanth](https://github.com/Jaswanth-dev-69)**

**Author:** Jaswanth

⭐ Star this repo if you find it useful!

</div>

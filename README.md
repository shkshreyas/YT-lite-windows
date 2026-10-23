<div align="center">

<img src="src-tauri/icons/icon.png" width="96" alt="YT Lite icon"/>

# YT Lite

**A lightweight YouTube desktop app for Windows — built with Tauri + Rust**

[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-blue.svg)](https://github.com/shkshreyas/YT-lite-windows/releases)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%202-24C8DB.svg)](https://tauri.app)
[![Rust](https://img.shields.io/badge/backend-Rust-orange.svg)](https://www.rust-lang.org)

[**Download**](#installation) · [**Features**](#features) · [**Screenshots**](#screenshots) · [**Build**](#building-from-source)

</div>

---

## Why YT Lite?

| Metric | Chrome + YouTube | YT Lite |
|--------|-----------------|---------|
| RAM usage | 300–600 MB | ~80 MB |
| Disk size | — | ~5 MB |
| Ads | Yes | **Blocked** |
| Taskbar clutter | Browser tabs | Single app |

YT Lite wraps YouTube in a **native Tauri 2 window** backed by the system's built-in **WebView2** (the same engine as Microsoft Edge, already on every Windows 10/11 machine). There's no bundled browser — the app itself is just the shell around it, which is why it's tiny.

---

## Features

- **Ad blocking** — comprehensive network-level + cosmetic ad filters injected before YouTube loads, blocking pre-roll ads, banner ads, and sponsored overlays
- **Multiple tabs** — open several YouTube videos simultaneously in independent windows with a shared tab bar
- **True fullscreen** — F11 hides the tab bar and taskbar completely
- **Google Sign-in** — full YouTube account support: subscriptions, history, playlists, and Watch Later all work
- **Minimal RAM** — ~80 MB because WebView2 is the OS's own component, not a bundled browser
- **Minimal size** — ~5 MB installer, no Electron overhead
- **Custom title bar** — frameless dark window with minimize / maximize / close buttons

---

## Installation

### Option 1 — Installer script (recommended)

1. Download `YT Lite_1.2.0_x64-setup.exe` from [Releases](https://github.com/shkshreyas/YT-lite-windows/releases)
2. Run it — Windows may show a SmartScreen warning (click **More info → Run anyway**)
3. YT Lite will appear in **Start Menu** and on your **Desktop**
4. It registers in **Settings → Apps** for clean uninstall

### Option 2 — Portable `.exe`

Download `YT Lite.exe` from Releases, run it directly — no install needed.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + T` | New tab |
| `F11` | Toggle true fullscreen |
| `Escape` | Exit fullscreen |
| Click tab × | Close that tab |

---

## Screenshots

> *First launch opens youtube.com with the dark tab bar across the top.*

---

## Building from Source

**Prerequisites:** [Rust](https://rustup.rs/) · [Node.js 18+](https://nodejs.org/) · Windows 10/11 with WebView2 (pre-installed on Win 11)

```bash
git clone https://github.com/shkshreyas/YT-lite-windows.git
cd YT-lite-windows
npm install
npx tauri build
```

The release exe appears at `src-tauri/target/release/YT Lite.exe`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | [Tauri 2](https://tauri.app) (Rust) |
| Renderer | Windows WebView2 (system component) |
| Ad blocking | JS initialization script (EasyList rules) |
| Tab bar | Injected JS UI |
| Build | `cargo` + `npx tauri build` |

---

## Legal Disclaimer

YT Lite is an **independent, open-source project** and is **not affiliated with, endorsed by, or sponsored by Google LLC or YouTube**.

- This app is a **browser wrapper** — it displays youtube.com the same way any web browser does
- Ad blocking is implemented client-side, consistent with established tools like uBlock Origin and browser privacy extensions
- No YouTube content is downloaded, redistributed, cached beyond normal browser behaviour, or monetised by this app
- Users are responsible for complying with [YouTube's Terms of Service](https://www.youtube.com/t/terms) in their jurisdiction
- This project is provided **as-is, without warranty of any kind**

**The author does not provide legal advice. Use at your own risk.**

---

## Contributing

Issues and pull requests are welcome. Please open an issue before large changes.

---

<div align="center">

Made with ❤️ and Rust · [MIT License](LICENSE)

</div>

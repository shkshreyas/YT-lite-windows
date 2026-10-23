<div align="center">

<img src="src-tauri/icons/icon.png" width="120" alt="YT Lite Logo" />

# ▶ YT Lite for Windows

### A blazing-fast, minimal YouTube desktop app — no bloat, no ads, no distractions.

[![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square&logo=windows)](https://github.com/shkshreyas/YT-lite-windows/releases)
[![Built with Tauri](https://img.shields.io/badge/built%20with-Tauri%202-FFC131?style=flat-square&logo=tauri)](https://tauri.app)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![RAM Usage](https://img.shields.io/badge/RAM-~80MB-success?style=flat-square)]()

<br/>

![YT Lite Screenshot](https://via.placeholder.com/900x500/0f0f0f/ff0000?text=YT+Lite+Screenshot)

</div>

---

## ✨ Features

| Feature | Details |
|---|---|
| 🚫 **Ad Blocking** | Blocks pre-roll, mid-roll, banner and overlay ads automatically |
| ⏭️ **Auto Ad Skip** | Detects and skips skippable ads instantly |
| 📑 **Multiple Tabs** | Open several YouTube pages simultaneously |
| ⛶ **True Fullscreen** | F11 or button — hides all chrome for immersive viewing |
| 🔐 **Google Sign-In** | Log in with your Google account — subscriptions, history, playlists all work |
| 🪶 **Lightweight** | ~5MB installer, ~80MB RAM (vs 300MB+ for Electron apps) |
| 🌑 **Dark UI** | Clean dark interface that matches YouTube's own theme |
| ⌨️ **Keyboard Shortcuts** | Ctrl+T, Ctrl+W, Ctrl+L, Ctrl+R, F11 and more |

---

## 📥 Download & Install

Go to [**Releases**](https://github.com/shkshreyas/YT-lite-windows/releases/latest) and download `YT-Lite-Setup.exe`.

> **Requirements:** Windows 10/11 (64-bit) · WebView2 Runtime (pre-installed on Windows 11)

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + T` | New tab |
| `Ctrl + W` | Close current tab |
| `Ctrl + L` | Focus URL bar |
| `Ctrl + R` | Reload |
| `Ctrl + 1-9` | Switch to tab N |
| `F11` / `Esc` | Toggle fullscreen |

---

## 🔨 Build from Source

**Prerequisites:** [Rust](https://rustup.rs) · [Node.js](https://nodejs.org) · Windows 10/11

```bash
git clone https://github.com/shkshreyas/YT-lite-windows.git
cd YT-lite-windows
npm install
npm run build
```

The installer will be at `src-tauri/target/release/bundle/`.

---

## 🏗️ Tech Stack

- **[Tauri 2](https://tauri.app)** — Rust-powered desktop framework, uses system WebView2 (no bundled browser engine)
- **WebView2** — Microsoft Edge's rendering engine, already on Windows 11
- **Vanilla JS/HTML/CSS** — zero framework overhead in the UI shell

---

## ⚖️ Legal Notice

> **YT Lite is an independent open-source project and is NOT affiliated with, endorsed by, or associated with Google LLC or YouTube.**

- This app is a **browser wrapper** — it loads `youtube.com` exactly as a web browser would.
- Ad blocking is implemented via **client-side JavaScript injection**, the same technique used by browser extensions like uBlock Origin. No YouTube content is downloaded, stored, redistributed, or modified.
- This project does **not** scrape, extract, or redistribute any YouTube data or media.
- Use of this app is subject to [YouTube's Terms of Service](https://www.youtube.com/t/terms). The authors take no responsibility for any ToS violations by end users.
- All YouTube trademarks, logos, and brand assets belong to Google LLC.

---

## 📄 License

MIT © [shkshreyas](https://github.com/shkshreyas)

---

<div align="center">
  Made with ❤️ and Rust · <a href="https://github.com/shkshreyas/YT-lite-windows/issues">Report a bug</a>
</div>

(function () {
  'use strict';

  /* ── 1. Cosmetic filtering (CSS) ────────────────────────────── */
  const CSS = `
    /* Pre-roll / mid-roll ad overlay */
    .ad-showing .ytp-ad-module,
    .ytp-ad-overlay-container,
    .ytp-ad-text-overlay,
    .ytp-ad-image-overlay,
    .ytp-ad-skip-button-container,
    .ytp-ad-action-interstitial,
    /* In-feed / sidebar ads */
    ytd-display-ad-renderer,
    ytd-promoted-sparkles-web-renderer,
    ytd-promoted-video-renderer,
    ytd-search-pyv-renderer,
    ytd-banner-promo-renderer,
    ytd-statement-banner-renderer,
    ytd-ad-slot-renderer,
    yt-about-this-ad-renderer,
    ytd-in-feed-ad-layout-renderer,
    ytd-rich-item-renderer[is-slim-media],
    #masthead-ad,
    .ytd-mealbar-promo-renderer,
    #player-ads,
    .ytd-companion-slot-renderer,
    tp-yt-paper-dialog:has(ytd-mealbar-promo-renderer),
    /* Shorts ads */
    ytd-reel-shelf-renderer[is-slim-media],
    /* Premium upsell */
    ytd-popup-container:has(ytd-mealbar-promo-renderer) {
      display: none !important;
      pointer-events: none !important;
    }
  `;
  const style = document.createElement('style');
  style.id = '__ytlite_adblock__';
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);

  /* ── 2. Video ad skip (runs every 150ms) ────────────────────── */
  function skipVideoAd() {
    // Click skip button if visible
    const skip = document.querySelector(
      '.ytp-ad-skip-button:not([style*="display: none"]), .ytp-skip-ad-button'
    );
    if (skip) { skip.click(); return; }

    // Fast-forward through unskippable ads
    if (document.querySelector('.ad-showing')) {
      const video = document.querySelector('video');
      if (video && isFinite(video.duration) && video.duration > 0.1) {
        video.currentTime = video.duration;
        video.muted = false;
      }
    }
  }
  setInterval(skipVideoAd, 150);

  /* ── 3. Network-level blocking (XHR + fetch) ────────────────── */
  const AD_PATTERNS = [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    '/pagead/', '/ads?', 'adsystem', 'adformat',
    'youtube.com/api/stats/ads', 'youtube.com/pagead',
    'youtube.com/get_midroll_info', 'youtube.com/api/stats/qoe?adformat',
  ];
  function isAd(url) {
    if (!url) return false;
    return AD_PATTERNS.some(p => url.includes(p));
  }

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (isAd(url)) return; // silently drop
    return origOpen.apply(this, arguments);
  };

  const origFetch = window.fetch;
  window.fetch = function (resource, ...args) {
    const url = typeof resource === 'string' ? resource : (resource && resource.url) || '';
    if (isAd(url)) return Promise.resolve(new Response('', { status: 200 }));
    return origFetch.apply(this, arguments);
  };

  /* ── 4. Overlay UI: tab bar + controls ─────────────────────── */
  // Only inject once (guard for SPA navigation re-runs)
  if (document.getElementById('__ytlite_bar__')) return;

  const bar = document.createElement('div');
  bar.id = '__ytlite_bar__';
  bar.innerHTML = `
    <div id="__ytlite_tabs__"></div>
    <div id="__ytlite_controls__">
      <button id="__ytlite_newtab__" title="New Tab (Ctrl+T)">＋</button>
      <button id="__ytlite_fs__" title="Fullscreen (F11)">⛶</button>
    </div>
  `;
  document.documentElement.appendChild(bar);

  const barStyle = document.createElement('style');
  barStyle.textContent = `
    #__ytlite_bar__ {
      position: fixed; top: 0; left: 0; right: 0; height: 34px;
      background: rgba(15,15,15,0.96); display: flex; align-items: center;
      z-index: 999999; padding: 0 6px; gap: 4px;
      border-bottom: 1px solid #333;
      font-family: -apple-system,'Segoe UI',sans-serif; font-size: 12px;
      backdrop-filter: blur(6px);
    }
    #__ytlite_bar__ button {
      background: transparent; border: none; color: #aaa;
      cursor: pointer; padding: 2px 8px; border-radius: 4px;
      font-size: 16px; height: 26px; display:flex; align-items:center;
    }
    #__ytlite_bar__ button:hover { background:#333; color:#fff; }
    #__ytlite_controls__ { margin-left: auto; display:flex; gap:2px; }
    /* Push YouTube content below our bar */
    ytd-app, #page-manager { padding-top: 34px !important; }
    #masthead-container { top: 34px !important; }
    /* Hide bar in fullscreen */
    :fullscreen #__ytlite_bar__, :-webkit-full-screen #__ytlite_bar__ {
      display: none !important;
    }
  `;
  document.head.appendChild(barStyle);

  // New tab → ask Tauri backend to open a new window
  document.getElementById('__ytlite_newtab__').onclick = () => {
    if (window.__TAURI__) {
      window.__TAURI__.core.invoke('new_tab');
    }
  };

  // Fullscreen button
  document.getElementById('__ytlite_fs__').onclick = toggleFs;
  document.addEventListener('keydown', e => {
    if (e.key === 'F11') { e.preventDefault(); toggleFs(); }
  });

  function toggleFs() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        if (window.__TAURI__) window.__TAURI__.core.invoke('toggle_fullscreen');
      });
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // Ctrl+T new tab shortcut
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
      e.preventDefault();
      document.getElementById('__ytlite_newtab__')?.click();
    }
  });
})();

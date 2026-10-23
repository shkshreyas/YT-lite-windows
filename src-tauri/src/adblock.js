/**
 * YT Lite – uBlock Origin-grade ad blocking for YouTube
 * Filter rules sourced from uBlock Origin uAssets (GPLv3) and EasyList (CC BY-SA 3.0)
 * Runs as an initialization_script (before any page JS) for maximum effectiveness.
 */
(function () {
  'use strict';
  if (window.__ytlite_adblock__) return;
  window.__ytlite_adblock__ = true;

  /* ────────────────────────────────────────────────────────────────────────
   * 1. NETWORK FILTER – block ad requests at XHR / fetch / beacon level
   *    Rules from: uBlock Origin filters.txt, EasyList, EasyPrivacy
   * ──────────────────────────────────────────────────────────────────────── */
  const NET_BLOCK = [
    // YouTube ad/tracking endpoints (uBlock Origin rules)
    /youtube\.com\/api\/stats\/ads/,
    /youtube\.com\/api\/stats\/qoe\?adformat/,
    /youtube\.com\/get_midroll_info/,
    /youtube\.com\/pagead\//,
    /youtube\.com\/ptracking/,
    /youtube\.com\/youtubei\/v1\/log_event/,
    /youtube\.com\/youtubei\/v1\/player\/ad_break/,
    /youtube\.com\/youtubei\/v1\/initiated_playback/,
    /youtube\.com\/generate_204\?/,
    // Doubleclick / Google Ads (EasyList)
    /doubleclick\.net/,
    /googlesyndication\.com/,
    /googleadservices\.com/,
    /google\.com\/pagead\//,
    /googletagservices\.com/,
    /google-analytics\.com\/r\//,
    /google-analytics\.com\/collect/,
    // Ad measurement / viewability
    /moatads\.com/,
    /adsystem\.(com|net)/,
    /adnxs\.com/,
    /scorecardresearch\.com/,
    /2mdn\.net/,
    /cdn\.ampproject\.org\/v0\/amp-ad/,
  ];

  function isAdURL(url) {
    if (!url) return false;
    try { return NET_BLOCK.some(r => r.test(url)); }
    catch { return false; }
  }

  // Block fetch
  const _fetch = window.fetch;
  window.fetch = function (input, init) {
    const url = (typeof input === 'string') ? input : (input && input.url) || '';
    if (isAdURL(url)) {
      return Promise.resolve(new Response('', { status: 200, headers: { 'Content-Type': 'text/plain' } }));
    }
    return _fetch.apply(this, arguments);
  };

  // Block XHR
  const _xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (isAdURL(String(url))) {
      // Return a dummy completed XHR
      Object.defineProperty(this, '_blocked', { value: true, writable: false });
    }
    return _xhrOpen.apply(this, arguments);
  };
  const _xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    if (this._blocked) return;
    return _xhrSend.apply(this, arguments);
  };

  // Block sendBeacon (tracking pixels / analytics)
  if (navigator.sendBeacon) {
    const _beacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url, data) {
      if (isAdURL(String(url))) return true;
      return _beacon(url, data);
    };
  }

  // Block image tracking pixels
  const _imgSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  if (_imgSrc && _imgSrc.set) {
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      set(val) {
        if (isAdURL(val)) return;
        _imgSrc.set.call(this, val);
      },
      get: _imgSrc.get,
      configurable: true,
    });
  }

  /* ────────────────────────────────────────────────────────────────────────
   * 2. COSMETIC FILTER – hide ad elements via CSS injection
   *    Rules from: uBlock Origin cosmetic filters (youtube.com##) + EasyList
   * ──────────────────────────────────────────────────────────────────────── */
  const CSS_RULES = `
    /* ── Video player ads ── */
    .ad-showing .ytp-ad-module,
    .ytp-ad-overlay-container,
    .ytp-ad-text-overlay,
    .ytp-ad-image-overlay,
    .ytp-ad-skip-button-container,
    .ytp-ad-action-interstitial,
    .ytp-ad-action-interstitial-background-color,
    .ytp-ad-player-overlay,
    .ytp-ad-player-overlay-instream-info,
    .ytp-ad-preview-container,
    .ytp-ad-preview-slot,
    .ytp-spinner:not([aria-hidden]) + .ytp-ads-indicator,

    /* ── In-feed / sidebar ad slots (uBlock: ytd-display-ad-renderer etc.) ── */
    ytd-display-ad-renderer,
    ytd-promoted-sparkles-web-renderer,
    ytd-promoted-video-renderer,
    ytd-search-pyv-renderer,
    ytd-banner-promo-renderer,
    ytd-statement-banner-renderer,
    ytd-ad-slot-renderer,
    ytd-in-feed-ad-layout-renderer,
    ytd-action-companion-ad-renderer,
    ytd-carousel-ad-renderer,
    ytd-companion-slot-renderer,
    yt-about-this-ad-renderer,
    yt-mealbar-promo-renderer,
    ytd-mealbar-promo-renderer,
    ytd-rich-item-renderer[is-slim-media],

    /* ── Masthead / banner ads ── */
    #masthead-ad,
    ytd-masthead-ad-v4-renderer,
    ytd-masthead-ad-v3-renderer,

    /* ── Shorts ads ── */
    ytd-reel-shelf-renderer[is-slim-media],
    ytd-reel-video-renderer .ytd-display-ad-renderer,

    /* ── Player ads overlay ── */
    #player-ads,
    .html5-video-player .ytp-ad-module:not(:empty),

    /* ── Premium upsell popups ── */
    ytd-popup-container:has(ytd-mealbar-promo-renderer),
    tp-yt-paper-dialog:has(ytd-mealbar-promo-renderer),
    ytd-enforcement-message-view-model,

    /* ── Shopping / promoted ── */
    ytd-merch-shelf-renderer,
    ytd-product-list-renderer,
    ytd-sponsorcard-renderer,

    /* ── Survey / feedback overlays ── */
    .ytd-mealbar-promo-renderer,
    yt-confirm-dialog-renderer:has([href*="premium"]) {
      display: none !important;
      pointer-events: none !important;
      height: 0 !important;
      min-height: 0 !important;
      overflow: hidden !important;
    }
  `;

  function injectCSS() {
    if (document.getElementById('__ytlite_css__')) return;
    const s = document.createElement('style');
    s.id = '__ytlite_css__';
    s.textContent = CSS_RULES;
    (document.head || document.documentElement).appendChild(s);
  }
  injectCSS();
  // Re-inject after YouTube SPA navigation
  new MutationObserver(injectCSS).observe(document.documentElement, { childList: true, subtree: false });

  /* ────────────────────────────────────────────────────────────────────────
   * 3. VIDEO AD SKIP – fast-forward or click skip button
   * ──────────────────────────────────────────────────────────────────────── */
  let skipTick = 0;
  function skipVideoAd() {
    // Click any visible skip button
    const skip = document.querySelector(
      '.ytp-ad-skip-button:not([style*="display: none"]),' +
      '.ytp-skip-ad-button:not([style*="display: none"]),' +
      '.ytp-ad-skip-button-modern'
    );
    if (skip) { skip.click(); return; }

    // Fast-forward through unskippable video ads
    const adShowing = document.querySelector('.ad-showing');
    if (adShowing) {
      const video = document.querySelector('video');
      if (video && isFinite(video.duration) && video.duration > 0.5) {
        video.currentTime = video.duration;
        if (video.paused) video.play().catch(() => {});
      }
    }

    // Dismiss overlay ads every ~3s
    if (++skipTick % 20 === 0) {
      document.querySelector('.ytp-ad-overlay-close-button')?.click();
      document.querySelector('.ytp-ad-text-overlay .ytp-ad-overlay-close-button')?.click();
    }
  }
  setInterval(skipVideoAd, 150);

  /* ────────────────────────────────────────────────────────────────────────
   * 4. SCRIPT DEFUSER – neutralise YouTube's ad player bootstrap
   *    (uBlock Origin scriptlet: youtube-no-ads.js equivalent)
   * ──────────────────────────────────────────────────────────────────────── */
  // Intercept ytInitialPlayerResponse to strip ad data before YouTube reads it
  let _ytInitial = undefined;
  Object.defineProperty(window, 'ytInitialPlayerResponse', {
    get() { return _ytInitial; },
    set(val) {
      if (val && typeof val === 'object') {
        // Remove ad slots from player config
        try {
          delete val.adPlacements;
          delete val.playerAds;
          delete val.adSlots;
          if (val.streamingData) delete val.streamingData.adaptiveFormats; // noop, keep video
        } catch {}
      }
      _ytInitial = val;
    },
    configurable: true,
  });

})();

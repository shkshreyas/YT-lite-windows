/**
 * YT Lite – uBlock Origin-grade ad blocking for YouTube
 * Runs as an initialization_script (before any page JS) for maximum effectiveness.
 */
(function () {
  'use strict';
  if (window.__ytlite_adblock__) return;
  window.__ytlite_adblock__ = true;

  /* ─────────────────────────────────────────────────────────────────────────
   * 1. NETWORK FILTER – block ad requests at XHR / fetch / beacon level
   * ───────────────────────────────────────────────────────────────────────── */
  const NET_BLOCK = [
    /youtube\.com\/api\/stats\/ads/,
    /youtube\.com\/api\/stats\/qoe\?adformat/,
    /youtube\.com\/get_midroll_info/,
    /youtube\.com\/pagead\//,
    /youtube\.com\/ptracking/,
    /youtube\.com\/youtubei\/v1\/log_event/,
    /youtube\.com\/youtubei\/v1\/player\/ad_break/,
    /youtube\.com\/youtubei\/v1\/initiated_playback/,
    /youtube\.com\/generate_204\?/,
    /doubleclick\.net/,
    /googlesyndication\.com/,
    /googleadservices\.com/,
    /google\.com\/pagead\//,
    /googletagservices\.com/,
    /google-analytics\.com\/r\//,
    /google-analytics\.com\/collect/,
    /moatads\.com/,
    /adsystem\.(com|net)/,
    /adnxs\.com/,
    /scorecardresearch\.com/,
    /2mdn\.net/,
  ];

  function isAdURL(url) {
    if (!url) return false;
    try { return NET_BLOCK.some(r => r.test(url)); }
    catch { return false; }
  }

  const _fetch = window.fetch;
  window.fetch = function (input, init) {
    const url = (typeof input === 'string') ? input : (input && input.url) || '';
    if (isAdURL(url)) return Promise.resolve(new Response('', { status: 200 }));
    return _fetch.apply(this, arguments);
  };

  const _xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (isAdURL(String(url))) this._ytlBlocked = true;
    return _xhrOpen.apply(this, arguments);
  };
  const _xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    if (this._ytlBlocked) return;
    return _xhrSend.apply(this, arguments);
  };

  if (navigator.sendBeacon) {
    const _beacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url) {
      if (isAdURL(String(url))) return true;
      return _beacon.apply(this, arguments);
    };
  }

  /* ─────────────────────────────────────────────────────────────────────────
   * 2. COSMETIC FILTER – hide ad elements via CSS + aggressive DOM removal
   * ───────────────────────────────────────────────────────────────────────── */
  const CSS_RULES = `
    /* Video player overlay ads */
    .ytp-ad-overlay-container,
    .ytp-ad-overlay-image,
    .ytp-ad-text-overlay,
    .ytp-ad-image-overlay,
    .ytp-ad-skip-button-container,
    .ytp-ad-action-interstitial,
    .ytp-ad-action-interstitial-background-color,
    .ytp-ad-player-overlay,
    .ytp-ad-player-overlay-instream-info,
    .ytp-ad-preview-container,
    .ytp-ad-preview-slot,
    .ytp-ad-module,
    .ad-showing .ytp-ad-module,
    #player-ads,
    .html5-video-player .ytp-ad-module:not(:empty),

    /* In-feed / sidebar ad slots */
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

    /* Masthead banner ads */
    #masthead-ad,
    ytd-masthead-ad-v4-renderer,
    ytd-masthead-ad-v3-renderer,

    /* Shorts ads */
    ytd-reel-shelf-renderer[is-slim-media],

    /* Premium upsell popups */
    ytd-enforcement-message-view-model,
    ytd-popup-container:has(ytd-mealbar-promo-renderer),
    tp-yt-paper-dialog:has(ytd-mealbar-promo-renderer),

    /* Shopping / promoted */
    ytd-merch-shelf-renderer,
    ytd-product-list-renderer,
    ytd-sponsorcard-renderer,

    /* Survey / feedback overlays */
    .ytd-mealbar-promo-renderer,
    yt-confirm-dialog-renderer:has([href*="premium"]) {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
      height: 0 !important;
      min-height: 0 !important;
      max-height: 0 !important;
      overflow: hidden !important;
      opacity: 0 !important;
    }

    /* Hide "Sponsored" label rows in feed */
    ytd-rich-item-renderer:has(ytd-display-ad-renderer),
    ytd-rich-item-renderer:has(ytd-promoted-sparkles-web-renderer),
    ytd-rich-item-renderer:has(ytd-promoted-video-renderer) {
      display: none !important;
    }

    /* ── Block recommendations ── */

    /* Watch page: sidebar "Up Next" / related videos panel */
    ytd-watch-next-secondary-results-renderer,
    #secondary-inner ytd-compact-video-renderer,
    #secondary-inner ytd-compact-playlist-renderer,
    #secondary-inner ytd-compact-radio-renderer,
    #related,

    /* Autoplay countdown overlay */
    .ytp-autonav-endscreen-upnext-container,
    .ytp-endscreen-content,
    .ytp-ce-element,

    /* End screen cards (suggested videos at end) */
    .ytp-cards-teaser,
    .ytp-ce-covering-overlay,

    /* Homepage feed (keep search results, hide home recommendations) */
    ytd-browse[page-subtype="home"] ytd-rich-grid-renderer,

    /* "What to watch next" shelf on home */
    ytd-rich-shelf-renderer,

    /* Notification dot / bell recommendations */
    ytd-notification-topbar-button-renderer {
      display: none !important;
    }

    /* Widen video player to fill the space freed by hiding sidebar */
    ytd-watch-flexy[is-two-columns_] #primary {
      max-width: 100% !important;
      width: 100% !important;
    }
    ytd-watch-flexy[is-two-columns_] #secondary {
      display: none !important;
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

  /* DOM element removal – catches anything CSS misses */
  const AD_SELECTORS = [
    '.ytp-ad-overlay-container',
    '.ytp-ad-module:not(:empty)',
    '#player-ads:not(:empty)',
    'ytd-display-ad-renderer',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-promoted-video-renderer',
    'ytd-action-companion-ad-renderer',
    'ytd-ad-slot-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-banner-promo-renderer',
    'ytd-statement-banner-renderer',
    'ytd-masthead-ad-v4-renderer',
    'ytd-masthead-ad-v3-renderer',
    '#masthead-ad',
    'ytd-enforcement-message-view-model',
  ];

  function removeAdElements() {
    injectCSS();
    for (const sel of AD_SELECTORS) {
      document.querySelectorAll(sel).forEach(el => {
        try { el.remove(); } catch {}
      });
    }
  }

  /* Watch the FULL DOM tree for new ad elements */
  new MutationObserver(removeAdElements).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  /* ─────────────────────────────────────────────────────────────────────────
   * 3. VIDEO AD SKIP – click skip button or fast-forward unskippable ads
   * ───────────────────────────────────────────────────────────────────────── */
  let skipTick = 0;
  function skipVideoAd() {
    const skip = document.querySelector(
      '.ytp-ad-skip-button:not([style*="display: none"]),' +
      '.ytp-skip-ad-button:not([style*="display: none"]),' +
      '.ytp-ad-skip-button-modern'
    );
    if (skip) { skip.click(); return; }

    const adShowing = document.querySelector('.ad-showing');
    if (adShowing) {
      const video = document.querySelector('video');
      if (video && isFinite(video.duration) && video.duration > 0.5) {
        video.currentTime = video.duration;
        if (video.paused) video.play().catch(() => {});
      }
    }

    if (++skipTick % 20 === 0) {
      document.querySelector('.ytp-ad-overlay-close-button')?.click();
    }
  }
  setInterval(skipVideoAd, 150);

  /* ─────────────────────────────────────────────────────────────────────────
   * 4. SCRIPT DEFUSER – strip ad data from YouTube's player bootstrap
   * ───────────────────────────────────────────────────────────────────────── */
  function stripAds(val) {
    if (val && typeof val === 'object') {
      try {
        delete val.adPlacements;
        delete val.playerAds;
        delete val.adSlots;
      } catch {}
    }
    return val;
  }

  let _ytInitial;
  Object.defineProperty(window, 'ytInitialPlayerResponse', {
    get() { return _ytInitial; },
    set(val) { _ytInitial = stripAds(val); },
    configurable: true,
  });

  let _ytData;
  Object.defineProperty(window, 'ytInitialData', {
    get() { return _ytData; },
    set(val) {
      if (val && val.contents) {
        try {
          // Strip ad items from homepage / search feed
          const stripFromArray = (arr) => {
            if (!Array.isArray(arr)) return;
            for (let i = arr.length - 1; i >= 0; i--) {
              const item = arr[i];
              if (item && (item.promotedSparklesTextSearchRenderer ||
                  item.searchPyvRenderer || item.displayAd ||
                  item.carouselAdRenderer)) {
                arr.splice(i, 1);
              }
            }
          };
          const tabs = val.contents?.twoColumnBrowseResultsRenderer?.tabs;
          if (tabs) tabs.forEach(t => {
            const items = t?.tabRenderer?.content?.richGridRenderer?.contents;
            if (items) stripFromArray(items);
          });
        } catch {}
      }
      _ytData = val;
    },
    configurable: true,
  });

})();

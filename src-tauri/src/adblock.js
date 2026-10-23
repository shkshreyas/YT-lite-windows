/**
 * YT Lite – Full uBlock Origin scriptlets + EasyList cosmetic filters for YouTube
 * Sources: uBlock Origin uAssets (GPLv3), EasyList (CC BY-SA 3.0), EasyPrivacy
 * Runs as initialization_script — executes BEFORE any YouTube JS.
 */
(function () {
  'use strict';
  if (window.__ytlite_adblock__) return;
  window.__ytlite_adblock__ = true;

  /* ═══════════════════════════════════════════════════════════════════════
   * 1. NETWORK FILTER  (uBlock: youtube.com##, EasyList network rules)
   * ═══════════════════════════════════════════════════════════════════════ */
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
    /youtube\.com\/set_awesome/,
    /youtube\.com\/api\/stats\/watchtime\?ad/,
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
    /imasdk\.googleapis\.com/,
    /static\.doubleclick\.net/,
    /securepubads\.g\.doubleclick\.net/,
    /pubads\.g\.doubleclick\.net/,
    /tpc\.googlesyndication\.com/,
    /partner\.googleadservices\.com/,
  ];

  function isAdURL(url) {
    if (!url) return false;
    try { return NET_BLOCK.some(r => r.test(url)); } catch { return false; }
  }

  // Patch fetch — single wrap handles both ad blocking AND player response pruning
  const _origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    // Block ad network requests outright
    if (isAdURL(url)) return Promise.resolve(new Response('', { status: 200 }));
    // Intercept YouTube InnerTube player API — strip adPlacements from response
    if (url.includes('/youtubei/v1/player')) {
      return _origFetch.apply(this, arguments).then(function(res) {
        return res.clone().json().then(function(json) {
          prunePlayerResponse(json);
          return new Response(JSON.stringify(json), { status: res.status, statusText: res.statusText });
        }).catch(function() { return res; });
      });
    }
    return _origFetch.apply(this, arguments);
  };

  // Patch XHR
  const _xhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (m, url) {
    if (isAdURL(String(url))) this._ytlBlocked = true;
    return _xhrOpen.apply(this, arguments);
  };
  const _xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    if (this._ytlBlocked) return;
    return _xhrSend.apply(this, arguments);
  };

  // Patch sendBeacon
  if (navigator.sendBeacon) {
    const _beacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function (url) {
      if (isAdURL(String(url))) return true;
      return _beacon.apply(this, arguments);
    };
  }

  /* ═══════════════════════════════════════════════════════════════════════
   * 2. SCRIPTLETS  (uBlock Origin scriptlets ported to JS)
   * ═══════════════════════════════════════════════════════════════════════ */

  // json-prune: strip ad fields from ytInitialPlayerResponse
  function prunePlayerResponse(val) {
    if (!val || typeof val !== 'object') return val;
    try {
      delete val.adPlacements;
      delete val.playerAds;
      delete val.adSlots;
      delete val.auxiliaryUi;        // bumper / interstitial UI
      // Strip adPlacements from inner arrays too
      if (Array.isArray(val.adPlacements)) val.adPlacements = [];
      if (val.streamingData && val.streamingData.serverAbrStreamingUrl) {
        // keep streamingData, just remove ad manifest pointers
      }
    } catch {}
    return val;
  }

  // json-prune: strip sponsored items from ytInitialData feed
  function pruneInitialData(val) {
    if (!val || typeof val !== 'object') return val;
    try {
      const stripAds = (obj) => {
        if (!obj || typeof obj !== 'object') return;
        if (Array.isArray(obj)) {
          for (let i = obj.length - 1; i >= 0; i--) {
            const item = obj[i];
            if (item && typeof item === 'object') {
              const keys = Object.keys(item);
              if (keys.some(k =>
                k.includes('Ad') || k.includes('ad') ||
                k.includes('promoted') || k.includes('Promoted') ||
                k.includes('sponsor') || k.includes('Sponsor') ||
                k === 'searchPyvRenderer' || k === 'carouselAdRenderer'
              )) {
                obj.splice(i, 1);
                continue;
              }
              stripAds(item);
            }
          }
        } else {
          for (const key of Object.keys(obj)) {
            stripAds(obj[key]);
          }
        }
      };
      stripAds(val);
    } catch {}
    return val;
  }

  let _ytPlayer;
  Object.defineProperty(window, 'ytInitialPlayerResponse', {
    get() { return _ytPlayer; },
    set(v) { _ytPlayer = prunePlayerResponse(v); },
    configurable: true,
  });

  let _ytData;
  Object.defineProperty(window, 'ytInitialData', {
    get() { return _ytData; },
    set(v) { _ytData = pruneInitialData(v); },
    configurable: true,
  });

  // set-constant: disable YouTube's internal ads config flags
  const YT_CONFIG_OVERRIDES = {
    'yt.ads.disable':          true,
    'ytAdsEnabled':            false,
    'ytAdUnit':                null,
    'googletag':               { cmd: { push: () => {} }, defineSlot: () => ({}), pubads: () => ({ enableSingleRequest: ()=>{}, refresh: ()=>{}, setTargeting: ()=>{} }), display: ()=>{}, enableServices: ()=>{} },
  };
  for (const [key, val] of Object.entries(YT_CONFIG_OVERRIDES)) {
    try {
      Object.defineProperty(window, key, {
        get() { return val; },
        set() {},
        configurable: true,
      });
    } catch {}
  }

  // Prevent IMA SDK from loading (Google's Interactive Media Ads)
  Object.defineProperty(window, 'google', {
    get() { return window._ytlGoogleStub; },
    set(v) {
      // Block IMA but allow other Google services
      if (v && v.ima) {
        v.ima = {
          AdDisplayContainer: function() { return { initialize: ()=>{}, destroy: ()=>{} }; },
          AdsLoader: function() { return { addEventListener: ()=>{}, requestAds: ()=>{}, contentComplete: ()=>{} }; },
          AdsRequest: function() { return {}; },
          AdErrorEvent: { Type: { AD_ERROR: 'adError' } },
          AdEvent: { Type: {} },
          ViewMode: { NORMAL: 'normal', FULLSCREEN: 'fullscreen' },
        };
      }
      window._ytlGoogleStub = v;
    },
    configurable: true,
  });

  /* ═══════════════════════════════════════════════════════════════════════
   * 3. COSMETIC FILTERS  (uBlock Origin youtube.com## rules + EasyList)
   * ═══════════════════════════════════════════════════════════════════════ */
  const CSS = `
    /* ── uBlock: video player ad overlays ── */
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
    .ytp-ad-persistent-progress-bar-container,
    .ytp-ad-progress,
    .ytp-ad-progress-list,
    .ytp-ads-indicator,
    .ad-showing .ytp-ad-module,
    #player-ads,
    #ad-badge,
    .html5-video-player .ytp-ad-module:not(:empty),

    /* ── uBlock: in-feed / companion ad renderers ── */
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
    ytd-promoted-sparkles-text-search-renderer,
    ytd-player-legacy-desktop-watch-ads-renderer,
    ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],

    /* ── uBlock: masthead / banner ads ── */
    #masthead-ad,
    ytd-masthead-ad-v4-renderer,
    ytd-masthead-ad-v3-renderer,
    ytd-masthead-ad-v2-renderer,

    /* ── uBlock: Shorts ads ── */
    ytd-reel-shelf-renderer[is-slim-media],
    ytd-reel-video-renderer .ytd-display-ad-renderer,

    /* ── uBlock: premium upsell / enforcement ── */
    ytd-enforcement-message-view-model,
    ytd-popup-container:has(ytd-mealbar-promo-renderer),
    tp-yt-paper-dialog:has(ytd-mealbar-promo-renderer),
    ytd-premium-promo-renderer,
    ytd-modal-with-title-and-button-renderer,

    /* ── uBlock: shopping / merch / sponsor cards ── */
    ytd-merch-shelf-renderer,
    ytd-product-list-renderer,
    ytd-sponsorcard-renderer,
    ytd-brand-video-shelf-renderer,
    ytd-brand-video-singleton-renderer,

    /* ── uBlock: survey / feedback overlays ── */
    .ytd-mealbar-promo-renderer,
    yt-confirm-dialog-renderer:has([href*="premium"]),

    /* ── EasyList: Google ad iframes ── */
    iframe[src*="doubleclick.net"],
    iframe[src*="googlesyndication.com"],
    iframe[src*="googleadservices.com"],
    iframe[id*="google_ads"],
    ins.adsbygoogle {
      display: none !important;
      visibility: hidden !important;
      pointer-events: none !important;
      height: 0 !important;
      min-height: 0 !important;
      max-height: 0 !important;
      overflow: hidden !important;
      opacity: 0 !important;
    }

    /* ── Hide sponsored rows in feed ── */
    ytd-rich-item-renderer:has(ytd-display-ad-renderer),
    ytd-rich-item-renderer:has(ytd-promoted-sparkles-web-renderer),
    ytd-rich-item-renderer:has(ytd-promoted-video-renderer) {
      display: none !important;
    }

    /* ── Block recommendations ── */
    ytd-watch-next-secondary-results-renderer,
    #secondary-inner ytd-compact-video-renderer,
    #secondary-inner ytd-compact-playlist-renderer,
    #secondary-inner ytd-compact-radio-renderer,
    #related,
    .ytp-autonav-endscreen-upnext-container,
    .ytp-endscreen-content,
    .ytp-ce-element,
    .ytp-cards-teaser,
    .ytp-ce-covering-overlay,
    ytd-browse[page-subtype="home"] ytd-rich-grid-renderer,
    ytd-rich-shelf-renderer {
      display: none !important;
    }

    /* Widen video when sidebar hidden */
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
    s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }
  injectCSS();

  /* ═══════════════════════════════════════════════════════════════════════
   * 4. DOM REMOVAL  — belt-and-suspenders; catches what CSS misses
   * ═══════════════════════════════════════════════════════════════════════ */
  const REMOVE_SELS = [
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
    'ytd-promoted-sparkles-text-search-renderer',
    'ytd-companion-slot-renderer',
  ];

  function sweepAds() {
    injectCSS();
    for (const sel of REMOVE_SELS) {
      try { document.querySelectorAll(sel).forEach(el => el.remove()); } catch {}
    }
  }

  new MutationObserver(sweepAds).observe(document.documentElement, {
    childList: true, subtree: true,
  });

  /* ═══════════════════════════════════════════════════════════════════════
   * 5. VIDEO AD SKIP  — click skip button; fast-forward unskippable ads
   * ═══════════════════════════════════════════════════════════════════════ */
  function skipAd() {
    const btn = document.querySelector(
      '.ytp-ad-skip-button:not([style*="display: none"]),' +
      '.ytp-skip-ad-button:not([style*="display: none"]),' +
      '.ytp-ad-skip-button-modern:not([style*="display: none"])'
    );
    if (btn) { btn.click(); return; }

    if (document.querySelector('.ad-showing')) {
      const v = document.querySelector('video');
      if (v && isFinite(v.duration) && v.duration > 0.5) {
        v.muted = true;
        v.currentTime = v.duration;
        v.play().catch(() => {});
      }
    }

    // Close banner / overlay ads
    document.querySelector('.ytp-ad-overlay-close-button')?.click();
    document.querySelector('.ytp-ad-skip-button-container button')?.click();
  }
  setInterval(skipAd, 150);


})();

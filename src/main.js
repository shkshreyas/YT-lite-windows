const { invoke } = window.__TAURI__.core;
const { getCurrentWindow, WebviewWindow } = window.__TAURI__.window;
const { emit, listen } = window.__TAURI__.event;

const win = getCurrentWindow();
let tabs = [];
let activeTabId = null;
let tabCounter = 0;

// ── Ad Block Script injected into every YouTube page ──────────────────────
const ADBLOCK_SCRIPT = `(function(){
  // CSS: hide all ad containers
  const css = \`
    .ad-showing .ytp-ad-module, .ytp-ad-overlay-container,
    .ytp-ad-text-overlay, .ytp-ad-skip-button-container,
    ytd-display-ad-renderer, ytd-promoted-sparkles-web-renderer,
    ytd-promoted-video-renderer, ytd-search-pyv-renderer,
    ytd-banner-promo-renderer, ytd-statement-banner-renderer,
    ytd-ad-slot-renderer, yt-about-this-ad-renderer,
    ytd-in-feed-ad-layout-renderer, #masthead-ad,
    .ytd-mealbar-promo-renderer, ytd-rich-item-renderer[is-slim-media],
    #player-ads, .ytd-companion-slot-renderer,
    tp-yt-paper-dialog:has(ytd-mealbar-promo-renderer) {
      display:none!important;
    }
  \`;
  const s = document.createElement('style');
  s.textContent = css;
  (document.head || document.documentElement).appendChild(s);

  // Skip video ads: fast-forward or click skip
  function skipAd(){
    const skip = document.querySelector('.ytp-ad-skip-button,.ytp-skip-ad-button');
    if(skip){ skip.click(); return; }
    if(document.querySelector('.ad-showing')){
      const v = document.querySelector('video');
      if(v && isFinite(v.duration) && v.duration > 0) v.currentTime = v.duration;
    }
  }
  setInterval(skipAd, 250);

  // Block ad XHR/fetch
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m,u,...a){
    if(/doubleclick|googlesyndication|googleadservices|\\/pagead\\/|adsystem|adformat|stats\\/ads/.test(u||'')) return;
    return _open.apply(this,arguments);
  };
  const _fetch = window.fetch;
  window.fetch = function(r,...a){
    const u = typeof r==='string'?r:(r&&r.url)||'';
    if(/doubleclick|googlesyndication|\\/pagead\\/|stats\\/ads/.test(u)) return Promise.resolve(new Response('',{status:200}));
    return _fetch.apply(this,arguments);
  };
})();`;

// ── Tab management ────────────────────────────────────────────────────────
function createTab(url = 'https://www.youtube.com') {
  const id = ++tabCounter;

  // Create webview element (Tauri webview tag)
  const wv = document.createElement('webview');
  wv.id = `wv-${id}`;
  wv.setAttribute('src', url);
  wv.setAttribute('allowpopups', '');
  wv.setAttribute('partition', 'persist:yt'); // shared cookies = Google sign-in persists
  wv.setAttribute('useragent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
  document.getElementById('webviews').appendChild(wv);

  // Inject adblock on every page load
  wv.addEventListener('dom-ready', () => {
    wv.executeJavaScript(ADBLOCK_SCRIPT).catch(() => {});
    updateNavBar();
  });
  wv.addEventListener('page-title-updated', e => {
    const tab = tabs.find(t => t.id === id);
    if (tab) { tab.title = e.title; renderTabs(); }
  });
  wv.addEventListener('page-favicon-updated', e => {
    const tab = tabs.find(t => t.id === id);
    if (tab && e.favicons?.[0]) { tab.favicon = e.favicons[0]; renderTabs(); }
  });
  wv.addEventListener('did-navigate', e => {
    if (id === activeTabId) {
      document.getElementById('url-bar').value = e.url;
      updateNavBar();
    }
  });

  const tab = { id, title: 'YouTube', favicon: '', wv };
  tabs.push(tab);
  switchTab(id);
  return id;
}

function switchTab(id) {
  activeTabId = id;
  tabs.forEach(t => {
    t.wv.classList.toggle('active', t.id === id);
  });
  renderTabs();
  const active = tabs.find(t => t.id === id);
  if (active) {
    try {
      document.getElementById('url-bar').value = active.wv.getURL?.() || 'https://www.youtube.com';
    } catch {}
  }
  updateNavBar();
}

function closeTab(id) {
  const idx = tabs.findIndex(t => t.id === id);
  if (idx === -1) return;
  tabs[idx].wv.remove();
  tabs.splice(idx, 1);
  if (tabs.length === 0) { win.close(); return; }
  if (activeTabId === id) switchTab(tabs[Math.min(idx, tabs.length - 1)].id);
  renderTabs();
}

function renderTabs() {
  const container = document.getElementById('tabs');
  container.innerHTML = '';
  tabs.forEach(tab => {
    const el = document.createElement('div');
    el.className = 'tab' + (tab.id === activeTabId ? ' active' : '');
    el.innerHTML = `
      ${tab.favicon ? `<img class="tab-favicon" src="${tab.favicon}" onerror="this.style.display='none'">` : ''}
      <span class="tab-title">${escHtml(tab.title || 'New Tab')}</span>
      <button class="tab-close" data-id="${tab.id}" title="Close tab">✕</button>
    `;
    el.addEventListener('click', e => {
      if (!e.target.classList.contains('tab-close')) switchTab(tab.id);
    });
    el.querySelector('.tab-close').addEventListener('click', e => {
      e.stopPropagation();
      closeTab(tab.id);
    });
    container.appendChild(el);
  });
}

function activeWv() {
  return tabs.find(t => t.id === activeTabId)?.wv;
}

function updateNavBar() {
  const wv = activeWv();
  if (!wv) return;
  try {
    document.getElementById('btn-back').disabled = !wv.canGoBack?.();
    document.getElementById('btn-forward').disabled = !wv.canGoForward?.();
  } catch {}
}

// ── Navbar actions ────────────────────────────────────────────────────────
document.getElementById('btn-back').onclick = () => activeWv()?.goBack?.();
document.getElementById('btn-forward').onclick = () => activeWv()?.goForward?.();
document.getElementById('btn-reload').onclick = () => activeWv()?.reload?.();
document.getElementById('btn-home').onclick = () => activeWv()?.loadURL?.('https://www.youtube.com');

document.getElementById('url-bar').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  let val = e.target.value.trim();
  if (!val) return;
  if (!/^https?:\/\//i.test(val)) val = 'https://' + val;
  activeWv()?.loadURL?.(val);
});

document.getElementById('new-tab-btn').onclick = () => createTab();

// ── Fullscreen ────────────────────────────────────────────────────────────
let isFullscreen = false;
document.getElementById('btn-fullscreen').onclick = toggleFullscreen;
document.addEventListener('keydown', e => {
  if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); }
  if (e.key === 'Escape' && isFullscreen) toggleFullscreen();
});

async function toggleFullscreen() {
  isFullscreen = !isFullscreen;
  document.body.classList.toggle('fullscreen', isFullscreen);
  await win.setFullscreen(isFullscreen);
  document.getElementById('btn-fullscreen').title = isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen (F11)';
}

// ── Window controls ───────────────────────────────────────────────────────
document.getElementById('btn-min').onclick = () => win.minimize();
document.getElementById('btn-max').onclick = async () => {
  const maximized = await win.isMaximized();
  maximized ? win.unmaximize() : win.maximize();
};
document.getElementById('btn-close').onclick = () => win.close();

// ── Keyboard shortcuts ────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key === 't') { e.preventDefault(); createTab(); }
  if (ctrl && e.key === 'w') { e.preventDefault(); if (activeTabId) closeTab(activeTabId); }
  if (ctrl && e.key === 'l') { e.preventDefault(); document.getElementById('url-bar').select(); }
  if (ctrl && e.key === 'r') { e.preventDefault(); activeWv()?.reload?.(); }
  // Ctrl+1-9 to switch tabs
  if (ctrl && e.key >= '1' && e.key <= '9') {
    const idx = parseInt(e.key) - 1;
    if (tabs[idx]) switchTab(tabs[idx].id);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Init ──────────────────────────────────────────────────────────────────
createTab('https://www.youtube.com');

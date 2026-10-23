/* Tab bar — injected into every YouTube window. __TAB_ID__ is replaced at runtime. */
(function () {
  if (document.getElementById('__ytl_bar__')) return;
  const TAB_ID = '__TAB_ID__';
  const T = window.__TAURI__ && window.__TAURI__.core;
  const EV = window.__TAURI__ && window.__TAURI__.event;
  const WIN = window.__TAURI__ && window.__TAURI__.window;

  /* ── Bar markup ── */
  const bar = document.createElement('div');
  bar.id = '__ytl_bar__';
  document.documentElement.appendChild(bar);

  const css = document.createElement('style');
  css.textContent = `
    #__ytl_bar__ {
      position:fixed;top:0;left:0;right:0;height:38px;
      background:#0f0f0f;display:flex;align-items:center;
      z-index:2147483647;padding:0 6px;gap:3px;
      border-bottom:1px solid #2a2a2a;
      font-family:-apple-system,'Segoe UI',sans-serif;font-size:12px;
      box-shadow:0 1px 8px rgba(0,0,0,.5);
      -webkit-app-region:drag;
    }
    #__ytl_bar__ * { -webkit-app-region:no-drag; box-sizing:border-box; }
    #__ytl_logo__ { display:flex;align-items:center;padding:0 8px 0 2px;flex-shrink:0; }
    #__ytl_tabs__ {
      display:flex;align-items:flex-end;flex:1;gap:1px;
      overflow-x:auto;overflow-y:hidden;height:38px;scrollbar-width:none;
    }
    #__ytl_tabs__::-webkit-scrollbar { display:none; }
    .ytl-tab {
      display:flex;align-items:center;gap:4px;
      height:30px;padding:0 6px 0 8px;
      border-radius:6px 6px 0 0;min-width:90px;max-width:180px;
      background:#1c1c1c;cursor:pointer;flex-shrink:0;
      transition:background .12s;
    }
    .ytl-tab:hover { background:#252525; }
    .ytl-tab.active { background:#282828;box-shadow:inset 0 2px 0 #f00; }
    .ytl-tab img { width:13px;height:13px;border-radius:2px;flex-shrink:0; }
    .ytl-tab .t { flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#e0e0e0;font-size:11.5px; }
    .ytl-tab .x {
      width:16px;height:16px;border:none;background:transparent;
      color:#666;font-size:11px;cursor:pointer;border-radius:50%;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;
    }
    .ytl-tab .x:hover { background:#444;color:#fff; }
    #__ytl_new__ {
      width:28px;height:28px;border:none;background:transparent;
      color:#666;font-size:20px;cursor:pointer;border-radius:6px;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;
    }
    #__ytl_new__:hover { background:#222;color:#ccc; }
    ytd-app, #page-manager { padding-top:38px!important; }
    #masthead-container { top:38px!important; }
    :fullscreen #__ytl_bar__, :-webkit-full-screen #__ytl_bar__ { display:none!important; }
  `;
  document.head.appendChild(css);

  bar.innerHTML = `
    <div id="__ytl_logo__">
      <svg width="20" height="20" viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
        <rect width="90" height="90" rx="18" fill="#fff"/>
        <rect x="8" y="24" width="74" height="42" rx="12" fill="#f00"/>
        <polygon points="34,30 34,60 62,45" fill="#fff"/>
      </svg>
    </div>
    <div id="__ytl_tabs__"></div>
    <button id="__ytl_new__" title="New tab (Ctrl+T)">+</button>
  `;

  /* ── Render tab list ── */
  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderTabs(tabs) {
    const el = document.getElementById('__ytl_tabs__');
    if (!el) return;
    el.innerHTML = '';
    (tabs || []).forEach(function (tab) {
      const d = document.createElement('div');
      d.className = 'ytl-tab' + (tab.id === TAB_ID ? ' active' : '');
      d.innerHTML =
        (tab.favicon ? '<img src="' + esc(tab.favicon) + '" onerror="this.remove()">' : '') +
        '<span class="t" title="' + esc(tab.title) + '">' + esc(tab.title || 'YouTube') + '</span>' +
        '<button class="x" title="Close">&#x2715;</button>';
      d.querySelector('.x').addEventListener('click', function (e) {
        e.stopPropagation();
        T && T.invoke('close_tab', { id: tab.id });
      });
      d.addEventListener('click', function () {
        T && T.invoke('switch_tab', { id: tab.id });
      });
      el.appendChild(d);
    });
  }

  /* ── Subscribe to tab updates from Rust ── */
  if (EV) EV.listen('tabs-updated', function (e) { renderTabs(e.payload); });
  if (T) T.invoke('get_tabs').then(renderTabs).catch(function () {});

  /* ── Notify Rust when title/favicon changes ── */
  function notifyUpdate() {
    if (!T) return;
    var favicon = '';
    var link = document.querySelector('link[rel~="icon"]');
    if (link) favicon = link.href || '';
    T.invoke('tab_update', {
      id: TAB_ID,
      title: document.title || 'YouTube',
      favicon: favicon,
      url: location.href,
    }).catch(function () {});
  }
  var titleEl = document.querySelector('title') || document.head;
  new MutationObserver(notifyUpdate).observe(titleEl, { childList: true, characterData: true, subtree: true });
  window.addEventListener('yt-navigate-finish', notifyUpdate);
  setTimeout(notifyUpdate, 1500);

  /* ── Buttons ── */
  document.getElementById('__ytl_new__').addEventListener('click', function () {
    T && T.invoke('new_tab');
  });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 't') { e.preventDefault(); T && T.invoke('new_tab'); }
    if (e.key === 'F11') { e.preventDefault(); toggleFs(); }
    if (e.key === 'Escape') { document.fullscreenElement && document.exitFullscreen(); }
  });

  function toggleFs() {
    if (!WIN) return;
    var w = WIN.getCurrentWindow();
    w.isFullscreen().then(function (fs) { w.setFullscreen(!fs); });
  }
})();

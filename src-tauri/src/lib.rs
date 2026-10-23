use std::sync::{Arc, Mutex};
use tauri::{command, AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use serde::{Deserialize, Serialize};

const ADBLOCK: &str = include_str!("adblock.js");
const CHROME_H: f64 = 42.0;

#[derive(Clone, Serialize, Deserialize)]
pub struct TabInfo {
    pub id: String,
    pub title: String,
    pub favicon: String,
    pub url: String,
}

type TabState = Arc<Mutex<Vec<TabInfo>>>;

fn get_arc(app: &AppHandle) -> TabState {
    app.state::<TabState>().inner().clone()
}

fn content_script(tab_id: &str) -> String {
    format!(
        r#"
        {}
        (function(){{
            const TAB_ID = "{}";
            function notify(){{
                if(!window.__TAURI__) return;
                window.__TAURI__.core.invoke('tab_update',{{
                    id: TAB_ID,
                    title: document.title || 'YouTube',
                    favicon: (document.querySelector('link[rel~="icon"]') || {{}}).href || '',
                    url: location.href,
                }}).catch(()=>{{}});
            }}
            new MutationObserver(notify).observe(document.querySelector('title')||document.head,
                {{childList:true,characterData:true,subtree:true}});
            window.addEventListener('yt-navigate-finish', notify);
            setTimeout(notify, 1500);
        }})();
        "#,
        ADBLOCK, tab_id
    )
}

fn make_tab_window(app: &AppHandle, tab_id: &str, url: &str) -> tauri::Result<()> {
    let script = content_script(tab_id);
    WebviewWindowBuilder::new(app, tab_id, WebviewUrl::External(url.parse().unwrap()))
        .title("YT Lite")
        .inner_size(1280.0, 800.0)
        .min_inner_size(800.0, 500.0)
        .decorations(false)
        .initialization_script(&script)
        .build()?;
    Ok(())
}

fn broadcast_tabs(app: &AppHandle) {
    let arc = get_arc(app);
    let tabs = arc.lock().unwrap().clone();
    if let Some(chrome) = app.get_webview_window("chrome") {
        let _ = chrome.emit("tabs-updated", tabs);
    }
}

// ── Commands ──────────────────────────────────────────────────────────────

#[command]
fn new_tab(app: AppHandle) -> Result<String, String> {
    let id = format!("yt-{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis());
    {
        let arc = get_arc(&app);
        arc.lock().unwrap().push(TabInfo {
            id: id.clone(), title: "YouTube".into(),
            favicon: String::new(), url: "https://www.youtube.com".into(),
        });
    }
    make_tab_window(&app, &id, "https://www.youtube.com").map_err(|e| e.to_string())?;
    broadcast_tabs(&app);
    Ok(id)
}

#[command]
fn close_tab(app: AppHandle, id: String) {
    {
        let arc = get_arc(&app);
        arc.lock().unwrap().retain(|t| t.id != id);
    }
    if let Some(win) = app.get_webview_window(&id) { let _ = win.close(); }
    broadcast_tabs(&app);
    let arc = get_arc(&app);
    if arc.lock().unwrap().is_empty() {
        if let Some(chrome) = app.get_webview_window("chrome") { let _ = chrome.close(); }
    }
}

#[command]
fn switch_tab(app: AppHandle, id: String) {
    if let Some(win) = app.get_webview_window(&id) { let _ = win.set_focus(); }
}

#[command]
fn tab_update(app: AppHandle, id: String, title: String, favicon: String, url: String) {
    {
        let arc = get_arc(&app);
        let mut tabs = arc.lock().unwrap();
        if let Some(t) = tabs.iter_mut().find(|t| t.id == id) {
            t.title = title; t.favicon = favicon; t.url = url;
        }
    }
    broadcast_tabs(&app);
}

#[command]
fn get_tabs(app: AppHandle) -> Vec<TabInfo> {
    let arc = get_arc(&app);
    let x = arc.lock().unwrap().clone();
    x
}

#[command]
async fn toggle_fullscreen(window: tauri::WebviewWindow) {
    let is_fs = window.is_fullscreen().unwrap_or(false);
    let _ = window.set_fullscreen(!is_fs);
    if let Some(chrome) = window.app_handle().get_webview_window("chrome") {
        let _ = chrome.set_fullscreen(!is_fs);
    }
}

// ── Entry point ───────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let tabs: TabState = Arc::new(Mutex::new(Vec::new()));
    tauri::Builder::default()
        .manage(tabs)
        .setup(|app| {
            WebviewWindowBuilder::new(app, "chrome", WebviewUrl::App("chrome.html".into()))
                .title("YT Lite")
                .inner_size(1280.0, CHROME_H)
                .min_inner_size(400.0, CHROME_H)
                .max_inner_size(99999.0, CHROME_H)
                .resizable(false)
                .decorations(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .build()?;

            let first_id = "yt-1";
            {
                let arc = app.state::<TabState>().inner().clone();
                arc.lock().unwrap().push(TabInfo {
                    id: first_id.to_string(), title: "YouTube".into(),
                    favicon: String::new(), url: "https://www.youtube.com".into(),
                });
            }
            make_tab_window(app.handle(), first_id, "https://www.youtube.com")?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            new_tab, close_tab, switch_tab, tab_update, get_tabs, toggle_fullscreen
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

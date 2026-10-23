use std::sync::{Arc, Mutex};
use tauri::{command, AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use serde::{Deserialize, Serialize};

const ADBLOCK: &str = include_str!("adblock.js");
const TABBAR: &str  = include_str!("tabbar.js");
const UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) \
    AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct TabInfo {
    pub id: String,
    pub title: String,
    pub favicon: String,
    pub url: String,
}

type TabList = Arc<Mutex<Vec<TabInfo>>>;

fn tabs(app: &AppHandle) -> TabList {
    app.state::<TabList>().inner().clone()
}

/// Build the initialization script: adblock first, then tab bar with ID substituted.
fn init_script(tab_id: &str) -> String {
    let tabbar = TABBAR.replace("'__TAB_ID__'", &format!("'{}'", tab_id));
    format!("{}\n{}", ADBLOCK, tabbar)
}

fn make_tab(app: &AppHandle, id: &str, url: &str) -> tauri::Result<()> {
    let script = init_script(id);
    WebviewWindowBuilder::new(app, id, WebviewUrl::External(url.parse().unwrap()))
        .title("YT Lite")
        .inner_size(1280.0, 800.0)
        .min_inner_size(800.0, 500.0)
        .decorations(false)
        .user_agent(UA)
        .initialization_script(&script)
        .build()?;
    Ok(())
}

fn broadcast(app: &AppHandle) {
    let arc = tabs(app);
    let list: Vec<TabInfo> = { arc.lock().unwrap().clone() };
    for t in &list {
        if let Some(w) = app.get_webview_window(&t.id) {
            let _ = w.emit("tabs-updated", &list);
        }
    }
}

// ── Commands ──────────────────────────────────────────────────────────────

#[command]
fn new_tab(app: AppHandle) -> Result<(), String> {
    let id = format!("yt-{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis());
    {
        let arc = tabs(&app);
        arc.lock().unwrap().push(TabInfo {
            id: id.clone(), title: "YouTube".into(),
            favicon: String::new(), url: "https://www.youtube.com".into(),
        });
    }
    make_tab(&app, &id, "https://www.youtube.com").map_err(|e| e.to_string())?;
    broadcast(&app);
    Ok(())
}

#[command]
fn close_tab(app: AppHandle, id: String) {
    {
        let arc = tabs(&app);
        arc.lock().unwrap().retain(|t| t.id != id);
    }
    if let Some(w) = app.get_webview_window(&id) { let _ = w.close(); }
    let arc = tabs(&app);
    if arc.lock().unwrap().is_empty() { return; }
    broadcast(&app);
}

#[command]
fn switch_tab(app: AppHandle, id: String) {
    if let Some(w) = app.get_webview_window(&id) { let _ = w.set_focus(); }
}

#[command]
fn tab_update(app: AppHandle, id: String, title: String, favicon: String, url: String) {
    {
        let arc = tabs(&app);
        let mut list = arc.lock().unwrap();
        if let Some(t) = list.iter_mut().find(|t| t.id == id) {
            if !title.is_empty() { t.title = title; }
            if !favicon.is_empty() { t.favicon = favicon; }
            if !url.is_empty() { t.url = url; }
        }
    }
    broadcast(&app);
}

#[command]
fn get_tabs(app: AppHandle) -> Vec<TabInfo> {
    let arc = tabs(&app);
    let v = arc.lock().unwrap().clone();
    v
}

// ── Entry point ───────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let list: TabList = Arc::new(Mutex::new(Vec::new()));
    tauri::Builder::default()
        .manage(list)
        .setup(|app| {
            let first = "yt-1";
            {
                let arc = app.state::<TabList>().inner().clone();
                arc.lock().unwrap().push(TabInfo {
                    id: first.to_string(), title: "YouTube".into(),
                    favicon: String::new(), url: "https://www.youtube.com".into(),
                });
            }
            make_tab(app.handle(), first, "https://www.youtube.com")?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            new_tab, close_tab, switch_tab, tab_update, get_tabs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

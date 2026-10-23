use tauri::{
    command, AppHandle, Manager, Runtime, WebviewUrl, WebviewWindowBuilder,
};

const ADBLOCK: &str = include_str!("adblock.js");

#[command]
fn new_tab(app: AppHandle) {
    let label = format!("yt-{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_millis());

    let _ = WebviewWindowBuilder::new(
        &app,
        label,
        WebviewUrl::External("https://www.youtube.com".parse().unwrap()),
    )
    .title("YT Lite")
    .inner_size(1280.0, 800.0)
    .min_inner_size(800.0, 500.0)
    .initialization_script(ADBLOCK)
    .build();
}

#[command]
async fn toggle_fullscreen<R: Runtime>(window: tauri::Window<R>) {
    let is_fs = window.is_fullscreen().unwrap_or(false);
    let _ = window.set_fullscreen(!is_fs);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External("https://www.youtube.com".parse().unwrap()),
            )
            .title("YT Lite")
            .inner_size(1280.0, 800.0)
            .min_inner_size(800.0, 500.0)
            .initialization_script(ADBLOCK)
            .build()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![new_tab, toggle_fullscreen])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

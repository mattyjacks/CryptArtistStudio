// Background Process Management for CryptArtist Studio
// Handles background/foreground separation, system tray integration, and lifecycle management

use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, Window};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone)]
pub struct BackgroundState {
    pub is_running: bool,
    pub is_minimized: bool,
    pub start_time: u64,
    pub last_activity: u64,
    pub error_count: u32,
    pub last_error: Option<String>,
}

impl Default for BackgroundState {
    fn default() -> Self {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        BackgroundState {
            is_running: true,
            is_minimized: false,
            start_time: now,
            last_activity: now,
            error_count: 0,
            last_error: None,
        }
    }
}

pub struct BackgroundManager {
    state: Arc<Mutex<BackgroundState>>,
    app_handle: Option<AppHandle>,
}

impl BackgroundManager {
    pub fn new() -> Self {
        BackgroundManager {
            state: Arc::new(Mutex::new(BackgroundState::default())),
            app_handle: None,
        }
    }

    pub fn initialize(&mut self, app: AppHandle) {
        self.app_handle = Some(app);
        if let Ok(mut state) = self.state.lock() {
            state.is_running = true;
        }
    }

    /// Update last activity timestamp
    pub fn update_activity(&self) {
        if let Ok(mut state) = self.state.lock() {
            state.last_activity = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
        }
    }

    /// Get current background state
    pub fn get_state(&self) -> Result<BackgroundState, String> {
        self.state
            .lock()
            .map(|s| s.clone())
            .map_err(|e| format!("Failed to get state: {}", e))
    }

    /// Minimize to background
    pub fn minimize_to_background(&self, app: &AppHandle) -> Result<(), String> {
        if let Ok(mut state) = self.state.lock() {
            state.is_minimized = true;
        }

        // Hide all windows
        for window in app.windows().values() {
            let _ = window.hide();
        }

        self.update_activity();
        Ok(())
    }

    /// Restore from background
    pub fn restore_from_background(&self, app: &AppHandle) -> Result<(), String> {
        if let Ok(mut state) = self.state.lock() {
            state.is_minimized = false;
        }

        // Show main window
        if let Some(window) = app.get_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }

        self.update_activity();
        Ok(())
    }

    /// Record error with recovery
    pub fn record_error(&self, error: String) -> Result<(), String> {
        if let Ok(mut state) = self.state.lock() {
            state.error_count += 1;
            state.last_error = Some(error);

            // Auto-recovery: reset error count after 5 minutes
            if state.error_count > 10 {
                state.error_count = 0;
            }
        }
        Ok(())
    }

    /// Check if background process is healthy
    pub fn is_healthy(&self) -> bool {
        if let Ok(state) = self.state.lock() {
            state.is_running && state.error_count < 5
        } else {
            false
        }
    }

    /// Graceful shutdown
    pub fn shutdown(&self) -> Result<(), String> {
        if let Ok(mut state) = self.state.lock() {
            state.is_running = false;
        }
        Ok(())
    }

    /// Get uptime in seconds
    pub fn get_uptime(&self) -> Result<u64, String> {
        if let Ok(state) = self.state.lock() {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
            Ok(now - state.start_time)
        } else {
            Err("Failed to get uptime".to_string())
        }
    }
}

impl Default for BackgroundManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Tauri commands for background management
#[tauri::command]
pub fn minimize_to_tray(app: tauri::AppHandle) -> Result<(), String> {
    for window in app.windows().values() {
        let _ = window.hide();
    }
    Ok(())
}

#[tauri::command]
pub fn restore_from_tray(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
    Ok(())
}

#[tauri::command]
pub fn get_background_state(app: tauri::AppHandle) -> Result<String, String> {
    let windows = app.windows();
    let main_visible = windows
        .get("main")
        .map(|w| w.is_visible().unwrap_or(false))
        .unwrap_or(false);

    Ok(format!(
        "{{\"visible\": {}, \"window_count\": {}}}",
        main_visible,
        windows.len()
    ))
}

#[tauri::command]
pub fn quit_app(app: tauri::AppHandle) -> Result<(), String> {
    app.exit(0);
    Ok(())
}

#[tauri::command]
pub fn is_app_running(app: tauri::AppHandle) -> Result<bool, String> {
    Ok(app.windows().len() > 0)
}

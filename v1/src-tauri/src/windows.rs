// Multi-window management for CryptArtist Studio
// Handles creation, lifecycle, and communication between multiple windows

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowConfig {
    pub id: String,
    pub title: String,
    pub width: f64,
    pub height: f64,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub program: String,
    pub data: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    pub id: String,
    pub title: String,
    pub width: f64,
    pub height: f64,
    pub x: f64,
    pub y: f64,
    pub program: String,
    pub focused: bool,
    pub minimized: bool,
}

pub struct WindowManager {
    windows: Mutex<HashMap<String, WindowState>>,
    max_windows: usize,
}

impl WindowManager {
    pub fn new() -> Self {
        WindowManager {
            windows: Mutex::new(HashMap::new()),
            max_windows: 10,
        }
    }

    /// Create a new window
    pub fn create_window(
        &self,
        _app: &tauri::AppHandle,
        config: WindowConfig,
    ) -> Result<String, String> {
        let mut windows = self.windows.lock().unwrap();

        // Check max windows limit
        if windows.len() >= self.max_windows {
            return Err(format!(
                "Maximum {} windows open. Close a window to open another.",
                self.max_windows
            ));
        }

        // Create window state
        let window_state = WindowState {
            id: config.id.clone(),
            title: config.title.clone(),
            width: config.width,
            height: config.height,
            x: config.x.unwrap_or(0.0),
            y: config.y.unwrap_or(0.0),
            program: config.program.clone(),
            focused: true,
            minimized: false,
        };

        windows.insert(config.id.clone(), window_state);
        Ok(config.id)
    }

    /// Close a window
    pub fn close_window(&self, window_id: &str) -> Result<(), String> {
        let mut windows = self.windows.lock().unwrap();
        windows.remove(window_id);
        Ok(())
    }

    /// Get all open windows
    pub fn get_windows(&self) -> Result<Vec<WindowState>, String> {
        let windows = self.windows.lock().unwrap();
        Ok(windows.values().cloned().collect())
    }

    /// Get window by ID
    pub fn get_window(&self, window_id: &str) -> Result<WindowState, String> {
        let windows = self.windows.lock().unwrap();
        windows
            .get(window_id)
            .cloned()
            .ok_or_else(|| format!("Window {} not found", window_id))
    }

    /// Update window state
    pub fn update_window_state(
        &self,
        window_id: &str,
        width: f64,
        height: f64,
        x: f64,
        y: f64,
        focused: bool,
        minimized: bool,
    ) -> Result<(), String> {
        let mut windows = self.windows.lock().unwrap();
        if let Some(window) = windows.get_mut(window_id) {
            window.width = width;
            window.height = height;
            window.x = x;
            window.y = y;
            window.focused = focused;
            window.minimized = minimized;
            Ok(())
        } else {
            Err(format!("Window {} not found", window_id))
        }
    }

    /// Get window count
    pub fn window_count(&self) -> usize {
        self.windows.lock().unwrap().len()
    }

    /// Check if can create more windows
    pub fn can_create_window(&self) -> bool {
        self.window_count() < self.max_windows
    }

    /// Set max windows limit
    pub fn set_max_windows(&mut self, max: usize) {
        self.max_windows = max;
    }

    /// Get max windows limit
    pub fn get_max_windows(&self) -> usize {
        self.max_windows
    }
}

impl Default for WindowManager {
    fn default() -> Self {
        Self::new()
    }
}

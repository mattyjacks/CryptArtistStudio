// Library entry point for Android builds
// Re-exports main functionality for mobile platforms

pub mod ai_integration;
pub mod background;
pub mod debug_play;
pub mod ffmpeg_installer;
pub mod logger;
pub mod screen_capture;
pub mod state;
pub mod system_menu;
pub mod window_commands;
pub mod windows;

// Export main initialization for Tauri
pub use state::AppState;

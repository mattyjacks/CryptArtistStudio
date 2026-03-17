use serde::{Serialize, Deserialize};
use std::process::{Command, Child};
use std::sync::{Arc, Mutex};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenCaptureSession {
    pub session_id: String,
    pub output_path: PathBuf,
}

lazy_static::lazy_static! {
    static ref FFMPEG_PROCESS: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(None));
}

#[tauri::command]
pub fn start_screen_capture(output_path: String) -> Result<String, String> {
    let session_id = uuid::Uuid::new_v4().to_string();
    
    #[cfg(target_os = "macos")]
    {
        let mut process = FFMPEG_PROCESS.lock().map_err(|e| e.to_string())?;
        
        if process.is_some() {
            return Err("Recording already in progress".to_string());
        }
        
        let child = Command::new("ffmpeg")
            .args(&[
                "-f", "avfoundation",
                "-i", "1:0",
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-c:a", "aac",
                &output_path,
            ])
            .spawn()
            .map_err(|e| format!("Failed to start recording: {}", e))?;
        
        *process = Some(child);
        Ok(session_id)
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        Err("Screen capture only supported on macOS".to_string())
    }
}

#[tauri::command]
pub fn stop_screen_capture() -> Result<String, String> {
    let mut process = FFMPEG_PROCESS.lock().map_err(|e| e.to_string())?;
    
    if let Some(mut child) = process.take() {
        child.kill().map_err(|e| format!("Failed to stop recording: {}", e))?;
        Ok("Recording stopped".to_string())
    } else {
        Err("No active recording".to_string())
    }
}

#[tauri::command]
pub fn is_screen_capture_available() -> bool {
    #[cfg(target_os = "macos")]
    {
        Command::new("which")
            .arg("ffmpeg")
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false)
    }
    
    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

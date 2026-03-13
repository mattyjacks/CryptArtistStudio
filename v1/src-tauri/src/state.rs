// ============================================================================
// CryptArtist Studio — Application State Module
// Source of truth for project data, managed by the Rust backend
// ============================================================================

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

// ---------------------------------------------------------------------------
// Data Structures
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineClip {
    pub id: String,
    pub name: String,
    pub start_frame: u64,
    pub end_frame: u64,
    pub source_path: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimelineTrack {
    pub id: String,
    pub name: String,
    pub track_type: String, // "video" | "audio"
    pub muted: bool,
    pub locked: bool,
    pub solo: bool,
    pub clips: Vec<TimelineClip>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub media_type: String, // "video" | "audio" | "image" | "gif"
    pub duration_ms: u64,
    pub thumbnail: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectData {
    pub name: String,
    pub resolution: (u32, u32),
    pub framerate: f64,
    pub tracks: Vec<TimelineTrack>,
    pub media_pool: Vec<MediaItem>,
}

impl ProjectData {
    pub fn save<P: AsRef<Path>>(&self, path: P) -> Result<(), String> {
        let json = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        fs::write(path, json).map_err(|e| e.to_string())
    }

    pub fn load<P: AsRef<Path>>(path: P) -> Result<Self, String> {
        let json = fs::read_to_string(path).map_err(|e| e.to_string())?;
        serde_json::from_str(&json).map_err(|e| e.to_string())
    }
}

// ---------------------------------------------------------------------------
// Default Project (sample data for demo)
// ---------------------------------------------------------------------------

impl Default for ProjectData {
    fn default() -> Self {
        Self {
            name: "Untitled Project".to_string(),
            resolution: (1920, 1080),
            framerate: 24.0,
            tracks: vec![
                TimelineTrack {
                    id: "v3".to_string(),
                    name: "Video 3".to_string(),
                    track_type: "video".to_string(),
                    muted: false,
                    locked: false,
                    solo: false,
                    clips: vec![],
                },
                TimelineTrack {
                    id: "v2".to_string(),
                    name: "Video 2".to_string(),
                    track_type: "video".to_string(),
                    muted: false,
                    locked: false,
                    solo: false,
                    clips: vec![TimelineClip {
                        id: "clip-2".to_string(),
                        name: "Overlay.png".to_string(),
                        start_frame: 72,
                        end_frame: 168,
                        source_path: String::new(),
                        color: "#7b2ff7".to_string(),
                    }],
                },
                TimelineTrack {
                    id: "v1".to_string(),
                    name: "Video 1".to_string(),
                    track_type: "video".to_string(),
                    muted: false,
                    locked: false,
                    solo: false,
                    clips: vec![
                        TimelineClip {
                            id: "clip-1".to_string(),
                            name: "Interview_Main.mp4".to_string(),
                            start_frame: 0,
                            end_frame: 120,
                            source_path: String::new(),
                            color: "#e94560".to_string(),
                        },
                        TimelineClip {
                            id: "clip-3".to_string(),
                            name: "B-Roll_City.mp4".to_string(),
                            start_frame: 130,
                            end_frame: 240,
                            source_path: String::new(),
                            color: "#00d2ff".to_string(),
                        },
                    ],
                },
                TimelineTrack {
                    id: "a1".to_string(),
                    name: "Audio 1".to_string(),
                    track_type: "audio".to_string(),
                    muted: false,
                    locked: false,
                    solo: false,
                    clips: vec![TimelineClip {
                        id: "clip-4".to_string(),
                        name: "Voiceover.wav".to_string(),
                        start_frame: 0,
                        end_frame: 200,
                        source_path: String::new(),
                        color: "#4ade80".to_string(),
                    }],
                },
                TimelineTrack {
                    id: "a2".to_string(),
                    name: "Audio 2".to_string(),
                    track_type: "audio".to_string(),
                    muted: false,
                    locked: false,
                    solo: false,
                    clips: vec![TimelineClip {
                        id: "clip-5".to_string(),
                        name: "BGM_Ambient.mp3".to_string(),
                        start_frame: 0,
                        end_frame: 240,
                        source_path: String::new(),
                        color: "#fbbf24".to_string(),
                    }],
                },
            ],
            media_pool: vec![
                MediaItem {
                    id: "media-1".to_string(),
                    name: "Interview_Main.mp4".to_string(),
                    path: String::new(),
                    media_type: "video".to_string(),
                    duration_ms: 5000,
                    thumbnail: None,
                },
                MediaItem {
                    id: "media-2".to_string(),
                    name: "B-Roll_City.mp4".to_string(),
                    path: String::new(),
                    media_type: "video".to_string(),
                    duration_ms: 5000,
                    thumbnail: None,
                },
                MediaItem {
                    id: "media-3".to_string(),
                    name: "Overlay.png".to_string(),
                    path: String::new(),
                    media_type: "image".to_string(),
                    duration_ms: 0,
                    thumbnail: None,
                },
                MediaItem {
                    id: "media-4".to_string(),
                    name: "Voiceover.wav".to_string(),
                    path: String::new(),
                    media_type: "audio".to_string(),
                    duration_ms: 8333,
                    thumbnail: None,
                },
                MediaItem {
                    id: "media-5".to_string(),
                    name: "BGM_Ambient.mp3".to_string(),
                    path: String::new(),
                    media_type: "audio".to_string(),
                    duration_ms: 10000,
                    thumbnail: None,
                },
                MediaItem {
                    id: "media-6".to_string(),
                    name: "Title_Card.gif".to_string(),
                    path: String::new(),
                    media_type: "gif".to_string(),
                    duration_ms: 3000,
                    thumbnail: None,
                },
            ],
        }
    }
}

// ---------------------------------------------------------------------------
// Managed Application State
// ---------------------------------------------------------------------------

pub struct AppState {
    pub project: Mutex<ProjectData>,
    pub api_key: Mutex<String>,
    pub pexels_key: Mutex<String>,
    pub givegigs_url: Mutex<String>,
    pub givegigs_key: Mutex<String>,
    pub openrouter_key: Mutex<String>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            project: Mutex::new(ProjectData::default()),
            api_key: Mutex::new(String::new()),
            pexels_key: Mutex::new(String::new()),
            givegigs_url: Mutex::new(String::new()),
            givegigs_key: Mutex::new(String::new()),
            openrouter_key: Mutex::new(String::new()),
        }
    }

    /// Path to the local FFmpeg binary.
    pub fn get_ffmpeg_path(&self) -> PathBuf {
        let mut path = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
        path.push("CryptArtistStudio");
        path.push("ffmpeg");
        if cfg!(windows) {
            path.push("ffmpeg.exe");
        } else {
            path.push("ffmpeg");
        }
        path
    }

    pub fn get_project_data(&self) -> ProjectData {
        self.project.lock().unwrap().clone()
    }

    pub fn set_api_key(&self, key: String) -> Result<(), String> {
        let mut api_key = self.api_key.lock().map_err(|e| e.to_string())?;
        *api_key = key;
        Ok(())
    }

    pub fn get_api_key(&self) -> String {
        self.api_key
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
    }

    pub fn set_pexels_key(&self, key: String) -> Result<(), String> {
        let mut pexels_key = self.pexels_key.lock().map_err(|e| e.to_string())?;
        *pexels_key = key;
        Ok(())
    }

    pub fn get_pexels_key(&self) -> String {
        self.pexels_key
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
    }

    pub fn set_givegigs_url(&self, url: String) -> Result<(), String> {
        let mut val = self.givegigs_url.lock().map_err(|e| e.to_string())?;
        *val = url;
        Ok(())
    }

    pub fn get_givegigs_url(&self) -> String {
        self.givegigs_url
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
    }

    pub fn set_givegigs_key(&self, key: String) -> Result<(), String> {
        let mut val = self.givegigs_key.lock().map_err(|e| e.to_string())?;
        *val = key;
        Ok(())
    }

    pub fn get_givegigs_key(&self) -> String {
        self.givegigs_key
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
    }

    pub fn set_openrouter_key(&self, key: String) -> Result<(), String> {
        let mut openrouter_key = self.openrouter_key.lock().map_err(|e| e.to_string())?;
        *openrouter_key = key;
        Ok(())
    }

    pub fn get_openrouter_key(&self) -> String {
        self.openrouter_key
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
    }
}

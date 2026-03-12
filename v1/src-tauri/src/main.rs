// ============================================================================
// CryptArtist Studio — Main Entry Point
// Professional-grade media editing suite powered by AI
// ============================================================================
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai_integration;
mod ffmpeg_installer;
mod state;

use state::AppState;
use clap::{Parser, Subcommand};
use std::path::PathBuf;

// ---------------------------------------------------------------------------
// CLI Definitions
// ---------------------------------------------------------------------------

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Create a new empty project JSON
    New {
        /// Path to the new project file
        path: PathBuf,
    },
    /// Print information about a project JSON
    Info {
        /// Path to the project file
        path: PathBuf,
    },
    /// Add a media item to a project JSON
    AddMedia {
        /// Path to the project file
        project: PathBuf,
        /// Path to the media file to add
        media: PathBuf,
        /// Type of media (video, audio, image, gif)
        #[arg(short, long, default_value = "video")]
        media_type: String,
    },
}

// ---------------------------------------------------------------------------
// FFmpeg Commands
// ---------------------------------------------------------------------------

#[tauri::command]
async fn check_ffmpeg_installed(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let ffmpeg_path = state.get_ffmpeg_path();
    Ok(ffmpeg_path.exists())
}

#[tauri::command]
async fn install_ffmpeg(app: tauri::AppHandle) -> Result<String, String> {
    ffmpeg_installer::download_ffmpeg(&app).await
}

// ---------------------------------------------------------------------------
// Project State Commands
// ---------------------------------------------------------------------------

#[tauri::command]
async fn get_project_state(
    state: tauri::State<'_, AppState>,
) -> Result<state::ProjectData, String> {
    Ok(state.get_project_data())
}

// ---------------------------------------------------------------------------
// API Key Commands
// ---------------------------------------------------------------------------

#[tauri::command]
async fn save_api_key(key: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.set_api_key(key).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_api_key(state: tauri::State<'_, AppState>) -> Result<String, String> {
    Ok(state.get_api_key())
}

// ---------------------------------------------------------------------------
// AI Commands
// ---------------------------------------------------------------------------

#[tauri::command]
async fn ai_chat(prompt: String, state: tauri::State<'_, AppState>) -> Result<String, String> {
    let api_key = state.get_api_key();
    if api_key.is_empty() {
        return Err(
            "No API key configured. Please set your OpenAI API key in Settings.".to_string(),
        );
    }
    ai_integration::chat_completion(&api_key, &prompt).await
}

#[tauri::command]
async fn ai_generate_image(
    prompt: String,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let api_key = state.get_api_key();
    if api_key.is_empty() {
        return Err(
            "No API key configured. Please set your OpenAI API key in Settings.".to_string(),
        );
    }
    ai_integration::generate_image(&api_key, &prompt).await
}

#[tauri::command]
async fn ai_analyze_scene(
    description: String,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let api_key = state.get_api_key();
    if api_key.is_empty() {
        return Err("No API key configured.".to_string());
    }
    let prompt = format!(
        "You are a professional video editor and colorist. Analyze this scene description and provide:\n\
         1. Suggested color grading (LUT style, color temperature, tint)\n\
         2. Recommended transitions\n\
         3. Audio suggestions (music mood, sound effects)\n\
         4. Composition tips\n\n\
         Scene: {}",
        description
    );
    ai_integration::chat_completion(&api_key, &prompt).await
}

#[tauri::command]
async fn ai_generate_subtitles(
    transcript: String,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let api_key = state.get_api_key();
    if api_key.is_empty() {
        return Err("No API key configured.".to_string());
    }
    let prompt = format!(
        "You are a professional subtitle editor. Take this transcript and format it into \
         properly timed SRT subtitles. Break lines naturally, keep each subtitle under 42 \
         characters per line, and ensure readable pacing (1-7 seconds per subtitle).\n\n\
         Transcript:\n{}",
        transcript
    );
    ai_integration::chat_completion(&api_key, &prompt).await
}

#[tauri::command]
async fn ai_suggest_effects(
    style: String,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let api_key = state.get_api_key();
    if api_key.is_empty() {
        return Err("No API key configured.".to_string());
    }
    let prompt = format!(
        "You are a VFX supervisor. Suggest a complete effects pipeline for achieving a '{}' \
         visual style. Include:\n\
         1. Node graph setup (which nodes to connect)\n\
         2. Specific parameter values for color correction\n\
         3. Recommended transitions between clips\n\
         4. Any compositing techniques needed",
        style
    );
    ai_integration::chat_completion(&api_key, &prompt).await
}

#[tauri::command]
async fn ai_generate_tts(
    text: String,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let api_key = state.get_api_key();
    if api_key.is_empty() {
        return Err("No API key configured.".to_string());
    }
    // Return base64 encoded mp3 or a path to a saved file. We'll save it to the project dir.
    let audio_path = state.get_ffmpeg_path().parent().unwrap().join(format!("tts_{}.mp3", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs()));
    ai_integration::generate_tts(&api_key, &text, &audio_path).await?;
    Ok(audio_path.to_string_lossy().into_owned())
}

#[tauri::command]
async fn save_pexels_key(key: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    state.set_pexels_key(key).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_pexels_key(state: tauri::State<'_, AppState>) -> Result<String, String> {
    Ok(state.get_pexels_key())
}

#[tauri::command]
async fn search_pexels(
    query: String,
    search_type: String, // "image" or "video"
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let api_key = state.get_pexels_key();
    if api_key.is_empty() {
        return Err("No Pexels API key configured.".to_string());
    }

    let url = if search_type == "video" {
        format!("https://api.pexels.com/videos/search?query={}&per_page=20", query)
    } else {
        format!("https://api.pexels.com/v1/search?query={}&per_page=20", query)
    };

    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .header("Authorization", api_key)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        return Err(format!("Pexels API error: {}", res.status()));
    }

    let text = res.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

// ---------------------------------------------------------------------------
// Application Bootstrap
// ---------------------------------------------------------------------------

fn main() {
    let cli = Cli::parse();
    
    // Headless CLI execution
    if let Some(cmd) = cli.command {
        match cmd {
            Commands::New { path } => {
                let proj = state::ProjectData::default();
                if let Err(e) = proj.save(&path) {
                    eprintln!("Error saving project: {}", e);
                    std::process::exit(1);
                }
                println!("Created new project at {:?}", path);
            }
            Commands::Info { path } => {
                match state::ProjectData::load(&path) {
                    Ok(proj) => {
                        println!("Project Name: {}", proj.name);
                        println!("Resolution: {}x{}", proj.resolution.0, proj.resolution.1);
                        println!("Tracks: {}", proj.tracks.len());
                        println!("Media Items: {}", proj.media_pool.len());
                    }
                    Err(e) => {
                        eprintln!("Failed to load project {:?}: {}", path, e);
                        std::process::exit(1);
                    }
                }
            }
            Commands::AddMedia { project, media, media_type } => {
                match state::ProjectData::load(&project) {
                    Ok(mut proj) => {
                        let name = media.file_name().unwrap_or_default().to_string_lossy().into_owned();
                        let item = state::MediaItem {
                            id: format!("m_{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs()),
                            name,
                            path: media.to_string_lossy().into_owned(),
                            media_type,
                            duration_ms: 0,
                            thumbnail: None,
                        };
                        proj.media_pool.push(item);
                        if let Err(e) = proj.save(&project) {
                            eprintln!("Error saving project: {}", e);
                            std::process::exit(1);
                        }
                        println!("Successfully added media to project.");
                    }
                    Err(e) => {
                        eprintln!("Failed to load project {:?}: {}", project, e);
                        std::process::exit(1);
                    }
                }
            }
        }
        std::process::exit(0);
    }

    // Normal GUI execution
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            check_ffmpeg_installed,
            install_ffmpeg,
            get_project_state,
            save_api_key,
            get_api_key,
            ai_chat,
            ai_generate_image,
            ai_analyze_scene,
            ai_generate_subtitles,
            ai_suggest_effects,
            ai_generate_tts,
            save_pexels_key,
            get_pexels_key,
            search_pexels,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CryptArtist Studio");
}

// ============================================================================
// CryptArtist Studio — Main Entry Point
// Professional-grade media editing suite powered by AI
// ============================================================================
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai_integration;
mod ffmpeg_installer;
mod logger;
mod state;

use state::AppState;
use tauri::Manager;
use clap::{Parser, Subcommand};
use std::io::Read;
use std::path::PathBuf;
use serde::{Serialize, Deserialize};
use reqwest::multipart;

// ---------------------------------------------------------------------------
// Security: Input validation helpers
// ---------------------------------------------------------------------------

const MAX_PROMPT_LENGTH: usize = 100_000;
const MAX_FILE_READ_SIZE: u64 = 50 * 1024 * 1024; // 50 MB
const MAX_REQUEST_BODY_SIZE: usize = 10 * 1024 * 1024; // 10 MB
const MAX_API_KEY_LENGTH: usize = 512; // Vuln 1-3: API key length limit
const MAX_WRITE_SIZE: usize = 100 * 1024 * 1024; // Vuln 6: 100 MB write limit
const MAX_LOG_MESSAGE_LENGTH: usize = 10_000; // Vuln 9: Log message limit
const HTTP_TIMEOUT_SECS: u64 = 30; // Vuln 19-21: Request timeout

fn sanitize_path(path: &str) -> Result<PathBuf, String> {
    let p = std::path::Path::new(path);
    // Block path traversal attempts
    let path_str = path.replace('\\', "/");
    if path_str.contains("..") {
        return Err("Path traversal detected: '..' is not allowed".to_string());
    }
    // Block null bytes
    if path.contains('\0') {
        return Err("Null bytes in path are not allowed".to_string());
    }
    // Canonicalize if the path exists, otherwise just validate
    match p.canonicalize() {
        Ok(canonical) => Ok(canonical),
        Err(_) => {
            // Path doesn't exist yet (e.g., for write operations)
            // Still validate it has no traversal
            Ok(p.to_path_buf())
        }
    }
}

fn url_encode(input: &str) -> String {
    let mut encoded = String::with_capacity(input.len() * 3);
    for byte in input.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(byte as char);
            }
            b' ' => encoded.push('+'),
            _ => {
                encoded.push('%');
                encoded.push_str(&format!("{:02X}", byte));
            }
        }
    }
    encoded
}

fn validate_prompt_length(prompt: &str) -> Result<(), String> {
    if prompt.len() > MAX_PROMPT_LENGTH {
        return Err(format!(
            "Prompt too long: {} chars (max {})",
            prompt.len(),
            MAX_PROMPT_LENGTH
        ));
    }
    Ok(())
}

// Vuln 1-3: Validate API key format (no control chars, length limit)
fn validate_api_key(key: &str) -> Result<(), String> {
    if key.len() > MAX_API_KEY_LENGTH {
        return Err(format!("API key too long: {} chars (max {})", key.len(), MAX_API_KEY_LENGTH));
    }
    if key.bytes().any(|b| b < 0x20 && b != b'\n' && b != b'\r' && b != b'\t') {
        return Err("API key contains invalid control characters".to_string());
    }
    Ok(())
}

// Vuln 4: Validate URL format for GiveGigs config
fn validate_url(url: &str) -> Result<(), String> {
    if url.len() > 2048 {
        return Err("URL too long (max 2048 chars)".to_string());
    }
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("URL must start with http:// or https://".to_string());
    }
    if url.contains('\0') {
        return Err("URL contains null bytes".to_string());
    }
    Ok(())
}

// Vuln 25: Validate search type parameter
fn validate_search_type(search_type: &str) -> Result<(), String> {
    match search_type {
        "image" | "video" => Ok(()),
        _ => Err(format!("Invalid search type '{}'. Must be 'image' or 'video'", search_type)),
    }
}

// Vuln 19-21: Create HTTP client with timeout
fn http_client_with_timeout() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(HTTP_TIMEOUT_SECS))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
}

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
    /// Send a prompt to the AI chat (requires OPENAI_API_KEY env var or --key)
    Chat {
        /// The prompt to send
        prompt: String,
        /// OpenAI API key (or set OPENAI_API_KEY env var)
        #[arg(short, long)]
        key: Option<String>,
        /// Model to use
        #[arg(long, default_value = "gpt-4o")]
        model: String,
    },
    /// Search Pexels for images or videos
    Pexels {
        /// Search query
        query: String,
        /// Type: image or video
        #[arg(short, long, default_value = "image")]
        search_type: String,
        /// Pexels API key (or set PEXELS_API_KEY env var)
        #[arg(short, long)]
        key: Option<String>,
    },
    /// Create or inspect a .CryptArt project file
    CryptArt {
        #[command(subcommand)]
        action: CryptArtCommands,
    },
    /// Start a local REST API server for programmatic access
    Serve {
        /// Port to listen on
        #[arg(short, long, default_value = "9420")]
        port: u16,
        /// OpenAI API key for AI endpoints
        #[arg(long)]
        api_key: Option<String>,
    },
    /// Read a file and output its contents
    ReadFile {
        /// Path to the file
        path: PathBuf,
    },
    /// Write content to a file
    WriteFile {
        /// Path to the file
        path: PathBuf,
        /// Content to write (reads from stdin if not provided)
        #[arg(short, long)]
        content: Option<String>,
    },
    /// List directory contents as JSON
    Ls {
        /// Directory path
        path: PathBuf,
    },
    /// List all available programs in the suite
    ListPrograms,
    /// Export project to a different format
    Export {
        /// Path to the .CryptArt project file
        project: PathBuf,
        /// Output path
        output: PathBuf,
        /// Format (json, csv, txt)
        #[arg(short, long, default_value = "json")]
        format: String,
    },
    /// Show application version and system info
    SysInfo,
}

#[derive(Subcommand)]
enum CryptArtCommands {
    /// Create a new .CryptArt project file
    Create {
        /// Program type (media-mogul, vibecode-worker, demo-recorder, valley-net)
        #[arg(short, long)]
        program: String,
        /// Project name
        #[arg(short, long, default_value = "Untitled")]
        name: String,
        /// Output path
        path: PathBuf,
    },
    /// Inspect a .CryptArt project file
    Inspect {
        /// Path to the .CryptArt file
        path: PathBuf,
    },
}

// ---------------------------------------------------------------------------
// FFmpeg Commands
// ---------------------------------------------------------------------------

#[tauri::command]
async fn check_ffmpeg_installed(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    log_cmd!("check_ffmpeg_installed", "Checking FFmpeg installation");
    let ffmpeg_path = state.get_ffmpeg_path();
    let exists = ffmpeg_path.exists();
    log_cmd!("check_ffmpeg_installed", "FFmpeg installed: {}", exists);
    Ok(exists)
}

#[tauri::command]
async fn install_ffmpeg(app: tauri::AppHandle) -> Result<String, String> {
    log_cmd!("install_ffmpeg", "Starting FFmpeg installation");
    let result = ffmpeg_installer::download_ffmpeg(&app).await;
    match &result {
        Ok(msg) => log_cmd!("install_ffmpeg", "FFmpeg installed: {}", msg),
        Err(e) => log_error!("install_ffmpeg", "FFmpeg install failed: {}", e),
    }
    result
}

// ---------------------------------------------------------------------------
// Project State Commands
// ---------------------------------------------------------------------------

#[tauri::command]
async fn get_project_state(
    state: tauri::State<'_, AppState>,
) -> Result<state::ProjectData, String> {
    log_cmd!("get_project_state", "Fetching project state");
    Ok(state.get_project_data())
}

// ---------------------------------------------------------------------------
// API Key Commands
// ---------------------------------------------------------------------------

#[tauri::command]
async fn save_api_key(key: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    validate_api_key(&key)?; // Vuln 1: Validate key format
    log_cmd!("save_api_key", "Saving OpenAI API key (length: {})", key.len());
    let result = state.set_api_key(key).map_err(|e| e.to_string());
    if result.is_ok() { log_cmd!("save_api_key", "API key saved"); }
    result
}

#[tauri::command]
async fn get_api_key(state: tauri::State<'_, AppState>) -> Result<String, String> {
    log_cmd!("get_api_key", "Retrieving API key");
    Ok(state.get_api_key())
}

// ---------------------------------------------------------------------------
// AI Commands
// ---------------------------------------------------------------------------

#[tauri::command]
async fn ai_chat(prompt: String, state: tauri::State<'_, AppState>) -> Result<String, String> {
    log_cmd!("ai_chat", "AI chat request (prompt: {} chars)", prompt.len());
    validate_prompt_length(&prompt)?;
    let api_key = state.get_api_key();
    if api_key.is_empty() {
        log_warn!("ai_chat", "No API key configured");
        return Err(
            "No API key configured. Please set your OpenAI API key in Settings.".to_string(),
        );
    }
    let result = ai_integration::chat_completion(&api_key, &prompt).await;
    match &result {
        Ok(reply) => log_cmd!("ai_chat", "AI replied ({} chars)", reply.len()),
        Err(e) => log_error!("ai_chat", "AI chat error: {}", e),
    }
    result
}

#[tauri::command]
async fn ai_generate_image(
    prompt: String,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    validate_prompt_length(&prompt)?;
    log_cmd!("ai_generate_image", "Image generation request: {}", &prompt[..prompt.len().min(100)]);
    let api_key = state.get_api_key();
    if api_key.is_empty() {
        log_warn!("ai_generate_image", "No API key configured");
        return Err(
            "No API key configured. Please set your OpenAI API key in Settings.".to_string(),
        );
    }
    let result = ai_integration::generate_image(&api_key, &prompt).await;
    match &result {
        Ok(url) => log_cmd!("ai_generate_image", "Image generated: {}", &url[..url.len().min(80)]),
        Err(e) => log_error!("ai_generate_image", "Image generation failed: {}", e),
    }
    result
}

#[tauri::command]
async fn ai_analyze_scene(
    description: String,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    validate_prompt_length(&description)?;
    log_cmd!("ai_analyze_scene", "Scene analysis request ({} chars)", description.len());
    let api_key = state.get_api_key();
    if api_key.is_empty() {
        log_warn!("ai_analyze_scene", "No API key configured");
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
    validate_prompt_length(&transcript)?;
    log_cmd!("ai_generate_subtitles", "Subtitle generation request ({} chars)", transcript.len());
    let api_key = state.get_api_key();
    if api_key.is_empty() {
        log_warn!("ai_generate_subtitles", "No API key configured");
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
    log_cmd!("ai_suggest_effects", "Effects suggestion for style: {}", style);
    // Vuln 11: Validate style parameter length
    if style.len() > 5000 {
        return Err("Style description too long (max 5000 chars)".to_string());
    }
    let api_key = state.get_api_key();
    if api_key.is_empty() {
        log_warn!("ai_suggest_effects", "No API key configured");
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
    log_cmd!("ai_generate_tts", "TTS request ({} chars)", text.len());
    let api_key = state.get_api_key();
    if api_key.is_empty() {
        log_warn!("ai_generate_tts", "No API key configured");
        return Err("No API key configured.".to_string());
    }
    validate_prompt_length(&text)?;
    // Return base64 encoded mp3 or a path to a saved file. We'll save it to the project dir.
    let ffmpeg_path = state.get_ffmpeg_path();
    let parent_dir = ffmpeg_path.parent().unwrap_or_else(|| std::path::Path::new("."));
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let audio_path = parent_dir.join(format!("tts_{}.mp3", timestamp));
    ai_integration::generate_tts(&api_key, &text, &audio_path).await?;
    Ok(audio_path.to_string_lossy().into_owned())
}

#[tauri::command]
async fn save_pexels_key(key: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    validate_api_key(&key)?; // Vuln 2: Validate key format
    log_cmd!("save_pexels_key", "Saving Pexels API key (length: {})", key.len());
    state.set_pexels_key(key).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_pexels_key(state: tauri::State<'_, AppState>) -> Result<String, String> {
    log_cmd!("get_pexels_key", "Retrieving Pexels API key");
    Ok(state.get_pexels_key())
}

// ---------------------------------------------------------------------------
// OpenRouter API Key Commands
// ---------------------------------------------------------------------------

#[tauri::command]
async fn save_openrouter_key(key: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    validate_api_key(&key)?; // Vuln 3: Validate key format
    log_cmd!("save_openrouter_key", "Saving OpenRouter API key (length: {})", key.len());
    state.set_openrouter_key(key).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_openrouter_key(state: tauri::State<'_, AppState>) -> Result<String, String> {
    log_cmd!("get_openrouter_key", "Retrieving OpenRouter API key");
    Ok(state.get_openrouter_key())
}

// ---------------------------------------------------------------------------
// ElevenLabs API Key + Audio Commands
// ---------------------------------------------------------------------------

#[tauri::command]
async fn save_elevenlabs_key(key: String, state: tauri::State<'_, AppState>) -> Result<(), String> {
    validate_api_key(&key)?;
    log_cmd!("save_elevenlabs_key", "Saving ElevenLabs API key (length: {})", key.len());
    state.set_elevenlabs_key(key).map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_elevenlabs_key(state: tauri::State<'_, AppState>) -> Result<String, String> {
    log_cmd!("get_elevenlabs_key", "Retrieving ElevenLabs API key");
    Ok(state.get_elevenlabs_key())
}

#[tauri::command]
async fn elevenlabs_list_voices(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let api_key = state.get_elevenlabs_key();
    if api_key.is_empty() {
        return Err("No ElevenLabs API key configured. Set it in Settings.".to_string());
    }
    let client = http_client_with_timeout();
    let res = client
        .get("https://api.elevenlabs.io/v1/voices")
        .header("xi-api-key", api_key)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("ElevenLabs voices error {}: {}", status, text));
    }
    Ok(text)
}

#[tauri::command]
async fn elevenlabs_list_models(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let api_key = state.get_elevenlabs_key();
    if api_key.is_empty() {
        return Err("No ElevenLabs API key configured. Set it in Settings.".to_string());
    }
    let client = http_client_with_timeout();
    let res = client
        .get("https://api.elevenlabs.io/v1/models")
        .header("xi-api-key", api_key)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(format!("ElevenLabs models error {}: {}", status, text));
    }
    Ok(text)
}

#[tauri::command]
async fn elevenlabs_text_to_speech(
    text: String,
    voice_id: String,
    model_id: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    validate_prompt_length(&text)?;
    if voice_id.trim().is_empty() || voice_id.len() > 128 {
        return Err("Invalid voice_id".to_string());
    }
    let api_key = state.get_elevenlabs_key();
    if api_key.is_empty() {
        return Err("No ElevenLabs API key configured. Set it in Settings.".to_string());
    }
    let client = http_client_with_timeout();
    let model = model_id.unwrap_or_else(|| "eleven_multilingual_v2".to_string());
    let res = client
        .post(format!("https://api.elevenlabs.io/v1/text-to-speech/{}", voice_id))
        .header("xi-api-key", api_key)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "text": text,
            "model_id": model,
            "voice_settings": {
                "stability": 0.45,
                "similarity_boost": 0.75,
                "style": 0.35,
                "use_speaker_boost": true
            }
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        return Err(format!("ElevenLabs TTS error {}: {}", status, body));
    }

    let bytes = res.bytes().await.map_err(|e| e.to_string())?;
    let ffmpeg_path = state.get_ffmpeg_path();
    let parent_dir = ffmpeg_path.parent().unwrap_or_else(|| std::path::Path::new("."));
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let audio_path = parent_dir.join(format!("elevenlabs_tts_{}.mp3", timestamp));
    std::fs::write(&audio_path, bytes).map_err(|e| e.to_string())?;
    Ok(audio_path.to_string_lossy().into_owned())
}

#[tauri::command]
async fn elevenlabs_generate_sound_effect(
    prompt: String,
    duration_seconds: Option<u32>,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    validate_prompt_length(&prompt)?;
    let api_key = state.get_elevenlabs_key();
    if api_key.is_empty() {
        return Err("No ElevenLabs API key configured. Set it in Settings.".to_string());
    }
    let duration = duration_seconds.unwrap_or(5).clamp(1, 22);
    let client = http_client_with_timeout();
    let res = client
        .post("https://api.elevenlabs.io/v1/sound-generation")
        .header("xi-api-key", api_key)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "text": prompt,
            "duration_seconds": duration,
            "prompt_influence": 0.8
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        return Err(format!("ElevenLabs SFX error {}: {}", status, body));
    }

    let bytes = res.bytes().await.map_err(|e| e.to_string())?;
    let ffmpeg_path = state.get_ffmpeg_path();
    let parent_dir = ffmpeg_path.parent().unwrap_or_else(|| std::path::Path::new("."));
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let audio_path = parent_dir.join(format!("elevenlabs_sfx_{}.mp3", timestamp));
    std::fs::write(&audio_path, bytes).map_err(|e| e.to_string())?;
    Ok(audio_path.to_string_lossy().into_owned())
}

#[tauri::command]
async fn elevenlabs_speech_to_text(
    file_path: String,
    model_id: Option<String>,
    language_code: Option<String>,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    let safe = sanitize_path(&file_path)?;
    if !safe.exists() {
        return Err("Audio file not found".to_string());
    }
    let metadata = std::fs::metadata(&safe).map_err(|e| e.to_string())?;
    if metadata.len() > MAX_FILE_READ_SIZE {
        return Err(format!("Audio file too large: {} bytes", metadata.len()));
    }
    let api_key = state.get_elevenlabs_key();
    if api_key.is_empty() {
        return Err("No ElevenLabs API key configured. Set it in Settings.".to_string());
    }

    let file_name = safe
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("audio.wav")
        .to_string();
    let bytes = std::fs::read(&safe).map_err(|e| e.to_string())?;
    let part = multipart::Part::bytes(bytes).file_name(file_name);
    let mut form = multipart::Form::new()
        .part("file", part)
        .text("model_id", model_id.unwrap_or_else(|| "scribe_v1".to_string()));
    if let Some(lang) = language_code {
        if !lang.trim().is_empty() {
            form = form.text("language_code", lang);
        }
    }

    let client = http_client_with_timeout();
    let res = client
        .post("https://api.elevenlabs.io/v1/speech-to-text")
        .header("xi-api-key", api_key)
        .multipart(form)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        return Err(format!("ElevenLabs STT error {}: {}", status, body));
    }
    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let text = json["text"].as_str().unwrap_or_default().to_string();
    if text.is_empty() {
        return Err("No transcript text returned by ElevenLabs".to_string());
    }
    Ok(text)
}

#[tauri::command]
async fn openrouter_chat(
    prompt: String,
    model: String,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    validate_prompt_length(&prompt)?;
    log_cmd!("openrouter_chat", "OpenRouter chat: model={} prompt={} chars", model, prompt.len());
    // Validate model ID format (provider/model-name)
    if !model.contains('/') || model.len() > 200 {
        return Err("Invalid model ID format. Expected 'provider/model-name'.".to_string());
    }
    let api_key = state.get_openrouter_key();
    if api_key.is_empty() {
        return Err("No OpenRouter API key configured. Set it in Settings.".to_string());
    }
    let client = http_client_with_timeout(); // Vuln 19: Add request timeout
    let body = serde_json::json!({
        "model": model,
        "messages": [
            { "role": "user", "content": prompt }
        ]
    });
    let res = client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("HTTP-Referer", "https://mattyjacks.com")
        .header("X-Title", "CryptArtist Studio")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        let status = res.status();
        let text = res.text().await.unwrap_or_default();
        return Err(format!("OpenRouter API error {}: {}", status, text));
    }
    let json: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let content = json["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("No response")
        .to_string();
    Ok(content)
}

#[tauri::command]
async fn openrouter_list_models(
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    log_cmd!("openrouter_list_models", "Fetching OpenRouter model list");
    let api_key = state.get_openrouter_key();
    if api_key.is_empty() {
        return Err("No OpenRouter API key configured.".to_string());
    }
    let client = http_client_with_timeout(); // Vuln 21: Add request timeout
    let res = client
        .get("https://openrouter.ai/api/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let text = res.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

// ---------------------------------------------------------------------------
// Bulk API Key Export/Import Commands
// ---------------------------------------------------------------------------

#[tauri::command]
async fn export_all_api_keys(
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    log_cmd!("export_all_api_keys", "Exporting all API keys");
    let keys = serde_json::json!({
        "_warning": "FORBIDDEN SECRETS - Do NOT share this file with anyone!",
        "_app": "CryptArtist Studio",
        "_exported_at": chrono_timestamp(),
        "openai_api_key": state.get_api_key(),
        "pexels_api_key": state.get_pexels_key(),
        "openrouter_api_key": state.get_openrouter_key(),
        "elevenlabs_api_key": state.get_elevenlabs_key(),
        "givegigs_url": state.get_givegigs_url(),
        "givegigs_key": state.get_givegigs_key(),
    });
    Ok(serde_json::to_string_pretty(&keys).unwrap_or_default())
}

#[tauri::command]
async fn import_all_api_keys(
    json_str: String,
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    // Vuln 15: Limit import JSON size
    if json_str.len() > MAX_REQUEST_BODY_SIZE {
        return Err(format!("Import data too large: {} bytes (max {})", json_str.len(), MAX_REQUEST_BODY_SIZE));
    }
    log_cmd!("import_all_api_keys", "Importing API keys from JSON ({} chars)", json_str.len());
    let val: serde_json::Value = serde_json::from_str(&json_str).map_err(|e| format!("Invalid JSON: {}", e))?;
    let mut count = 0;
    if let Some(k) = val["openai_api_key"].as_str() { if !k.is_empty() { state.set_api_key(k.to_string())?; count += 1; } }
    if let Some(k) = val["pexels_api_key"].as_str() { if !k.is_empty() { state.set_pexels_key(k.to_string())?; count += 1; } }
    if let Some(k) = val["openrouter_api_key"].as_str() { if !k.is_empty() { state.set_openrouter_key(k.to_string())?; count += 1; } }
    if let Some(k) = val["elevenlabs_api_key"].as_str() { if !k.is_empty() { state.set_elevenlabs_key(k.to_string())?; count += 1; } }
    if let Some(k) = val["givegigs_url"].as_str() { if !k.is_empty() { state.set_givegigs_url(k.to_string())?; count += 1; } }
    if let Some(k) = val["givegigs_key"].as_str() { if !k.is_empty() { state.set_givegigs_key(k.to_string())?; count += 1; } }
    Ok(format!("Imported {} keys successfully", count))
}

fn chrono_timestamp() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{}", now)
}

// ---------------------------------------------------------------------------
// Filesystem Commands (for VibeCodeWorker + .CryptArt)
// ---------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Clone)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

#[tauri::command]
async fn read_directory(path: String) -> Result<Vec<DirEntry>, String> {
    log_cmd!("read_directory", "Reading directory: {}", path);
    let safe_path = sanitize_path(&path)?;
    let entries = std::fs::read_dir(&safe_path).map_err(|e| {
        log_error!("read_directory", "Failed to read directory {}: {}", path, e);
        format!("Failed to read directory: {}", e)
    })?;
    let mut result = Vec::new();
    for entry in entries {
        if let Ok(entry) = entry {
            let metadata = match entry.metadata() {
                Ok(m) => m,
                Err(_) => continue, // Skip entries we can't read metadata for
            };
            let name = entry.file_name().to_string_lossy().into_owned();
            // Skip hidden files/dirs and node_modules
            if name.starts_with('.') || name == "node_modules" || name == "target" || name == "dist" {
                continue;
            }
            result.push(DirEntry {
                name,
                path: entry.path().to_string_lossy().into_owned(),
                is_dir: metadata.is_dir(),
                size: metadata.len(),
            });
        }
    }
    result.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        } else if a.is_dir {
            std::cmp::Ordering::Less
        } else {
            std::cmp::Ordering::Greater
        }
    });
    Ok(result)
}

#[tauri::command]
async fn read_text_file(path: String) -> Result<String, String> {
    log_cmd!("read_text_file", "Reading file: {}", path);
    let safe_path = sanitize_path(&path)?;
    // Check file size before reading to prevent OOM
    let metadata = std::fs::metadata(&safe_path).map_err(|e| {
        log_error!("read_text_file", "Failed to stat {}: {}", path, e);
        format!("Failed to read file metadata: {}", e)
    })?;
    if metadata.len() > MAX_FILE_READ_SIZE {
        log_error!("read_text_file", "File too large: {} bytes (max {})", metadata.len(), MAX_FILE_READ_SIZE);
        return Err(format!("File too large: {} bytes (max {} bytes)", metadata.len(), MAX_FILE_READ_SIZE));
    }
    let result = std::fs::read_to_string(&safe_path).map_err(|e| {
        log_error!("read_text_file", "Failed to read {}: {}", path, e);
        format!("Failed to read file: {}", e)
    });
    if let Ok(ref content) = result {
        log_cmd!("read_text_file", "Read {} bytes from {}", content.len(), path);
    }
    result
}

#[tauri::command]
async fn write_text_file(path: String, contents: String) -> Result<(), String> {
    // Vuln 6: Check content size before writing
    if contents.len() > MAX_WRITE_SIZE {
        return Err(format!("Content too large: {} bytes (max {} bytes)", contents.len(), MAX_WRITE_SIZE));
    }
    log_cmd!("write_text_file", "Writing {} bytes to: {}", contents.len(), path);
    let safe_path = sanitize_path(&path)?;
    // Create parent directories if needed
    if let Some(parent) = safe_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create directories: {}", e))?;
    }
    let result = std::fs::write(&safe_path, contents).map_err(|e| {
        log_error!("write_text_file", "Failed to write {}: {}", path, e);
        format!("Failed to write file: {}", e)
    });
    if result.is_ok() { log_cmd!("write_text_file", "Write successful: {}", path); }
    result
}

// ---------------------------------------------------------------------------
// GiveGigs Config Commands
// ---------------------------------------------------------------------------

#[tauri::command]
async fn save_givegigs_config(
    url: String,
    key: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    validate_url(&url)?; // Vuln 4: Validate URL format
    validate_api_key(&key)?; // Vuln 5: Validate key format
    log_cmd!("save_givegigs_config", "Saving GiveGigs config (url: {})", url);
    state.set_givegigs_url(url).map_err(|e| e.to_string())?;
    state.set_givegigs_key(key).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_givegigs_config(
    state: tauri::State<'_, AppState>,
) -> Result<(String, String), String> {
    log_cmd!("get_givegigs_config", "Retrieving GiveGigs config");
    Ok((state.get_givegigs_url(), state.get_givegigs_key()))
}

// ---------------------------------------------------------------------------
// Pexels Commands
// ---------------------------------------------------------------------------

#[tauri::command]
async fn search_pexels(
    query: String,
    search_type: String, // "image" or "video"
    state: tauri::State<'_, AppState>,
) -> Result<String, String> {
    log_cmd!("search_pexels", "Pexels search: type={} query={}", search_type, query);
    let api_key = state.get_pexels_key();
    if api_key.is_empty() {
        log_warn!("search_pexels", "No Pexels API key configured");
        return Err("No Pexels API key configured.".to_string());
    }

    // Validate and sanitize query
    if query.len() > 500 {
        return Err("Search query too long (max 500 chars)".to_string());
    }
    validate_search_type(&search_type)?; // Vuln 25: Validate search type
    let encoded_query = url_encode(&query);
    let url = if search_type == "video" {
        format!("https://api.pexels.com/videos/search?query={}&per_page=20", encoded_query)
    } else {
        format!("https://api.pexels.com/v1/search?query={}&per_page=20", encoded_query)
    };

    let client = http_client_with_timeout(); // Vuln 20: Add request timeout
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
// Godot Integration Commands
// ---------------------------------------------------------------------------

#[tauri::command]
async fn godot_detect() -> Result<serde_json::Value, String> {
    log_cmd!("godot_detect", "Detecting Godot installation");
    // Try to find Godot executable on PATH or common locations
    let candidates = if cfg!(target_os = "windows") {
        vec![
            "godot.exe",
            "godot4.exe",
            "C:\\Program Files\\Godot\\Godot_v4.4-stable_win64.exe",
            "C:\\Program Files\\Godot\\godot.exe",
            "C:\\Godot\\godot.exe",
        ]
    } else if cfg!(target_os = "macos") {
        vec![
            "godot",
            "godot4",
            "/Applications/Godot.app/Contents/MacOS/Godot",
        ]
    } else {
        vec!["godot", "godot4", "/usr/bin/godot", "/usr/local/bin/godot"]
    };

    // Check PATH first
    for candidate in &candidates {
        let path = std::path::Path::new(candidate);
        if path.exists() {
            return Ok(serde_json::json!({
                "found": true,
                "path": candidate,
                "version": "4.x (detected)",
            }));
        }
    }

    // Try `which` / `where` command
    let cmd = if cfg!(target_os = "windows") { "where" } else { "which" };
    if let Ok(output) = std::process::Command::new(cmd).arg("godot").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            return Ok(serde_json::json!({
                "found": true,
                "path": path,
                "version": "4.x (detected via PATH)",
            }));
        }
    }

    Ok(serde_json::json!({
        "found": false,
        "path": null,
        "version": null,
        "install_url": "https://godotengine.org/download",
    }))
}

#[tauri::command]
async fn godot_create_project(path: String, name: String, template: String) -> Result<String, String> {
    log_cmd!("godot_create_project", "Creating Godot project: name={} template={} path={}", name, template, path);
    // Security: validate path and sanitize project name
    sanitize_path(&path)?;
    let safe_name = name.replace("..", "").replace('/', "").replace('\\', "").replace('\0', "");
    if safe_name.is_empty() || safe_name.len() > 256 {
        return Err("Invalid project name (empty or too long, max 256 chars)".to_string());
    }
    // Vuln 17: Validate template parameter
    let valid_templates = ["2d_platformer", "3d_fps", "ui_app", "empty"];
    let safe_template = if valid_templates.contains(&template.as_str()) { template.clone() } else { "empty".to_string() };
    let _ = safe_template; // used below via template match
    let project_dir = std::path::Path::new(&path).join(&safe_name);
    std::fs::create_dir_all(&project_dir).map_err(|e| format!("Failed to create project directory: {}", e))?;

    // Create project.godot
    let project_godot = format!(
        r#"; Engine configuration file.
; Generated by CryptArtist GameStudio

[application]

config/name="{safe_name}"
config/description="Created with CryptArtist GameStudio"
run/main_scene="res://scenes/main.tscn"
config/features=PackedStringArray("4.4", "Forward+")

[display]

window/size/viewport_width=1280
window/size/viewport_height=720

[rendering]

renderer/rendering_method="forward_plus"
"#,
        safe_name = safe_name
    );
    std::fs::write(project_dir.join("project.godot"), &project_godot)
        .map_err(|e| format!("Failed to write project.godot: {}", e))?;

    // Create directory structure
    for dir in &["scenes", "scripts", "assets", "assets/sprites", "assets/audio", "assets/fonts", "shaders"] {
        std::fs::create_dir_all(project_dir.join(dir))
            .map_err(|e| format!("Failed to create {}: {}", dir, e))?;
    }

    // Create main scene based on template
    let (main_scene, main_script) = match template.as_str() {
        "2d_platformer" => (
            r#"[gd_scene load_steps=2 format=3 uid="uid://main"]

[ext_resource type="Script" path="res://scripts/main.gd" id="1"]

[node name="Main" type="Node2D"]
script = ExtResource("1")

[node name="Player" type="CharacterBody2D" parent="."]
position = Vector2(640, 360)

[node name="CollisionShape2D" type="CollisionShape2D" parent="Player"]

[node name="Sprite2D" type="Sprite2D" parent="Player"]

[node name="Camera2D" type="Camera2D" parent="Player"]
"#.to_string(),
            r#"extends Node2D

func _ready() -> void:
	print("CryptArtist GameStudio - 2D Platformer Template")

func _process(delta: float) -> void:
	pass
"#.to_string(),
        ),
        "3d_fps" => (
            r#"[gd_scene load_steps=2 format=3 uid="uid://main"]

[ext_resource type="Script" path="res://scripts/main.gd" id="1"]

[node name="Main" type="Node3D"]
script = ExtResource("1")

[node name="DirectionalLight3D" type="DirectionalLight3D" parent="."]
transform = Transform3D(1, 0, 0, 0, 0.866, 0.5, 0, -0.5, 0.866, 0, 10, 0)

[node name="WorldEnvironment" type="WorldEnvironment" parent="."]

[node name="Player" type="CharacterBody3D" parent="."]
transform = Transform3D(1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0)

[node name="CollisionShape3D" type="CollisionShape3D" parent="Player"]

[node name="Camera3D" type="Camera3D" parent="Player"]

[node name="Ground" type="StaticBody3D" parent="."]

[node name="MeshInstance3D" type="MeshInstance3D" parent="Ground"]
"#.to_string(),
            r#"extends Node3D

func _ready() -> void:
	print("CryptArtist GameStudio - 3D FPS Template")

func _process(delta: float) -> void:
	pass
"#.to_string(),
        ),
        "ui_app" => (
            r#"[gd_scene load_steps=2 format=3 uid="uid://main"]

[ext_resource type="Script" path="res://scripts/main.gd" id="1"]

[node name="Main" type="Control"]
layout_mode = 3
anchors_preset = 15
anchor_right = 1.0
anchor_bottom = 1.0
script = ExtResource("1")

[node name="VBoxContainer" type="VBoxContainer" parent="."]
layout_mode = 1
anchors_preset = 15
anchor_right = 1.0
anchor_bottom = 1.0

[node name="Label" type="Label" parent="VBoxContainer"]
layout_mode = 2
text = "Hello from CryptArtist GameStudio!"
horizontal_alignment = 1
"#.to_string(),
            r#"extends Control

func _ready() -> void:
	print("CryptArtist GameStudio - UI App Template")
"#.to_string(),
        ),
        _ => (
            r#"[gd_scene load_steps=2 format=3 uid="uid://main"]

[ext_resource type="Script" path="res://scripts/main.gd" id="1"]

[node name="Main" type="Node"]
script = ExtResource("1")
"#.to_string(),
            r#"extends Node

func _ready() -> void:
	print("CryptArtist GameStudio - Empty Project")

func _process(delta: float) -> void:
	pass
"#.to_string(),
        ),
    };

    std::fs::write(project_dir.join("scenes/main.tscn"), &main_scene)
        .map_err(|e| format!("Failed to write main.tscn: {}", e))?;
    std::fs::write(project_dir.join("scripts/main.gd"), &main_script)
        .map_err(|e| format!("Failed to write main.gd: {}", e))?;

    // Create .gdignore for import cache clarity
    std::fs::write(project_dir.join(".gdignore"), "")
        .map_err(|e| format!("Failed to write .gdignore: {}", e))?;

    Ok(project_dir.to_string_lossy().into_owned())
}

#[tauri::command]
async fn godot_run_project(godot_path: String, project_path: String) -> Result<String, String> {
    log_cmd!("godot_run_project", "Running Godot: {} at {}", godot_path, project_path);
    // Security: validate paths
    sanitize_path(&godot_path)?;
    sanitize_path(&project_path)?;
    // Verify the executable looks like a Godot binary
    let godot_name = std::path::Path::new(&godot_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");
    if !godot_name.to_lowercase().contains("godot") {
        return Err("Invalid Godot executable path: filename must contain 'godot'".to_string());
    }
    let child = std::process::Command::new(&godot_path)
        .arg("--path")
        .arg(&project_path)
        .spawn()
        .map_err(|e| format!("Failed to launch Godot: {}", e))?;

    Ok(format!("Godot launched with PID {}", child.id()))
}

#[tauri::command]
async fn godot_export(godot_path: String, project_path: String, preset: String, output: String) -> Result<String, String> {
    log_cmd!("godot_export", "Exporting Godot project: preset={} output={}", preset, output);
    // Security: validate all paths
    sanitize_path(&godot_path)?;
    sanitize_path(&project_path)?;
    sanitize_path(&output)?;
    let result = std::process::Command::new(&godot_path)
        .arg("--headless")
        .arg("--path")
        .arg(&project_path)
        .arg("--export-release")
        .arg(&preset)
        .arg(&output)
        .output()
        .map_err(|e| format!("Failed to run Godot export: {}", e))?;

    if result.status.success() {
        Ok(format!("Export completed: {}", output))
    } else {
        let stderr = String::from_utf8_lossy(&result.stderr);
        Err(format!("Export failed: {}", stderr))
    }
}

#[tauri::command]
async fn godot_list_scenes(project_path: String) -> Result<Vec<String>, String> {
    log_cmd!("godot_list_scenes", "Listing scenes in: {}", project_path);
    sanitize_path(&project_path)?; // Vuln 7: Validate path
    let mut scenes = Vec::new();
    fn walk_scenes(dir: &std::path::Path, scenes: &mut Vec<String>) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    walk_scenes(&path, scenes);
                } else if let Some(ext) = path.extension() {
                    if ext == "tscn" || ext == "scn" {
                        scenes.push(path.to_string_lossy().into_owned());
                    }
                }
            }
        }
    }
    walk_scenes(std::path::Path::new(&project_path), &mut scenes);
    scenes.sort();
    Ok(scenes)
}

#[tauri::command]
async fn godot_list_scripts(project_path: String) -> Result<Vec<String>, String> {
    log_cmd!("godot_list_scripts", "Listing scripts in: {}", project_path);
    sanitize_path(&project_path)?; // Vuln 8: Validate path
    let mut scripts = Vec::new();
    fn walk_scripts(dir: &std::path::Path, scripts: &mut Vec<String>) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() && !path.ends_with(".godot") {
                    walk_scripts(&path, scripts);
                } else if let Some(ext) = path.extension() {
                    if ext == "gd" || ext == "gdshader" || ext == "cs" {
                        scripts.push(path.to_string_lossy().into_owned());
                    }
                }
            }
        }
    }
    walk_scripts(std::path::Path::new(&project_path), &mut scripts);
    scripts.sort();
    Ok(scripts)
}

// ---------------------------------------------------------------------------
// Platform Detection Command
// ---------------------------------------------------------------------------

#[tauri::command]
async fn get_platform_info() -> Result<serde_json::Value, String> {
    log_cmd!("get_platform_info", "Fetching platform info");
    Ok(serde_json::json!({
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "family": std::env::consts::FAMILY,
        "is_mobile": cfg!(any(target_os = "android", target_os = "ios")),
        "is_desktop": cfg!(not(any(target_os = "android", target_os = "ios"))),
    }))
}

// ---------------------------------------------------------------------------
// Health Check Command
// ---------------------------------------------------------------------------

#[tauri::command]
async fn health_check() -> Result<serde_json::Value, String> {
    log_cmd!("health_check", "Health check OK");
    Ok(serde_json::json!({
        "status": "ok",
        "version": env!("CARGO_PKG_VERSION"),
        "timestamp": chrono::Utc::now().to_rfc3339(),
    }))
}

// ---------------------------------------------------------------------------
// Logging Commands (exposed to frontend)
// ---------------------------------------------------------------------------

#[tauri::command]
async fn log_from_frontend(level: String, source: String, message: String) -> Result<(), String> {
    // Vuln 9: Limit message length to prevent log flooding
    let safe_message = if message.len() > MAX_LOG_MESSAGE_LENGTH {
        format!("{}... [truncated, {} total chars]", &message[..MAX_LOG_MESSAGE_LENGTH], message.len())
    } else {
        message
    };
    // Vuln 10: Validate log level
    let safe_level = match level.as_str() {
        "debug" | "info" | "warn" | "error" => level.as_str(),
        _ => "info",
    };
    let message = safe_message;
    match safe_level {
        "debug" => logger::logger().debug(&source, &message),
        "info" => logger::logger().info(&source, &message),
        "warn" => logger::logger().warn(&source, &message),
        "error" => logger::logger().error(&source, &message),
        _ => logger::logger().frontend(&source, &message),
    }
    Ok(())
}

#[tauri::command]
async fn get_log_session() -> Result<Vec<String>, String> {
    Ok(logger::logger().read_session())
}

#[tauri::command]
async fn get_log_recent() -> Result<Vec<String>, String> {
    Ok(logger::logger().read_recent())
}

#[tauri::command]
async fn get_log_paths() -> Result<serde_json::Value, String> {
    Ok(logger::logger().get_log_paths())
}

// ---------------------------------------------------------------------------
// REST API Server (for CLI `serve` mode)
// ---------------------------------------------------------------------------

fn run_api_server(port: u16, api_key: Option<String>) {
    let addr = format!("0.0.0.0:{}", port);
    let server = match tiny_http::Server::http(&addr) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Failed to start API server: {}", e);
            std::process::exit(1);
        }
    };
    println!("CryptArtist Studio API server running at http://localhost:{}", port);
    println!("Endpoints:");
    println!("  GET  /health           - Health check");
    println!("  GET  /programs         - List programs");
    println!("  POST /chat             - AI chat (body: {{\"prompt\": \"...\"}} )");
    println!("  GET  /ls?path=<dir>    - List directory");
    println!("  GET  /read?path=<file> - Read file");
    println!("  POST /write            - Write file (body: {{\"path\": \"...\", \"content\": \"...\"}} )");
    println!("  POST /pexels           - Search Pexels (body: {{\"query\": \"...\", \"type\": \"image\"}} )");
    println!("  GET  /sysinfo          - System info");
    println!("Press Ctrl+C to stop.");

    let rt = match tokio::runtime::Runtime::new() {
        Ok(r) => r,
        Err(e) => {
            eprintln!("Failed to create async runtime: {}", e);
            std::process::exit(1);
        }
    };
    let stored_key = api_key.unwrap_or_default();

    for mut request in server.incoming_requests() {
        let url = request.url().to_string();
        let method = request.method().to_string();
        log_api!(&format!("{} {}", method, url), "Request received");

        // Vuln 22: Handle CORS preflight
        if method == "OPTIONS" {
            let response = tiny_http::Response::from_string("")
                .with_status_code(204)
                .with_header(tiny_http::Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"http://localhost"[..]).unwrap())
                .with_header(tiny_http::Header::from_bytes(&b"Access-Control-Allow-Methods"[..], &b"GET, POST, OPTIONS"[..]).unwrap())
                .with_header(tiny_http::Header::from_bytes(&b"Access-Control-Allow-Headers"[..], &b"Content-Type, Authorization"[..]).unwrap())
                .with_header(tiny_http::Header::from_bytes(&b"Access-Control-Max-Age"[..], &b"86400"[..]).unwrap());
            let _ = request.respond(response);
            continue;
        }

        // Vuln 23: Validate Content-Type on POST requests
        if method == "POST" {
            let content_type = request.headers().iter()
                .find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("content-type"))
                .map(|h| h.value.as_str().to_string())
                .unwrap_or_default();
            if !content_type.is_empty() && !content_type.contains("application/json") {
                let response = tiny_http::Response::from_string(
                    serde_json::json!({"error": "Content-Type must be application/json"}).to_string()
                )
                    .with_status_code(415)
                    .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap());
                let _ = request.respond(response);
                continue;
            }
        }

        let (status, body) = match (method.as_str(), url.split('?').next().unwrap_or("")) {
            ("GET", "/health") => {
                (200, serde_json::json!({"status": "ok", "version": env!("CARGO_PKG_VERSION")}).to_string())
            }
            ("GET", "/programs") => {
                (200, serde_json::json!([
                    {"id": "media-mogul", "name": "Media Mogul", "code": "MMo", "emoji": "📺"},
                    {"id": "vibecode-worker", "name": "VibeCodeWorker", "code": "VCW", "emoji": "👩🏻‍💻"},
                    {"id": "demo-recorder", "name": "DemoRecorder", "code": "DRe", "emoji": "🎥"},
                    {"id": "valley-net", "name": "ValleyNet", "code": "VNt", "emoji": "👱🏻‍♀️"},
                    {"id": "game-studio", "name": "GameStudio", "code": "GSt", "emoji": "🎮", "description": "Media Mogul + VibeCodeWorker + Godot 4.4"},
                ]).to_string())
            }
            ("GET", "/sysinfo") => {
                (200, serde_json::json!({
                    "os": std::env::consts::OS,
                    "arch": std::env::consts::ARCH,
                    "version": env!("CARGO_PKG_VERSION"),
                }).to_string())
            }
            ("GET", "/ls") => {
                let params: std::collections::HashMap<String, String> = url
                    .split('?')
                    .nth(1)
                    .unwrap_or("")
                    .split('&')
                    .filter_map(|p| {
                        let mut kv = p.splitn(2, '=');
                        Some((kv.next()?.to_string(), kv.next().unwrap_or("").to_string()))
                    })
                    .collect();
                let path = params.get("path").cloned().unwrap_or_else(|| ".".to_string());
                // Security: validate path
                if let Err(e) = sanitize_path(&path) {
                    (403, serde_json::json!({"error": e}).to_string())
                } else {
                match std::fs::read_dir(&path) {
                    Ok(entries) => {
                        let items: Vec<serde_json::Value> = entries
                            .filter_map(|e| e.ok())
                            .map(|e| {
                                let meta = e.metadata().ok();
                                serde_json::json!({
                                    "name": e.file_name().to_string_lossy(),
                                    "path": e.path().to_string_lossy(),
                                    "is_dir": meta.as_ref().map(|m| m.is_dir()).unwrap_or(false),
                                    "size": meta.as_ref().map(|m| m.len()).unwrap_or(0),
                                })
                            })
                            .collect();
                        (200, serde_json::json!(items).to_string())
                    }
                    Err(e) => (400, serde_json::json!({"error": e.to_string()}).to_string()),
                } }
            }
            ("GET", "/read") => {
                let params: std::collections::HashMap<String, String> = url
                    .split('?')
                    .nth(1)
                    .unwrap_or("")
                    .split('&')
                    .filter_map(|p| {
                        let mut kv = p.splitn(2, '=');
                        Some((kv.next()?.to_string(), kv.next().unwrap_or("").to_string()))
                    })
                    .collect();
                let path = params.get("path").cloned().unwrap_or_default();
                // Security: validate path
                if let Err(e) = sanitize_path(&path) {
                    (403, serde_json::json!({"error": e}).to_string())
                } else {
                    // Vuln 24: Check file size before reading
                    match std::fs::metadata(&path) {
                        Ok(meta) if meta.len() > MAX_FILE_READ_SIZE => {
                            (413, serde_json::json!({"error": format!("File too large: {} bytes (max {})", meta.len(), MAX_FILE_READ_SIZE)}).to_string())
                        }
                        _ => {
                            match std::fs::read_to_string(&path) {
                                Ok(content) => (200, serde_json::json!({"path": path, "content": content}).to_string()),
                                Err(e) => (400, serde_json::json!({"error": e.to_string()}).to_string()),
                            }
                        }
                    }
                }
            }
            ("POST", "/write") => {
                let mut body_str = String::new();
                let bytes_read = request.as_reader().take(MAX_REQUEST_BODY_SIZE as u64).read_to_string(&mut body_str).unwrap_or(0);
                if bytes_read >= MAX_REQUEST_BODY_SIZE {
                    (413, serde_json::json!({"error": "Request body too large"}).to_string())
                } else {
                match serde_json::from_str::<serde_json::Value>(&body_str) {
                    Ok(val) => {
                        let path = val["path"].as_str().unwrap_or("");
                        let content = val["content"].as_str().unwrap_or("");
                        // Security: validate path
                        if let Err(e) = sanitize_path(path) {
                            (403, serde_json::json!({"error": e}).to_string())
                        } else {
                            if let Some(parent) = std::path::Path::new(path).parent() {
                                let _ = std::fs::create_dir_all(parent);
                            }
                            match std::fs::write(path, content) {
                                Ok(_) => (200, serde_json::json!({"status": "ok", "path": path}).to_string()),
                                Err(e) => (500, serde_json::json!({"error": e.to_string()}).to_string()),
                            }
                        }
                    }
                    Err(e) => (400, serde_json::json!({"error": format!("Invalid JSON: {}", e)}).to_string()),
                } }
            }
            ("POST", "/chat") => {
                let mut body_str = String::new();
                request.as_reader().take(MAX_REQUEST_BODY_SIZE as u64).read_to_string(&mut body_str).unwrap_or(0);
                match serde_json::from_str::<serde_json::Value>(&body_str) {
                    Ok(val) => {
                        let prompt = val["prompt"].as_str().unwrap_or("").to_string();
                        if prompt.len() > MAX_PROMPT_LENGTH {
                            (413, serde_json::json!({"error": "Prompt too long"}).to_string())
                        } else {
                        let key = stored_key.clone();
                        if key.is_empty() {
                            (401, serde_json::json!({"error": "No API key. Pass --api-key to serve command."}).to_string())
                        } else {
                            match rt.block_on(ai_integration::chat_completion(&key, &prompt)) {
                                Ok(reply) => (200, serde_json::json!({"reply": reply}).to_string()),
                                Err(e) => (500, serde_json::json!({"error": e}).to_string()),
                            }
                        }
                    }
                    }
                    Err(e) => (400, serde_json::json!({"error": format!("Invalid JSON: {}", e)}).to_string()),
                }
            }
            ("POST", "/pexels") => {
                let mut body_str = String::new();
                request.as_reader().read_to_string(&mut body_str).unwrap_or(0);
                (501, serde_json::json!({"error": "Pexels search via API server requires PEXELS_API_KEY env var. Use the GUI or CLI instead."}).to_string())
            }
            _ => {
                (404, serde_json::json!({"error": "Not found", "available_endpoints": ["/health", "/programs", "/chat", "/ls", "/read", "/write", "/sysinfo"]}).to_string())
            }
        };

        let response = tiny_http::Response::from_string::<String>(body.clone())
            .with_status_code(status)
            .with_header(tiny_http::Header::from_bytes(&b"Content-Type"[..], &b"application/json"[..]).unwrap())
            .with_header(tiny_http::Header::from_bytes(&b"Access-Control-Allow-Origin"[..], &b"http://localhost"[..]).unwrap())
            .with_header(tiny_http::Header::from_bytes(&b"X-Content-Type-Options"[..], &b"nosniff"[..]).unwrap())
            .with_header(tiny_http::Header::from_bytes(&b"X-Frame-Options"[..], &b"DENY"[..]).unwrap())
            .with_header(tiny_http::Header::from_bytes(&b"X-XSS-Protection"[..], &b"1; mode=block"[..]).unwrap()) // Vuln 78
            .with_header(tiny_http::Header::from_bytes(&b"Referrer-Policy"[..], &b"strict-origin-when-cross-origin"[..]).unwrap()) // Vuln 79
            .with_header(tiny_http::Header::from_bytes(&b"Permissions-Policy"[..], &b"camera=(), microphone=(), geolocation=()"[..]).unwrap()) // Vuln 80
            .with_header(tiny_http::Header::from_bytes(&b"Cache-Control"[..], &b"no-store, no-cache, must-revalidate"[..]).unwrap()); // Vuln 77
        log_api!(&format!("{} {}", method, url), "Response: {} ({} bytes)", status, body.len());
        let _ = request.respond(response);
    }
}

// ---------------------------------------------------------------------------
// Application Bootstrap
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// File Association Commands (OS double-click .CryptArt -> open in app)
// ---------------------------------------------------------------------------

#[tauri::command]
async fn get_file_to_open(state: tauri::State<'_, AppState>) -> Result<Vec<String>, String> {
    log_cmd!("get_file_to_open", "Checking for pending .CryptArt files");
    let files = state.get_files_to_open();
    if !files.is_empty() {
        log_cmd!("get_file_to_open", "Found {} pending file(s): {:?}", files.len(), files);
    }
    Ok(files)
}

#[tauri::command]
async fn clear_file_to_open(state: tauri::State<'_, AppState>) -> Result<(), String> {
    log_cmd!("clear_file_to_open", "Clearing pending .CryptArt files");
    state.clear_files_to_open();
    Ok(())
}

/// Check if a string looks like a .CryptArt file path
fn is_cryptart_path(s: &str) -> bool {
    let lower = s.to_lowercase();
    lower.ends_with(".cryptart") && !s.starts_with('-')
}

fn main() {
    // Initialize the logging system FIRST
    logger::init_logger();
    log_info!("main", "CryptArtist Studio v{} starting", env!("CARGO_PKG_VERSION"));

    // -----------------------------------------------------------------------
    // File Association: Pre-scan CLI args for .CryptArt file paths.
    // When the OS opens a .CryptArt file, it launches the app with the path
    // as an argument. We extract those BEFORE clap parsing to avoid conflicts.
    // -----------------------------------------------------------------------
    let raw_args: Vec<String> = std::env::args().collect();
    let mut cryptart_files: Vec<String> = Vec::new();
    let mut filtered_args: Vec<String> = Vec::new();

    for (i, arg) in raw_args.iter().enumerate() {
        if i == 0 {
            // Always keep the program name
            filtered_args.push(arg.clone());
        } else if is_cryptart_path(arg) {
            log_info!("main", "File association detected: {}", arg);
            cryptart_files.push(arg.clone());
        } else {
            filtered_args.push(arg.clone());
        }
    }

    let cli = Cli::parse_from(&filtered_args);
    
    // Headless CLI execution
    if let Some(cmd) = cli.command {
        log_cli!("main", "CLI mode activated");
        match cmd {
            Commands::New { path } => {
                log_cli!("new", "Creating new project at {:?}", path);
                let proj = state::ProjectData::default();
                if let Err(e) = proj.save(&path) {
                    log_error!("new", "Error saving project: {}", e);
                    eprintln!("Error saving project: {}", e);
                    std::process::exit(1);
                }
                log_cli!("new", "Created new project at {:?}", path);
                println!("Created new project at {:?}", path);
            }
            Commands::Info { path } => {
                log_cli!("info", "Inspecting project at {:?}", path);
                match state::ProjectData::load(&path) {
                    Ok(proj) => {
                        log_cli!("info", "Project '{}' - {}x{} - {} tracks - {} media items", proj.name, proj.resolution.0, proj.resolution.1, proj.tracks.len(), proj.media_pool.len());
                        println!("Project Name: {}", proj.name);
                        println!("Resolution: {}x{}", proj.resolution.0, proj.resolution.1);
                        println!("Tracks: {}", proj.tracks.len());
                        println!("Media Items: {}", proj.media_pool.len());
                    }
                    Err(e) => {
                        log_error!("info", "Failed to load project {:?}: {}", path, e);
                        eprintln!("Failed to load project {:?}: {}", path, e);
                        std::process::exit(1);
                    }
                }
            }
            Commands::AddMedia { project, media, media_type } => {
                log_cli!("add-media", "Adding {} media from {:?} to {:?}", media_type, media, project);
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
                            log_error!("add-media", "Error saving project: {}", e);
                            eprintln!("Error saving project: {}", e);
                            std::process::exit(1);
                        }
                        log_cli!("add-media", "Successfully added media to project");
                        println!("Successfully added media to project.");
                    }
                    Err(e) => {
                        log_error!("add-media", "Failed to load project {:?}: {}", project, e);
                        eprintln!("Failed to load project {:?}: {}", project, e);
                        std::process::exit(1);
                    }
                }
            }
            Commands::Chat { prompt, key, model: _model } => {
                log_cli!("chat", "AI chat request (prompt length: {})", prompt.len());
                let api_key = key.or_else(|| std::env::var("OPENAI_API_KEY").ok()).unwrap_or_default();
                if api_key.is_empty() {
                    log_error!("chat", "No API key provided");
                    eprintln!("Error: No API key. Use --key <KEY> or set OPENAI_API_KEY env var.");
                    std::process::exit(1);
                }
                let rt = tokio::runtime::Runtime::new().unwrap();
                match rt.block_on(ai_integration::chat_completion(&api_key, &prompt)) {
                    Ok(reply) => {
                        log_cli!("chat", "AI replied ({} chars)", reply.len());
                        println!("{}", reply);
                    }
                    Err(e) => {
                        log_error!("chat", "AI chat error: {}", e);
                        eprintln!("AI chat error: {}", e);
                        std::process::exit(1);
                    }
                }
            }
            Commands::Pexels { query, search_type, key } => {
                log_cli!("pexels", "Pexels search: type={} query={}", search_type, query);
                let api_key = key.or_else(|| std::env::var("PEXELS_API_KEY").ok()).unwrap_or_default();
                if api_key.is_empty() {
                    log_error!("pexels", "No Pexels API key provided");
                    eprintln!("Error: No API key. Use --key <KEY> or set PEXELS_API_KEY env var.");
                    std::process::exit(1);
                }
                let url = if search_type == "video" {
                    format!("https://api.pexels.com/videos/search?query={}&per_page=20", query)
                } else {
                    format!("https://api.pexels.com/v1/search?query={}&per_page=20", query)
                };
                let rt = tokio::runtime::Runtime::new().unwrap();
                match rt.block_on(async {
                    let client = reqwest::Client::new();
                    let res = client.get(&url).header("Authorization", &api_key).send().await.map_err(|e| e.to_string())?;
                    res.text().await.map_err(|e| e.to_string())
                }) {
                    Ok(text) => {
                        log_cli!("pexels", "Pexels returned {} chars", text.len());
                        println!("{}", text);
                    }
                    Err(e) => {
                        log_error!("pexels", "Pexels search error: {}", e);
                        eprintln!("Pexels search error: {}", e);
                        std::process::exit(1);
                    }
                }
            }
            Commands::CryptArt { action } => {
                log_cli!("cryptart", "CryptArt CLI action");
                match action {
                    CryptArtCommands::Create { program, name, path } => {
                        log_cli!("cryptart-create", "Creating .CryptArt: program={} name={} path={:?}", program, name, path);
                        let known = ["media-mogul", "vibecode-worker", "demo-recorder", "valley-net", "game-studio"];
                        if !known.contains(&program.as_str()) {
                            eprintln!("Warning: '{}' is not a known program ({:?}). Creating anyway.", program, known);
                        }
                        let now = chrono::Utc::now().to_rfc3339();
                        let cryptart = serde_json::json!({
                            "$cryptart": 1,
                            "program": program,
                            "name": name,
                            "createdAt": now,
                            "updatedAt": now,
                            "appVersion": env!("CARGO_PKG_VERSION"),
                            "meta": {
                                "website": "https://mattyjacks.com"
                            },
                            "data": {}
                        });
                        match std::fs::write(&path, serde_json::to_string_pretty(&cryptart).unwrap()) {
                            Ok(_) => {
                                log_cli!("cryptart-create", "Created .CryptArt file at {:?}", path);
                                println!("Created .CryptArt file at {:?}", path);
                            }
                            Err(e) => {
                                log_error!("cryptart-create", "Error creating file: {}", e);
                                eprintln!("Error creating file: {}", e);
                                std::process::exit(1);
                            }
                        }
                    }
                    CryptArtCommands::Inspect { path } => {
                        log_cli!("cryptart-inspect", "Inspecting {:?}", path);
                        match std::fs::read_to_string(&path) {
                            Ok(content) => {
                                match serde_json::from_str::<serde_json::Value>(&content) {
                                    Ok(val) => {
                                        // Detect format generation
                                        let format_ver = val.get("$cryptart").and_then(|v| v.as_u64()).unwrap_or(0);
                                        if format_ver >= 1 {
                                            println!("Format:     .CryptArt v{}", format_ver);
                                        } else {
                                            println!("Format:     .CryptArt (legacy pre-v1)");
                                        }
                                        println!("Program:    {}", val["program"].as_str().unwrap_or("unknown"));
                                        // Support both old "version" and new "appVersion"
                                        let app_ver = val.get("appVersion")
                                            .or_else(|| val.get("version"))
                                            .and_then(|v| v.as_str())
                                            .unwrap_or("unknown");
                                        println!("App Ver:    {}", app_ver);
                                        println!("Name:       {}", val["name"].as_str().unwrap_or("unnamed"));
                                        println!("Created:    {}", val["createdAt"].as_str().unwrap_or("unknown"));
                                        println!("Updated:    {}", val["updatedAt"].as_str().unwrap_or("unknown"));
                                        if let Some(id) = val.get("id").and_then(|v| v.as_str()) {
                                            println!("ID:         {}", id);
                                        }
                                        if let Some(meta) = val.get("meta").and_then(|v| v.as_object()) {
                                            if let Some(website) = meta.get("website").and_then(|v| v.as_str()) {
                                                println!("Website:    {}", website);
                                            }
                                            if let Some(author) = meta.get("author").and_then(|v| v.as_str()) {
                                                println!("Author:     {}", author);
                                            }
                                            if let Some(desc) = meta.get("description").and_then(|v| v.as_str()) {
                                                println!("Desc:       {}", desc);
                                            }
                                            if let Some(tags) = meta.get("tags").and_then(|v| v.as_array()) {
                                                let tag_strs: Vec<&str> = tags.iter().filter_map(|t| t.as_str()).collect();
                                                println!("Tags:       {}", tag_strs.join(", "));
                                            }
                                        }
                                        println!("Data keys:  {:?}", val["data"].as_object().map(|o| o.keys().collect::<Vec<_>>()).unwrap_or_default());
                                        if let Some(ext) = val.get("extensions").and_then(|v| v.as_object()) {
                                            println!("Extensions: {:?}", ext.keys().collect::<Vec<_>>());
                                        }
                                        if let Some(hist) = val.get("history").and_then(|v| v.as_array()) {
                                            println!("History:    {} entries", hist.len());
                                        }
                                    }
                                    Err(e) => {
                                        eprintln!("Invalid JSON: {}", e);
                                        std::process::exit(1);
                                    }
                                }
                            }
                            Err(e) => {
                                eprintln!("Failed to read file: {}", e);
                                std::process::exit(1);
                            }
                        }
                    }
                }
            }
            Commands::Serve { port, api_key } => {
                log_cli!("serve", "Starting API server on port {}", port);
                run_api_server(port, api_key);
            }
            Commands::ReadFile { path } => {
                log_cli!("read-file", "Reading {:?}", path);
                match std::fs::read_to_string(&path) {
                    Ok(content) => {
                        log_cli!("read-file", "Read {} bytes from {:?}", content.len(), path);
                        print!("{}", content);
                    }
                    Err(e) => {
                        log_error!("read-file", "Error reading file: {}", e);
                        eprintln!("Error reading file: {}", e);
                        std::process::exit(1);
                    }
                }
            }
            Commands::WriteFile { path, content } => {
                log_cli!("write-file", "Writing to {:?}", path);
                let data = content.unwrap_or_else(|| {
                    let mut buf = String::new();
                    std::io::Read::read_to_string(&mut std::io::stdin(), &mut buf).unwrap_or(0);
                    buf
                });
                if let Some(parent) = path.parent() {
                    let _ = std::fs::create_dir_all(parent);
                }
                match std::fs::write(&path, &data) {
                    Ok(_) => {
                        log_cli!("write-file", "Written {} bytes to {:?}", data.len(), path);
                        println!("Written {} bytes to {:?}", data.len(), path);
                    }
                    Err(e) => {
                        log_error!("write-file", "Error writing file: {}", e);
                        eprintln!("Error writing file: {}", e);
                        std::process::exit(1);
                    }
                }
            }
            Commands::Ls { path } => {
                log_cli!("ls", "Listing directory {:?}", path);
                match std::fs::read_dir(&path) {
                    Ok(entries) => {
                        let items: Vec<serde_json::Value> = entries
                            .filter_map(|e| e.ok())
                            .map(|e| {
                                let meta = e.metadata().ok();
                                serde_json::json!({
                                    "name": e.file_name().to_string_lossy(),
                                    "is_dir": meta.as_ref().map(|m| m.is_dir()).unwrap_or(false),
                                    "size": meta.as_ref().map(|m| m.len()).unwrap_or(0),
                                })
                            })
                            .collect();
                        println!("{}", serde_json::to_string_pretty(&items).unwrap());
                    }
                    Err(e) => {
                        eprintln!("Error listing directory: {}", e);
                        std::process::exit(1);
                    }
                }
            }
            Commands::ListPrograms => {
                log_cli!("list-programs", "Listing available programs");
                println!("CryptArtist Studio Programs:");
                println!("  📺 Media Mogul      [MMo]  - Video editor, image editor, AI media studio");
                println!("  👩🏻‍💻 VibeCodeWorker  [VCW]  - Vibe-coding IDE powered by your API keys");
                println!("  🎥 DemoRecorder     [DRe]  - Screen recorder and live streamer");
                println!("  👱🏻‍♀️ ValleyNet       [VNt]  - Autonomous AI agent");
                println!("  🎮 GameStudio       [GSt]  - Media Mogul + VibeCodeWorker + Godot 4.4");
            }
            Commands::Export { project, output, format } => {
                log_cli!("export", "Exporting {:?} to {:?} (format: {})", project, output, format);
                match std::fs::read_to_string(&project) {
                    Ok(content) => {
                        match format.as_str() {
                            "json" => {
                                match std::fs::write(&output, &content) {
                                    Ok(_) => println!("Exported to {:?}", output),
                                    Err(e) => eprintln!("Export error: {}", e),
                                }
                            }
                            "txt" => {
                                match serde_json::from_str::<serde_json::Value>(&content) {
                                    Ok(val) => {
                                        let text = format!(
                                            "CryptArt Project Export\nProgram: {}\nName: {}\nVersion: {}\nCreated: {}\n",
                                            val["program"], val["name"], val["version"], val["createdAt"]
                                        );
                                        match std::fs::write(&output, text) {
                                            Ok(_) => println!("Exported to {:?}", output),
                                            Err(e) => eprintln!("Export error: {}", e),
                                        }
                                    }
                                    Err(e) => eprintln!("Parse error: {}", e),
                                }
                            }
                            _ => eprintln!("Unsupported format '{}'. Use: json, txt", format),
                        }
                    }
                    Err(e) => eprintln!("Failed to read project: {}", e),
                }
            }
            Commands::SysInfo => {
                log_cli!("sysinfo", "Displaying system info");
                println!("CryptArtist Studio v{}", env!("CARGO_PKG_VERSION"));
                println!("OS:          {}", std::env::consts::OS);
                println!("Arch:        {}", std::env::consts::ARCH);
                println!("Family:      {}", std::env::consts::FAMILY);
                println!("Mobile:      {}", cfg!(any(target_os = "android", target_os = "ios")));
                println!("Rust:        {}", env!("CARGO_PKG_RUST_VERSION", "stable"));
            }
        }
        std::process::exit(0);
    }

    // Normal GUI execution
    log_info!("main", "Starting GUI mode");
    log_info!("main", "Log directory: {}", logger::logger().get_log_dir());

    // Store any .CryptArt files found in CLI args
    let pending_files = cryptart_files.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(move |app| {
            // Inject any .CryptArt file paths from CLI args into AppState
            if !pending_files.is_empty() {
                let state = app.state::<AppState>();
                log_info!("setup", "Storing {} .CryptArt file(s) from CLI args", pending_files.len());
                state.set_files_to_open(pending_files.clone());
            }
            Ok(())
        })
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
            read_directory,
            read_text_file,
            write_text_file,
            save_givegigs_config,
            get_givegigs_config,
            get_platform_info,
            health_check,
            godot_detect,
            godot_create_project,
            godot_run_project,
            godot_export,
            godot_list_scenes,
            godot_list_scripts,
            log_from_frontend,
            get_log_session,
            get_log_recent,
            get_log_paths,
            save_openrouter_key,
            get_openrouter_key,
            openrouter_chat,
            openrouter_list_models,
            save_elevenlabs_key,
            get_elevenlabs_key,
            elevenlabs_list_voices,
            elevenlabs_list_models,
            elevenlabs_text_to_speech,
            elevenlabs_generate_sound_effect,
            elevenlabs_speech_to_text,
            export_all_api_keys,
            import_all_api_keys,
            get_file_to_open,
            clear_file_to_open,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CryptArtist Studio");
}

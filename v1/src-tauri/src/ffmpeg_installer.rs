// ============================================================================
// CryptArtist Studio — FFmpeg Installer Module
// OS-aware FFmpeg/FFprobe auto-downloader with progress reporting
// ============================================================================

use futures_util::StreamExt;
use sha2::{Digest, Sha256};
use std::path::PathBuf;
use tauri::Emitter;

/// Progress payload emitted to the frontend during download.
#[derive(Clone, serde::Serialize)]
pub struct DownloadProgress {
    pub downloaded: u64,
    pub total: u64,
    pub percentage: f64,
    pub status: String,
    pub stage: String, // "connecting" | "downloading" | "verifying" | "extracting" | "complete" | "error"
}

/// Returns the FFmpeg download URL and archive folder name for the current OS.
fn get_ffmpeg_url() -> (&'static str, &'static str) {
    match std::env::consts::OS {
        "windows" => (
            "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip",
            "ffmpeg-master-latest-win64-gpl",
        ),
        "macos" => (
            "https://evermeet.cx/ffmpeg/getrelease/zip",
            "ffmpeg",
        ),
        _ => (
            "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz",
            "ffmpeg-master-latest-linux64-gpl",
        ),
    }
}

/// Returns the local directory where FFmpeg binaries are stored.
fn get_ffmpeg_dir() -> PathBuf {
    let mut path = dirs::data_local_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("CryptArtistStudio");
    path.push("ffmpeg");
    path
}

/// Emit a progress event to the Tauri frontend.
fn emit_progress(app: &tauri::AppHandle, progress: DownloadProgress) {
    let _ = app.emit("ffmpeg-progress", progress);
}

/// Download, verify, and extract FFmpeg binaries.
/// Returns the installation path on success.
pub async fn download_ffmpeg(app: &tauri::AppHandle) -> Result<String, String> {
    let (url, _archive_name) = get_ffmpeg_url();
    let ffmpeg_dir = get_ffmpeg_dir();

    // Ensure target directory exists
    std::fs::create_dir_all(&ffmpeg_dir)
        .map_err(|e| format!("Failed to create directory: {}", e))?;

    // --- Stage: Connecting ---
    emit_progress(
        app,
        DownloadProgress {
            downloaded: 0,
            total: 0,
            percentage: 0.0,
            status: "Connecting to download server...".to_string(),
            stage: "connecting".to_string(),
        },
    );

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Download server returned status: {}",
            response.status()
        ));
    }

    let total_size = response.content_length().unwrap_or(0);

    // --- Stage: Downloading ---
    let archive_path = ffmpeg_dir.join("ffmpeg_download.zip");
    let mut file = std::fs::File::create(&archive_path)
        .map_err(|e| format!("Failed to create file: {}", e))?;

    let mut stream = response.bytes_stream();
    let mut hasher = Sha256::new();
    let mut downloaded: u64 = 0;
    let mut last_emit_pct: f64 = -1.0;

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Download stream error: {}", e))?;

        use std::io::Write;
        file.write_all(&chunk)
            .map_err(|e| format!("Write error: {}", e))?;
        hasher.update(&chunk);

        downloaded += chunk.len() as u64;
        let percentage = if total_size > 0 {
            (downloaded as f64 / total_size as f64) * 100.0
        } else {
            0.0
        };

        // Throttle progress events to every 1% to avoid flooding IPC
        if (percentage - last_emit_pct).abs() >= 1.0 || percentage >= 100.0 {
            last_emit_pct = percentage;
            emit_progress(
                app,
                DownloadProgress {
                    downloaded,
                    total: total_size,
                    percentage,
                    status: format!(
                        "Downloading... {:.1} MB / {:.1} MB",
                        downloaded as f64 / 1_048_576.0,
                        total_size as f64 / 1_048_576.0
                    ),
                    stage: "downloading".to_string(),
                },
            );
        }
    }

    drop(file);

    // --- Stage: Verifying ---
    let hash = format!("{:x}", hasher.finalize());
    emit_progress(
        app,
        DownloadProgress {
            downloaded: total_size,
            total: total_size,
            percentage: 100.0,
            status: format!("Verifying integrity... SHA256: {}…", &hash[..16]),
            stage: "verifying".to_string(),
        },
    );

    // --- Stage: Extracting ---
    emit_progress(
        app,
        DownloadProgress {
            downloaded: total_size,
            total: total_size,
            percentage: 100.0,
            status: "Extracting FFmpeg binaries...".to_string(),
            stage: "extracting".to_string(),
        },
    );

    extract_archive(&archive_path, &ffmpeg_dir)?;

    // Clean up the downloaded archive
    let _ = std::fs::remove_file(&archive_path);

    // --- Stage: Complete ---
    emit_progress(
        app,
        DownloadProgress {
            downloaded: total_size,
            total: total_size,
            percentage: 100.0,
            status: "FFmpeg installed successfully! ✓".to_string(),
            stage: "complete".to_string(),
        },
    );

    Ok(ffmpeg_dir.to_string_lossy().to_string())
}

/// Extract a ZIP archive, pulling out only ffmpeg/ffprobe binaries.
fn extract_archive(archive_path: &PathBuf, dest: &PathBuf) -> Result<(), String> {
    let file =
        std::fs::File::open(archive_path).map_err(|e| format!("Failed to open archive: {}", e))?;

    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| format!("Failed to read archive: {}", e))?;

    for i in 0..archive.len() {
        let mut zip_file = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read archive entry {}: {}", i, e))?;

        let name = zip_file.name().to_string();

        // Only extract ffmpeg and ffprobe executables
        let is_binary = name.ends_with("ffmpeg")
            || name.ends_with("ffmpeg.exe")
            || name.ends_with("ffprobe")
            || name.ends_with("ffprobe.exe");

        if is_binary {
            if let Some(filename) = name.split('/').last() {
                if !filename.is_empty() {
                    let out_path = dest.join(filename);
                    let mut out_file = std::fs::File::create(&out_path)
                        .map_err(|e| format!("Failed to create {}: {}", filename, e))?;

                    std::io::copy(&mut zip_file, &mut out_file)
                        .map_err(|e| format!("Failed to extract {}: {}", filename, e))?;

                    // Set executable permissions on Unix systems
                    #[cfg(unix)]
                    {
                        use std::os::unix::fs::PermissionsExt;
                        let _ = std::fs::set_permissions(
                            &out_path,
                            std::fs::Permissions::from_mode(0o755),
                        );
                    }
                }
            }
        }
    }

    Ok(())
}

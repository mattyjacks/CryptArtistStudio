// ============================================================================
// CryptArtist Studio - Automatic Logging System
// 3 log files:
//   1. cryptartist-recent.txt      - Last 1000 lines (rolling)
//   2. cryptartist-full-history.txt - Every line ever logged (append-only)
//   3. cryptartist-session.txt      - Last 100 lines since this run started
// ============================================================================

use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use std::collections::VecDeque;

// ---------------------------------------------------------------------------
// Log level
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
    Command,
    Api,
    Cli,
    Frontend,
}

impl std::fmt::Display for LogLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LogLevel::Debug => write!(f, "DEBUG"),
            LogLevel::Info => write!(f, "INFO"),
            LogLevel::Warn => write!(f, "WARN"),
            LogLevel::Error => write!(f, "ERROR"),
            LogLevel::Command => write!(f, "CMD"),
            LogLevel::Api => write!(f, "API"),
            LogLevel::Cli => write!(f, "CLI"),
            LogLevel::Frontend => write!(f, "FRONT"),
        }
    }
}

// ---------------------------------------------------------------------------
// Logger state
// ---------------------------------------------------------------------------

pub struct Logger {
    log_dir: PathBuf,
    recent_buffer: Mutex<VecDeque<String>>,
    session_buffer: Mutex<VecDeque<String>>,
}

const RECENT_MAX: usize = 1000;
const SESSION_MAX: usize = 100;

impl Logger {
    pub fn new() -> Self {
        let log_dir = Self::resolve_log_dir();
        fs::create_dir_all(&log_dir).ok();

        // Clear session log on startup
        let session_path = log_dir.join("cryptartist-session.txt");
        let header = format!(
            "=== CryptArtist Studio Session Started: {} ===\n",
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
        );
        fs::write(&session_path, &header).ok();

        // Log startup to full history
        let full_path = log_dir.join("cryptartist-full-history.txt");
        if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&full_path) {
            writeln!(f, "").ok();
            write!(f, "{}", &header).ok();
        }

        let logger = Logger {
            log_dir,
            recent_buffer: Mutex::new(VecDeque::with_capacity(RECENT_MAX + 1)),
            session_buffer: Mutex::new({
                let mut buf = VecDeque::with_capacity(SESSION_MAX + 1);
                buf.push_back(header.trim().to_string());
                buf
            }),
        };

        logger.log(LogLevel::Info, "logger", "Logging system initialized");
        logger.log(
            LogLevel::Info,
            "logger",
            &format!("Log directory: {}", logger.log_dir.display()),
        );

        logger
    }

    fn resolve_log_dir() -> PathBuf {
        // Use the app data directory / logs
        if let Some(data_dir) = dirs::data_local_dir() {
            data_dir.join("CryptArtist Studio").join("logs")
        } else {
            // Fallback to current directory
            PathBuf::from("logs")
        }
    }

    // -----------------------------------------------------------------------
    // Core log method
    // -----------------------------------------------------------------------

    pub fn log(&self, level: LogLevel, source: &str, message: &str) {
        let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
        let line = format!("[{}] [{}] [{}] {}", timestamp, level, source, message);

        // 1. Append to full history (every line ever)
        self.append_full_history(&line);

        // 2. Update recent buffer (last 1000 lines)
        self.push_recent(&line);

        // 3. Update session buffer (last 100 lines since run)
        self.push_session(&line);

        // Also print to stderr in debug builds
        #[cfg(debug_assertions)]
        eprintln!("{}", line);
    }

    fn append_full_history(&self, line: &str) {
        let path = self.log_dir.join("cryptartist-full-history.txt");
        if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(&path) {
            writeln!(f, "{}", line).ok();
        }
    }

    fn push_recent(&self, line: &str) {
        if let Ok(mut buf) = self.recent_buffer.lock() {
            buf.push_back(line.to_string());
            while buf.len() > RECENT_MAX {
                buf.pop_front();
            }
            // Write the rolling file
            let path = self.log_dir.join("cryptartist-recent.txt");
            if let Ok(mut f) = fs::File::create(&path) {
                for entry in buf.iter() {
                    writeln!(f, "{}", entry).ok();
                }
            }
        }
    }

    fn push_session(&self, line: &str) {
        if let Ok(mut buf) = self.session_buffer.lock() {
            buf.push_back(line.to_string());
            while buf.len() > SESSION_MAX {
                buf.pop_front();
            }
            // Write the session file
            let path = self.log_dir.join("cryptartist-session.txt");
            if let Ok(mut f) = fs::File::create(&path) {
                for entry in buf.iter() {
                    writeln!(f, "{}", entry).ok();
                }
            }
        }
    }

    // -----------------------------------------------------------------------
    // Convenience methods
    // -----------------------------------------------------------------------

    pub fn debug(&self, source: &str, message: &str) {
        self.log(LogLevel::Debug, source, message);
    }

    pub fn info(&self, source: &str, message: &str) {
        self.log(LogLevel::Info, source, message);
    }

    pub fn warn(&self, source: &str, message: &str) {
        self.log(LogLevel::Warn, source, message);
    }

    pub fn error(&self, source: &str, message: &str) {
        self.log(LogLevel::Error, source, message);
    }

    pub fn command(&self, cmd_name: &str, message: &str) {
        self.log(LogLevel::Command, cmd_name, message);
    }

    pub fn api(&self, endpoint: &str, message: &str) {
        self.log(LogLevel::Api, endpoint, message);
    }

    pub fn cli(&self, cmd_name: &str, message: &str) {
        self.log(LogLevel::Cli, cmd_name, message);
    }

    pub fn frontend(&self, component: &str, message: &str) {
        self.log(LogLevel::Frontend, component, message);
    }

    // -----------------------------------------------------------------------
    // Read logs back (for UI / API)
    // -----------------------------------------------------------------------

    pub fn read_recent(&self) -> Vec<String> {
        if let Ok(buf) = self.recent_buffer.lock() {
            buf.iter().cloned().collect()
        } else {
            vec![]
        }
    }

    pub fn read_session(&self) -> Vec<String> {
        if let Ok(buf) = self.session_buffer.lock() {
            buf.iter().cloned().collect()
        } else {
            vec![]
        }
    }

    pub fn get_log_dir(&self) -> String {
        self.log_dir.to_string_lossy().into_owned()
    }

    pub fn get_log_paths(&self) -> serde_json::Value {
        serde_json::json!({
            "recent": self.log_dir.join("cryptartist-recent.txt").to_string_lossy(),
            "full_history": self.log_dir.join("cryptartist-full-history.txt").to_string_lossy(),
            "session": self.log_dir.join("cryptartist-session.txt").to_string_lossy(),
        })
    }
}

// ---------------------------------------------------------------------------
// Global logger singleton (thread-safe)
// ---------------------------------------------------------------------------

use std::sync::OnceLock;

static GLOBAL_LOGGER: OnceLock<Logger> = OnceLock::new();

pub fn init_logger() {
    GLOBAL_LOGGER.get_or_init(Logger::new);
}

pub fn logger() -> &'static Logger {
    GLOBAL_LOGGER.get_or_init(Logger::new)
}

// ---------------------------------------------------------------------------
// Macros for convenient logging everywhere
// ---------------------------------------------------------------------------

#[macro_export]
macro_rules! log_debug {
    ($src:expr, $($arg:tt)*) => {
        $crate::logger::logger().debug($src, &format!($($arg)*))
    };
}

#[macro_export]
macro_rules! log_info {
    ($src:expr, $($arg:tt)*) => {
        $crate::logger::logger().info($src, &format!($($arg)*))
    };
}

#[macro_export]
macro_rules! log_warn {
    ($src:expr, $($arg:tt)*) => {
        $crate::logger::logger().warn($src, &format!($($arg)*))
    };
}

#[macro_export]
macro_rules! log_error {
    ($src:expr, $($arg:tt)*) => {
        $crate::logger::logger().error($src, &format!($($arg)*))
    };
}

#[macro_export]
macro_rules! log_cmd {
    ($src:expr, $($arg:tt)*) => {
        $crate::logger::logger().command($src, &format!($($arg)*))
    };
}

#[macro_export]
macro_rules! log_api {
    ($src:expr, $($arg:tt)*) => {
        $crate::logger::logger().api($src, &format!($($arg)*))
    };
}

#[macro_export]
macro_rules! log_cli {
    ($src:expr, $($arg:tt)*) => {
        $crate::logger::logger().cli($src, &format!($($arg)*))
    };
}

#[macro_export]
macro_rules! log_frontend {
    ($src:expr, $($arg:tt)*) => {
        $crate::logger::logger().frontend($src, &format!($($arg)*))
    };
}

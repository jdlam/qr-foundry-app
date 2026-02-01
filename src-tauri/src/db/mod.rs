use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;

pub mod history;
pub mod templates;

pub use history::*;
pub use templates::*;

/// Get the database path in the app data directory
pub fn get_db_path() -> PathBuf {
    let data_dir = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("com.jonathanlam.qr-foundry");

    // Create directory if it doesn't exist
    std::fs::create_dir_all(&data_dir).ok();

    data_dir.join("qr-foundry.db")
}

/// Database state managed by Tauri
pub struct DbState {
    pub conn: Mutex<Connection>,
}

impl DbState {
    pub fn new() -> Result<Self> {
        let db_path = get_db_path();
        let conn = Connection::open(&db_path)?;

        // Initialize schema
        init_schema(&conn)?;

        Ok(Self {
            conn: Mutex::new(conn),
        })
    }
}

/// Initialize the database schema
fn init_schema(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        r#"
        -- History of generated QR codes
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            qr_type TEXT NOT NULL,
            label TEXT,
            style_json TEXT NOT NULL,
            thumbnail TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        -- Create index on created_at for faster sorting
        CREATE INDEX IF NOT EXISTS idx_history_created_at ON history(created_at DESC);

        -- Saved style templates
        CREATE TABLE IF NOT EXISTS templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            style_json TEXT NOT NULL,
            preview TEXT,
            is_default INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );

        -- App settings
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        "#,
    )?;

    Ok(())
}

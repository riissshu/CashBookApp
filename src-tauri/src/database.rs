use rusqlite::Connection;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};

const SETTINGS_FILE: &str = "settings.json";

#[derive(Serialize)]
pub struct CompanyInfo {
    pub file_name: String,
    pub company_name: String,
    pub path: String,
}

fn default_database_directory(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join("CashBook").join("Databases")
}

fn settings_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join(SETTINGS_FILE)
}

fn get_saved_directory(app_data_dir: &Path) -> Option<PathBuf> {
    let path = settings_path(app_data_dir);

    if !path.exists() {
        return None;
    }

    let content = fs::read_to_string(path).ok()?;

    let value: serde_json::Value = serde_json::from_str(&content).ok()?;

    value
        .get("database_directory")?
        .as_str()
        .map(PathBuf::from)
}

fn save_directory(
    app_data_dir: &Path,
    database_directory: &Path,
) -> Result<(), String> {
    let path = settings_path(app_data_dir);

    let settings = serde_json::json!({
        "database_directory": database_directory.to_string_lossy()
    });

    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to create settings: {}", e))?;

    fs::write(path, content)
        .map_err(|e| format!("Failed to save settings: {}", e))?;

    Ok(())
}

pub fn get_database_directory_path(app_data_dir: PathBuf) -> Result<String, String> {
    let directory = match get_saved_directory(&app_data_dir) {
        Some(saved) => saved,
        None => default_database_directory(&app_data_dir),
    };

    fs::create_dir_all(&directory)
        .map_err(|e| format!("Failed to create database directory: {}", e))?;

    Ok(directory.to_string_lossy().to_string())
}

pub fn set_database_directory_path(
    app_data_dir: PathBuf,
    database_directory: String,
) -> Result<String, String> {
    let directory = PathBuf::from(&database_directory);

    if !directory.exists() {
        fs::create_dir_all(&directory)
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    if !directory.is_dir() {
        return Err("Selected path is not a directory".to_string());
    }

    save_directory(&app_data_dir, &directory)?;

    Ok(directory.to_string_lossy().to_string())
}

pub fn list_companies_from_directory(
    app_data_dir: PathBuf,
) -> Result<Vec<CompanyInfo>, String> {
    let directory = match get_saved_directory(&app_data_dir) {
        Some(saved) => saved,
        None => default_database_directory(&app_data_dir),
    };

    fs::create_dir_all(&directory)
        .map_err(|e| format!("Failed to create database directory: {}", e))?;

    let entries = fs::read_dir(&directory)
        .map_err(|e| format!("Failed to read database directory: {}", e))?;

    let mut companies = Vec::new();

    for entry in entries {
        let entry = entry
            .map_err(|e| format!("Failed to read directory entry: {}", e))?;

        let path = entry.path();

        if path.extension().and_then(|e| e.to_str()) != Some("db") {
            continue;
        }

        let connection = match Connection::open(&path) {
            Ok(connection) => connection,
            Err(_) => continue,
        };

        let company_name: Result<String, _> = connection.query_row(
            "SELECT company_name FROM company ORDER BY id LIMIT 1",
            [],
            |row| row.get(0),
        );

        if let Ok(company_name) = company_name {
            let file_name = path
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("")
                .to_string();

            companies.push(CompanyInfo {
                file_name,
                company_name,
                path: path.to_string_lossy().to_string(),
            });
        }
    }

    companies.sort_by(|a, b| {
        a.company_name
            .to_lowercase()
            .cmp(&b.company_name.to_lowercase())
    });

    Ok(companies)
}

pub fn create_company(
    app_data_dir: PathBuf,
    company_name: String,
    opening_balance: f64,
) -> Result<CompanyInfo, String> {
    let directory = match get_saved_directory(&app_data_dir) {
        Some(saved) => saved,
        None => default_database_directory(&app_data_dir),
    };

    fs::create_dir_all(&directory)
        .map_err(|e| format!("Failed to create database directory: {}", e))?;

    let trimmed_name = company_name.trim();

    if trimmed_name.is_empty() {
        return Err("Company name cannot be empty".to_string());
    }

    // Create a safe database filename from the company name.
    let mut file_name = trimmed_name
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == ' ' || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>();

    file_name = file_name.trim().to_string();

    if file_name.is_empty() {
        return Err("Invalid company name".to_string());
    }

    file_name.push_str(".db");

    let path = directory.join(&file_name);

    if path.exists() {
        return Err("A database file with this company name already exists".to_string());
    }

    let connection = Connection::open(&path)
        .map_err(|e| format!("Failed to create database: {}", e))?;

    connection.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS company (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            company_name TEXT,
            opening_balance REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS cashbook (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL UNIQUE,
            narration TEXT,
            total_receipt REAL NOT NULL DEFAULT 0,
            total_payment REAL NOT NULL DEFAULT 0,
            opening_balance REAL NOT NULL DEFAULT 0,
            closing_balance REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cashbook_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            type TEXT NOT NULL,
            party_name TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (cashbook_id) REFERENCES cashbook(id)
        );
        ",
    )
    .map_err(|e| format!("Failed to create database tables: {}", e))?;

    let now = chrono::Local::now().to_rfc3339();

    connection
        .execute(
            "
            INSERT INTO company (
                company_name,
                opening_balance,
                created_at,
                updated_at
            )
            VALUES (?1, ?2, ?3, ?3)
            ",
            rusqlite::params![trimmed_name, opening_balance, now],
        )
        .map_err(|e| format!("Failed to save company: {}", e))?;

    Ok(CompanyInfo {
        file_name,
        company_name: trimmed_name.to_string(),
        path: path.to_string_lossy().to_string(),
    })
}
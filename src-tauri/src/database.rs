use rusqlite::{Connection, OptionalExtension};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

const SETTINGS_FILE: &str = "settings.json";

#[derive(Serialize)]
pub struct CompanyInfo {
    pub id: i64,
    pub company_uuid: String,
    pub file_name: String,
    pub company_name: String,
    pub path: String,
}

#[derive(Serialize)]
pub struct Transaction {
    pub id: i64,
    pub cashbook_id: i64,
    pub date: String,
    pub transaction_type: String,
    pub party_name: String,
    pub amount: f64,
    pub description: Option<String>,
    pub created_at: String,
}

#[derive(Serialize)]
pub struct CashBook {
    pub id: i64,
    pub date: String,
    pub narration: Option<String>,
    pub total_receipt: f64,
    pub total_payment: f64,
    pub opening_balance: f64,
    pub closing_balance: f64,
    pub created_at: String,
    pub updated_at: String,
    pub transactions: Vec<Transaction>,
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

        let company_info: Result<(i64, String, String), _> = connection.query_row(
            "SELECT id, company_uuid, company_name FROM company ORDER BY id LIMIT 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        );

        if let Ok((id, company_uuid, company_name)) = company_info {
            let file_name = path
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or("")
                .to_string();

            companies.push(CompanyInfo {
                id,
                company_uuid,
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
            company_uuid TEXT NOT NULL UNIQUE,
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
    let company_uuid = Uuid::new_v4().to_string();

    connection
        .execute(
            "
            INSERT INTO company (
                company_uuid,
                company_name,
                opening_balance,
                created_at,
                updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?4)
            ",
            rusqlite::params![company_uuid, trimmed_name, opening_balance, now],
        )
        .map_err(|e| format!("Failed to save company: {}", e))?;

        let company_id = connection.last_insert_rowid();

    Ok(CompanyInfo {
        id: company_id,
        company_uuid,
        file_name,
        company_name: trimmed_name.to_string(),
        path: path.to_string_lossy().to_string(),
    })
}




pub fn set_active_company(
    app_data_dir: PathBuf,
    company_path: String,
) -> Result<(), String> {
    let settings_path = settings_path(&app_data_dir);

    let mut settings = if settings_path.exists() {
        let content = fs::read_to_string(&settings_path)
            .map_err(|e| format!("Failed to read settings: {}", e))?;

        serde_json::from_str::<serde_json::Value>(&content)
            .map_err(|e| format!("Failed to read settings: {}", e))?
    } else {
        serde_json::json!({})
    };

    settings["active_company"] = serde_json::Value::String(company_path);

    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to create settings: {}", e))?;

    fs::write(settings_path, content)
        .map_err(|e| format!("Failed to save settings: {}", e))?;

    Ok(())
}


pub fn get_active_company(
    app_data_dir: PathBuf,
) -> Result<String, String> {
    let path = settings_path(&app_data_dir);

    if !path.exists() {
        return Err("No active company selected".to_string());
    }

    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read settings: {}", e))?;

    let value: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to read settings: {}", e))?;

    value
        .get("active_company")
        .and_then(|v| v.as_str())
        .map(|v| v.to_string())
        .ok_or_else(|| "No active company selected".to_string())
}

pub fn clear_active_company(
    app_data_dir: PathBuf,
) -> Result<(), String> {
    let path = settings_path(&app_data_dir);

    if !path.exists() {
        return Ok(());
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read settings: {}", e))?;

    let mut settings = serde_json::from_str::<serde_json::Value>(&content)
        .map_err(|e| format!("Failed to read settings: {}", e))?;

    settings.as_object_mut()
        .map(|object| object.remove("active_company"));

    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to create settings: {}", e))?;

    fs::write(path, content)
        .map_err(|e| format!("Failed to save settings: {}", e))?;

    Ok(())
}



pub fn get_opening_balance(
    app_data_dir: PathBuf,
    date: String,
) -> Result<f64, String> {
    let active_company = get_active_company(app_data_dir)?;

    let connection = Connection::open(&active_company)
        .map_err(|e| format!("Failed to open company database: {}", e))?;

    let previous: Option<f64> = connection
        .query_row(
            "
            SELECT closing_balance
            FROM cashbook
            WHERE date < ?1
            ORDER BY date DESC
            LIMIT 1
            ",
            rusqlite::params![date],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to get previous balance: {}", e))?;

    if let Some(balance) = previous {
        return Ok(balance);
    }

    let opening_balance: Option<f64> = connection
        .query_row(
            "
            SELECT opening_balance
            FROM company
            ORDER BY id
            LIMIT 1
            ",
            [],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| format!("Failed to get company opening balance: {}", e))?;

    Ok(opening_balance.unwrap_or(0.0))
}


pub fn get_cash_book_by_date(
    app_data_dir: PathBuf,
    date: String,
) -> Result<Option<CashBook>, String> {
    let active_company = get_active_company(app_data_dir)?;

    let connection = Connection::open(&active_company)
        .map_err(|e| format!("Failed to open company database: {}", e))?;

    let cashbook = connection
        .query_row(
            "
            SELECT
                id,
                date,
                narration,
                total_receipt,
                total_payment,
                opening_balance,
                closing_balance,
                created_at,
                updated_at
            FROM cashbook
            WHERE date = ?1
            ",
            rusqlite::params![date],
            |row| {
                Ok(CashBook {
                    id: row.get(0)?,
                    date: row.get(1)?,
                    narration: row.get(2)?,
                    total_receipt: row.get(3)?,
                    total_payment: row.get(4)?,
                    opening_balance: row.get(5)?,
                    closing_balance: row.get(6)?,
                    created_at: row.get(7)?,
                    updated_at: row.get(8)?,
                    transactions: Vec::new(),
                })
            },
        )
        .optional()
        .map_err(|e| format!("Failed to get cash book: {}", e))?;

    let Some(mut cashbook) = cashbook else {
        return Ok(None);
    };

    let mut statement = connection
        .prepare(
            "
            SELECT
                id,
                cashbook_id,
                date,
                type,
                party_name,
                amount,
                description,
                created_at
            FROM transactions
            WHERE cashbook_id = ?1
            ORDER BY id ASC
            ",
        )
        .map_err(|e| format!("Failed to prepare transactions query: {}", e))?;

    let rows = statement
        .query_map(rusqlite::params![cashbook.id], |row| {
            Ok(Transaction {
                id: row.get(0)?,
                cashbook_id: row.get(1)?,
                date: row.get(2)?,
                transaction_type: row.get(3)?,
                party_name: row.get(4)?,
                amount: row.get(5)?,
                description: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("Failed to get transactions: {}", e))?;

    for row in rows {
        cashbook
            .transactions
            .push(row.map_err(|e| format!("Failed to read transaction: {}", e))?);
    }

    Ok(Some(cashbook))
}


pub fn create_cash_book(
    app_data_dir: PathBuf,
    date: String,
    narration: String,
) -> Result<Option<CashBook>, String> {
    // Check if this date already exists
    if let Some(existing) = get_cash_book_by_date(
        app_data_dir.clone(),
        date.clone(),
    )? {
        return Ok(Some(existing));
    }

    // Get opening balance for this date
    let opening_balance = get_opening_balance(
        app_data_dir.clone(),
        date.clone(),
    )?;

    let active_company = get_active_company(app_data_dir.clone())?;

    let connection = Connection::open(&active_company)
        .map_err(|e| format!("Failed to open company database: {}", e))?;

    let now = chrono::Utc::now().to_rfc3339();

    connection
        .execute(
            "
            INSERT INTO cashbook (
                date,
                narration,
                total_receipt,
                total_payment,
                opening_balance,
                closing_balance,
                created_at,
                updated_at
            )
            VALUES (?1, ?2, 0, 0, ?3, ?3, ?4, ?4)
            ",
            rusqlite::params![
                date,
                narration,
                opening_balance,
                now
            ],
        )
        .map_err(|e| format!("Failed to create cash book: {}", e))?;

    get_cash_book_by_date(
        app_data_dir,
        date,
    )
}

pub fn save_cash_book(
    app_data_dir: PathBuf,
    cashbook_id: i64,
    date: String,
    narration: String,
    transactions: Vec<serde_json::Value>,
) -> Result<Option<CashBook>, String> {
    let active_company = get_active_company(app_data_dir.clone())?;

    let mut connection = Connection::open(&active_company)
        .map_err(|e| format!("Failed to open company database: {}", e))?;

    let transaction = connection
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    transaction
        .execute(
            "DELETE FROM transactions WHERE cashbook_id = ?1",
            rusqlite::params![cashbook_id],
        )
        .map_err(|e| format!("Failed to delete existing transactions: {}", e))?;

    let now = chrono::Utc::now().to_rfc3339();

    let mut total_receipt = 0.0;
    let mut total_payment = 0.0;

    for item in transactions {
        let transaction_type = item
            .get("transaction_type")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let party_name = item
            .get("party_name")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let amount = item
            .get("amount")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);

        let description = item
            .get("description")
            .and_then(|v| v.as_str());

        if transaction_type == "receipt" {
            total_receipt += amount;
        } else if transaction_type == "payment" {
            total_payment += amount;
        }

        transaction
            .execute(
                "
                INSERT INTO transactions (
                    cashbook_id,
                    date,
                    type,
                    party_name,
                    amount,
                    description,
                    created_at
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                ",
                rusqlite::params![
                    cashbook_id,
                    date,
                    transaction_type,
                    party_name,
                    amount,
                    description,
                    now
                ],
            )
            .map_err(|e| format!("Failed to save transaction: {}", e))?;
    }

    let opening_balance = {
        let previous: Option<f64> = transaction
            .query_row(
                "
                SELECT closing_balance
                FROM cashbook
                WHERE date < ?1
                ORDER BY date DESC
                LIMIT 1
                ",
                rusqlite::params![date],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| format!("Failed to get previous balance: {}", e))?;

        match previous {
            Some(balance) => balance,
            None => transaction
                .query_row(
                    "
                    SELECT opening_balance
                    FROM company
                    ORDER BY id
                    LIMIT 1
                    ",
                    [],
                    |row| row.get(0),
                )
                .optional()
                .map_err(|e| {
                    format!("Failed to get company opening balance: {}", e)
                })?
                .unwrap_or(0.0),
        }
    };

    let closing_balance =
        opening_balance + total_receipt - total_payment;

    transaction
        .execute(
            "
            UPDATE cashbook
            SET narration = ?1,
                total_receipt = ?2,
                total_payment = ?3,
                opening_balance = ?4,
                closing_balance = ?5,
                updated_at = ?6
            WHERE id = ?7
            ",
            rusqlite::params![
                narration,
                total_receipt,
                total_payment,
                opening_balance,
                closing_balance,
                now,
                cashbook_id
            ],
        )
        .map_err(|e| format!("Failed to update cash book: {}", e))?;

    transaction
        .commit()
        .map_err(|e| format!("Failed to save cash book: {}", e))?;

    recalculate_from_date_internal(&active_company, &date)?;

    get_cash_book_by_date(
        app_data_dir,
        date,
    )
}


fn recalculate_from_date_internal(
    database_path: &str,
    start_date: &str,
) -> Result<(), String> {
    let connection = Connection::open(database_path)
        .map_err(|e| format!("Failed to open company database: {}", e))?;

    let mut statement = connection
        .prepare(
            "
            SELECT
                id,
                total_receipt,
                total_payment
            FROM cashbook
            WHERE date >= ?1
            ORDER BY date ASC
            ",
        )
        .map_err(|e| format!("Failed to prepare cash book query: {}", e))?;

    let days: Vec<(i64, f64, f64)> = statement
        .query_map(rusqlite::params![start_date], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
            ))
        })
        .map_err(|e| format!("Failed to read cash books: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read cash book row: {}", e))?;

    drop(statement);

    let mut previous_closing = {
        let previous: Option<f64> = connection
            .query_row(
                "
                SELECT closing_balance
                FROM cashbook
                WHERE date < ?1
                ORDER BY date DESC
                LIMIT 1
                ",
                rusqlite::params![start_date],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| format!("Failed to get previous balance: {}", e))?;

        match previous {
            Some(balance) => balance,
            None => connection
                .query_row(
                    "
                    SELECT opening_balance
                    FROM company
                    ORDER BY id
                    LIMIT 1
                    ",
                    [],
                    |row| row.get(0),
                )
                .optional()
                .map_err(|e| {
                    format!("Failed to get company opening balance: {}", e)
                })?
                .unwrap_or(0.0),
        }
    };

    for (id, total_receipt, total_payment) in days {
        let opening_balance = previous_closing;

        let closing_balance =
            opening_balance + total_receipt - total_payment;

        connection
            .execute(
                "
                UPDATE cashbook
                SET opening_balance = ?1,
                    closing_balance = ?2
                WHERE id = ?3
                ",
                rusqlite::params![
                    opening_balance,
                    closing_balance,
                    id
                ],
            )
            .map_err(|e| {
                format!("Failed to recalculate cash book: {}", e)
            })?;

        previous_closing = closing_balance;
    }

    Ok(())
}

pub fn list_cash_books(
    app_data_dir: PathBuf,
) -> Result<Vec<CashBook>, String> {
    let active_company = get_active_company(app_data_dir)?;

    let connection = Connection::open(&active_company)
        .map_err(|e| format!("Failed to open company database: {}", e))?;

    let mut statement = connection
        .prepare(
            "
            SELECT
                id,
                date,
                narration,
                total_receipt,
                total_payment,
                opening_balance,
                closing_balance,
                created_at,
                updated_at
            FROM cashbook
            ORDER BY date DESC
            ",
        )
        .map_err(|e| format!("Failed to prepare cash books query: {}", e))?;

    let rows = statement
        .query_map([], |row| {
            Ok(CashBook {
                id: row.get(0)?,
                date: row.get(1)?,
                narration: row.get(2)?,
                total_receipt: row.get(3)?,
                total_payment: row.get(4)?,
                opening_balance: row.get(5)?,
                closing_balance: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
                transactions: Vec::new(),
            })
        })
        .map_err(|e| format!("Failed to read cash books: {}", e))?;

    let mut cash_books = Vec::new();

    for row in rows {
        cash_books.push(
            row.map_err(|e| format!("Failed to read cash book: {}", e))?
        );
    }

    Ok(cash_books)
}


pub fn get_company_settings(
    app_data_dir: PathBuf,
) -> Result<serde_json::Value, String> {
    let active_company = get_active_company(app_data_dir)?;

    let connection = Connection::open(&active_company)
        .map_err(|e| format!("Failed to open company database: {}", e))?;

    let company = connection
        .query_row(
            "
            SELECT company_name, opening_balance
            FROM company
            ORDER BY id
            LIMIT 1
            ",
            [],
            |row| {
                Ok(serde_json::json!({
                    "company_name": row.get::<_, String>(0)?,
                    "opening_balance": row.get::<_, f64>(1)?
                }))
            },
        )
        .optional()
        .map_err(|e| format!("Failed to get company settings: {}", e))?;

    company.ok_or_else(|| "Company settings not found".to_string())
}


pub fn update_company_settings(
    app_data_dir: PathBuf,
    company_name: String,
    opening_balance: f64,
) -> Result<(), String> {
    let active_company = get_active_company(app_data_dir)?;

    let mut connection = Connection::open(&active_company)
        .map_err(|e| format!("Failed to open company database: {}", e))?;

    let transaction = connection
        .transaction()
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    let now = chrono::Local::now().to_rfc3339();

    transaction
        .execute(
            "
            UPDATE company
            SET company_name = ?1,
                opening_balance = ?2,
                updated_at = ?3
            WHERE id = (
                SELECT id
                FROM company
                ORDER BY id
                LIMIT 1
            )
            ",
            rusqlite::params![company_name.trim(), opening_balance, now],
        )
        .map_err(|e| format!("Failed to update company settings: {}", e))?;

    // Recalculate every existing Cash Book from the beginning.
    let days: Vec<(i64, f64, f64)> = {
        let mut statement = transaction
            .prepare(
                "
                SELECT id, total_receipt, total_payment
                FROM cashbook
                ORDER BY date ASC
                ",
            )
            .map_err(|e| format!("Failed to read Cash Books: {}", e))?;

        let rows = statement
            .query_map([], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, f64>(1)?,
                    row.get::<_, f64>(2)?,
                ))
            })
            .map_err(|e| format!("Failed to read Cash Books: {}", e))?;

        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Failed to process Cash Books: {}", e))?
    };

    let mut previous_closing = opening_balance;

    for (id, total_receipt, total_payment) in days {
        let opening = previous_closing;

        let closing =
            opening + total_receipt - total_payment;

        transaction
            .execute(
                "
                UPDATE cashbook
                SET opening_balance = ?1,
                    closing_balance = ?2
                WHERE id = ?3
                ",
                rusqlite::params![opening, closing, id],
            )
            .map_err(|e| format!("Failed to recalculate Cash Book: {}", e))?;

        previous_closing = closing;
    }

    transaction
        .commit()
        .map_err(|e| format!("Failed to save company settings: {}", e))?;

    Ok(())
}
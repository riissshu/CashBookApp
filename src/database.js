import Database from "@tauri-apps/plugin-sql";
import { appConfigDir, appDataDir } from "@tauri-apps/api/path";

let db;

export async function initDatabase() {
  // Log the directories where plugins usually store files
  const dbPath = await appConfigDir();
  console.log("Database directory:", dbPath);

  const dbDir = await appDataDir();
  console.log("Database directory:", dbDir);

  db = await Database.load("sqlite:cashbook.db");

  // Settings table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT,
      opening_balance REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Cash Book table - one record for each day
  await db.execute(`
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
    )
  `);

  // Individual receipt/payment transactions
  await db.execute(`
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
    )
  `);

  return db;
}

export function getDatabase() {
  return db;
}
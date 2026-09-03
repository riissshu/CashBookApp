import Database from "@tauri-apps/plugin-sql";

let db;

export async function initDatabase() {
  db = await Database.load("sqlite:cashbook.db");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      voucher_no TEXT NOT NULL,
      party_name TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    )
  `);

  return db;
}

export function getDatabase() {
  return db;
}
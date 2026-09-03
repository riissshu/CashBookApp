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

export async function getOpeningBalance(date) {
  // Find the latest Cash Book before this date
  const previous = await db.select(
    `SELECT closing_balance
     FROM cashbook
     WHERE date < ?
     ORDER BY date DESC
     LIMIT 1`,
    [date]
  );

  // If no previous day exists, use the opening balance from settings
  if (previous.length === 0) {
    const settings = await db.select(
      `SELECT opening_balance
       FROM settings
       ORDER BY id
       LIMIT 1`
    );

    return settings.length > 0 ? settings[0].opening_balance : 0;
  }

  return previous[0].closing_balance;
}

export async function getCashBookByDate(date) {
  const cashbooks = await db.select(
    `SELECT *
     FROM cashbook
     WHERE date = ?`,
    [date]
  );

  if (cashbooks.length === 0) {
    return null;
  }

  const cashbook = cashbooks[0];

  const transactions = await db.select(
    `SELECT *
     FROM transactions
     WHERE cashbook_id = ?
     ORDER BY id ASC`,
    [cashbook.id]
  );

  return {
    ...cashbook,
    transactions,
  };
}

export async function createCashBook(date, narration = "") {
  const existing = await getCashBookByDate(date);

  if (existing) {
    return existing;
  }

  const openingBalance = await getOpeningBalance(date);
  const now = new Date().toISOString();

  const result = await db.execute(
    `INSERT INTO cashbook
      (date, narration, total_receipt, total_payment,
       opening_balance, closing_balance, created_at, updated_at)
     VALUES (?, ?, 0, 0, ?, ?, ?, ?)`,
    [
      date,
      narration,
      openingBalance,
      openingBalance,
      now,
      now,
    ]
  );

  return getCashBookByDate(date);
}

export async function saveCashBook(
  cashbookId,
  date,
  narration,
  transactions
) {
  // Remove existing transaction lines for this day
  await db.execute(
    `DELETE FROM transactions
     WHERE cashbook_id = ?`,
    [cashbookId]
  );

  const now = new Date().toISOString();

  let totalReceipt = 0;
  let totalPayment = 0;

  // Insert current receipt/payment lines
  for (const transaction of transactions) {
    const amount = Number(transaction.amount) || 0;

    if (transaction.type === "receipt") {
      totalReceipt += amount;
    } else if (transaction.type === "payment") {
      totalPayment += amount;
    }

    await db.execute(
      `INSERT INTO transactions
        (cashbook_id, date, type, party_name, amount,
         description, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        cashbookId,
        date,
        transaction.type,
        transaction.party_name,
        amount,
        transaction.description || null,
        now,
      ]
    );
  }

  // Get opening balance
  const openingBalance = await getOpeningBalance(date);

  const closingBalance =
    openingBalance + totalReceipt - totalPayment;

  // Update Cash Book
  await db.execute(
    `UPDATE cashbook
     SET narration = ?,
         total_receipt = ?,
         total_payment = ?,
         opening_balance = ?,
         closing_balance = ?,
         updated_at = ?
     WHERE id = ?`,
    [
      narration,
      totalReceipt,
      totalPayment,
      openingBalance,
      closingBalance,
      now,
      cashbookId,
    ]
  );

  // Recalculate all following days
  await recalculateFromDate(date);

  return getCashBookByDate(date);
}

export async function recalculateFromDate(startDate) {
  const days = await db.select(
    `SELECT *
     FROM cashbook
     WHERE date >= ?
     ORDER BY date ASC`,
    [startDate]
  );

  let previousClosing = await getOpeningBalance(startDate);

  for (const day of days) {
    const openingBalance = previousClosing;

    const closingBalance =
      openingBalance +
      Number(day.total_receipt || 0) -
      Number(day.total_payment || 0);

    await db.execute(
      `UPDATE cashbook
       SET opening_balance = ?,
           closing_balance = ?
       WHERE id = ?`,
      [
        openingBalance,
        closingBalance,
        day.id,
      ]
    );

    previousClosing = closingBalance;
  }
}
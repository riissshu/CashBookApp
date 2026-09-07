import { invoke } from "@tauri-apps/api/core";

export async function getDatabaseDirectory() {
  return await invoke("get_database_directory");
}

export async function setDatabaseDirectory(directory) {
  return await invoke("set_database_directory", {
    directory,
  });
}

export async function listCompanies() {
  return await invoke("list_companies");
}

export async function createCompany(companyName, openingBalance) {
  return await invoke("create_company", {
    companyName,
    openingBalance,
  });
}

export async function setActiveCompany(companyPath) {
  return await invoke("set_active_company", {
    companyPath,
  });
}

export async function clearActiveCompany() {
  return await invoke("clear_active_company");
}

export async function getActiveCompany() {
  return await invoke("get_active_company");
}

export async function getOpeningBalance(date) {
  return await invoke("get_opening_balance", {
    date,
  });
}

export async function getCashBookByDate(date) {
  return await invoke("get_cash_book_by_date", {
    date,
  });
}

export async function createCashBook(date, narration = "") {
  return await invoke("create_cash_book", {
    date,
    narration,
  });
}

export async function saveCashBook(
  cashbookId,
  date,
  narration,
  transactions
) {
  return await invoke("save_cash_book", {
    cashbookId,
    date,
    narration,
    transactions,
  });
}

export async function listCashBooks() {
  return await invoke("list_cash_books");
}

export async function getCompanySettings() {
  return await invoke("get_company_settings");
}

export async function updateCompanySettings(companyName, openingBalance) {
  return await invoke("update_company_settings", {
    companyName,
    openingBalance,
  });
}
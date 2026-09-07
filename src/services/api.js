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
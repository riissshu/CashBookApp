#[cfg_attr(mobile, tauri::mobile_entry_point)]
mod database;

use tauri::Manager;

#[tauri::command]
fn get_database_directory(app: tauri::AppHandle) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    database::get_database_directory_path(app_data_dir)
}

#[tauri::command]
fn set_database_directory(
    app: tauri::AppHandle,
    directory: String,
) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    database::set_database_directory_path(app_data_dir, directory)
}

#[tauri::command]
fn list_companies(
    app: tauri::AppHandle,
) -> Result<Vec<database::CompanyInfo>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    database::list_companies_from_directory(app_data_dir)
}


#[tauri::command]
fn create_company(
    app: tauri::AppHandle,
    company_name: String,
    opening_balance: f64,
) -> Result<database::CompanyInfo, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    database::create_company(
        app_data_dir,
        company_name,
        opening_balance,
    )
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|_app| {

            Ok(())
        })

        .invoke_handler(tauri::generate_handler![
    get_database_directory,
    set_database_directory,
    list_companies,
      create_company
])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
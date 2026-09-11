#[cfg_attr(mobile, tauri::mobile_entry_point)]
mod database;
mod backup;

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


#[tauri::command]
fn set_active_company(
    app: tauri::AppHandle,
    company_path: String,
) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    database::set_active_company(app_data_dir, company_path)
}


#[tauri::command]
fn clear_active_company(
    app: tauri::AppHandle,
) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    database::clear_active_company(app_data_dir)
}


#[tauri::command]
fn get_active_company(
    app: tauri::AppHandle,
) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    database::get_active_company(app_data_dir)
}

#[tauri::command]
fn get_opening_balance(
    app: tauri::AppHandle,
    date: String,
) -> Result<f64, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    database::get_opening_balance(app_data_dir, date)
}

#[tauri::command]
fn get_cash_book_by_date(
    app: tauri::AppHandle,
    date: String,
) -> Result<Option<database::CashBook>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    database::get_cash_book_by_date(app_data_dir, date)
}

#[tauri::command]
fn create_cash_book(
    app: tauri::AppHandle,
    date: String,
    narration: String,
) -> Result<Option<database::CashBook>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    database::create_cash_book(
        app_data_dir,
        date,
        narration,
    )
}

#[tauri::command]
fn save_cash_book(
    app: tauri::AppHandle,
    cashbook_id: i64,
    date: String,
    narration: String,
    transactions: Vec<serde_json::Value>,
) -> Result<Option<database::CashBook>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    database::save_cash_book(
        app_data_dir,
        cashbook_id,
        date,
        narration,
        transactions,
    )
}

#[tauri::command]
fn list_cash_books(
    app: tauri::AppHandle,
) -> Result<Vec<database::CashBook>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    database::list_cash_books(app_data_dir)
}


#[tauri::command]
fn get_company_settings(
    app: tauri::AppHandle,
) -> Result<serde_json::Value, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    database::get_company_settings(app_data_dir)
}

#[tauri::command]
fn update_company_settings(
    app: tauri::AppHandle,
    company_name: String,
    opening_balance: f64,
) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    database::update_company_settings(
        app_data_dir,
        company_name,
        opening_balance,
    )
}


#[tauri::command]
fn create_backup(
    app: tauri::AppHandle,
    backup_path: String,
) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    let database_path = database::get_active_company(app_data_dir)?;

    backup::create_backup(
        std::path::Path::new(&database_path),
        std::path::Path::new(&backup_path),
    )
}


#[tauri::command]
fn inspect_backup(
    backup_path: String,
) -> Result<backup::BackupMetadata, String> {
    backup::inspect_backup(
        std::path::Path::new(&backup_path),
    )
}


#[tauri::command]
fn restore_backup(
    app: tauri::AppHandle,
    backup_path: String,
    action: String,
    existing_company_path: Option<String>,
) -> Result<(), String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;






         // A company must not be open while restoring.
    if action == "replace" {
        if let Ok(active_company) =
            database::get_active_company(app_data_dir.clone())
        {
            if let Some(existing_path) = &existing_company_path {
                let active_path =
                    std::path::Path::new(&active_company);

                let selected_path =
                    std::path::Path::new(existing_path);

                if active_path == selected_path {
                    return Err(
                        "Please close the active company before restoring it"
                            .to_string(),
                    );
                }
            }
        }
    }
     // A company must not be open while restoring.






    let database_directory =
        database::get_database_directory_path(app_data_dir)?;

    backup::restore_backup(
        std::path::Path::new(&backup_path),
        std::path::Path::new(&database_directory),
        &action,
        existing_company_path
            .as_deref()
            .map(std::path::Path::new),
    )
}








pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_window_state::Builder::default().build())?;

            Ok(())
        })

        .invoke_handler(tauri::generate_handler![
    get_database_directory,
    set_database_directory,
    list_companies,
    create_company,
    set_active_company,
    get_active_company,
    get_opening_balance,
    get_cash_book_by_date,
    create_cash_book,
    save_cash_book,
    list_cash_books,
    get_company_settings,
    update_company_settings,
    clear_active_company,
    create_backup,
    restore_backup,
    inspect_backup,
])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
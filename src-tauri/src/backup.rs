use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use rand::RngCore;
use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};


#[derive(Serialize, Deserialize)]
pub struct BackupMetadata {
    pub company_uuid: String,
    pub company_name: String,
}

// CashBook portable master key.
// This is used only to protect the random key generated for each backup.
const MASTER_KEY: [u8; 32] = [
    0x43, 0x61, 0x73, 0x68, 0x42, 0x6F, 0x6F, 0x6B,
    0x42, 0x61, 0x63, 0x6B, 0x75, 0x70, 0x4B, 0x65,
    0x79, 0x32, 0x30, 0x32, 0x36, 0x43, 0x42, 0x4B,
    0x31, 0x21, 0x21, 0x21, 0x21, 0x21, 0x21, 0x21,
];

const MAGIC: &[u8; 4] = b"CBK1";

const NONCE_SIZE: usize = 12;
const KEY_SIZE: usize = 32;

pub fn create_backup(
    database_path: &Path,
    backup_path: &Path,
) -> Result<(), String> {

    // Read company identity
let connection = rusqlite::Connection::open(database_path)
    .map_err(|e| format!("Failed to open database: {}", e))?;

let (company_uuid, company_name): (String, String) = connection
    .query_row(
        "SELECT company_uuid, company_name FROM company ORDER BY id LIMIT 1",
        [],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .map_err(|e| format!("Failed to read company information: {}", e))?;

    let metadata = BackupMetadata {
    company_uuid,
    company_name,
};

let metadata_data = serde_json::to_vec(&metadata)
    .map_err(|e| format!("Failed to create backup metadata: {}", e))?;

    // Read the SQLite database
    let database_data = fs::read(database_path)
        .map_err(|e| format!("Failed to read database: {}", e))?;

    // Compress database
    let compressed_data = zstd::encode_all(
        database_data.as_slice(),
        3,
    )
    .map_err(|e| format!("Failed to compress database: {}", e))?;

    // Generate a random AES-256 key for THIS backup
    let mut backup_key = [0u8; KEY_SIZE];
    rand::thread_rng().fill_bytes(&mut backup_key);

    // Generate random nonce for metadata encryption
let mut metadata_nonce = [0u8; NONCE_SIZE];
rand::thread_rng().fill_bytes(&mut metadata_nonce);

// Encrypt metadata using the backup key
let metadata_cipher = Aes256Gcm::new(
    Key::<Aes256Gcm>::from_slice(&backup_key),
);

let encrypted_metadata = metadata_cipher
    .encrypt(
        Nonce::from_slice(&metadata_nonce),
        metadata_data.as_slice(),
    )
    .map_err(|_| "Failed to encrypt backup metadata".to_string())?;

    // Generate random nonce for database encryption
    let mut database_nonce = [0u8; NONCE_SIZE];
    rand::thread_rng().fill_bytes(&mut database_nonce);

    // Encrypt compressed database
    let database_cipher = Aes256Gcm::new(
        Key::<Aes256Gcm>::from_slice(&backup_key),
    );

    let encrypted_database = database_cipher
        .encrypt(
            Nonce::from_slice(&database_nonce),
            compressed_data.as_slice(),
        )
        .map_err(|_| "Failed to encrypt database".to_string())?;

    // Protect the backup key using the CashBook master key
    let master_cipher = Aes256Gcm::new(
        Key::<Aes256Gcm>::from_slice(&MASTER_KEY),
    );

    let mut key_nonce = [0u8; NONCE_SIZE];
    rand::thread_rng().fill_bytes(&mut key_nonce);

    let encrypted_backup_key = master_cipher
        .encrypt(
            Nonce::from_slice(&key_nonce),
            backup_key.as_slice(),
        )
        .map_err(|_| "Failed to protect backup key".to_string())?;

    // Build .001 file
    let mut output = Vec::new();

    // Magic
    output.extend_from_slice(MAGIC);

    // Version
    output.push(1);

    // Compression: 1 = Zstd
    output.push(1);

    // Encryption: 1 = AES-256-GCM
    output.push(1);

    // Reserved
    output.push(0);

    // Key nonce
    output.extend_from_slice(&key_nonce);

    // Database nonce
    output.extend_from_slice(&database_nonce);

    // Metadata nonce
    output.extend_from_slice(&metadata_nonce);

    // Encrypted metadata length
    let metadata_length = encrypted_metadata.len() as u32;
    output.extend_from_slice(&metadata_length.to_le_bytes());

    // Encrypted metadata
    output.extend_from_slice(&encrypted_metadata);

    // Encrypted backup key length
    let key_length = encrypted_backup_key.len() as u32;
    output.extend_from_slice(&key_length.to_le_bytes());

    // Encrypted backup key
    output.extend_from_slice(&encrypted_backup_key);

    // Encrypted database
    output.extend_from_slice(&encrypted_database);

    // Write final .001 file
    fs::write(backup_path, output)
        .map_err(|e| format!("Failed to write backup: {}", e))?;

    Ok(())
}






pub fn inspect_backup(
    backup_path: &Path,
) -> Result<BackupMetadata, String> {
    let backup_data = fs::read(backup_path)
        .map_err(|e| format!("Failed to read backup: {}", e))?;

    let mut position = 0;

    // Check minimum header size
    if backup_data.len() < 8 {
        return Err("Invalid CashBook backup file".to_string());
    }

    // Check magic
    if &backup_data[0..4] != MAGIC {
        return Err("Invalid CashBook backup file".to_string());
    }

    position += 4;

    // Version
    let version = backup_data[position];
    position += 1;

    if version != 1 {
        return Err("Unsupported CashBook backup version".to_string());
    }

    // Compression
    let compression = backup_data[position];
    position += 1;

    if compression != 1 {
        return Err("Unsupported compression format".to_string());
    }

    // Encryption
    let encryption = backup_data[position];
    position += 1;

    if encryption != 1 {
        return Err("Unsupported encryption format".to_string());
    }

    // Reserved
    position += 1;

    // Key nonce
    if backup_data.len() < position + NONCE_SIZE {
        return Err("Invalid backup file".to_string());
    }

    let key_nonce = &backup_data[position..position + NONCE_SIZE];
    position += NONCE_SIZE;

    // Database nonce
    if backup_data.len() < position + NONCE_SIZE {
        return Err("Invalid backup file".to_string());
    }

    position += NONCE_SIZE;

    // Metadata nonce
    if backup_data.len() < position + NONCE_SIZE {
        return Err("Invalid backup file".to_string());
    }

    let metadata_nonce =
        &backup_data[position..position + NONCE_SIZE];
    position += NONCE_SIZE;

    // Metadata length
    if backup_data.len() < position + 4 {
        return Err("Invalid backup file".to_string());
    }

    let metadata_length = u32::from_le_bytes([
        backup_data[position],
        backup_data[position + 1],
        backup_data[position + 2],
        backup_data[position + 3],
    ]) as usize;

    position += 4;

    // Encrypted metadata
    if backup_data.len() < position + metadata_length {
        return Err("Invalid backup file".to_string());
    }

    let encrypted_metadata =
        &backup_data[position..position + metadata_length];

    position += metadata_length;

    // Encrypted backup key length
    if backup_data.len() < position + 4 {
        return Err("Invalid backup file".to_string());
    }

    let key_length = u32::from_le_bytes([
        backup_data[position],
        backup_data[position + 1],
        backup_data[position + 2],
        backup_data[position + 3],
    ]) as usize;

    position += 4;

    // Encrypted backup key
    if backup_data.len() < position + key_length {
        return Err("Invalid backup file".to_string());
    }

    let encrypted_backup_key =
        &backup_data[position..position + key_length];

    // Recover backup key
    let master_cipher = Aes256Gcm::new(
        Key::<Aes256Gcm>::from_slice(&MASTER_KEY),
    );

    let backup_key = master_cipher
        .decrypt(
            Nonce::from_slice(key_nonce),
            encrypted_backup_key,
        )
        .map_err(|_| "Invalid or corrupted backup".to_string())?;

    if backup_key.len() != KEY_SIZE {
        return Err("Invalid backup encryption key".to_string());
    }

    // Decrypt metadata
    let metadata_cipher = Aes256Gcm::new(
        Key::<Aes256Gcm>::from_slice(&backup_key),
    );

    let metadata_data = metadata_cipher
        .decrypt(
            Nonce::from_slice(metadata_nonce),
            encrypted_metadata,
        )
        .map_err(|_| "Backup metadata decryption failed".to_string())?;

    serde_json::from_slice(&metadata_data)
        .map_err(|_| "Invalid backup metadata".to_string())
}








pub fn restore_backup(
    backup_path: &Path,
    database_directory: &Path,
    action: &str,
    existing_company_path: Option<&Path>,
) -> Result<(), String> {
    let backup_data = fs::read(backup_path)
        .map_err(|e| format!("Failed to read backup: {}", e))?;

    let mut position = 0;

    // Check minimum header size
    if backup_data.len() < 8 {
        return Err("Invalid CashBook backup file".to_string());
    }

    // Magic
    if &backup_data[0..4] != MAGIC {
        return Err("Invalid CashBook backup file".to_string());
    }

    position += 4;

    // Version
    let version = backup_data[position];
    position += 1;

    if version != 1 {
        return Err("Unsupported CashBook backup version".to_string());
    }

    // Compression
    let compression = backup_data[position];
    position += 1;

    if compression != 1 {
        return Err("Unsupported compression format".to_string());
    }

    // Encryption
    let encryption = backup_data[position];
    position += 1;

    if encryption != 1 {
        return Err("Unsupported encryption format".to_string());
    }

    // Reserved
    position += 1;

    // Key nonce
    if backup_data.len() < position + NONCE_SIZE {
        return Err("Invalid backup file".to_string());
    }

    let key_nonce = &backup_data[position..position + NONCE_SIZE];
    position += NONCE_SIZE;

    // Database nonce
    if backup_data.len() < position + NONCE_SIZE {
        return Err("Invalid backup file".to_string());
    }

    let database_nonce = &backup_data[position..position + NONCE_SIZE];
    position += NONCE_SIZE;

    // Metadata nonce
    if backup_data.len() < position + NONCE_SIZE {
        return Err("Invalid backup file".to_string());
    }

    let metadata_nonce = &backup_data[position..position + NONCE_SIZE];
    position += NONCE_SIZE;

    // Encrypted metadata length
    if backup_data.len() < position + 4 {
        return Err("Invalid backup file".to_string());
    }

    let metadata_length = u32::from_le_bytes([
        backup_data[position],
        backup_data[position + 1],
        backup_data[position + 2],
        backup_data[position + 3],
    ]) as usize;

    position += 4;

    // Encrypted metadata
    if backup_data.len() < position + metadata_length {
        return Err("Invalid backup file".to_string());
    }

    let encrypted_metadata =
        &backup_data[position..position + metadata_length];

    position += metadata_length;

    // Encrypted backup key length
    if backup_data.len() < position + 4 {
        return Err("Invalid backup file".to_string());
    }

    let key_length = u32::from_le_bytes([
        backup_data[position],
        backup_data[position + 1],
        backup_data[position + 2],
        backup_data[position + 3],
    ]) as usize;

    position += 4;

    // Encrypted backup key
    if backup_data.len() < position + key_length {
        return Err("Invalid backup file".to_string());
    }

    let encrypted_backup_key =
        &backup_data[position..position + key_length];

    position += key_length;

    // Remaining bytes = encrypted database
    let encrypted_database = &backup_data[position..];

    if encrypted_database.is_empty() {
        return Err("Backup database is empty".to_string());
    }

    // Recover backup key
    let master_cipher = Aes256Gcm::new(
        Key::<Aes256Gcm>::from_slice(&MASTER_KEY),
    );

    let backup_key = master_cipher
        .decrypt(
            Nonce::from_slice(key_nonce),
            encrypted_backup_key,
        )
        .map_err(|_| "Invalid or corrupted backup".to_string())?;

    if backup_key.len() != KEY_SIZE {
        return Err("Invalid backup encryption key".to_string());
    }

    // Decrypt metadata
    let metadata_cipher = Aes256Gcm::new(
        Key::<Aes256Gcm>::from_slice(&backup_key),
    );

    let metadata_data = metadata_cipher
        .decrypt(
            Nonce::from_slice(metadata_nonce),
            encrypted_metadata,
        )
        .map_err(|_| "Backup metadata decryption failed".to_string())?;

    let metadata: BackupMetadata = serde_json::from_slice(&metadata_data)
        .map_err(|_| "Invalid backup metadata".to_string())?;

    // Decrypt database
    let database_cipher = Aes256Gcm::new(
        Key::<Aes256Gcm>::from_slice(&backup_key),
    );

    let compressed_data = database_cipher
        .decrypt(
            Nonce::from_slice(database_nonce),
            encrypted_database,
        )
        .map_err(|_| "Backup decryption failed".to_string())?;

    // Decompress
    let database_data = zstd::decode_all(
        compressed_data.as_slice(),
    )
    .map_err(|e| format!("Failed to decompress backup: {}", e))?;

    // Validate the restored database before using it.
let validation_path = database_directory.join(".restore_validation.db");

if validation_path.exists() {
    fs::remove_file(&validation_path)
        .map_err(|e| format!("Failed to prepare database validation: {}", e))?;
}

fs::write(&validation_path, &database_data)
    .map_err(|e| format!("Failed to prepare database validation: {}", e))?;

let validation_connection = match rusqlite::Connection::open(&validation_path) {
    Ok(connection) => connection,
    Err(e) => {
        let _ = fs::remove_file(&validation_path);
        return Err(format!("Backup contains an invalid database: {}", e));
    }
};

let validation_uuid: Result<String, _> = validation_connection.query_row(
    "SELECT company_uuid FROM company ORDER BY id LIMIT 1",
    [],
    |row| row.get(0),
);

let validation_name: Result<String, _> = validation_connection.query_row(
    "SELECT company_name FROM company ORDER BY id LIMIT 1",
    [],
    |row| row.get(0),
);

drop(validation_connection);

let validation_uuid = match validation_uuid {
    Ok(uuid) if !uuid.trim().is_empty() => uuid,
    _ => {
        let _ = fs::remove_file(&validation_path);
        return Err("Backup database has invalid company information".to_string());
    }
};

if validation_uuid != metadata.company_uuid {
    let _ = fs::remove_file(&validation_path);
    return Err("Backup company identity is invalid".to_string());
}

if validation_name.is_err() {
    let _ = fs::remove_file(&validation_path);
    return Err("Backup database has invalid company information".to_string());
}

fs::remove_file(&validation_path)
    .map_err(|e| format!("Failed to clean up database validation: {}", e))?;

    // Validate action
    if action != "replace" && action != "new" {
        return Err("Invalid restore action".to_string());
    }

    // ---------------------------------------------------------
    // REPLACE EXISTING COMPANY
    // ---------------------------------------------------------
    if action == "replace" {
        let destination = existing_company_path
            .ok_or_else(|| "Existing company path is required".to_string())?;

        if !destination.exists() {
            return Err("Existing company database was not found".to_string());
        }

        // Safety check: never replace the currently active company.
        //
        // This function does not look up the active company.
        // The caller must only provide a company selected from
        // the Landing Page.
        let existing_connection = rusqlite::Connection::open(destination)
            .map_err(|e| {
                format!("Failed to open existing company: {}", e)
            })?;

        let existing_uuid: String = existing_connection
            .query_row(
                "SELECT company_uuid FROM company ORDER BY id LIMIT 1",
                [],
                |row| row.get(0),
            )
            .map_err(|e| {
                format!("Failed to read existing company identity: {}", e)
            })?;

        if existing_uuid != metadata.company_uuid {
            return Err(
                "Company UUID does not match the selected company"
                    .to_string(),
            );
        }

        drop(existing_connection);

        // Write restored database to a temporary file first.
        let temp_path = destination.with_extension("restore.tmp");

        if temp_path.exists() {
            fs::remove_file(&temp_path)
                .map_err(|e| {
                    format!("Failed to remove old restore file: {}", e)
                })?;
        }

        fs::write(&temp_path, &database_data)
            .map_err(|e| {
                format!("Failed to prepare restored database: {}", e)
            })?;

        // Replace existing database.
        fs::remove_file(destination)
            .map_err(|e| {
                format!("Failed to replace existing database: {}", e)
            })?;

        fs::rename(&temp_path, destination)
            .map_err(|e| {
                format!("Failed to finalize restored database: {}", e)
            })?;

        return Ok(());
    }

    // ---------------------------------------------------------
    // RESTORE AS NEW COMPANY
    // ---------------------------------------------------------

    fs::create_dir_all(database_directory)
        .map_err(|e| {
            format!("Failed to create database directory: {}", e)
        })?;

    // Find the highest company ID currently used by all databases.
    let mut highest_id: i64 = 0;

    let entries = fs::read_dir(database_directory)
        .map_err(|e| {
            format!("Failed to read database directory: {}", e)
        })?;

    for entry in entries {
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => continue,
        };

        let path = entry.path();

        if path.extension().and_then(|e| e.to_str()) != Some("db") {
            continue;
        }

        let connection = match rusqlite::Connection::open(&path) {
            Ok(connection) => connection,
            Err(_) => continue,
        };

        let company_id: Result<i64, _> = connection.query_row(
            "SELECT id FROM company ORDER BY id LIMIT 1",
            [],
            |row| row.get(0),
        );

        if let Ok(id) = company_id {
            if id > highest_id {
                highest_id = id;
            }
        }
    }

    let new_company_id = highest_id + 1;
    let new_company_uuid = uuid::Uuid::new_v4().to_string();

    // Create a safe filename from the backup company name.
    let mut base_name = metadata
        .company_name
        .trim()
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == ' ' || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect::<String>();

    base_name = base_name.trim().to_string();

    if base_name.is_empty() {
        base_name = "Restored Company".to_string();
    }

    // Find a unique filename.
    let mut file_name = format!("{}.db", base_name);
    let mut destination = database_directory.join(&file_name);
    let mut counter = 1;

    while destination.exists() {
        file_name = format!("{}_{}.db", base_name, counter);
        destination = database_directory.join(&file_name);
        counter += 1;
    }

    // Write restored database.
    fs::write(&destination, &database_data)
        .map_err(|e| {
            format!("Failed to create restored database: {}", e)
        })?;

    // Open restored database and assign NEW identity.
    let connection = match rusqlite::Connection::open(&destination) {
        Ok(connection) => connection,
        Err(e) => {
            let _ = fs::remove_file(&destination);
            return Err(format!(
                "Failed to open restored database: {}",
                e
            ));
        }
    };

    let update_result = connection.execute(
        "
        UPDATE company
        SET id = ?1,
            company_uuid = ?2
        WHERE id = (
            SELECT id
            FROM company
            ORDER BY id
            LIMIT 1
        )
        ",
        rusqlite::params![new_company_id, new_company_uuid],
    );

    if let Err(e) = update_result {
        drop(connection);
        let _ = fs::remove_file(&destination);

        return Err(format!(
            "Failed to assign new company identity: {}",
            e
        ));
    }

    drop(connection);

    Ok(())
}
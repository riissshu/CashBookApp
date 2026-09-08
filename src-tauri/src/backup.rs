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
    database_path: &Path,
) -> Result<(), String> {
    let backup_data = fs::read(backup_path)
        .map_err(|e| format!("Failed to read backup: {}", e))?;

    let mut position = 0;

    // Check magic
    if backup_data.len() < 8 {
        return Err("Invalid CashBook backup file".to_string());
    }

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

    // Encrypted key length
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


    // Decrypt backup metadata
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

    // Make sure destination directory exists
    if let Some(parent) = database_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create database directory: {}", e))?;
    }

    // Write restored database
    fs::write(database_path, database_data)
        .map_err(|e| format!("Failed to restore database: {}", e))?;

    Ok(())
}
use base64::{engine::general_purpose::STANDARD, Engine};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Serialize)]
pub struct ImageInfo {
    id: String,
    path: String,
    name: String,
    tags: Vec<String>,
    description: String,
}

#[derive(Serialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    images: Vec<String>,
    stream: bool,
}

#[derive(Deserialize)]
struct OllamaResponse {
    response: String,
}

const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "gif", "webp", "bmp", "tiff", "tif", "svg"];

#[tauri::command]
fn scan_folder(folder_path: String) -> Result<Vec<ImageInfo>, String> {
    let path = PathBuf::from(&folder_path);

    if !path.exists() {
        return Err("Folder does not exist".to_string());
    }

    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    let mut images: Vec<ImageInfo> = Vec::new();

    match fs::read_dir(&path) {
        Ok(entries) => {
            for (index, entry) in entries.enumerate() {
                if let Ok(entry) = entry {
                    let file_path = entry.path();

                    if file_path.is_file() {
                        if let Some(extension) = file_path.extension() {
                            let ext = extension.to_string_lossy().to_lowercase();

                            if IMAGE_EXTENSIONS.contains(&ext.as_str()) {
                                let file_name = file_path
                                    .file_name()
                                    .map(|n| n.to_string_lossy().to_string())
                                    .unwrap_or_default();

                                images.push(ImageInfo {
                                    id: format!("img_{}", index),
                                    path: file_path.to_string_lossy().to_string(),
                                    name: file_name,
                                    tags: Vec::new(),
                                    description: String::new(),
                                });
                            }
                        }
                    }
                }
            }
        }
        Err(e) => return Err(format!("Failed to read directory: {}", e)),
    }

    // Sort by filename
    images.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(images)
}

#[tauri::command]
fn generate_tags(image_path: String) -> Result<Vec<String>, String> {
    // Read the image file
    let image_bytes = fs::read(&image_path)
        .map_err(|e| format!("Failed to read image: {}", e))?;

    // Base64 encode the image
    let image_base64 = STANDARD.encode(&image_bytes);

    // Create request to Ollama
    let request = OllamaRequest {
        model: "moondream".to_string(),
        prompt: "List 5-10 descriptive tags for this image. Output only the tags separated by commas, nothing else. Example: nature, sunset, mountain, peaceful, orange sky".to_string(),
        images: vec![image_base64],
        stream: false,
    };

    // Call Ollama API
    let client = reqwest::blocking::Client::new();
    let response = client
        .post("http://localhost:11434/api/generate")
        .json(&request)
        .send()
        .map_err(|e| format!("Failed to call Ollama: {}. Is Ollama running?", e))?;

    if !response.status().is_success() {
        return Err(format!("Ollama returned error: {}", response.status()));
    }

    let ollama_response: OllamaResponse = response
        .json()
        .map_err(|e| format!("Failed to parse Ollama response: {}", e))?;

    // Parse tags from response
    let tags: Vec<String> = ollama_response
        .response
        .split(',')
        .map(|s| s.trim().to_lowercase())
        .filter(|s| !s.is_empty() && s.len() < 50) // Filter out empty and overly long strings
        .collect();

    Ok(tags)
}

#[tauri::command]
fn check_ollama() -> Result<bool, String> {
    let client = reqwest::blocking::Client::new();
    match client.get("http://localhost:11434/api/tags").send() {
        Ok(response) => Ok(response.status().is_success()),
        Err(_) => Ok(false),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![scan_folder, generate_tags, check_ollama])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

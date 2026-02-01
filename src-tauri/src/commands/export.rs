use base64::{engine::general_purpose::STANDARD, Engine};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub success: bool,
    pub path: Option<String>,
    pub error: Option<String>,
}

/// Save a PNG image to disk using native file dialog
#[tauri::command]
pub async fn export_png(
    app: tauri::AppHandle,
    image_data: String,
    suggested_name: Option<String>,
) -> Result<ExportResult, String> {
    // Strip data URL prefix if present
    let base64_data = if image_data.contains(",") {
        image_data.split(",").nth(1).unwrap_or(&image_data)
    } else {
        &image_data
    };

    let image_bytes = STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    let file_name = suggested_name.unwrap_or_else(|| "qr-code.png".to_string());

    // Show save dialog
    let file_path = app
        .dialog()
        .file()
        .set_file_name(&file_name)
        .add_filter("PNG Image", &["png"])
        .blocking_save_file();

    match file_path {
        Some(path) => {
            let path_buf: PathBuf = path.as_path().unwrap().to_path_buf();
            fs::write(&path_buf, &image_bytes)
                .map_err(|e| format!("Failed to write file: {}", e))?;

            Ok(ExportResult {
                success: true,
                path: Some(path_buf.to_string_lossy().to_string()),
                error: None,
            })
        }
        None => Ok(ExportResult {
            success: false,
            path: None,
            error: Some("Save cancelled by user".to_string()),
        }),
    }
}

/// Save an SVG file to disk using native file dialog
#[tauri::command]
pub async fn export_svg(
    app: tauri::AppHandle,
    svg_data: String,
    suggested_name: Option<String>,
) -> Result<ExportResult, String> {
    let file_name = suggested_name.unwrap_or_else(|| "qr-code.svg".to_string());

    // Show save dialog
    let file_path = app
        .dialog()
        .file()
        .set_file_name(&file_name)
        .add_filter("SVG Image", &["svg"])
        .blocking_save_file();

    match file_path {
        Some(path) => {
            let path_buf: PathBuf = path.as_path().unwrap().to_path_buf();
            fs::write(&path_buf, svg_data.as_bytes())
                .map_err(|e| format!("Failed to write file: {}", e))?;

            Ok(ExportResult {
                success: true,
                path: Some(path_buf.to_string_lossy().to_string()),
                error: None,
            })
        }
        None => Ok(ExportResult {
            success: false,
            path: None,
            error: Some("Save cancelled by user".to_string()),
        }),
    }
}

/// Copy image data to clipboard
#[tauri::command]
pub async fn copy_image_to_clipboard(
    app: tauri::AppHandle,
    image_data: String,
) -> Result<bool, String> {
    use tauri::image::Image;
    use tauri_plugin_clipboard_manager::ClipboardExt;

    // Strip data URL prefix if present
    let base64_data = if image_data.contains(",") {
        image_data.split(",").nth(1).unwrap_or(&image_data)
    } else {
        &image_data
    };

    let image_bytes = STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    // Load image to get dimensions and RGBA data
    let img = image::load_from_memory(&image_bytes)
        .map_err(|e| format!("Failed to load image: {}", e))?;

    let rgba = img.to_rgba8();
    let (width, height) = rgba.dimensions();

    // Create a Tauri Image from RGBA data
    let tauri_image = Image::new_owned(rgba.into_raw(), width, height);

    // Write image to clipboard
    app.clipboard()
        .write_image(&tauri_image)
        .map_err(|e| format!("Failed to copy to clipboard: {}", e))?;

    Ok(true)
}

/// Open a file picker to select an image for scanning
#[tauri::command]
pub async fn pick_image_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let file_path = app
        .dialog()
        .file()
        .add_filter("Images", &["png", "jpg", "jpeg", "gif", "webp", "bmp"])
        .blocking_pick_file();

    match file_path {
        Some(path) => {
            let path_buf: PathBuf = path.as_path().unwrap().to_path_buf();
            Ok(Some(path_buf.to_string_lossy().to_string()))
        }
        None => Ok(None),
    }
}

/// Strip data URL prefix from base64 string
pub fn strip_data_url_prefix(data: &str) -> &str {
    if data.contains(',') {
        data.split(',').nth(1).unwrap_or(data)
    } else {
        data
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strip_data_url_prefix_png() {
        let input = "data:image/png;base64,iVBORw0KGgo=";
        let result = strip_data_url_prefix(input);
        assert_eq!(result, "iVBORw0KGgo=");
    }

    #[test]
    fn test_strip_data_url_prefix_jpeg() {
        let input = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
        let result = strip_data_url_prefix(input);
        assert_eq!(result, "/9j/4AAQSkZJRg==");
    }

    #[test]
    fn test_strip_data_url_prefix_svg() {
        let input = "data:image/svg+xml;base64,PHN2Zz4=";
        let result = strip_data_url_prefix(input);
        assert_eq!(result, "PHN2Zz4=");
    }

    #[test]
    fn test_strip_data_url_prefix_no_prefix() {
        let input = "iVBORw0KGgo=";
        let result = strip_data_url_prefix(input);
        assert_eq!(result, "iVBORw0KGgo=");
    }

    #[test]
    fn test_strip_data_url_prefix_empty() {
        let input = "";
        let result = strip_data_url_prefix(input);
        assert_eq!(result, "");
    }

    #[test]
    fn test_strip_data_url_prefix_only_comma() {
        let input = ",abc123";
        let result = strip_data_url_prefix(input);
        assert_eq!(result, "abc123");
    }

    #[test]
    fn test_strip_data_url_prefix_multiple_commas() {
        // Edge case: base64 content doesn't have commas normally, but test robustness
        let input = "data:image/png;base64,abc,def";
        let result = strip_data_url_prefix(input);
        assert_eq!(result, "abc");
    }

    #[test]
    fn test_export_result_success() {
        let result = ExportResult {
            success: true,
            path: Some("/path/to/file.png".to_string()),
            error: None,
        };

        assert!(result.success);
        assert_eq!(result.path, Some("/path/to/file.png".to_string()));
        assert!(result.error.is_none());
    }

    #[test]
    fn test_export_result_failure() {
        let result = ExportResult {
            success: false,
            path: None,
            error: Some("Save cancelled by user".to_string()),
        };

        assert!(!result.success);
        assert!(result.path.is_none());
        assert_eq!(result.error, Some("Save cancelled by user".to_string()));
    }

    #[test]
    fn test_base64_decode() {
        // Test that the base64 engine we use can decode properly
        let original = b"Hello, World!";
        let encoded = STANDARD.encode(original);
        let decoded = STANDARD.decode(&encoded).unwrap();
        assert_eq!(decoded, original);
    }

    #[test]
    fn test_base64_decode_after_strip() {
        let data_url = "data:image/png;base64,SGVsbG8sIFdvcmxkIQ==";
        let base64_only = strip_data_url_prefix(data_url);
        let decoded = STANDARD.decode(base64_only).unwrap();
        assert_eq!(decoded, b"Hello, World!");
    }
}

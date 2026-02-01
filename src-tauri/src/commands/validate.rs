use base64::{engine::general_purpose::STANDARD, Engine};
use image::{DynamicImage, ImageReader};
use rqrr::PreparedImage;
use serde::{Deserialize, Serialize};
use std::io::Cursor;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationResult {
    pub state: String,           // "pass" | "warn" | "fail"
    pub decoded_content: Option<String>,
    pub content_match: bool,
    pub message: String,
    pub suggestions: Vec<String>,
}

/// Validate a QR code by decoding it and comparing with expected content
/// Takes a base64-encoded PNG image and the expected content string
#[tauri::command]
pub async fn validate_qr(
    image_data: String,
    expected_content: String,
) -> Result<ValidationResult, String> {
    // Strip data URL prefix if present
    let base64_data = if image_data.contains(",") {
        image_data.split(",").nth(1).unwrap_or(&image_data)
    } else {
        &image_data
    };

    // Decode base64 to bytes
    let image_bytes = STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    // Load image
    let img = ImageReader::new(Cursor::new(&image_bytes))
        .with_guessed_format()
        .map_err(|e| format!("Failed to read image format: {}", e))?
        .decode()
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    // Convert to grayscale for QR detection
    let gray_img = img.to_luma8();

    // Prepare image for QR detection
    let mut prepared = PreparedImage::prepare(gray_img);

    // Try to find and decode QR codes
    let grids = prepared.detect_grids();

    if grids.is_empty() {
        return Ok(ValidationResult {
            state: "fail".to_string(),
            decoded_content: None,
            content_match: false,
            message: "No QR code detected in image".to_string(),
            suggestions: vec![
                "Increase error correction level to H".to_string(),
                "Reduce logo size if using one".to_string(),
                "Ensure sufficient contrast between colors".to_string(),
            ],
        });
    }

    // Try to decode the first grid found
    match grids[0].decode() {
        Ok((_, content)) => {
            let decoded_str = content.to_string();
            let content_match = decoded_str.trim() == expected_content.trim();

            if content_match {
                Ok(ValidationResult {
                    state: "pass".to_string(),
                    decoded_content: Some(decoded_str),
                    content_match: true,
                    message: "QR code scans correctly".to_string(),
                    suggestions: vec![],
                })
            } else {
                // Content decoded but doesn't match - this is unusual
                Ok(ValidationResult {
                    state: "warn".to_string(),
                    decoded_content: Some(decoded_str.clone()),
                    content_match: false,
                    message: format!("Decoded content differs from expected"),
                    suggestions: vec![
                        "Verify the QR content is correct".to_string(),
                    ],
                })
            }
        }
        Err(_) => {
            // Grid detected but couldn't decode - marginal case
            Ok(ValidationResult {
                state: "warn".to_string(),
                decoded_content: None,
                content_match: false,
                message: "QR code detected but decode was unreliable".to_string(),
                suggestions: vec![
                    "Increase error correction level".to_string(),
                    "Reduce customization complexity".to_string(),
                    "Ensure logo doesn't cover critical areas".to_string(),
                ],
            })
        }
    }
}

/// Decode a QR code from an image file path
#[tauri::command]
pub async fn scan_qr_from_file(file_path: String) -> Result<ScanResult, String> {
    let img = image::open(&file_path)
        .map_err(|e| format!("Failed to open image: {}", e))?;

    decode_qr_from_image(img)
}

/// Decode a QR code from base64 image data
#[tauri::command]
pub async fn scan_qr_from_data(image_data: String) -> Result<ScanResult, String> {
    // Strip data URL prefix if present
    let base64_data = if image_data.contains(",") {
        image_data.split(",").nth(1).unwrap_or(&image_data)
    } else {
        &image_data
    };

    let image_bytes = STANDARD
        .decode(base64_data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    let img = ImageReader::new(Cursor::new(&image_bytes))
        .with_guessed_format()
        .map_err(|e| format!("Failed to read image format: {}", e))?
        .decode()
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    decode_qr_from_image(img)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub success: bool,
    pub content: Option<String>,
    pub qr_type: Option<String>,
    pub error: Option<String>,
}

fn decode_qr_from_image(img: DynamicImage) -> Result<ScanResult, String> {
    let gray_img = img.to_luma8();
    let mut prepared = PreparedImage::prepare(gray_img);
    let grids = prepared.detect_grids();

    if grids.is_empty() {
        return Ok(ScanResult {
            success: false,
            content: None,
            qr_type: None,
            error: Some("No QR code found in image".to_string()),
        });
    }

    match grids[0].decode() {
        Ok((_, content)) => {
            let content_str = content.to_string();
            let qr_type = detect_qr_type(&content_str);

            Ok(ScanResult {
                success: true,
                content: Some(content_str),
                qr_type: Some(qr_type),
                error: None,
            })
        }
        Err(e) => Ok(ScanResult {
            success: false,
            content: None,
            qr_type: None,
            error: Some(format!("Failed to decode QR: {:?}", e)),
        }),
    }
}

fn detect_qr_type(content: &str) -> String {
    let lower = content.to_lowercase();

    if lower.starts_with("wifi:") {
        "wifi".to_string()
    } else if lower.starts_with("begin:vcard") {
        "vcard".to_string()
    } else if lower.starts_with("mailto:") {
        "email".to_string()
    } else if lower.starts_with("sms:") || lower.starts_with("smsto:") {
        "sms".to_string()
    } else if lower.starts_with("tel:") {
        "phone".to_string()
    } else if lower.starts_with("geo:") {
        "geo".to_string()
    } else if lower.starts_with("begin:vevent") {
        "calendar".to_string()
    } else if lower.starts_with("http://") || lower.starts_with("https://") {
        "url".to_string()
    } else {
        "text".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_qr_type_all_types() {
        // WiFi
        assert_eq!(detect_qr_type("WIFI:T:WPA;S:Network;;"), "wifi");

        // vCard
        assert_eq!(detect_qr_type("BEGIN:VCARD\nVERSION:3.0"), "vcard");

        // Email
        assert_eq!(detect_qr_type("mailto:test@example.com"), "email");

        // SMS
        assert_eq!(detect_qr_type("sms:+15551234567"), "sms");
        assert_eq!(detect_qr_type("smsto:+15551234567"), "sms");

        // Phone
        assert_eq!(detect_qr_type("tel:+15551234567"), "phone");

        // Geo
        assert_eq!(detect_qr_type("geo:37.7749,-122.4194"), "geo");

        // Calendar
        assert_eq!(detect_qr_type("BEGIN:VEVENT"), "calendar");

        // URL
        assert_eq!(detect_qr_type("https://example.com"), "url");
        assert_eq!(detect_qr_type("http://example.com"), "url");

        // Text (default)
        assert_eq!(detect_qr_type("Hello World"), "text");
        assert_eq!(detect_qr_type("12345"), "text");
    }

    #[test]
    fn test_detect_qr_type_case_insensitive() {
        assert_eq!(detect_qr_type("WIFI:T:WPA;;"), "wifi");
        assert_eq!(detect_qr_type("wifi:t:wpa;;"), "wifi");
        assert_eq!(detect_qr_type("MAILTO:test@example.com"), "email");
        assert_eq!(detect_qr_type("TEL:+15551234567"), "phone");
        assert_eq!(detect_qr_type("GEO:0,0"), "geo");
        assert_eq!(detect_qr_type("HTTPS://EXAMPLE.COM"), "url");
    }

    #[test]
    fn test_validation_result_structure() {
        let result = ValidationResult {
            state: "pass".to_string(),
            decoded_content: Some("test".to_string()),
            content_match: true,
            message: "Success".to_string(),
            suggestions: vec![],
        };

        assert_eq!(result.state, "pass");
        assert_eq!(result.decoded_content, Some("test".to_string()));
        assert!(result.content_match);
        assert!(result.suggestions.is_empty());
    }

    #[test]
    fn test_scan_result_structure() {
        let success_result = ScanResult {
            success: true,
            content: Some("https://example.com".to_string()),
            qr_type: Some("url".to_string()),
            error: None,
        };

        assert!(success_result.success);
        assert_eq!(success_result.content, Some("https://example.com".to_string()));
        assert_eq!(success_result.qr_type, Some("url".to_string()));
        assert!(success_result.error.is_none());

        let failure_result = ScanResult {
            success: false,
            content: None,
            qr_type: None,
            error: Some("No QR code found".to_string()),
        };

        assert!(!failure_result.success);
        assert!(failure_result.content.is_none());
        assert!(failure_result.error.is_some());
    }
}

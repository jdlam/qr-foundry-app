mod commands;
mod db;

use commands::{
    // Export commands
    copy_image_to_clipboard, export_png, export_svg, pick_image_file,
    // Validation commands
    scan_qr_from_data, scan_qr_from_file, validate_qr,
    // History commands
    history_clear, history_delete, history_list, history_save,
    // Template commands
    template_delete, template_get, template_list, template_save, template_set_default,
    template_update,
    // Batch commands
    batch_generate_zip, batch_parse_csv, batch_parse_csv_content, batch_save_files, batch_validate,
    pick_csv_file,
};
use db::DbState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize database
    let db_state = DbState::new().expect("Failed to initialize database");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(db_state)
        .invoke_handler(tauri::generate_handler![
            // Validation
            validate_qr,
            scan_qr_from_file,
            scan_qr_from_data,
            // Export
            export_png,
            export_svg,
            copy_image_to_clipboard,
            pick_image_file,
            // History
            history_list,
            history_save,
            history_delete,
            history_clear,
            // Templates
            template_list,
            template_get,
            template_save,
            template_update,
            template_delete,
            template_set_default,
            // Batch
            batch_parse_csv,
            batch_parse_csv_content,
            batch_validate,
            batch_generate_zip,
            batch_save_files,
            pick_csv_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

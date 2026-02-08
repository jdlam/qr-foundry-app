// Tauri platform adapters — re-exports all adapters
export { exportAdapter } from './export';
export { clipboardAdapter } from './clipboard';
export { filesystemAdapter } from './filesystem';
export { historyAdapter, templateAdapter } from './storage';
export { scannerAdapter } from './scanner';
export { batchAdapter } from './batch';
export { dragDropAdapter } from './dragdrop';
export { authAdapter } from './auth';

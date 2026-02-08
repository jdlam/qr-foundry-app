// Shared adapter interfaces for platform abstraction

// --- Export ---

export interface ExportResult {
  success: boolean;
  path: string | null;
  error: string | null;
}

export interface ExportAdapter {
  exportPng(imageDataUrl: string, suggestedName?: string): Promise<ExportResult>;
  exportSvg(svgData: string, suggestedName?: string): Promise<ExportResult>;
}

// --- Clipboard ---

export interface ClipboardAdapter {
  copyImage(imageDataUrl: string): Promise<boolean>;
}

// --- Filesystem ---

export interface FilesystemAdapter {
  pickImageFile(): Promise<string | null>;
  pickCsvFile(): Promise<string | null>;
  readFile(filePath: string): Promise<Uint8Array>;
}

// --- History ---

export interface HistoryItem {
  id: number;
  content: string;
  qrType: string;
  label: string | null;
  styleJson: string;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewHistoryItem {
  content: string;
  qrType: string;
  label?: string;
  styleJson: string;
  thumbnail?: string;
}

export interface HistoryListResult {
  items: HistoryItem[];
  total: number;
  hasMore: boolean;
}

export interface HistoryAdapter {
  list(limit: number, offset: number, search: string | null): Promise<HistoryListResult>;
  save(item: NewHistoryItem): Promise<number>;
  delete(id: number): Promise<boolean>;
  clear(): Promise<number>;
}

// --- Templates ---

export interface Template {
  id: number;
  name: string;
  styleJson: string;
  preview: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface NewTemplate {
  name: string;
  styleJson: string;
  preview?: string;
  isDefault?: boolean;
}

export interface TemplateAdapter {
  list(): Promise<Template[]>;
  get(id: number): Promise<Template | null>;
  save(template: NewTemplate): Promise<number>;
  update(id: number, template: NewTemplate): Promise<boolean>;
  delete(id: number): Promise<boolean>;
  setDefault(id: number): Promise<boolean>;
}

// --- Scanner ---

export interface ScanResult {
  success: boolean;
  content: string | null;
  qrType: string | null;
  error: string | null;
}

export interface ValidationResult {
  state: 'pass' | 'warn' | 'fail';
  decodedContent: string | null;
  contentMatch: boolean;
  message: string;
  suggestions: string[];
}

export interface ScannerAdapter {
  validateQr(imageDataUrl: string, expectedContent: string): Promise<ValidationResult>;
  scanFromFile(filePath: string): Promise<ScanResult>;
  scanFromData(imageData: string): Promise<ScanResult>;
}

// --- Batch ---

export interface BatchItem {
  row: number;
  content: string;
  qrType: string;
  label: string | null;
}

export interface BatchGenerateItem {
  row: number;
  content: string;
  label: string | null;
  imageData: string;
}

export interface BatchValidationResult {
  row: number;
  success: boolean;
  decodedContent: string | null;
  contentMatch: boolean;
  error: string | null;
}

export interface BatchParseResult {
  success: boolean;
  items: BatchItem[];
  error: string | null;
  totalRows: number;
}

export interface BatchGenerateResult {
  success: boolean;
  zipPath: string | null;
  validationResults: BatchValidationResult[];
  error: string | null;
}

export interface BatchSaveFilesResult {
  success: boolean;
  directory: string | null;
  filesSaved: number;
  error: string | null;
}

export interface BatchAdapter {
  parseCsvFile(filePath: string): Promise<BatchParseResult>;
  parseCsvContent(content: string): Promise<BatchParseResult>;
  validateBatch(items: BatchGenerateItem[]): Promise<BatchValidationResult[]>;
  generateZip(items: BatchGenerateItem[], format: 'png' | 'svg', validate: boolean): Promise<BatchGenerateResult>;
  saveFiles(items: BatchGenerateItem[], format: 'png' | 'svg', baseName: string): Promise<BatchSaveFilesResult>;
}

// --- DragDrop ---

export type DragDropEventType = 'over' | 'leave' | 'drop';

export interface DragDropEvent {
  type: DragDropEventType;
  paths?: string[];
}

export type DragDropCallback = (event: DragDropEvent) => void;
export type UnlistenFn = () => void;

export interface DragDropAdapter {
  listen(callback: DragDropCallback): Promise<UnlistenFn>;
}

// --- Auth ---

export interface AuthAdapter {
  getToken(): Promise<string | null>;
  setToken(token: string): Promise<void>;
  clearToken(): Promise<void>;
}

import '@testing-library/jest-dom/vitest';

// Mock @platform adapters for testing
// Tests that need specific adapter behavior will override these mocks
vi.mock('@platform', () => ({
  exportAdapter: {
    exportPng: vi.fn(),
    exportSvg: vi.fn(),
  },
  clipboardAdapter: {
    copyImage: vi.fn(),
  },
  filesystemAdapter: {
    pickImageFile: vi.fn(),
    pickCsvFile: vi.fn(),
    readFile: vi.fn(),
  },
  historyAdapter: {
    list: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  },
  templateAdapter: {
    list: vi.fn(),
    get: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    setDefault: vi.fn(),
  },
  scannerAdapter: {
    validateQr: vi.fn(),
    scanFromFile: vi.fn(),
    scanFromData: vi.fn(),
  },
  batchAdapter: {
    parseCsvFile: vi.fn(),
    parseCsvContent: vi.fn(),
    validateBatch: vi.fn(),
    generateZip: vi.fn(),
    saveFiles: vi.fn(),
  },
  dragDropAdapter: {
    listen: vi.fn(() => Promise.resolve(() => {})),
  },
  authAdapter: {
    getToken: vi.fn(() => Promise.resolve(null)),
    setToken: vi.fn(() => Promise.resolve()),
    clearToken: vi.fn(() => Promise.resolve()),
  },
}));

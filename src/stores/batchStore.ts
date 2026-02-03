import { create } from 'zustand';

export interface BatchItem {
  row: number;
  content: string;
  qrType: string;
  label: string | null;
}

export type ItemStatus = 'pending' | 'generating' | 'done' | 'validating' | 'validated' | 'error';
export type ExportFormat = 'png' | 'svg';

export interface BatchItemWithStatus extends BatchItem {
  status: ItemStatus;
  imageData?: string;
  error?: string;
  validationError?: string;
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

interface BatchState {
  // Parsed items from CSV
  items: BatchItem[];

  // Items with generation status
  itemsWithStatus: BatchItemWithStatus[];

  // Generated items ready for export
  generatedItems: BatchGenerateItem[];

  // Validation results
  validationResults: Map<number, BatchValidationResult>;

  // UI state
  parseError: string | null;
  isParsing: boolean;
  isGenerating: boolean;
  isValidating: boolean;
  isLoading: boolean;
  generateProgress: number;
  previewIndex: number;
  exportFormat: ExportFormat;

  // Actions
  setItems: (items: BatchItem[]) => void;
  setItemsWithStatus: (items: BatchItemWithStatus[]) => void;
  updateItemStatus: (index: number, update: Partial<BatchItemWithStatus>) => void;
  setGeneratedItems: (items: BatchGenerateItem[]) => void;
  setValidationResults: (results: Map<number, BatchValidationResult>) => void;
  setParseError: (error: string | null) => void;
  setIsParsing: (isParsing: boolean) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setIsValidating: (isValidating: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setGenerateProgress: (progress: number) => void;
  setPreviewIndex: (index: number) => void;
  setExportFormat: (format: ExportFormat) => void;
  clear: () => void;
}

export const useBatchStore = create<BatchState>((set) => ({
  // State
  items: [],
  itemsWithStatus: [],
  generatedItems: [],
  validationResults: new Map(),
  parseError: null,
  isParsing: false,
  isGenerating: false,
  isValidating: false,
  isLoading: false,
  generateProgress: 0,
  previewIndex: 0,
  exportFormat: 'png',

  // Actions
  setItems: (items) => set({
    items,
    // When items change, reset itemsWithStatus to pending
    itemsWithStatus: items.map((item) => ({
      ...item,
      status: 'pending' as ItemStatus,
    })),
    generatedItems: [],
    previewIndex: 0,
    validationResults: new Map(),
  }),

  setItemsWithStatus: (itemsWithStatus) => set({ itemsWithStatus }),

  updateItemStatus: (index, update) => set((state) => ({
    itemsWithStatus: state.itemsWithStatus.map((item, i) =>
      i === index ? { ...item, ...update } : item
    ),
  })),

  setGeneratedItems: (generatedItems) => set({ generatedItems }),

  setValidationResults: (validationResults) => set({ validationResults }),

  setParseError: (parseError) => set({ parseError }),

  setIsParsing: (isParsing) => set({ isParsing }),

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  setIsValidating: (isValidating) => set({ isValidating }),

  setIsLoading: (isLoading) => set({ isLoading }),

  setGenerateProgress: (generateProgress) => set({ generateProgress }),

  setPreviewIndex: (previewIndex) => set({ previewIndex }),

  setExportFormat: (exportFormat) => set({ exportFormat }),

  clear: () => set({
    items: [],
    itemsWithStatus: [],
    generatedItems: [],
    validationResults: new Map(),
    parseError: null,
    isParsing: false,
    isGenerating: false,
    isValidating: false,
    isLoading: false,
    generateProgress: 0,
    previewIndex: 0,
  }),
}));

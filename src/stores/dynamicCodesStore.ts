import { create } from 'zustand';
import type { DynamicQRRecord, CodeStatus, UsageResponse } from '../api/types';

interface DynamicCodesState {
  codes: DynamicQRRecord[];
  selectedCode: DynamicQRRecord | null;
  usage: UsageResponse | null;
  statusFilter: CodeStatus | null;

  isLoadingCodes: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;

  setCodes: (codes: DynamicQRRecord[]) => void;
  setSelectedCode: (code: DynamicQRRecord | null) => void;
  setUsage: (usage: UsageResponse) => void;
  setStatusFilter: (status: CodeStatus | null) => void;
  addCodeToList: (code: DynamicQRRecord) => void;
  updateCodeInList: (shortCode: string, updated: DynamicQRRecord) => void;
  removeCodeFromList: (shortCode: string) => void;
  reset: () => void;
}

export const useDynamicCodesStore = create<DynamicCodesState>((set) => ({
  codes: [],
  selectedCode: null,
  usage: null,
  statusFilter: null,

  isLoadingCodes: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,

  setCodes: (codes) => set({ codes }),

  setSelectedCode: (code) => set({ selectedCode: code }),

  setUsage: (usage) => set({ usage }),

  setStatusFilter: (status) => set({ statusFilter: status }),

  addCodeToList: (code) => set((state) => ({ codes: [code, ...state.codes] })),

  updateCodeInList: (shortCode, updated) => set((state) => ({
    codes: state.codes.map((c) => c.shortCode === shortCode ? updated : c),
    selectedCode: state.selectedCode?.shortCode === shortCode ? updated : state.selectedCode,
  })),

  removeCodeFromList: (shortCode) => set((state) => ({
    codes: state.codes.filter((c) => c.shortCode !== shortCode),
    selectedCode: state.selectedCode?.shortCode === shortCode ? null : state.selectedCode,
  })),

  reset: () => set({
    codes: [],
    selectedCode: null,
    usage: null,
    statusFilter: null,
    isLoadingCodes: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
  }),
}));

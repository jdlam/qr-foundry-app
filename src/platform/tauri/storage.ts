import { invoke } from '@tauri-apps/api/core';
import type {
  HistoryAdapter,
  HistoryListResult,
  NewHistoryItem,
  TemplateAdapter,
  Template,
  NewTemplate,
} from '../types';

export const historyAdapter: HistoryAdapter = {
  async list(limit: number, offset: number, search: string | null): Promise<HistoryListResult> {
    return invoke<HistoryListResult>('history_list', { limit, offset, search });
  },

  async save(item: NewHistoryItem): Promise<number> {
    return invoke<number>('history_save', { item });
  },

  async delete(id: number): Promise<boolean> {
    return invoke<boolean>('history_delete', { id });
  },

  async clear(): Promise<number> {
    return invoke<number>('history_clear');
  },
};

export const templateAdapter: TemplateAdapter = {
  async list(): Promise<Template[]> {
    return invoke<Template[]>('template_list');
  },

  async get(id: number): Promise<Template | null> {
    return invoke<Template | null>('template_get', { id });
  },

  async save(template: NewTemplate): Promise<number> {
    return invoke<number>('template_save', { template });
  },

  async update(id: number, template: NewTemplate): Promise<boolean> {
    return invoke<boolean>('template_update', { id, template });
  },

  async delete(id: number): Promise<boolean> {
    return invoke<boolean>('template_delete', { id });
  },

  async setDefault(id: number): Promise<boolean> {
    return invoke<boolean>('template_set_default', { id });
  },
};

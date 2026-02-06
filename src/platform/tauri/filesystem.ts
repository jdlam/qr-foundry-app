import { invoke } from '@tauri-apps/api/core';
import { readFile as tauriReadFile } from '@tauri-apps/plugin-fs';
import type { FilesystemAdapter } from '../types';

export const filesystemAdapter: FilesystemAdapter = {
  async pickImageFile(): Promise<string | null> {
    return invoke<string | null>('pick_image_file');
  },

  async pickCsvFile(): Promise<string | null> {
    return invoke<string | null>('pick_csv_file');
  },

  async readFile(filePath: string): Promise<Uint8Array> {
    return tauriReadFile(filePath);
  },
};

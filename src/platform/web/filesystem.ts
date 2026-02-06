import type { FilesystemAdapter } from '../types';

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.onchange = () => {
      const file = input.files?.[0] || null;
      document.body.removeChild(input);
      resolve(file);
    };
    // Handle cancel — the change event won't fire, so listen for focus return
    const onFocus = () => {
      window.removeEventListener('focus', onFocus);
      // Small delay to allow change event to fire first
      setTimeout(() => {
        if (document.body.contains(input)) {
          document.body.removeChild(input);
          resolve(null);
        }
      }, 300);
    };
    window.addEventListener('focus', onFocus);
    document.body.appendChild(input);
    input.click();
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const filesystemAdapter: FilesystemAdapter = {
  async pickImageFile(): Promise<string | null> {
    const file = await pickFile('image/*');
    if (!file) return null;
    // On web, return a data URL instead of a file path
    return fileToDataUrl(file);
  },

  async pickCsvFile(): Promise<string | null> {
    const file = await pickFile('.csv,.txt');
    if (!file) return null;
    // On web, return the text content instead of a file path
    return file.text();
  },

  async readFile(filePath: string): Promise<Uint8Array> {
    // On web, filePath is actually a data URL or blob URL
    const response = await fetch(filePath);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  },
};

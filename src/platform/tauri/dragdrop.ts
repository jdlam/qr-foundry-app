import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import type { DragDropAdapter, DragDropCallback, UnlistenFn } from '../types';

export const dragDropAdapter: DragDropAdapter = {
  async listen(callback: DragDropCallback): Promise<UnlistenFn> {
    const webview = getCurrentWebviewWindow();
    return webview.onDragDropEvent((event) => {
      const { type, paths } = event.payload as { type: string; paths?: string[] };
      if (type === 'over') {
        callback({ type: 'over' });
      } else if (type === 'leave') {
        callback({ type: 'leave' });
      } else if (type === 'drop') {
        callback({ type: 'drop', paths: paths || [] });
      }
    });
  },
};

import type { DragDropAdapter, DragDropCallback, UnlistenFn } from '../types';

// No-op on web — components already handle HTML5 drag-and-drop natively.
// This adapter exists so the useTauriDragDrop hook doesn't error on web.
export const dragDropAdapter: DragDropAdapter = {
  async listen(_callback: DragDropCallback): Promise<UnlistenFn> {
    // Return a no-op unlisten function
    return () => {};
  },
};

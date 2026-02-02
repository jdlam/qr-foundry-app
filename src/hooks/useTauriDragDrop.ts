import { useEffect, useRef, useCallback, useState } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

interface DragDropState {
  isDragging: boolean;
  droppedFiles: string[];
}

type DropCallback = (paths: string[]) => void;

/**
 * Hook to handle Tauri's native drag-drop events.
 * Returns dragging state and allows registering a callback for file drops.
 */
export function useTauriDragDrop(onDrop?: DropCallback) {
  const [state, setState] = useState<DragDropState>({
    isDragging: false,
    droppedFiles: [],
  });

  const callbackRef = useRef(onDrop);
  callbackRef.current = onDrop;

  useEffect(() => {
    let unlistenPromise: Promise<() => void> | null = null;

    try {
      const webview = getCurrentWebviewWindow();

      unlistenPromise = webview.onDragDropEvent((event) => {
        if (event.payload.type === 'over') {
          setState((s) => ({ ...s, isDragging: true }));
        } else if (event.payload.type === 'leave') {
          setState((s) => ({ ...s, isDragging: false }));
        } else if (event.payload.type === 'drop') {
          setState({ isDragging: false, droppedFiles: event.payload.paths });
          if (callbackRef.current) {
            callbackRef.current(event.payload.paths);
          }
        }
      });
    } catch (err) {
      // Tauri APIs not available (e.g., running in browser without Tauri)
      console.warn('Tauri drag-drop not available:', err);
    }

    return () => {
      unlistenPromise?.then((fn) => fn());
    };
  }, []);

  const clearDroppedFiles = useCallback(() => {
    setState((s) => ({ ...s, droppedFiles: [] }));
  }, []);

  return {
    isDragging: state.isDragging,
    droppedFiles: state.droppedFiles,
    clearDroppedFiles,
  };
}

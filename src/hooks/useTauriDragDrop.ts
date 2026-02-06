import { useEffect, useRef, useCallback, useState } from 'react';
import { dragDropAdapter } from '@platform';

interface DragDropState {
  isDragging: boolean;
  droppedFiles: string[];
}

type DropCallback = (paths: string[]) => void;

/**
 * Hook to handle native drag-drop events via the platform adapter.
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
    let unlisten: (() => void) | null = null;

    dragDropAdapter
      .listen((event) => {
        if (event.type === 'over') {
          setState((s) => ({ ...s, isDragging: true }));
        } else if (event.type === 'leave') {
          setState((s) => ({ ...s, isDragging: false }));
        } else if (event.type === 'drop') {
          const paths = event.paths || [];
          setState({ isDragging: false, droppedFiles: paths });
          if (callbackRef.current) {
            callbackRef.current(paths);
          }
        }
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch((err) => {
        console.warn('Drag-drop not available:', err);
      });

    return () => {
      unlisten?.();
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

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: number[];
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  snapPoints = [0.5, 0.9]
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentHeight, setCurrentHeight] = useState(snapPoints[0]);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setCurrentHeight(snapPoints[0]);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open, snapPoints]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  function handleDragStart(e: React.TouchEvent | React.MouseEvent) {
    setIsDragging(true);
    dragStartY.current = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartHeight.current = currentHeight;
  }

  function handleDragMove(e: React.TouchEvent | React.MouseEvent) {
    if (!isDragging) return;

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = dragStartY.current - clientY;
    const deltaPercent = deltaY / window.innerHeight;
    const newHeight = Math.max(0.1, Math.min(0.95, dragStartHeight.current + deltaPercent));

    setCurrentHeight(newHeight);
  }

  function handleDragEnd() {
    if (!isDragging) return;
    setIsDragging(false);

    // Snap to closest point or close
    if (currentHeight < 0.2) {
      onClose();
      return;
    }

    const closest = snapPoints.reduce((prev, curr) =>
      Math.abs(curr - currentHeight) < Math.abs(prev - currentHeight) ? curr : prev
    );
    setCurrentHeight(closest);
  }

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl shadow-xl transition-transform"
        style={{
          height: `${currentHeight * 100}%`,
          transitionDuration: isDragging ? '0ms' : '200ms'
        }}
      >
        {/* Drag handle */}
        <div
          className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div className="w-10 h-1 rounded-full bg-muted" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
            <h2 className="text-lg font-semibold text-text">{title}</h2>
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm font-medium text-accent hover:text-accent/80"
            >
              Done
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto overscroll-contain" style={{ height: 'calc(100% - 60px)' }}>
          <div className="p-4 pb-safe">
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

interface BottomSheetSectionProps {
  title: string;
  children: React.ReactNode;
}

export function BottomSheetSection({ title, children }: BottomSheetSectionProps) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-muted mb-3">{title}</h3>
      {children}
    </div>
  );
}

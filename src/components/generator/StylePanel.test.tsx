import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { StylePanel } from './StylePanel';
import { useQrStore } from '../../stores/qrStore';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { readFile } from '@tauri-apps/plugin-fs';
import { optimizeImage, blobToDataUrl } from '../../lib/imageOptimizer';

vi.mock('@tauri-apps/api/webviewWindow');
vi.mock('@tauri-apps/plugin-fs');
vi.mock('../../lib/imageOptimizer');

describe('StylePanel', () => {
  let mockDragDropHandler: ((event: { payload: { type: string; paths?: string[] } }) => void) | null =
    null;
  let mockUnlisten: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useQrStore.getState().reset();
    mockDragDropHandler = null;
    mockUnlisten = vi.fn();

    vi.mocked(getCurrentWebviewWindow).mockReturnValue({
      onDragDropEvent: vi.fn((handler) => {
        mockDragDropHandler = handler;
        return Promise.resolve(mockUnlisten);
      }),
    } as unknown as ReturnType<typeof getCurrentWebviewWindow>);

    vi.mocked(readFile).mockReset();

    // Mock image optimizer to return optimized data URL
    vi.mocked(blobToDataUrl).mockImplementation(async (blob: Blob) => {
      return `data:${blob.type || 'image/png'};base64,optimized`;
    });
    vi.mocked(optimizeImage).mockImplementation(async (dataUrl: string, _mimeType: string) => {
      return {
        dataUrl: dataUrl.replace('base64,', 'base64,optimized_'),
        originalWidth: 1000,
        originalHeight: 1000,
        finalWidth: 512,
        finalHeight: 512,
        wasResized: true,
        wasTrimmed: true,
      };
    });
  });

  describe('Dot Style', () => {
    it('renders dot style section', () => {
      render(<StylePanel />);

      expect(screen.getByText('Dot Style')).toBeInTheDocument();
    });

    it('updates dot style when Dots button clicked', () => {
      render(<StylePanel />);

      // Click the "Dots" style button (unique title)
      fireEvent.click(screen.getByTitle('Dots'));
      expect(useQrStore.getState().dotStyle).toBe('dots');
    });

    it('updates dot style when Classy button clicked', () => {
      render(<StylePanel />);

      fireEvent.click(screen.getByTitle('Classy'));
      expect(useQrStore.getState().dotStyle).toBe('classy');
    });

    it('updates dot style when Extra Round button clicked', () => {
      render(<StylePanel />);

      fireEvent.click(screen.getByTitle('Extra Round'));
      expect(useQrStore.getState().dotStyle).toBe('extra-rounded');
    });
  });

  describe('Corner Style', () => {
    it('renders corner style section', () => {
      render(<StylePanel />);

      expect(screen.getByText('Corner Style')).toBeInTheDocument();
    });

    it('updates corner square style when Dot button clicked', () => {
      render(<StylePanel />);

      // Find corner style Dot button (there might be multiple "Dot" titles)
      const dotButtons = screen.getAllByTitle('Dot');
      // Click each until we get the corner one (corner style buttons update cornerSquareStyle)
      for (const btn of dotButtons) {
        fireEvent.click(btn);
        if (useQrStore.getState().cornerSquareStyle === 'dot') break;
      }

      expect(useQrStore.getState().cornerSquareStyle).toBe('dot');
    });
  });

  describe('Colors', () => {
    it('renders foreground and background color inputs', () => {
      render(<StylePanel />);

      expect(screen.getByText('FG')).toBeInTheDocument();
      expect(screen.getByText('BG')).toBeInTheDocument();
    });

    it('renders color input elements', () => {
      render(<StylePanel />);

      // Color inputs have type="color"
      const container = document.querySelector('body');
      const colorInputs = container?.querySelectorAll('input[type="color"]');
      expect(colorInputs?.length).toBeGreaterThanOrEqual(2);
    });

    it('renders transparent background checkbox', () => {
      render(<StylePanel />);

      expect(screen.getByText('Transparent')).toBeInTheDocument();
    });

    it('toggles transparent background', () => {
      render(<StylePanel />);

      // Find the transparent checkbox by looking at all checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      const transparentCheckbox = checkboxes.find((cb) => {
        const label = cb.closest('label');
        return label?.textContent?.includes('Transparent');
      });

      expect(transparentCheckbox).toBeDefined();
      expect(useQrStore.getState().transparentBg).toBe(false);

      fireEvent.click(transparentCheckbox!);
      expect(useQrStore.getState().transparentBg).toBe(true);

      fireEvent.click(transparentCheckbox!);
      expect(useQrStore.getState().transparentBg).toBe(false);
    });
  });

  describe('Gradient', () => {
    it('renders gradient checkbox', () => {
      render(<StylePanel />);

      expect(screen.getByText('Gradient Fill')).toBeInTheDocument();
    });

    it('toggles gradient option', () => {
      render(<StylePanel />);

      // Find the gradient checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      const gradientCheckbox = checkboxes.find((cb) => {
        const label = cb.closest('label');
        return label?.textContent?.includes('Gradient Fill');
      });

      expect(gradientCheckbox).toBeDefined();
      expect(useQrStore.getState().useGradient).toBe(false);

      fireEvent.click(gradientCheckbox!);
      expect(useQrStore.getState().useGradient).toBe(true);
    });

    it('shows gradient color pickers when gradient enabled', () => {
      useQrStore.getState().setUseGradient(true);
      render(<StylePanel />);

      // Should show the arrow between colors
      expect(screen.getByText('→')).toBeInTheDocument();
    });
  });

  describe('Logo', () => {
    it('renders logo upload area when no logo', () => {
      render(<StylePanel />);

      expect(screen.getByText('Drop logo or click to upload')).toBeInTheDocument();
      expect(screen.getByText(/PNG, JPG, SVG.*auto-resized/)).toBeInTheDocument();
    });

    it('renders logo controls when logo is set', () => {
      useQrStore.getState().setLogo({
        src: 'data:image/png;base64,test',
        size: 25,
        margin: 5,
        shape: 'square',
      });
      render(<StylePanel />);

      expect(screen.getByText('Logo added')).toBeInTheDocument();
      expect(screen.getByText('Remove')).toBeInTheDocument();
      expect(screen.getByText('Size: 25%')).toBeInTheDocument();
    });

    it('removes logo when Remove clicked', () => {
      useQrStore.getState().setLogo({
        src: 'data:image/png;base64,test',
        size: 25,
        margin: 5,
        shape: 'square',
      });
      render(<StylePanel />);

      fireEvent.click(screen.getByText('Remove'));
      expect(useQrStore.getState().logo).toBeNull();
    });

    it('shows size slider when logo is set', () => {
      useQrStore.getState().setLogo({
        src: 'data:image/png;base64,test',
        size: 25,
        margin: 5,
        shape: 'square',
      });
      render(<StylePanel />);

      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('min', '10');
      expect(slider).toHaveAttribute('max', '40');
    });

    it('shows warning for large logo size', () => {
      useQrStore.getState().setLogo({
        src: 'data:image/png;base64,test',
        size: 35,
        margin: 5,
        shape: 'square',
      });
      render(<StylePanel />);

      expect(screen.getByText(/Large logos may reduce scanability/)).toBeInTheDocument();
    });

    it('shows shape options when logo is set', () => {
      useQrStore.getState().setLogo({
        src: 'data:image/png;base64,test',
        size: 25,
        margin: 5,
        shape: 'square',
      });
      render(<StylePanel />);

      expect(screen.getByText('□ Square')).toBeInTheDocument();
      expect(screen.getByText('○ Circle')).toBeInTheDocument();
    });

    it('updates logo shape when shape button clicked', () => {
      useQrStore.getState().setLogo({
        src: 'data:image/png;base64,test',
        size: 25,
        margin: 5,
        shape: 'square',
      });
      render(<StylePanel />);

      fireEvent.click(screen.getByText('○ Circle'));
      expect(useQrStore.getState().logo?.shape).toBe('circle');
    });
  });

  describe('Error Correction', () => {
    it('renders all error correction levels', () => {
      render(<StylePanel />);

      expect(screen.getByRole('button', { name: 'L' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Q' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'H' })).toBeInTheDocument();
    });

    it('updates error correction when clicked', () => {
      render(<StylePanel />);

      fireEvent.click(screen.getByRole('button', { name: 'H' }));
      expect(useQrStore.getState().errorCorrection).toBe('H');

      fireEvent.click(screen.getByRole('button', { name: 'L' }));
      expect(useQrStore.getState().errorCorrection).toBe('L');
    });

    it('shows description for selected error correction', () => {
      useQrStore.getState().setErrorCorrection('M');
      render(<StylePanel />);

      expect(screen.getByText(/15% recovery/)).toBeInTheDocument();
      expect(screen.getByText(/Recommended/)).toBeInTheDocument();
    });

    it('shows tip when logo is set with low EC level', () => {
      useQrStore.getState().setLogo({
        src: 'data:image/png;base64,test',
        size: 25,
        margin: 5,
        shape: 'square',
      });
      useQrStore.getState().setErrorCorrection('L');
      render(<StylePanel />);

      expect(screen.getByText(/Use Q or H when embedding a logo/)).toBeInTheDocument();
    });

    it('does not show tip when logo is set with high EC level', () => {
      useQrStore.getState().setLogo({
        src: 'data:image/png;base64,test',
        size: 25,
        margin: 5,
        shape: 'square',
      });
      useQrStore.getState().setErrorCorrection('H');
      render(<StylePanel />);

      expect(screen.queryByText(/Use Q or H when embedding a logo/)).not.toBeInTheDocument();
    });
  });

  describe('Drag and Drop Logo', () => {
    it('loads logo when image file is dropped via Tauri drag-drop', async () => {
      // Mock readFile to return fake PNG data
      const fakeImageData = new Uint8Array([137, 80, 78, 71]); // PNG magic bytes
      vi.mocked(readFile).mockResolvedValue(fakeImageData);

      render(<StylePanel />);

      // Wait for the drag-drop handler to be registered
      await waitFor(() => {
        expect(mockDragDropHandler).not.toBeNull();
      });

      // Simulate dropping a PNG file
      await act(async () => {
        mockDragDropHandler!({ payload: { type: 'drop', paths: ['/path/to/logo.png'] } });
      });

      // Wait for the logo to be loaded
      await waitFor(() => {
        expect(useQrStore.getState().logo).not.toBeNull();
      });

      // Verify readFile was called with the correct path
      expect(readFile).toHaveBeenCalledWith('/path/to/logo.png');

      // Verify logo was set with correct properties
      const logo = useQrStore.getState().logo;
      expect(logo?.src).toMatch(/^data:image\/png;base64,/);
      expect(logo?.size).toBe(32);
      expect(logo?.margin).toBe(5);
      expect(logo?.shape).toBe('square');
    });

    it('loads JPEG files correctly with proper mime type', async () => {
      const fakeImageData = new Uint8Array([255, 216, 255]); // JPEG magic bytes
      vi.mocked(readFile).mockResolvedValue(fakeImageData);

      render(<StylePanel />);

      await waitFor(() => {
        expect(mockDragDropHandler).not.toBeNull();
      });

      await act(async () => {
        mockDragDropHandler!({ payload: { type: 'drop', paths: ['/path/to/photo.jpg'] } });
      });

      await waitFor(() => {
        expect(useQrStore.getState().logo).not.toBeNull();
      });

      // JPEG should use image/jpeg mime type
      const logo = useQrStore.getState().logo;
      expect(logo?.src).toMatch(/^data:image\/jpeg;base64,/);
    });

    it('loads SVG files correctly with proper mime type', async () => {
      const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"></svg>';
      const fakeImageData = new TextEncoder().encode(svgContent);
      vi.mocked(readFile).mockResolvedValue(fakeImageData);

      render(<StylePanel />);

      await waitFor(() => {
        expect(mockDragDropHandler).not.toBeNull();
      });

      await act(async () => {
        mockDragDropHandler!({ payload: { type: 'drop', paths: ['/path/to/icon.svg'] } });
      });

      await waitFor(() => {
        expect(useQrStore.getState().logo).not.toBeNull();
      });

      const logo = useQrStore.getState().logo;
      expect(logo?.src).toMatch(/^data:image\/svg\+xml;base64,/);
    });

    it('ignores non-image files', async () => {
      render(<StylePanel />);

      await waitFor(() => {
        expect(mockDragDropHandler).not.toBeNull();
      });

      // Drop a non-image file
      await act(async () => {
        mockDragDropHandler!({ payload: { type: 'drop', paths: ['/path/to/document.pdf'] } });
      });

      // Logo should not be set
      expect(useQrStore.getState().logo).toBeNull();
      expect(readFile).not.toHaveBeenCalled();
    });

    it('shows drag indicator when dragging over app', async () => {
      render(<StylePanel />);

      await waitFor(() => {
        expect(mockDragDropHandler).not.toBeNull();
      });

      // Trigger drag over
      await act(async () => {
        mockDragDropHandler!({ payload: { type: 'over' } });
      });

      // Should show "Drop to add logo" text
      await waitFor(() => {
        expect(screen.getByText('Drop to add logo')).toBeInTheDocument();
      });
    });

    it('hides drag indicator when drag leaves', async () => {
      render(<StylePanel />);

      await waitFor(() => {
        expect(mockDragDropHandler).not.toBeNull();
      });

      // Trigger drag over then leave
      await act(async () => {
        mockDragDropHandler!({ payload: { type: 'over' } });
      });

      await waitFor(() => {
        expect(screen.getByText('Drop to add logo')).toBeInTheDocument();
      });

      await act(async () => {
        mockDragDropHandler!({ payload: { type: 'leave' } });
      });

      await waitFor(() => {
        expect(screen.getByText('Drop logo or click to upload')).toBeInTheDocument();
      });
    });

    it('replaces existing logo when new file is dropped', async () => {
      // Set an existing logo
      useQrStore.getState().setLogo({
        src: 'data:image/png;base64,oldlogo',
        size: 30,
        margin: 10,
        shape: 'circle',
      });

      const fakeImageData = new Uint8Array([137, 80, 78, 71]);
      vi.mocked(readFile).mockResolvedValue(fakeImageData);

      render(<StylePanel />);

      await waitFor(() => {
        expect(mockDragDropHandler).not.toBeNull();
      });

      // Drop a new file
      await act(async () => {
        mockDragDropHandler!({ payload: { type: 'drop', paths: ['/path/to/newlogo.png'] } });
      });

      await waitFor(() => {
        const logo = useQrStore.getState().logo;
        // New logo should have default size/margin/shape
        expect(logo?.size).toBe(32);
        expect(logo?.margin).toBe(5);
        expect(logo?.shape).toBe('square');
      });
    });

    it('handles file read errors gracefully', async () => {
      vi.mocked(readFile).mockRejectedValue(new Error('File not found'));

      // Spy on console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<StylePanel />);

      await waitFor(() => {
        expect(mockDragDropHandler).not.toBeNull();
      });

      await act(async () => {
        mockDragDropHandler!({ payload: { type: 'drop', paths: ['/path/to/missing.png'] } });
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load logo:', expect.any(Error));
      });

      // Logo should not be set
      expect(useQrStore.getState().logo).toBeNull();

      consoleSpy.mockRestore();
    });

    it('automatically resizes large files instead of rejecting', async () => {
      // Create a mock large file - should be resized, not rejected
      const largeFileData = new Uint8Array(600 * 1024); // 600KB
      vi.mocked(readFile).mockResolvedValue(largeFileData);

      render(<StylePanel />);

      await waitFor(() => {
        expect(mockDragDropHandler).not.toBeNull();
      });

      await act(async () => {
        mockDragDropHandler!({ payload: { type: 'drop', paths: ['/path/to/large-logo.png'] } });
      });

      // Logo should be set (auto-resized)
      await waitFor(() => {
        expect(useQrStore.getState().logo).not.toBeNull();
      });

      // Verify optimizeImage was called
      expect(optimizeImage).toHaveBeenCalled();
    });

    it('displays auto-resize info in drop zone', () => {
      render(<StylePanel />);

      expect(screen.getByText(/auto-resized/)).toBeInTheDocument();
    });
  });
});

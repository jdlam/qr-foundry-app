import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { StylePanel } from './StylePanel';
import { useQrStore } from '../../stores/qrStore';
import { dragDropAdapter, filesystemAdapter } from '@platform';
import { optimizeImage, blobToDataUrl } from '../../lib/imageOptimizer';
import type { DragDropCallback } from '../../platform/types';

vi.mock('../../lib/imageOptimizer');

const mockListen = vi.mocked(dragDropAdapter.listen);
const mockReadFile = vi.mocked(filesystemAdapter.readFile);

describe('StylePanel', () => {
  let mockDragDropHandler: DragDropCallback | null = null;
  let mockUnlisten: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    useQrStore.getState().reset();
    mockDragDropHandler = null;
    mockUnlisten = vi.fn();

    mockListen.mockImplementation(async (callback) => {
      mockDragDropHandler = callback;
      return mockUnlisten as unknown as () => void;
    });

    mockReadFile.mockReset();

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

    it('updates dot style when Extra Rounded button clicked', () => {
      render(<StylePanel />);

      fireEvent.click(screen.getByTitle('Extra Rounded'));
      expect(useQrStore.getState().dotStyle).toBe('extra-rounded');
    });

    it('updates dot style when Classy Rounded button clicked', () => {
      render(<StylePanel />);

      fireEvent.click(screen.getByTitle('Classy Rounded'));
      expect(useQrStore.getState().dotStyle).toBe('classy-rounded');
    });

    it('renders all 6 dot style buttons', () => {
      render(<StylePanel />);

      // Square and Rounded titles appear in both Dot Style and Eye Style sections
      const squareButtons = screen.getAllByTitle('Square');
      const roundedButtons = screen.getAllByTitle('Rounded');
      expect(squareButtons.length).toBeGreaterThanOrEqual(1);
      expect(roundedButtons.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTitle('Dots')).toBeInTheDocument();
      expect(screen.getByTitle('Classy')).toBeInTheDocument();
      expect(screen.getByTitle('Classy Rounded')).toBeInTheDocument();
      expect(screen.getByTitle('Extra Rounded')).toBeInTheDocument();
    });
  });

  describe('Eye Style', () => {
    it('renders eye style section', () => {
      render(<StylePanel />);

      expect(screen.getByText('Eye Style')).toBeInTheDocument();
    });

    it('updates corner square style when Circle button clicked', () => {
      render(<StylePanel />);

      // Find the Circle button in the eye style section
      const circleButtons = screen.getAllByTitle('Circle');
      // Click each until we get the corner one (corner style buttons update cornerSquareStyle)
      for (const btn of circleButtons) {
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

    it('renders color swatch elements', () => {
      render(<StylePanel />);

      // Color rows show hex values as text (defaults from qrStore)
      expect(screen.getByText('#1a1a2e')).toBeInTheDocument();
      expect(screen.getByText('#ffffff')).toBeInTheDocument();
    });

    it('renders transparent background option', () => {
      render(<StylePanel />);

      expect(screen.getByText('Transparent Background')).toBeInTheDocument();
    });

    it('toggles transparent background', () => {
      render(<StylePanel />);

      // The transparent checkbox is a custom div, find it by its adjacent text
      const transparentText = screen.getByText('Transparent Background');
      const transparentToggle = transparentText.previousElementSibling;

      expect(transparentToggle).toBeDefined();
      expect(useQrStore.getState().transparentBg).toBe(false);

      fireEvent.click(transparentToggle!);
      expect(useQrStore.getState().transparentBg).toBe(true);

      fireEvent.click(transparentToggle!);
      expect(useQrStore.getState().transparentBg).toBe(false);
    });
  });

  describe('Gradient', () => {
    it('renders gradient toggle', () => {
      render(<StylePanel />);

      expect(screen.getByText('Gradient Fill')).toBeInTheDocument();
    });

    it('toggles gradient option', () => {
      render(<StylePanel />);

      // The gradient toggle is a custom toggle switch (div), find it by its adjacent text
      const gradientText = screen.getByText('Gradient Fill');
      const gradientToggle = gradientText.previousElementSibling;

      expect(gradientToggle).toBeDefined();
      expect(useQrStore.getState().useGradient).toBe(false);

      fireEvent.click(gradientToggle!);
      expect(useQrStore.getState().useGradient).toBe(true);
    });

    it('shows gradient color pickers when gradient enabled', () => {
      useQrStore.getState().setUseGradient(true);
      render(<StylePanel />);

      // Should show A and B labels for gradient colors
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
    });
  });

  describe('Logo', () => {
    it('renders logo upload area when no logo', () => {
      render(<StylePanel />);

      expect(screen.getByText('Drop logo or click to upload')).toBeInTheDocument();
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

      // Shape buttons use title attribute (without emoji prefixes)
      const squareButtons = screen.getAllByTitle('Square');
      const circleButtons = screen.getAllByTitle('Circle');
      expect(squareButtons.length).toBeGreaterThanOrEqual(1);
      expect(circleButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('updates logo shape when Circle shape button clicked', () => {
      useQrStore.getState().setLogo({
        src: 'data:image/png;base64,test',
        size: 25,
        margin: 5,
        shape: 'square',
      });
      render(<StylePanel />);

      // Find Circle buttons - the logo shape one vs the eye style one
      const circleButtons = screen.getAllByTitle('Circle');
      // Click each to find the one that sets logo shape
      for (const btn of circleButtons) {
        fireEvent.click(btn);
        if (useQrStore.getState().logo?.shape === 'circle') break;
      }
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
    it('loads logo when image file is dropped via drag-drop adapter', async () => {
      // Mock readFile to return fake PNG data
      const fakeImageData = new Uint8Array([137, 80, 78, 71]); // PNG magic bytes
      mockReadFile.mockResolvedValue(fakeImageData);

      render(<StylePanel />);

      // Wait for the drag-drop handler to be registered
      await waitFor(() => {
        expect(mockDragDropHandler).not.toBeNull();
      });

      // Simulate dropping a PNG file
      await act(async () => {
        mockDragDropHandler!({ type: 'drop', paths: ['/path/to/logo.png'] });
      });

      // Wait for the logo to be loaded
      await waitFor(() => {
        expect(useQrStore.getState().logo).not.toBeNull();
      });

      // Verify readFile was called with the correct path
      expect(mockReadFile).toHaveBeenCalledWith('/path/to/logo.png');

      // Verify logo was set with correct properties
      const logo = useQrStore.getState().logo;
      expect(logo?.src).toMatch(/^data:image\/png;base64,/);
      expect(logo?.size).toBe(32);
      expect(logo?.margin).toBe(5);
      expect(logo?.shape).toBe('square');
    });

    it('loads JPEG files correctly with proper mime type', async () => {
      const fakeImageData = new Uint8Array([255, 216, 255]); // JPEG magic bytes
      mockReadFile.mockResolvedValue(fakeImageData);

      render(<StylePanel />);

      await waitFor(() => {
        expect(mockDragDropHandler).not.toBeNull();
      });

      await act(async () => {
        mockDragDropHandler!({ type: 'drop', paths: ['/path/to/photo.jpg'] });
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
      mockReadFile.mockResolvedValue(fakeImageData);

      render(<StylePanel />);

      await waitFor(() => {
        expect(mockDragDropHandler).not.toBeNull();
      });

      await act(async () => {
        mockDragDropHandler!({ type: 'drop', paths: ['/path/to/icon.svg'] });
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
        mockDragDropHandler!({ type: 'drop', paths: ['/path/to/document.pdf'] });
      });

      // Logo should not be set
      expect(useQrStore.getState().logo).toBeNull();
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it('shows drag indicator when dragging over app', async () => {
      render(<StylePanel />);

      await waitFor(() => {
        expect(mockDragDropHandler).not.toBeNull();
      });

      // Trigger drag over
      await act(async () => {
        mockDragDropHandler!({ type: 'over' });
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
        mockDragDropHandler!({ type: 'over' });
      });

      await waitFor(() => {
        expect(screen.getByText('Drop to add logo')).toBeInTheDocument();
      });

      await act(async () => {
        mockDragDropHandler!({ type: 'leave' });
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
      mockReadFile.mockResolvedValue(fakeImageData);

      render(<StylePanel />);

      await waitFor(() => {
        expect(mockDragDropHandler).not.toBeNull();
      });

      // Drop a new file
      await act(async () => {
        mockDragDropHandler!({ type: 'drop', paths: ['/path/to/newlogo.png'] });
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
      mockReadFile.mockRejectedValue(new Error('File not found'));

      // Spy on console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<StylePanel />);

      await waitFor(() => {
        expect(mockDragDropHandler).not.toBeNull();
      });

      await act(async () => {
        mockDragDropHandler!({ type: 'drop', paths: ['/path/to/missing.png'] });
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
      mockReadFile.mockResolvedValue(largeFileData);

      render(<StylePanel />);

      await waitFor(() => {
        expect(mockDragDropHandler).not.toBeNull();
      });

      await act(async () => {
        mockDragDropHandler!({ type: 'drop', paths: ['/path/to/large-logo.png'] });
      });

      // Logo should be set (auto-resized)
      await waitFor(() => {
        expect(useQrStore.getState().logo).not.toBeNull();
      });

      // Verify optimizeImage was called
      expect(optimizeImage).toHaveBeenCalled();
    });

    it('displays upload text in drop zone', () => {
      render(<StylePanel />);

      expect(screen.getByText('Drop logo or click to upload')).toBeInTheDocument();
    });
  });
});

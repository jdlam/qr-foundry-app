import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScannerView } from './ScannerView';
import { useQrStore } from '../../stores/qrStore';
import { toast } from 'sonner';

// Mock the hooks
vi.mock('../../hooks/useValidation', () => ({
  useScanQr: vi.fn(() => ({
    scanFromFile: vi.fn(),
    scanFromData: vi.fn(),
    isScanning: false,
    scanResult: null,
    clearScan: vi.fn(),
  })),
}));

vi.mock('../../hooks/useExport', () => ({
  useExport: vi.fn(() => ({
    pickImageFile: vi.fn(),
  })),
}));

vi.mock('../../hooks/useTauriDragDrop', () => ({
  useTauriDragDrop: vi.fn(() => ({
    isDragging: false,
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useScanQr } from '../../hooks/useValidation';
import { useExport } from '../../hooks/useExport';

const mockUseScanQr = vi.mocked(useScanQr);
const mockUseExport = vi.mocked(useExport);

describe('ScannerView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQrStore.getState().reset();

    mockUseScanQr.mockReturnValue({
      scanFromFile: vi.fn(),
      scanFromData: vi.fn(),
      isScanning: false,
      scanResult: null,
      clearScan: vi.fn(),
    });

    mockUseExport.mockReturnValue({
      pickImageFile: vi.fn(),
      exportPng: vi.fn(),
      exportSvg: vi.fn(),
      copyToClipboard: vi.fn(),
    } as unknown as ReturnType<typeof useExport>);
  });

  describe('initial state', () => {
    it('renders drop zone', () => {
      render(<ScannerView />);

      expect(screen.getByText('Drop QR image here')).toBeInTheDocument();
      expect(screen.getByText(/or click to browse/)).toBeInTheDocument();
    });

    it('shows empty state message', () => {
      render(<ScannerView />);

      expect(screen.getByText('Drop a QR code image to scan')).toBeInTheDocument();
      expect(screen.getByText(/Supports PNG, JPG, WebP/)).toBeInTheDocument();
    });
  });

  describe('scanning state', () => {
    it('shows scanning indicator', () => {
      mockUseScanQr.mockReturnValue({
        scanFromFile: vi.fn(),
        scanFromData: vi.fn(),
        isScanning: true,
        scanResult: null,
        clearScan: vi.fn(),
      });

      render(<ScannerView />);

      expect(screen.getByText('Scanning...')).toBeInTheDocument();
    });
  });

  describe('scan results', () => {
    it('displays decoded content', () => {
      mockUseScanQr.mockReturnValue({
        scanFromFile: vi.fn(),
        scanFromData: vi.fn(),
        isScanning: false,
        scanResult: {
          success: true,
          content: 'https://example.com',
          qrType: 'url',
          error: null,
        },
        clearScan: vi.fn(),
      });

      render(<ScannerView />);

      expect(screen.getByText('QR Code Decoded')).toBeInTheDocument();
      // Content appears in both sidebar and main view
      const contentElements = screen.getAllByText('https://example.com');
      expect(contentElements.length).toBeGreaterThanOrEqual(1);
    });

    it('displays QR type badge', () => {
      mockUseScanQr.mockReturnValue({
        scanFromFile: vi.fn(),
        scanFromData: vi.fn(),
        isScanning: false,
        scanResult: {
          success: true,
          content: 'https://example.com',
          qrType: 'url',
          error: null,
        },
        clearScan: vi.fn(),
      });

      render(<ScannerView />);

      expect(screen.getByText('url')).toBeInTheDocument();
    });

    it('shows action buttons on successful scan', () => {
      mockUseScanQr.mockReturnValue({
        scanFromFile: vi.fn(),
        scanFromData: vi.fn(),
        isScanning: false,
        scanResult: {
          success: true,
          content: 'https://example.com',
          qrType: 'url',
          error: null,
        },
        clearScan: vi.fn(),
      });

      render(<ScannerView />);

      // Buttons have emoji prefixes: 📋 Copy Content, 🔗 Open URL, ◧ Re-generate
      expect(screen.getByText(/Copy Content/)).toBeInTheDocument();
      expect(screen.getByText(/Open URL/)).toBeInTheDocument();
      // Re-generate appears in both sidebar and main view
      const regenButtons = screen.getAllByText(/Re-generate/);
      expect(regenButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('does not show Open URL button for non-URL content', () => {
      mockUseScanQr.mockReturnValue({
        scanFromFile: vi.fn(),
        scanFromData: vi.fn(),
        isScanning: false,
        scanResult: {
          success: true,
          content: 'Hello World',
          qrType: 'text',
          error: null,
        },
        clearScan: vi.fn(),
      });

      render(<ScannerView />);

      expect(screen.queryByText('Open URL')).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('displays error message on scan failure', () => {
      mockUseScanQr.mockReturnValue({
        scanFromFile: vi.fn(),
        scanFromData: vi.fn(),
        isScanning: false,
        scanResult: {
          success: false,
          content: null,
          qrType: null,
          error: 'No QR code found',
        },
        clearScan: vi.fn(),
      });

      render(<ScannerView />);

      expect(screen.getByText('No QR code found')).toBeInTheDocument();
    });
  });

  describe('copy to clipboard', () => {
    it('copies content and shows success toast', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      mockUseScanQr.mockReturnValue({
        scanFromFile: vi.fn(),
        scanFromData: vi.fn(),
        isScanning: false,
        scanResult: {
          success: true,
          content: 'https://example.com',
          qrType: 'url',
          error: null,
        },
        clearScan: vi.fn(),
      });

      render(<ScannerView />);

      // Button has emoji prefix 📋
      fireEvent.click(screen.getByText(/Copy Content/));

      expect(writeTextMock).toHaveBeenCalledWith('https://example.com');
      expect(toast.success).toHaveBeenCalledWith('Copied to clipboard');
    });

    it('also works with the sidebar copy button', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: { writeText: writeTextMock },
      });

      mockUseScanQr.mockReturnValue({
        scanFromFile: vi.fn(),
        scanFromData: vi.fn(),
        isScanning: false,
        scanResult: {
          success: true,
          content: 'https://example.com',
          qrType: 'url',
          error: null,
        },
        clearScan: vi.fn(),
      });

      render(<ScannerView />);

      // There are two copy buttons - one in sidebar (smaller), one in main view
      const copyButtons = screen.getAllByText('Copy');
      fireEvent.click(copyButtons[0]); // Click sidebar copy button

      expect(writeTextMock).toHaveBeenCalledWith('https://example.com');
    });
  });

  describe('re-generate in generator', () => {
    it('loads content in generator and shows success toast', () => {
      mockUseScanQr.mockReturnValue({
        scanFromFile: vi.fn(),
        scanFromData: vi.fn(),
        isScanning: false,
        scanResult: {
          success: true,
          content: 'https://example.com',
          qrType: 'url',
          error: null,
        },
        clearScan: vi.fn(),
      });

      render(<ScannerView />);

      fireEvent.click(screen.getByText('Re-generate'));

      expect(useQrStore.getState().content).toBe('https://example.com');
      expect(toast.success).toHaveBeenCalledWith('Loaded in Generator');
    });

    it('also works with sidebar re-generate button', () => {
      mockUseScanQr.mockReturnValue({
        scanFromFile: vi.fn(),
        scanFromData: vi.fn(),
        isScanning: false,
        scanResult: {
          success: true,
          content: 'Hello World',
          qrType: 'text',
          error: null,
        },
        clearScan: vi.fn(),
      });

      render(<ScannerView />);

      // There are two re-generate buttons
      const regenButtons = screen.getAllByText('Re-generate');
      fireEvent.click(regenButtons[0]); // Click sidebar re-generate button

      expect(useQrStore.getState().content).toBe('Hello World');
    });
  });

  describe('clear scan', () => {
    it('shows clear button when scan result exists', () => {
      const clearScan = vi.fn();

      mockUseScanQr.mockReturnValue({
        scanFromFile: vi.fn(),
        scanFromData: vi.fn(),
        isScanning: false,
        scanResult: {
          success: true,
          content: 'https://example.com',
          qrType: 'url',
          error: null,
        },
        clearScan,
      });

      render(<ScannerView />);

      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('calls clearScan when clear button clicked', () => {
      const clearScan = vi.fn();

      mockUseScanQr.mockReturnValue({
        scanFromFile: vi.fn(),
        scanFromData: vi.fn(),
        isScanning: false,
        scanResult: {
          success: true,
          content: 'https://example.com',
          qrType: 'url',
          error: null,
        },
        clearScan,
      });

      render(<ScannerView />);

      fireEvent.click(screen.getByText('Clear'));

      expect(clearScan).toHaveBeenCalled();
    });
  });

  describe('file picking', () => {
    it('opens file picker on drop zone click', async () => {
      const pickImageFile = vi.fn().mockResolvedValue('/path/to/image.png');
      const scanFromFile = vi.fn();

      mockUseExport.mockReturnValue({
        pickImageFile,
        exportPng: vi.fn(),
        exportSvg: vi.fn(),
        copyToClipboard: vi.fn(),
      } as unknown as ReturnType<typeof useExport>);

      mockUseScanQr.mockReturnValue({
        scanFromFile,
        scanFromData: vi.fn(),
        isScanning: false,
        scanResult: null,
        clearScan: vi.fn(),
      });

      render(<ScannerView />);

      // Click on the drop zone
      const dropZone = screen.getByText('Drop QR image here').closest('div');
      fireEvent.click(dropZone!);

      await waitFor(() => {
        expect(pickImageFile).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(scanFromFile).toHaveBeenCalledWith('/path/to/image.png');
      });
    });

    it('does not scan if file picker cancelled', async () => {
      const pickImageFile = vi.fn().mockResolvedValue(null);
      const scanFromFile = vi.fn();

      mockUseExport.mockReturnValue({
        pickImageFile,
        exportPng: vi.fn(),
        exportSvg: vi.fn(),
        copyToClipboard: vi.fn(),
      } as unknown as ReturnType<typeof useExport>);

      mockUseScanQr.mockReturnValue({
        scanFromFile,
        scanFromData: vi.fn(),
        isScanning: false,
        scanResult: null,
        clearScan: vi.fn(),
      });

      render(<ScannerView />);

      const dropZone = screen.getByText('Drop QR image here').closest('div');
      fireEvent.click(dropZone!);

      await waitFor(() => {
        expect(pickImageFile).toHaveBeenCalled();
      });

      expect(scanFromFile).not.toHaveBeenCalled();
    });
  });

  describe('drag and drop', () => {
    it('handles image file drop', async () => {
      const scanFromData = vi.fn();

      mockUseScanQr.mockReturnValue({
        scanFromFile: vi.fn(),
        scanFromData,
        isScanning: false,
        scanResult: null,
        clearScan: vi.fn(),
      });

      render(<ScannerView />);

      const dropZone = screen.getByText('Drop QR image here').closest('div')!;

      const file = new File(['test'], 'test.png', { type: 'image/png' });
      const dataTransfer = {
        files: [file],
      };

      fireEvent.dragOver(dropZone, { dataTransfer });
      fireEvent.drop(dropZone, { dataTransfer });

      // The file reading is async, so we wait
      await waitFor(() => {
        expect(scanFromData).toHaveBeenCalled();
      });
    });

    it('rejects non-image files', async () => {
      const scanFromData = vi.fn();

      mockUseScanQr.mockReturnValue({
        scanFromFile: vi.fn(),
        scanFromData,
        isScanning: false,
        scanResult: null,
        clearScan: vi.fn(),
      });

      render(<ScannerView />);

      const dropZone = screen.getByText('Drop QR image here').closest('div')!;

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const dataTransfer = {
        files: [file],
      };

      fireEvent.drop(dropZone, { dataTransfer });

      // Should not call scanFromData for non-image files
      expect(scanFromData).not.toHaveBeenCalled();
    });
  });
});

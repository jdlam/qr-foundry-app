import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TemplatesView } from './TemplatesView';
import { useQrStore } from '../../stores/qrStore';
import { toast } from 'sonner';

// Mock the hooks
vi.mock('../../hooks/useTemplates', () => ({
  useTemplates: vi.fn(() => ({
    templates: [],
    isLoading: false,
    fetchTemplates: vi.fn(),
    getTemplate: vi.fn().mockResolvedValue(null),
    saveTemplate: vi.fn().mockResolvedValue(1),
    updateTemplate: vi.fn().mockResolvedValue(true),
    deleteTemplate: vi.fn().mockResolvedValue(true),
    setDefaultTemplate: vi.fn().mockResolvedValue(true),
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useTemplates } from '../../hooks/useTemplates';

const mockUseTemplates = vi.mocked(useTemplates);

const mockTemplates = [
  {
    id: 1,
    name: 'Corporate Blue',
    styleJson: JSON.stringify({
      dotStyle: 'rounded',
      foreground: '#0066cc',
      background: '#ffffff',
      cornerSquareStyle: 'extra-rounded',
      cornerDotStyle: 'dot',
    }),
    preview: null,
    isDefault: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Default Style',
    styleJson: JSON.stringify({
      dotStyle: 'square',
      foreground: '#000000',
      background: '#ffffff',
    }),
    preview: null,
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
];

const createMockUseTemplates = (overrides = {}) => ({
  templates: [],
  isLoading: false,
  fetchTemplates: vi.fn(),
  getTemplate: vi.fn().mockResolvedValue(null),
  saveTemplate: vi.fn().mockResolvedValue(1),
  updateTemplate: vi.fn().mockResolvedValue(true),
  deleteTemplate: vi.fn().mockResolvedValue(true),
  setDefaultTemplate: vi.fn().mockResolvedValue(true),
  ...overrides,
});

describe('TemplatesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQrStore.getState().reset();
    mockUseTemplates.mockReturnValue(createMockUseTemplates());
  });

  describe('empty state', () => {
    it('renders empty state when no templates', () => {
      render(<TemplatesView />);
      expect(screen.getByText(/No templates yet/)).toBeInTheDocument();
    });

    it('shows loading state', () => {
      mockUseTemplates.mockReturnValue(createMockUseTemplates({ isLoading: true }));
      render(<TemplatesView />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('with templates', () => {
    it('renders template list', () => {
      mockUseTemplates.mockReturnValue(createMockUseTemplates({
        templates: mockTemplates,
      }));

      render(<TemplatesView />);

      expect(screen.getByText('Corporate Blue')).toBeInTheDocument();
      expect(screen.getByText('Default Style')).toBeInTheDocument();
    });

    it('shows template count in header', () => {
      mockUseTemplates.mockReturnValue(createMockUseTemplates({
        templates: mockTemplates,
      }));

      render(<TemplatesView />);
      expect(screen.getByText('Templates (2)')).toBeInTheDocument();
    });

    it('shows Default badge on default template', () => {
      mockUseTemplates.mockReturnValue(createMockUseTemplates({
        templates: mockTemplates,
      }));

      render(<TemplatesView />);
      expect(screen.getByText('Default')).toBeInTheDocument();
    });
  });

  describe('template selection', () => {
    it('selects template on click', () => {
      mockUseTemplates.mockReturnValue(createMockUseTemplates({
        templates: mockTemplates,
      }));

      render(<TemplatesView />);
      fireEvent.click(screen.getByText('Corporate Blue'));

      // Should show action buttons (Delete has emoji prefix)
      expect(screen.getByText('Apply Style')).toBeInTheDocument();
      expect(screen.getByText(/Delete/)).toBeInTheDocument();
    });

    it('shows Set as Default button for non-default templates', () => {
      mockUseTemplates.mockReturnValue(createMockUseTemplates({
        templates: mockTemplates,
      }));

      render(<TemplatesView />);
      fireEvent.click(screen.getByText('Corporate Blue'));

      // "Set as Default" has star prefix
      expect(screen.getByText(/Set as Default/)).toBeInTheDocument();
    });

    it('does not show Set as Default button for default template', () => {
      mockUseTemplates.mockReturnValue(createMockUseTemplates({
        templates: mockTemplates,
      }));

      render(<TemplatesView />);
      fireEvent.click(screen.getByText('Default Style'));

      // The "Set as Default" button should not be shown for the already-default template
      const buttons = screen.queryAllByRole('button');
      const setDefaultButton = buttons.find(btn => btn.textContent?.includes('Set as Default'));
      expect(setDefaultButton).toBeUndefined();
    });
  });

  describe('applying template', () => {
    it('applies template style and shows success toast', () => {
      mockUseTemplates.mockReturnValue(createMockUseTemplates({
        templates: mockTemplates,
      }));

      render(<TemplatesView />);
      fireEvent.click(screen.getByText('Corporate Blue'));
      fireEvent.click(screen.getByText('Apply Style'));

      expect(useQrStore.getState().dotStyle).toBe('rounded');
      expect(useQrStore.getState().foreground).toBe('#0066cc');
      expect(toast.success).toHaveBeenCalledWith('Applied "Corporate Blue" template');
    });

    it('shows error toast on invalid style JSON', () => {
      const badTemplate = {
        ...mockTemplates[0],
        styleJson: 'invalid json',
      };

      mockUseTemplates.mockReturnValue(createMockUseTemplates({
        templates: [badTemplate],
      }));

      render(<TemplatesView />);
      fireEvent.click(screen.getByText('Corporate Blue'));
      fireEvent.click(screen.getByText('Apply Style'));

      expect(toast.error).toHaveBeenCalledWith('Failed to apply template');
    });
  });

  describe('saving templates', () => {
    it('shows save template form when Save Current clicked', () => {
      mockUseTemplates.mockReturnValue(createMockUseTemplates({
        templates: mockTemplates,
      }));

      render(<TemplatesView />);
      fireEvent.click(screen.getByText('+ Save Current'));

      expect(screen.getByText('Save as Template')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Template name...')).toBeInTheDocument();
    });

    it('saves template and shows success toast', async () => {
      const saveTemplate = vi.fn().mockResolvedValue(3);

      mockUseTemplates.mockReturnValue(createMockUseTemplates({
        templates: mockTemplates,
        saveTemplate,
      }));

      render(<TemplatesView />);
      fireEvent.click(screen.getByText('+ Save Current'));

      const nameInput = screen.getByPlaceholderText('Template name...');
      fireEvent.change(nameInput, { target: { value: 'My New Template' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save Template' }));

      await waitFor(() => {
        expect(saveTemplate).toHaveBeenCalledWith(expect.objectContaining({
          name: 'My New Template',
        }));
        expect(toast.success).toHaveBeenCalledWith('Saved "My New Template" template');
      });
    });

    it('shows error toast when save fails', async () => {
      const saveTemplate = vi.fn().mockResolvedValue(null);

      mockUseTemplates.mockReturnValue(createMockUseTemplates({
        templates: mockTemplates,
        saveTemplate,
      }));

      render(<TemplatesView />);
      fireEvent.click(screen.getByText('+ Save Current'));

      const nameInput = screen.getByPlaceholderText('Template name...');
      fireEvent.change(nameInput, { target: { value: 'Failing Template' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save Template' }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to save template');
      });
    });

    it('disables save button when name is empty', () => {
      mockUseTemplates.mockReturnValue(createMockUseTemplates({
        templates: mockTemplates,
      }));

      render(<TemplatesView />);
      fireEvent.click(screen.getByText('+ Save Current'));

      const saveButton = screen.getByRole('button', { name: 'Save Template' });
      expect(saveButton).toBeDisabled();
    });

    it('cancels save template form', () => {
      mockUseTemplates.mockReturnValue(createMockUseTemplates({
        templates: mockTemplates,
      }));

      render(<TemplatesView />);
      fireEvent.click(screen.getByText('+ Save Current'));
      expect(screen.getByText('Save as Template')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByText('Save as Template')).not.toBeInTheDocument();
    });
  });

  describe('deleting templates', () => {
    it('deletes template after confirmation and shows success toast', async () => {
      const deleteTemplate = vi.fn().mockResolvedValue(true);
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      mockUseTemplates.mockReturnValue(createMockUseTemplates({
        templates: mockTemplates,
        deleteTemplate,
      }));

      render(<TemplatesView />);
      fireEvent.click(screen.getByText('Corporate Blue'));
      fireEvent.click(screen.getByText(/Delete/));

      await waitFor(() => {
        expect(deleteTemplate).toHaveBeenCalledWith(1);
        expect(toast.success).toHaveBeenCalledWith('Template deleted');
      });
    });

    it('does not delete if user cancels confirmation', async () => {
      const deleteTemplate = vi.fn();
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      mockUseTemplates.mockReturnValue(createMockUseTemplates({
        templates: mockTemplates,
        deleteTemplate,
      }));

      render(<TemplatesView />);
      fireEvent.click(screen.getByText('Corporate Blue'));
      fireEvent.click(screen.getByText(/Delete/));

      expect(deleteTemplate).not.toHaveBeenCalled();
    });

    it('shows error toast when delete fails', async () => {
      const deleteTemplate = vi.fn().mockResolvedValue(false);
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      mockUseTemplates.mockReturnValue(createMockUseTemplates({
        templates: mockTemplates,
        deleteTemplate,
      }));

      render(<TemplatesView />);
      fireEvent.click(screen.getByText('Corporate Blue'));
      fireEvent.click(screen.getByText(/Delete/));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to delete template');
      });
    });
  });

  describe('setting default template', () => {
    it('sets default and shows success toast', async () => {
      const setDefaultTemplate = vi.fn().mockResolvedValue(true);

      mockUseTemplates.mockReturnValue(createMockUseTemplates({
        templates: mockTemplates,
        setDefaultTemplate,
      }));

      render(<TemplatesView />);
      fireEvent.click(screen.getByText('Corporate Blue'));
      fireEvent.click(screen.getByText(/Set as Default/));

      await waitFor(() => {
        expect(setDefaultTemplate).toHaveBeenCalledWith(1);
        expect(toast.success).toHaveBeenCalledWith('Set as default template');
      });
    });

    it('shows error toast when setting default fails', async () => {
      const setDefaultTemplate = vi.fn().mockResolvedValue(false);

      mockUseTemplates.mockReturnValue(createMockUseTemplates({
        templates: mockTemplates,
        setDefaultTemplate,
      }));

      render(<TemplatesView />);
      fireEvent.click(screen.getByText('Corporate Blue'));
      fireEvent.click(screen.getByText(/Set as Default/));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to set default template');
      });
    });
  });

  describe('fetching templates on mount', () => {
    it('fetches templates on mount', () => {
      const fetchTemplates = vi.fn();

      mockUseTemplates.mockReturnValue(createMockUseTemplates({ fetchTemplates }));

      render(<TemplatesView />);
      expect(fetchTemplates).toHaveBeenCalled();
    });
  });
});

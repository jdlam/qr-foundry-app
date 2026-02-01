import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTemplates } from './useTemplates';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core');
const mockInvoke = vi.mocked(invoke);

const mockTemplates = [
  {
    id: 1,
    name: 'Classic',
    styleJson: '{"dotStyle":"square"}',
    preview: null,
    isDefault: true,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Modern',
    styleJson: '{"dotStyle":"rounded"}',
    preview: 'data:image/png;base64,abc',
    isDefault: false,
    createdAt: '2024-01-02T00:00:00Z',
  },
];

describe('useTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useTemplates());

    expect(result.current.templates).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  describe('fetchTemplates', () => {
    it('fetches all templates', async () => {
      mockInvoke.mockResolvedValueOnce(mockTemplates);

      const { result } = renderHook(() => useTemplates());

      await act(async () => {
        await result.current.fetchTemplates();
      });

      expect(mockInvoke).toHaveBeenCalledWith('template_list');
      expect(result.current.templates).toHaveLength(2);
      expect(result.current.templates[0].name).toBe('Classic');
    });

    it('handles fetch error gracefully', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Database error'));

      const { result } = renderHook(() => useTemplates());

      await act(async () => {
        await result.current.fetchTemplates();
      });

      expect(result.current.templates).toEqual([]);
    });

    it('sets isLoading during fetch', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockInvoke.mockReturnValueOnce(pendingPromise as Promise<unknown>);

      const { result } = renderHook(() => useTemplates());

      act(() => {
        result.current.fetchTemplates();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!([]);
        await pendingPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('getTemplate', () => {
    it('gets template by ID', async () => {
      mockInvoke.mockResolvedValueOnce(mockTemplates[0]);

      const { result } = renderHook(() => useTemplates());

      let template: unknown;
      await act(async () => {
        template = await result.current.getTemplate(1);
      });

      expect(mockInvoke).toHaveBeenCalledWith('template_get', { id: 1 });
      expect(template).toEqual(mockTemplates[0]);
    });

    it('returns null for non-existent template', async () => {
      mockInvoke.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useTemplates());

      let template: unknown = 'something';
      await act(async () => {
        template = await result.current.getTemplate(999);
      });

      expect(template).toBeNull();
    });

    it('returns null on error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Not found'));

      const { result } = renderHook(() => useTemplates());

      let template: unknown = 'something';
      await act(async () => {
        template = await result.current.getTemplate(1);
      });

      expect(template).toBeNull();
    });
  });

  describe('saveTemplate', () => {
    it('saves template and refreshes list', async () => {
      mockInvoke
        .mockResolvedValueOnce(3) // template_save returns new ID
        .mockResolvedValueOnce([...mockTemplates, { ...mockTemplates[0], id: 3, name: 'New' }]);

      const { result } = renderHook(() => useTemplates());

      let newId: number | null = null;
      await act(async () => {
        newId = await result.current.saveTemplate({
          name: 'New',
          styleJson: '{}',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('template_save', {
        template: { name: 'New', styleJson: '{}' },
      });
      expect(newId).toBe(3);
    });

    it('returns null on error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Save failed'));

      const { result } = renderHook(() => useTemplates());

      let newId: number | null = 1;
      await act(async () => {
        newId = await result.current.saveTemplate({
          name: 'Test',
          styleJson: '{}',
        });
      });

      expect(newId).toBeNull();
    });
  });

  describe('updateTemplate', () => {
    it('updates template and refreshes list', async () => {
      mockInvoke
        .mockResolvedValueOnce(true) // template_update
        .mockResolvedValueOnce(mockTemplates);

      const { result } = renderHook(() => useTemplates());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.updateTemplate(1, {
          name: 'Updated',
          styleJson: '{}',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('template_update', {
        id: 1,
        template: { name: 'Updated', styleJson: '{}' },
      });
      expect(success).toBe(true);
    });

    it('returns false on failed update', async () => {
      mockInvoke.mockResolvedValueOnce(false);

      const { result } = renderHook(() => useTemplates());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.updateTemplate(1, {
          name: 'Updated',
          styleJson: '{}',
        });
      });

      expect(success).toBe(false);
    });

    it('returns false on error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useTemplates());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.updateTemplate(1, {
          name: 'Updated',
          styleJson: '{}',
        });
      });

      expect(success).toBe(false);
    });
  });

  describe('deleteTemplate', () => {
    it('deletes template and updates local state', async () => {
      mockInvoke.mockResolvedValueOnce(mockTemplates);

      const { result } = renderHook(() => useTemplates());

      await act(async () => {
        await result.current.fetchTemplates();
      });

      mockInvoke.mockResolvedValueOnce(true);

      let success: boolean = false;
      await act(async () => {
        success = await result.current.deleteTemplate(1);
      });

      expect(mockInvoke).toHaveBeenCalledWith('template_delete', { id: 1 });
      expect(success).toBe(true);
      expect(result.current.templates).toHaveLength(1);
      expect(result.current.templates[0].id).toBe(2);
    });

    it('does not update state on failed delete', async () => {
      mockInvoke.mockResolvedValueOnce(mockTemplates);

      const { result } = renderHook(() => useTemplates());

      await act(async () => {
        await result.current.fetchTemplates();
      });

      mockInvoke.mockResolvedValueOnce(false);

      let success: boolean = true;
      await act(async () => {
        success = await result.current.deleteTemplate(1);
      });

      expect(success).toBe(false);
      expect(result.current.templates).toHaveLength(2);
    });

    it('returns false on error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useTemplates());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.deleteTemplate(1);
      });

      expect(success).toBe(false);
    });
  });

  describe('setDefaultTemplate', () => {
    it('sets default and updates local state', async () => {
      mockInvoke.mockResolvedValueOnce(mockTemplates);

      const { result } = renderHook(() => useTemplates());

      await act(async () => {
        await result.current.fetchTemplates();
      });

      mockInvoke.mockResolvedValueOnce(true);

      let success: boolean = false;
      await act(async () => {
        success = await result.current.setDefaultTemplate(2);
      });

      expect(mockInvoke).toHaveBeenCalledWith('template_set_default', { id: 2 });
      expect(success).toBe(true);
      expect(result.current.templates.find((t) => t.id === 1)?.isDefault).toBe(false);
      expect(result.current.templates.find((t) => t.id === 2)?.isDefault).toBe(true);
    });

    it('does not update state on failed set default', async () => {
      mockInvoke.mockResolvedValueOnce(mockTemplates);

      const { result } = renderHook(() => useTemplates());

      await act(async () => {
        await result.current.fetchTemplates();
      });

      mockInvoke.mockResolvedValueOnce(false);

      await act(async () => {
        await result.current.setDefaultTemplate(2);
      });

      // Template 1 should still be default
      expect(result.current.templates.find((t) => t.id === 1)?.isDefault).toBe(true);
    });

    it('returns false on error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Set default failed'));

      const { result } = renderHook(() => useTemplates());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.setDefaultTemplate(1);
      });

      expect(success).toBe(false);
    });
  });
});

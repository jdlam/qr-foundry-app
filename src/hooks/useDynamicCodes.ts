import { useCallback } from 'react';
import { toast } from 'sonner';
import { useDynamicCodesStore } from '../stores/dynamicCodesStore';
import { useAuthStore } from '../stores/authStore';
import { workerApi, WorkerApiError } from '../api/worker';
import type { CreateCodeRequest, UpdateCodeRequest, CodeStatus, DynamicQRRecord } from '../api/types';

function getToken(): string | null {
  return useAuthStore.getState().token;
}

export function useDynamicCodes() {
  const codes = useDynamicCodesStore((s) => s.codes);
  const selectedCode = useDynamicCodesStore((s) => s.selectedCode);
  const usage = useDynamicCodesStore((s) => s.usage);
  const statusFilter = useDynamicCodesStore((s) => s.statusFilter);
  const isLoadingCodes = useDynamicCodesStore((s) => s.isLoadingCodes);
  const isCreating = useDynamicCodesStore((s) => s.isCreating);
  const isUpdating = useDynamicCodesStore((s) => s.isUpdating);
  const isDeleting = useDynamicCodesStore((s) => s.isDeleting);

  const fetchCodes = useCallback(async (status?: CodeStatus) => {
    const token = getToken();
    if (!token) return;

    useDynamicCodesStore.setState({ isLoadingCodes: true });
    try {
      const codes = await workerApi.listCodes(token, status ?? undefined);
      useDynamicCodesStore.getState().setCodes(codes);
    } catch (err) {
      const message = err instanceof WorkerApiError ? err.message : 'Failed to load codes';
      toast.error(message);
    } finally {
      useDynamicCodesStore.setState({ isLoadingCodes: false });
    }
  }, []);

  const fetchUsage = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      const usage = await workerApi.getUsage(token);
      useDynamicCodesStore.getState().setUsage(usage);
    } catch (err) {
      const message = err instanceof WorkerApiError ? err.message : 'Failed to load usage';
      toast.error(message);
    }
  }, []);

  const createCode = useCallback(async (body: CreateCodeRequest): Promise<DynamicQRRecord | null> => {
    const token = getToken();
    if (!token) return null;

    useDynamicCodesStore.setState({ isCreating: true });
    let createdCode: DynamicQRRecord | null = null;
    try {
      const code = await workerApi.createCode(token, body);
      useDynamicCodesStore.getState().addCodeToList(code);
      useDynamicCodesStore.getState().setSelectedCode(code);
      toast.success(`Created: qrfo.link/${code.shortCode}`);
      createdCode = code;
    } catch (err) {
      const message = err instanceof WorkerApiError ? err.message : 'Failed to create code';
      toast.error(message);
    } finally {
      useDynamicCodesStore.setState({ isCreating: false });
    }
    if (createdCode) {
      fetchUsage().catch(() => {});
    }
    return createdCode;
  }, [fetchUsage]);

  const updateCode = useCallback(async (shortCode: string, body: UpdateCodeRequest): Promise<boolean> => {
    const token = getToken();
    if (!token) return false;

    useDynamicCodesStore.setState({ isUpdating: true });
    let success = false;
    try {
      const updated = await workerApi.updateCode(token, shortCode, body);
      useDynamicCodesStore.getState().updateCodeInList(shortCode, updated);
      toast.success('Code updated');
      success = true;
    } catch (err) {
      const message = err instanceof WorkerApiError ? err.message : 'Failed to update code';
      toast.error(message);
    } finally {
      useDynamicCodesStore.setState({ isUpdating: false });
    }
    if (success && body.status) {
      fetchUsage().catch(() => {});
    }
    return success;
  }, [fetchUsage]);

  const deleteCode = useCallback(async (shortCode: string): Promise<boolean> => {
    const token = getToken();
    if (!token) return false;

    useDynamicCodesStore.setState({ isDeleting: true });
    let deleted = false;
    try {
      await workerApi.deleteCode(token, shortCode);
      useDynamicCodesStore.getState().removeCodeFromList(shortCode);
      toast.success('Code deleted');
      deleted = true;
    } catch (err) {
      const message = err instanceof WorkerApiError ? err.message : 'Failed to delete code';
      toast.error(message);
    } finally {
      useDynamicCodesStore.setState({ isDeleting: false });
    }
    if (deleted) {
      fetchUsage().catch(() => {});
    }
    return deleted;
  }, [fetchUsage]);

  const selectCode = useCallback((code: DynamicQRRecord | null) => {
    useDynamicCodesStore.getState().setSelectedCode(code);
  }, []);

  const setStatusFilter = useCallback((status: CodeStatus | null) => {
    useDynamicCodesStore.getState().setStatusFilter(status);
  }, []);

  return {
    codes,
    selectedCode,
    usage,
    statusFilter,
    isLoadingCodes,
    isCreating,
    isUpdating,
    isDeleting,
    fetchCodes,
    fetchUsage,
    createCode,
    updateCode,
    deleteCode,
    selectCode,
    setStatusFilter,
  };
}

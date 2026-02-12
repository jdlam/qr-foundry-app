import { describe, it, expect, beforeEach } from 'vitest';
import { useDynamicCodesStore } from './dynamicCodesStore';
import type { DynamicQRRecord, UsageResponse } from '../api/types';

const makeCode = (shortCode: string, overrides?: Partial<DynamicQRRecord>): DynamicQRRecord => ({
  shortCode,
  destinationUrl: `https://${shortCode}.com`,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  status: 'active',
  ownerId: 'u1',
  ...overrides,
});

describe('dynamicCodesStore', () => {
  beforeEach(() => {
    useDynamicCodesStore.getState().reset();
  });

  describe('initial state', () => {
    it('has correct defaults', () => {
      const state = useDynamicCodesStore.getState();
      expect(state.codes).toEqual([]);
      expect(state.selectedCode).toBeNull();
      expect(state.usage).toBeNull();
      expect(state.statusFilter).toBeNull();
      expect(state.isLoadingCodes).toBe(false);
      expect(state.isCreating).toBe(false);
      expect(state.isUpdating).toBe(false);
      expect(state.isDeleting).toBe(false);
    });
  });

  describe('setCodes', () => {
    it('sets the codes list', () => {
      const codes = [makeCode('abc'), makeCode('xyz')];
      useDynamicCodesStore.getState().setCodes(codes);
      expect(useDynamicCodesStore.getState().codes).toEqual(codes);
    });
  });

  describe('setSelectedCode', () => {
    it('sets selected code', () => {
      const code = makeCode('abc');
      useDynamicCodesStore.getState().setSelectedCode(code);
      expect(useDynamicCodesStore.getState().selectedCode).toEqual(code);
    });

    it('clears selected code', () => {
      useDynamicCodesStore.getState().setSelectedCode(makeCode('abc'));
      useDynamicCodesStore.getState().setSelectedCode(null);
      expect(useDynamicCodesStore.getState().selectedCode).toBeNull();
    });
  });

  describe('setUsage', () => {
    it('sets usage data', () => {
      const usage: UsageResponse = { ownerId: 'u1', limit: 25, total: 5, active: 3, paused: 1, expired: 1, remaining: 20 };
      useDynamicCodesStore.getState().setUsage(usage);
      expect(useDynamicCodesStore.getState().usage).toEqual(usage);
    });
  });

  describe('setStatusFilter', () => {
    it('sets status filter', () => {
      useDynamicCodesStore.getState().setStatusFilter('paused');
      expect(useDynamicCodesStore.getState().statusFilter).toBe('paused');
    });

    it('clears status filter', () => {
      useDynamicCodesStore.getState().setStatusFilter('active');
      useDynamicCodesStore.getState().setStatusFilter(null);
      expect(useDynamicCodesStore.getState().statusFilter).toBeNull();
    });
  });

  describe('addCodeToList', () => {
    it('prepends code to list', () => {
      const existing = makeCode('old');
      useDynamicCodesStore.getState().setCodes([existing]);
      const newCode = makeCode('new');
      useDynamicCodesStore.getState().addCodeToList(newCode);
      const codes = useDynamicCodesStore.getState().codes;
      expect(codes).toHaveLength(2);
      expect(codes[0].shortCode).toBe('new');
      expect(codes[1].shortCode).toBe('old');
    });
  });

  describe('updateCodeInList', () => {
    it('updates code in list', () => {
      useDynamicCodesStore.getState().setCodes([makeCode('abc'), makeCode('xyz')]);
      const updated = makeCode('abc', { destinationUrl: 'https://updated.com' });
      useDynamicCodesStore.getState().updateCodeInList('abc', updated);
      expect(useDynamicCodesStore.getState().codes[0].destinationUrl).toBe('https://updated.com');
    });

    it('updates selectedCode if it matches', () => {
      const code = makeCode('abc');
      useDynamicCodesStore.getState().setCodes([code]);
      useDynamicCodesStore.getState().setSelectedCode(code);
      const updated = makeCode('abc', { status: 'paused' });
      useDynamicCodesStore.getState().updateCodeInList('abc', updated);
      expect(useDynamicCodesStore.getState().selectedCode?.status).toBe('paused');
    });

    it('does not change selectedCode if different code updated', () => {
      useDynamicCodesStore.getState().setCodes([makeCode('abc'), makeCode('xyz')]);
      useDynamicCodesStore.getState().setSelectedCode(makeCode('abc'));
      useDynamicCodesStore.getState().updateCodeInList('xyz', makeCode('xyz', { status: 'paused' }));
      expect(useDynamicCodesStore.getState().selectedCode?.shortCode).toBe('abc');
    });
  });

  describe('removeCodeFromList', () => {
    it('removes code from list', () => {
      useDynamicCodesStore.getState().setCodes([makeCode('abc'), makeCode('xyz')]);
      useDynamicCodesStore.getState().removeCodeFromList('abc');
      expect(useDynamicCodesStore.getState().codes).toHaveLength(1);
      expect(useDynamicCodesStore.getState().codes[0].shortCode).toBe('xyz');
    });

    it('clears selectedCode if removed code was selected', () => {
      const code = makeCode('abc');
      useDynamicCodesStore.getState().setCodes([code]);
      useDynamicCodesStore.getState().setSelectedCode(code);
      useDynamicCodesStore.getState().removeCodeFromList('abc');
      expect(useDynamicCodesStore.getState().selectedCode).toBeNull();
    });

    it('keeps selectedCode if different code removed', () => {
      useDynamicCodesStore.getState().setCodes([makeCode('abc'), makeCode('xyz')]);
      useDynamicCodesStore.getState().setSelectedCode(makeCode('abc'));
      useDynamicCodesStore.getState().removeCodeFromList('xyz');
      expect(useDynamicCodesStore.getState().selectedCode?.shortCode).toBe('abc');
    });
  });

  describe('reset', () => {
    it('resets all state', () => {
      useDynamicCodesStore.setState({
        codes: [makeCode('abc')],
        selectedCode: makeCode('abc'),
        usage: { ownerId: 'u1', limit: 25, total: 5, active: 3, paused: 1, expired: 1, remaining: 20 },
        statusFilter: 'active',
        isLoadingCodes: true,
        isCreating: true,
        isUpdating: true,
        isDeleting: true,
      });
      useDynamicCodesStore.getState().reset();
      const state = useDynamicCodesStore.getState();
      expect(state.codes).toEqual([]);
      expect(state.selectedCode).toBeNull();
      expect(state.usage).toBeNull();
      expect(state.statusFilter).toBeNull();
      expect(state.isLoadingCodes).toBe(false);
      expect(state.isCreating).toBe(false);
    });
  });
});

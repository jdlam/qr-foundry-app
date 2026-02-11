import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import type { TabId } from './Sidebar';
import { useAuthModalStore } from '../../stores/authModalStore';

// Mock useAuth hook
const mockLogout = vi.fn();
let mockAuthState: Record<string, unknown> = {
  user: null,
  plan: null,
  isLoggedIn: false,
  isLoading: false,
  isAuthenticating: false,
  login: vi.fn(),
  signup: vi.fn(),
  logout: mockLogout,
};

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockAuthState,
}));

describe('Sidebar', () => {
  const defaultProps = {
    activeTab: 'generator' as TabId,
    onTabChange: vi.fn(),
  };

  beforeEach(() => {
    mockAuthState = {
      user: null,
      plan: null,
      isLoggedIn: false,
      isLoading: false,
      isAuthenticating: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: mockLogout,
    };
    mockLogout.mockReset();
    useAuthModalStore.getState().close();
  });

  describe('Navigation items', () => {
    it('renders all nav items with labels when expanded', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('Generator')).toBeInTheDocument();
      expect(screen.getByText('Batch')).toBeInTheDocument();
      expect(screen.getByText('Scanner')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
      expect(screen.getByText('Templates')).toBeInTheDocument();
      expect(screen.getByText('Dynamic Codes')).toBeInTheDocument();
    });

    it('shows SOON badge on Dynamic Codes', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('SOON')).toBeInTheDocument();
    });

    it('does not show PRO badges (all features are free)', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.queryByText('PRO')).not.toBeInTheDocument();
    });

    it('calls onTabChange when any nav item is clicked', () => {
      const onTabChange = vi.fn();
      render(<Sidebar {...defaultProps} onTabChange={onTabChange} />);

      fireEvent.click(screen.getByText('Scanner'));
      expect(onTabChange).toHaveBeenCalledWith('scanner');

      fireEvent.click(screen.getByText('History'));
      expect(onTabChange).toHaveBeenCalledWith('history');

      fireEvent.click(screen.getByText('Batch'));
      expect(onTabChange).toHaveBeenCalledWith('batch');

      fireEvent.click(screen.getByText('Templates'));
      expect(onTabChange).toHaveBeenCalledWith('templates');
    });

    it('highlights the active tab', () => {
      render(<Sidebar {...defaultProps} activeTab="scanner" />);

      const scannerButton = screen.getByText('Scanner').closest('button');
      expect(scannerButton).toHaveStyle({ color: 'var(--accent)' });
    });
  });

  describe('Bottom section — logged out', () => {
    it('shows Sign In text when expanded', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('Sign In')).toBeInTheDocument();
      expect(screen.getByText('Free tier')).toBeInTheDocument();
    });

    it('shows Sign In tooltip when collapsed', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Collapse sidebar'));

      expect(screen.getByTitle('Sign In')).toBeInTheDocument();
    });

    it('opens auth modal when sign-in area is clicked (expanded)', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('Sign In'));

      expect(useAuthModalStore.getState().isOpen).toBe(true);
    });

    it('opens auth modal when sign-in icon is clicked (collapsed)', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Collapse sidebar'));
      fireEvent.click(screen.getByTitle('Sign In'));

      expect(useAuthModalStore.getState().isOpen).toBe(true);
    });
  });

  describe('Bottom section — logged in', () => {
    beforeEach(() => {
      mockAuthState = {
        user: { id: '1', email: 'test@example.com', createdAt: '2025-01-01' },
        plan: { tier: 'subscription', features: [], maxCodes: 25 },
        isLoggedIn: true,
        isLoading: false,
        isAuthenticating: false,
        login: vi.fn(),
        signup: vi.fn(),
        logout: mockLogout,
      };
    });

    it('shows user email and plan tier when expanded', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('Subscription')).toBeInTheDocument();
    });

    it('shows Free tier for free plan', () => {
      mockAuthState = {
        ...mockAuthState,
        plan: { tier: 'free', features: [], maxCodes: 0 },
      };
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('Free tier')).toBeInTheDocument();
    });

    it('shows sign out button when expanded', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('calls logout when sign out is clicked', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByText('Sign Out'));
      expect(mockLogout).toHaveBeenCalled();
    });

    it('shows user initial avatar when collapsed', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Collapse sidebar'));

      // Should show the user initial
      expect(screen.getByText('t')).toBeInTheDocument();
    });
  });

  describe('Collapsible behavior', () => {
    it('starts expanded with labels visible', () => {
      render(<Sidebar {...defaultProps} />);

      expect(screen.getByText('Generator')).toBeInTheDocument();
      expect(screen.getByText('Free tier')).toBeInTheDocument();
    });

    it('collapses when collapse button is clicked', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Collapse sidebar'));

      // Labels should be hidden
      expect(screen.queryByText('Generator')).not.toBeInTheDocument();
      expect(screen.queryByText('Batch')).not.toBeInTheDocument();
      expect(screen.queryByText('Scanner')).not.toBeInTheDocument();
      expect(screen.queryByText('Free tier')).not.toBeInTheDocument();
    });

    it('hides badges when collapsed', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Collapse sidebar'));

      expect(screen.queryByText('SOON')).not.toBeInTheDocument();
    });

    it('shows tooltips on nav items when collapsed', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Collapse sidebar'));

      expect(screen.getByTitle('Generator')).toBeInTheDocument();
      expect(screen.getByTitle('Batch')).toBeInTheDocument();
      expect(screen.getByTitle('Scanner')).toBeInTheDocument();
      expect(screen.getByTitle('History')).toBeInTheDocument();
      expect(screen.getByTitle('Templates')).toBeInTheDocument();
      expect(screen.getByTitle('Dynamic Codes')).toBeInTheDocument();
    });

    it('expands when expand button is clicked', () => {
      render(<Sidebar {...defaultProps} />);

      fireEvent.click(screen.getByTitle('Collapse sidebar'));
      expect(screen.queryByText('Generator')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTitle('Expand sidebar'));
      expect(screen.getByText('Generator')).toBeInTheDocument();
      expect(screen.getByText('Free tier')).toBeInTheDocument();
    });

    it('still triggers onTabChange when collapsed', () => {
      const onTabChange = vi.fn();
      render(<Sidebar {...defaultProps} onTabChange={onTabChange} />);

      fireEvent.click(screen.getByTitle('Collapse sidebar'));

      fireEvent.click(screen.getByTitle('Scanner'));
      expect(onTabChange).toHaveBeenCalledWith('scanner');
    });
  });
});

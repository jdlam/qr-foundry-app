import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StylePanel } from './StylePanel';
import { useQrStore } from '../../stores/qrStore';

describe('StylePanel', () => {
  beforeEach(() => {
    useQrStore.getState().reset();
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
      expect(screen.getByText('PNG, JPG, SVG')).toBeInTheDocument();
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
});

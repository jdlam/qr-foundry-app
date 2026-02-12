import { describe, it, expect, beforeEach } from 'vitest';
import { useQrStore } from './qrStore';

describe('qrStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useQrStore.getState().reset();
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useQrStore.getState();

      expect(state.content).toBe('');
      expect(state.inputType).toBe('url');
      expect(state.dotStyle).toBe('rounded');
      expect(state.cornerSquareStyle).toBe('extra-rounded');
      expect(state.cornerDotStyle).toBe('dot');
      expect(state.foreground).toBe('#1a1a2e');
      expect(state.background).toBe('#ffffff');
      expect(state.transparentBg).toBe(false);
      expect(state.useGradient).toBe(false);
      expect(state.logo).toBeNull();
      expect(state.errorCorrection).toBe('M');
      expect(state.exportSize).toBe(1024);
      expect(state.validationState).toBe('idle');
    });

    it('has default wifi config', () => {
      const { wifiConfig } = useQrStore.getState();
      expect(wifiConfig.ssid).toBe('');
      expect(wifiConfig.password).toBe('');
      expect(wifiConfig.encryption).toBe('WPA');
      expect(wifiConfig.hidden).toBe(false);
    });

    it('has default vcard config', () => {
      const { vcardConfig } = useQrStore.getState();
      expect(vcardConfig.firstName).toBe('');
      expect(vcardConfig.lastName).toBe('');
      expect(vcardConfig.organization).toBe('');
    });
  });

  describe('setContent', () => {
    it('updates content', () => {
      useQrStore.getState().setContent('https://example.com');
      expect(useQrStore.getState().content).toBe('https://example.com');
    });

    it('resets validation state to idle', () => {
      useQrStore.setState({ validationState: 'pass' });
      useQrStore.getState().setContent('new content');
      expect(useQrStore.getState().validationState).toBe('idle');
    });
  });

  describe('setInputType', () => {
    it('updates input type', () => {
      useQrStore.getState().setInputType('wifi');
      expect(useQrStore.getState().inputType).toBe('wifi');
    });

    it('clears content when changing type', () => {
      useQrStore.getState().setContent('https://example.com');
      useQrStore.getState().setInputType('wifi');
      expect(useQrStore.getState().content).toBe('');
    });

    it('resets validation state', () => {
      useQrStore.setState({ validationState: 'pass' });
      useQrStore.getState().setInputType('text');
      expect(useQrStore.getState().validationState).toBe('idle');
    });
  });

  describe('setWifiConfig', () => {
    it('updates wifi config partially', () => {
      useQrStore.getState().setWifiConfig({ ssid: 'MyNetwork' });
      const { wifiConfig } = useQrStore.getState();
      expect(wifiConfig.ssid).toBe('MyNetwork');
      expect(wifiConfig.encryption).toBe('WPA'); // unchanged
    });

    it('updates multiple wifi fields', () => {
      useQrStore.getState().setWifiConfig({
        ssid: 'Network',
        password: 'secret',
        encryption: 'WEP',
      });
      const { wifiConfig } = useQrStore.getState();
      expect(wifiConfig.ssid).toBe('Network');
      expect(wifiConfig.password).toBe('secret');
      expect(wifiConfig.encryption).toBe('WEP');
    });
  });

  describe('setVcardConfig', () => {
    it('updates vcard config partially', () => {
      useQrStore.getState().setVcardConfig({ firstName: 'John' });
      expect(useQrStore.getState().vcardConfig.firstName).toBe('John');
    });

    it('preserves other vcard fields', () => {
      useQrStore.getState().setVcardConfig({ firstName: 'John', lastName: 'Doe' });
      useQrStore.getState().setVcardConfig({ organization: 'Acme' });
      const { vcardConfig } = useQrStore.getState();
      expect(vcardConfig.firstName).toBe('John');
      expect(vcardConfig.lastName).toBe('Doe');
      expect(vcardConfig.organization).toBe('Acme');
    });
  });

  describe('style setters', () => {
    it('setDotStyle updates dot style', () => {
      useQrStore.getState().setDotStyle('dots');
      expect(useQrStore.getState().dotStyle).toBe('dots');
    });

    it('setCornerSquareStyle updates corner square style', () => {
      useQrStore.getState().setCornerSquareStyle('square');
      expect(useQrStore.getState().cornerSquareStyle).toBe('square');
    });

    it('setCornerDotStyle updates corner dot style', () => {
      useQrStore.getState().setCornerDotStyle('square');
      expect(useQrStore.getState().cornerDotStyle).toBe('square');
    });

    it('setForeground updates foreground color', () => {
      useQrStore.getState().setForeground('#ff0000');
      expect(useQrStore.getState().foreground).toBe('#ff0000');
    });

    it('setBackground updates background color', () => {
      useQrStore.getState().setBackground('#000000');
      expect(useQrStore.getState().background).toBe('#000000');
    });

    it('setTransparentBg updates transparent background', () => {
      useQrStore.getState().setTransparentBg(true);
      expect(useQrStore.getState().transparentBg).toBe(true);
    });

    it('style changes reset validation state', () => {
      useQrStore.setState({ validationState: 'pass' });
      useQrStore.getState().setDotStyle('square');
      expect(useQrStore.getState().validationState).toBe('idle');
    });
  });

  describe('gradient', () => {
    it('setUseGradient toggles gradient', () => {
      useQrStore.getState().setUseGradient(true);
      expect(useQrStore.getState().useGradient).toBe(true);
    });

    it('setGradient updates gradient config', () => {
      useQrStore.getState().setGradient({ rotation: 45 });
      expect(useQrStore.getState().gradient.rotation).toBe(45);
    });

    it('setGradient preserves other gradient fields', () => {
      useQrStore.getState().setGradient({ rotation: 90 });
      expect(useQrStore.getState().gradient.type).toBe('linear');
      expect(useQrStore.getState().gradient.colorStops).toHaveLength(2);
    });
  });

  describe('logo', () => {
    it('setLogo sets logo config', () => {
      const logo = {
        src: 'data:image/png;base64,abc',
        size: 0.2,
        margin: 5,
        shape: 'square' as const,
      };
      useQrStore.getState().setLogo(logo);
      expect(useQrStore.getState().logo).toEqual(logo);
    });

    it('setLogo can clear logo', () => {
      useQrStore.getState().setLogo({ src: 'test', size: 0.2, margin: 5, shape: 'square' as const });
      useQrStore.getState().setLogo(null);
      expect(useQrStore.getState().logo).toBeNull();
    });
  });

  describe('error correction', () => {
    it('setErrorCorrection updates level', () => {
      useQrStore.getState().setErrorCorrection('H');
      expect(useQrStore.getState().errorCorrection).toBe('H');
    });

    it('error correction change resets validation', () => {
      useQrStore.setState({ validationState: 'pass' });
      useQrStore.getState().setErrorCorrection('L');
      expect(useQrStore.getState().validationState).toBe('idle');
    });
  });

  describe('export size', () => {
    it('setExportSize updates size', () => {
      useQrStore.getState().setExportSize(2048);
      expect(useQrStore.getState().exportSize).toBe(2048);
    });

    it('setExportSize does not reset validation', () => {
      useQrStore.setState({ validationState: 'pass' });
      useQrStore.getState().setExportSize(4096);
      expect(useQrStore.getState().validationState).toBe('pass');
    });
  });

  describe('validation', () => {
    it('setValidationState updates state', () => {
      useQrStore.getState().setValidationState('validating');
      expect(useQrStore.getState().validationState).toBe('validating');
    });

    it('resetValidation sets state to idle', () => {
      useQrStore.setState({ validationState: 'fail' });
      useQrStore.getState().resetValidation();
      expect(useQrStore.getState().validationState).toBe('idle');
    });
  });

  describe('getStyle', () => {
    it('returns current style object', () => {
      useQrStore.getState().setDotStyle('square');
      useQrStore.getState().setForeground('#ff0000');

      const style = useQrStore.getState().getStyle();
      expect(style.dotStyle).toBe('square');
      expect(style.foreground).toBe('#ff0000');
    });

    it('excludes gradient when not enabled', () => {
      useQrStore.getState().setUseGradient(false);
      const style = useQrStore.getState().getStyle();
      expect(style.gradient).toBeUndefined();
    });

    it('includes gradient when enabled', () => {
      useQrStore.getState().setUseGradient(true);
      const style = useQrStore.getState().getStyle();
      expect(style.gradient).toBeDefined();
      expect(style.gradient?.type).toBe('linear');
    });

    it('excludes logo when null', () => {
      const style = useQrStore.getState().getStyle();
      expect(style.logo).toBeUndefined();
    });

    it('includes logo when set', () => {
      useQrStore.getState().setLogo({ src: 'test', size: 0.2, margin: 5, shape: 'square' as const });
      const style = useQrStore.getState().getStyle();
      expect(style.logo).toBeDefined();
    });
  });

  describe('dynamic code fields', () => {
    it('has correct default dynamic values', () => {
      const state = useQrStore.getState();
      expect(state.isDynamic).toBe(false);
      expect(state.dynamicShortCode).toBeNull();
      expect(state.dynamicLabel).toBe('');
    });

    it('setIsDynamic toggles dynamic mode', () => {
      useQrStore.getState().setIsDynamic(true);
      expect(useQrStore.getState().isDynamic).toBe(true);
    });

    it('setIsDynamic(false) clears dynamicShortCode', () => {
      useQrStore.getState().setDynamicShortCode('abc123');
      useQrStore.getState().setIsDynamic(false);
      expect(useQrStore.getState().dynamicShortCode).toBeNull();
    });

    it('setIsDynamic(true) preserves existing dynamicShortCode', () => {
      useQrStore.getState().setDynamicShortCode('abc123');
      useQrStore.getState().setIsDynamic(true);
      expect(useQrStore.getState().dynamicShortCode).toBe('abc123');
    });

    it('setDynamicShortCode sets short code', () => {
      useQrStore.getState().setDynamicShortCode('abc123');
      expect(useQrStore.getState().dynamicShortCode).toBe('abc123');
    });

    it('setDynamicLabel sets label', () => {
      useQrStore.getState().setDynamicLabel('My Link');
      expect(useQrStore.getState().dynamicLabel).toBe('My Link');
    });

    it('setContent resets dynamicShortCode', () => {
      useQrStore.getState().setDynamicShortCode('abc123');
      useQrStore.getState().setContent('https://new.com');
      expect(useQrStore.getState().dynamicShortCode).toBeNull();
    });

    it('setInputType resets isDynamic, dynamicShortCode, and dynamicLabel', () => {
      useQrStore.getState().setIsDynamic(true);
      useQrStore.getState().setDynamicShortCode('abc123');
      useQrStore.getState().setDynamicLabel('My Link');
      useQrStore.getState().setInputType('wifi');
      expect(useQrStore.getState().isDynamic).toBe(false);
      expect(useQrStore.getState().dynamicShortCode).toBeNull();
      expect(useQrStore.getState().dynamicLabel).toBe('');
    });
  });

  describe('reset', () => {
    it('resets all state to defaults', () => {
      // Change various state values
      useQrStore.getState().setContent('test');
      useQrStore.getState().setInputType('wifi');
      useQrStore.getState().setDotStyle('square');
      useQrStore.getState().setForeground('#ff0000');
      useQrStore.getState().setUseGradient(true);
      useQrStore.getState().setLogo({ src: 'test', size: 0.2, margin: 5, shape: 'square' as const });
      useQrStore.setState({ validationState: 'pass' });
      useQrStore.getState().setIsDynamic(true);
      useQrStore.getState().setDynamicShortCode('abc');
      useQrStore.getState().setDynamicLabel('label');

      // Reset
      useQrStore.getState().reset();

      // Verify defaults
      const state = useQrStore.getState();
      expect(state.content).toBe('');
      expect(state.inputType).toBe('url');
      expect(state.dotStyle).toBe('rounded');
      expect(state.foreground).toBe('#1a1a2e');
      expect(state.useGradient).toBe(false);
      expect(state.logo).toBeNull();
      expect(state.validationState).toBe('idle');
      expect(state.isDynamic).toBe(false);
      expect(state.dynamicShortCode).toBeNull();
      expect(state.dynamicLabel).toBe('');
    });
  });
});

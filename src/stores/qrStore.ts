import { create } from 'zustand';
import type {
  QrType,
  QrStyle,
  DotStyle,
  CornerSquareStyle,
  CornerDotStyle,
  ErrorCorrection,
  LogoConfig,
  GradientConfig,
  ValidationState,
  WifiConfig,
  VCardConfig,
  EmailConfig,
  SmsConfig,
  GeoConfig,
} from '../types/qr';

interface QrState {
  // Content
  content: string;
  inputType: QrType;

  // Type-specific inputs
  wifiConfig: WifiConfig;
  vcardConfig: VCardConfig;
  emailConfig: EmailConfig;
  smsConfig: SmsConfig;
  geoConfig: GeoConfig;

  // Style
  dotStyle: DotStyle;
  cornerSquareStyle: CornerSquareStyle;
  cornerDotStyle: CornerDotStyle;
  foreground: string;
  background: string;
  transparentBg: boolean;

  // Gradient
  useGradient: boolean;
  gradient: GradientConfig;

  // Logo
  logo: LogoConfig | null;

  // Settings
  errorCorrection: ErrorCorrection;
  exportSize: number;

  // Validation
  validationState: ValidationState;

  // Dynamic code
  isDynamic: boolean;
  dynamicShortCode: string | null;
  dynamicLabel: string;

  // Actions
  setContent: (content: string) => void;
  setInputType: (type: QrType) => void;
  setWifiConfig: (config: Partial<WifiConfig>) => void;
  setVcardConfig: (config: Partial<VCardConfig>) => void;
  setEmailConfig: (config: Partial<EmailConfig>) => void;
  setSmsConfig: (config: Partial<SmsConfig>) => void;
  setGeoConfig: (config: Partial<GeoConfig>) => void;
  setDotStyle: (style: DotStyle) => void;
  setCornerSquareStyle: (style: CornerSquareStyle) => void;
  setCornerDotStyle: (style: CornerDotStyle) => void;
  setForeground: (color: string) => void;
  setBackground: (color: string) => void;
  setTransparentBg: (value: boolean) => void;
  setUseGradient: (value: boolean) => void;
  setGradient: (gradient: Partial<GradientConfig>) => void;
  setLogo: (logo: LogoConfig | null) => void;
  setErrorCorrection: (level: ErrorCorrection) => void;
  setExportSize: (size: number) => void;
  setValidationState: (state: ValidationState) => void;
  resetValidation: () => void;
  setIsDynamic: (value: boolean) => void;
  setDynamicShortCode: (code: string | null) => void;
  setDynamicLabel: (label: string) => void;
  getStyle: () => QrStyle;
  reset: () => void;
}

const defaultWifiConfig: WifiConfig = {
  ssid: '',
  password: '',
  encryption: 'WPA',
  hidden: false,
};

const defaultVcardConfig: VCardConfig = {
  firstName: '',
  lastName: '',
  organization: '',
  title: '',
  email: '',
  phone: '',
  url: '',
};

const defaultEmailConfig: EmailConfig = {
  to: '',
  subject: '',
  body: '',
};

const defaultSmsConfig: SmsConfig = {
  phone: '',
  message: '',
};

const defaultGeoConfig: GeoConfig = {
  latitude: '',
  longitude: '',
};

const defaultGradient: GradientConfig = {
  type: 'linear',
  rotation: 0,
  colorStops: [
    { offset: 0, color: '#1a1a2e' },
    { offset: 1, color: '#e94560' },
  ],
};

export const useQrStore = create<QrState>((set, get) => ({
  // Content
  content: '',
  inputType: 'url',

  // Type-specific inputs
  wifiConfig: defaultWifiConfig,
  vcardConfig: defaultVcardConfig,
  emailConfig: defaultEmailConfig,
  smsConfig: defaultSmsConfig,
  geoConfig: defaultGeoConfig,

  // Style
  dotStyle: 'rounded',
  cornerSquareStyle: 'extra-rounded',
  cornerDotStyle: 'dot',
  foreground: '#1a1a2e',
  background: '#ffffff',
  transparentBg: false,

  // Gradient
  useGradient: false,
  gradient: defaultGradient,

  // Logo
  logo: null,

  // Settings
  errorCorrection: 'M',
  exportSize: 1024,

  // Validation
  validationState: 'idle',

  // Dynamic code
  isDynamic: false,
  dynamicShortCode: null,
  dynamicLabel: '',

  // Actions
  setContent: (content) => set({ content, validationState: 'idle', dynamicShortCode: null }),

  setInputType: (inputType) => set({ inputType, content: '', validationState: 'idle', isDynamic: false, dynamicShortCode: null, dynamicLabel: '' }),

  setWifiConfig: (config) => set((state) => ({
    wifiConfig: { ...state.wifiConfig, ...config },
    validationState: 'idle',
  })),

  setVcardConfig: (config) => set((state) => ({
    vcardConfig: { ...state.vcardConfig, ...config },
    validationState: 'idle',
  })),

  setEmailConfig: (config) => set((state) => ({
    emailConfig: { ...state.emailConfig, ...config },
    validationState: 'idle',
  })),

  setSmsConfig: (config) => set((state) => ({
    smsConfig: { ...state.smsConfig, ...config },
    validationState: 'idle',
  })),

  setGeoConfig: (config) => set((state) => ({
    geoConfig: { ...state.geoConfig, ...config },
    validationState: 'idle',
  })),

  setDotStyle: (dotStyle) => set({ dotStyle, validationState: 'idle' }),

  setCornerSquareStyle: (cornerSquareStyle) => set({ cornerSquareStyle, validationState: 'idle' }),

  setCornerDotStyle: (cornerDotStyle) => set({ cornerDotStyle, validationState: 'idle' }),

  setForeground: (foreground) => set({ foreground, validationState: 'idle' }),

  setBackground: (background) => set({ background, validationState: 'idle' }),

  setTransparentBg: (transparentBg) => set({ transparentBg, validationState: 'idle' }),

  setUseGradient: (useGradient) => set({ useGradient, validationState: 'idle' }),

  setGradient: (gradient) => set((state) => ({
    gradient: { ...state.gradient, ...gradient },
    validationState: 'idle',
  })),

  setLogo: (logo) => set({ logo, validationState: 'idle' }),

  setErrorCorrection: (errorCorrection) => set({ errorCorrection, validationState: 'idle' }),

  setExportSize: (exportSize) => set({ exportSize }),

  setValidationState: (validationState) => set({ validationState }),

  resetValidation: () => set({ validationState: 'idle' }),

  setIsDynamic: (isDynamic) => set({ isDynamic, dynamicShortCode: isDynamic ? get().dynamicShortCode : null }),

  setDynamicShortCode: (dynamicShortCode) => set({ dynamicShortCode }),

  setDynamicLabel: (dynamicLabel) => set({ dynamicLabel }),

  getStyle: () => {
    const state = get();
    return {
      dotStyle: state.dotStyle,
      cornerSquareStyle: state.cornerSquareStyle,
      cornerDotStyle: state.cornerDotStyle,
      foreground: state.foreground,
      background: state.background,
      gradient: state.useGradient ? state.gradient : undefined,
      logo: state.logo || undefined,
      transparentBg: state.transparentBg,
    };
  },

  reset: () => set({
    content: '',
    inputType: 'url',
    wifiConfig: defaultWifiConfig,
    vcardConfig: defaultVcardConfig,
    emailConfig: defaultEmailConfig,
    smsConfig: defaultSmsConfig,
    geoConfig: defaultGeoConfig,
    dotStyle: 'rounded',
    cornerSquareStyle: 'extra-rounded',
    cornerDotStyle: 'dot',
    foreground: '#1a1a2e',
    background: '#ffffff',
    transparentBg: false,
    useGradient: false,
    gradient: defaultGradient,
    logo: null,
    errorCorrection: 'M',
    exportSize: 1024,
    validationState: 'idle',
    isDynamic: false,
    dynamicShortCode: null,
    dynamicLabel: '',
  }),
}));

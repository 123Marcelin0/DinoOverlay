export type ThemeMode = 'light' | 'dark' | 'auto';

export interface GlassmorphicColors {
  background: string;
  backdropBlur: string;
  border: string;
  shadow: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentHover: string;
  success: string;
  warning: string;
  error: string;
}

export interface ThemeConfig {
  mode: ThemeMode;
  glassmorphism: GlassmorphicColors;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    textSecondary: string;
    background: string;
    surface: string;
    border: string;
  };
  animations: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: {
      ease: string;
      easeIn: string;
      easeOut: string;
      easeInOut: string;
    };
  };
}

export interface ThemeDetectionResult {
  detectedTheme: 'light' | 'dark';
  confidence: number;
  method: 'prefers-color-scheme' | 'background-color' | 'computed-style' | 'fallback';
  details?: {
    backgroundColor?: string;
    textColor?: string;
    computedBrightness?: number;
  };
}

export interface ThemeManagerEvents {
  themeChanged: (theme: ThemeConfig, previousTheme: ThemeConfig) => void;
  modeChanged: (mode: ThemeMode, previousMode: ThemeMode) => void;
  detectionCompleted: (result: ThemeDetectionResult) => void;
}

// Light theme configuration
export const LIGHT_THEME: ThemeConfig = {
  mode: 'light',
  glassmorphism: {
    background: 'rgba(255, 255, 255, 0.25)',
    backdropBlur: 'blur(16px)',
    border: 'rgba(255, 255, 255, 0.3)',
    shadow: 'rgba(0, 0, 0, 0.1)',
    text: 'rgba(0, 0, 0, 0.87)',
    textSecondary: 'rgba(0, 0, 0, 0.6)',
    accent: 'rgba(59, 130, 246, 0.8)',
    accentHover: 'rgba(59, 130, 246, 0.9)',
    success: 'rgba(34, 197, 94, 0.8)',
    warning: 'rgba(251, 191, 36, 0.8)',
    error: 'rgba(239, 68, 68, 0.8)',
  },
  colors: {
    primary: '#3b82f6',
    secondary: '#6b7280',
    accent: '#8b5cf6',
    text: '#111827',
    textSecondary: '#6b7280',
    background: '#ffffff',
    surface: '#f9fafb',
    border: '#e5e7eb',
  },
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
};

// Dark theme configuration
export const DARK_THEME: ThemeConfig = {
  mode: 'dark',
  glassmorphism: {
    background: 'rgba(17, 24, 39, 0.25)',
    backdropBlur: 'blur(16px)',
    border: 'rgba(75, 85, 99, 0.3)',
    shadow: 'rgba(0, 0, 0, 0.3)',
    text: 'rgba(255, 255, 255, 0.87)',
    textSecondary: 'rgba(255, 255, 255, 0.6)',
    accent: 'rgba(96, 165, 250, 0.8)',
    accentHover: 'rgba(96, 165, 250, 0.9)',
    success: 'rgba(52, 211, 153, 0.8)',
    warning: 'rgba(251, 191, 36, 0.8)',
    error: 'rgba(248, 113, 113, 0.8)',
  },
  colors: {
    primary: '#60a5fa',
    secondary: '#9ca3af',
    accent: '#a78bfa',
    text: '#f9fafb',
    textSecondary: '#d1d5db',
    background: '#111827',
    surface: '#1f2937',
    border: '#374151',
  },
  animations: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
};

export const DEFAULT_THEME = LIGHT_THEME;
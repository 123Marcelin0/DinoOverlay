export interface DinoOverlayConfig {
  apiEndpoint?: string;
  apiKey?: string;
  theme?: 'light' | 'dark' | 'auto';
  enableAnalytics?: boolean;
  customActions?: CustomAction[];
  debug?: boolean;
}

export interface CustomAction {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
}

export interface LoaderError extends Error {
  code: string;
  details?: any;
}

export const DEFAULT_CONFIG: Required<Omit<DinoOverlayConfig, 'apiKey' | 'customActions'>> = {
  apiEndpoint: 'https://dino-overlay-hzdzk7o4h-marces-projects-3950c474.vercel.app/api/overlay',
  theme: 'auto',
  enableAnalytics: false,
  debug: false,
};
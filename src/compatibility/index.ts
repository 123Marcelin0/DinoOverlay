// Framework Compatibility Layer Entry Point
export { WordPressCompatibility } from './wordpress/WordPressCompatibility';
export { ReactCompatibility } from './react/ReactCompatibility';
export { VueCompatibility } from './vue/VueCompatibility';
export { PlainHTMLCompatibility } from './html/PlainHTMLCompatibility';
export { FrameworkDetector } from './FrameworkDetector';
export { CompatibilityManager } from './CompatibilityManager';

export type { 
  FrameworkType, 
  CompatibilityConfig, 
  FrameworkInfo,
  CompatibilityAdapter 
} from './types';
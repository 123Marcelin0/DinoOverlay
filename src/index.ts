// DinoOverlay Widget Entry Point
export { DinoOverlayLoader } from './core/DinoOverlayLoader';
export { ImageDetector } from './core/ImageDetector';
export { OverlayManager } from './core/OverlayManager';
export { ImageHighlighter } from './core/ImageHighlighter';
export { QuickActionSidebar } from './core/QuickActionSidebar';
export { FloatingChatBar } from './core/FloatingChatBar';
export { APIClient } from './core/APIClient';
export { ErrorManager } from './core/ErrorManager';
export { AnimationSystem, animationSystem } from './core/AnimationSystem';
export { OverlayAnimations, overlayAnimations } from './core/OverlayAnimations';

// Security exports
export { SecurityManager, securityManager } from './core/SecurityManager';
export { SecurityValidator, securityValidator } from './core/SecurityValidator';
export { SecurityAuditor, securityAuditor } from './core/SecurityAuditor';

// Performance and optimization exports
export { PerformanceMonitor, performanceMonitor } from './core/PerformanceMonitor';
export { ImageOptimizer, imageOptimizer, LazyImageLoader } from './core/ImageOptimizer';
export { LazyComponentLoader, lazyComponentLoader, componentLoaders } from './core/LazyComponentLoader';
export { PerformanceConfigManager, performanceConfigManager, defaultPerformanceConfig, productionPerformanceConfig } from './config/performance';

export type { DinoOverlayConfig } from './types/config';
export type { DetectionConfig, ImageDetectorEvents } from './core/ImageDetector';
export type { OverlayManagerEvents, Component } from './core/OverlayManager';
export type { HighlighterProps } from './core/ImageHighlighter';
export type { SelectedImage, OverlayState, Position, AnimationConfig, QuickAction, SidebarProps, ChatBarProps } from './types/overlay';
export type { 
  AnimationOptions, 
  AnimationKeyframe, 
  TransitionConfig, 
  AnimationCleanup 
} from './core/AnimationSystem';
export type { OverlayAnimationConfig } from './core/OverlayAnimations';
export type { 
  APIClientConfig, 
  EditImageRequest, 
  EditImageResponse, 
  ChatRequest, 
  ChatResponse, 
  APIError 
} from './types/api';

// Security types
export type { 
  SecurityConfig, 
  CSPConfig, 
  SanitizationOptions, 
  SecurityValidationResult, 
  XSSPattern, 
  SecurityAuditResult, 
  SecurityVulnerability, 
  EncryptionConfig, 
  SecurityHeaders, 
  ValidationRules, 
  SecurityEvent, 
  SecurityEventType 
} from './types/security';

// Performance types
export type { 
  PerformanceMetrics, 
  PerformanceThresholds 
} from './core/PerformanceMonitor';
export type { 
  ImageOptimizationOptions, 
  OptimizedImage 
} from './core/ImageOptimizer';
export type { 
  LazyComponentConfig, 
  ComponentLoadResult 
} from './core/LazyComponentLoader';
export type { 
  PerformanceConfig 
} from './config/performance';

// Initialize global DinoOverlay object for script tag usage
declare global {
  interface Window {
    DinoOverlay: {
      init: (config: any) => void;
      performanceMonitor: typeof performanceMonitor;
      lazyComponentLoader: typeof lazyComponentLoader;
      loadedComponents?: string[];
    };
  }
}

// Auto-initialize if config is provided via window
if (typeof window !== 'undefined') {
  window.DinoOverlay = {
    init: (config) => {
      // Start performance monitoring
      performanceMonitor.trackUserEngagement('sessionDuration');
      
      const loader = new DinoOverlayLoader(config);
      loader.initialize().then(() => {
        // Track successful initialization
        performanceMonitor.trackUserEngagement('actionsTriggered');
      }).catch((error) => {
        // Track initialization errors
        performanceMonitor.trackApiRequest(0, true);
        console.error('DinoOverlay initialization failed:', error);
      });
    },
    performanceMonitor,
    lazyComponentLoader,
    get loadedComponents() {
      return lazyComponentLoader.getLoadedComponents();
    }
  };
}
// Framework Compatibility Types

export type FrameworkType = 'wordpress' | 'react' | 'vue' | 'html' | 'unknown';

export interface FrameworkInfo {
  type: FrameworkType;
  version?: string;
  theme?: string;
  plugins?: string[];
  detected: boolean;
  confidence: number; // 0-1 confidence score
}

export interface CompatibilityConfig {
  framework?: FrameworkType;
  autoDetect?: boolean;
  preventConflicts?: boolean;
  isolateStyles?: boolean;
  respectLifecycle?: boolean;
  customSelectors?: string[];
  excludeSelectors?: string[];
}

export interface CompatibilityAdapter {
  readonly frameworkType: FrameworkType;
  
  initialize(): Promise<void>;
  cleanup(): void;
  
  // DOM manipulation methods
  findEditableImages(): HTMLImageElement[];
  attachEventListeners(element: HTMLElement, events: Record<string, EventListener>): void;
  removeEventListeners(element: HTMLElement): void;
  
  // Lifecycle integration
  onFrameworkMount?(): void;
  onFrameworkUnmount?(): void;
  onFrameworkUpdate?(): void;
  
  // Style isolation
  preventStyleConflicts(): void;
  
  // Framework-specific optimizations
  optimizeForFramework(): void;
}

export interface ConflictPrevention {
  cssNamespacing: boolean;
  eventBubbling: boolean;
  domMutation: boolean;
  globalVariables: boolean;
}

export interface LifecycleHooks {
  beforeMount?: () => void;
  afterMount?: () => void;
  beforeUnmount?: () => void;
  afterUnmount?: () => void;
  onUpdate?: () => void;
}
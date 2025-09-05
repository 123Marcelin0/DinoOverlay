import { OverlayState, SelectedImage, Position } from '../types/overlay';
import { DinoOverlayConfig } from '../types/config';
import { ThemeConfig, ThemeMode } from '../types/theme';
import { ImageDetector, DetectionConfig } from './ImageDetector';
import { ResponsiveManager } from './ResponsiveManager';
import { ThemeManager } from './ThemeManager';

export interface OverlayManagerEvents {
  stateChanged: (state: OverlayState, previousState: OverlayState) => void;
  imageSelected: (selectedImage: SelectedImage) => void;
  imageDeselected: (previousImage: SelectedImage) => void;
  imagePositionUpdated: (selectedImage: SelectedImage) => void;
  sidebarToggled: (visible: boolean) => void;
  chatBarToggled: (visible: boolean) => void;
  processingStateChanged: (isProcessing: boolean, action?: string) => void;
  themeChanged: (theme: ThemeConfig, previousTheme: ThemeConfig) => void;
}

export interface Component {
  render(): HTMLElement;
  destroy(): void;
  update?(state: OverlayState): void;
  updateTheme?(theme: ThemeConfig): void;
}

export class OverlayManager {
  private state: OverlayState;
  private previousState: OverlayState;
  private components: Map<string, Component> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  private imageDetector: ImageDetector;
  private responsiveManager: ResponsiveManager;
  private themeManager: ThemeManager;
  private shadowRoot: ShadowRoot;
  private config: Required<DinoOverlayConfig>;
  private positionUpdateTimer: number | null = null;
  private isDestroyed: boolean = false;

  constructor(
    shadowRoot: ShadowRoot,
    config: Required<DinoOverlayConfig>
  ) {
    this.shadowRoot = shadowRoot;
    this.config = config;

    // Initialize state
    this.state = this.createInitialState();
    this.previousState = { ...this.state };

    // Initialize image detector
    const detectionConfig: DetectionConfig = {
      className: 'editable-room',
      observeChanges: true,
      debounceMs: 150,
      debug: config.debug
    };

    this.imageDetector = new ImageDetector(detectionConfig);
    this.setupImageDetectorListeners();

    // Initialize responsive manager
    this.responsiveManager = new ResponsiveManager(config);
    this.setupResponsiveManagerListeners();

    // Initialize theme manager
    this.themeManager = new ThemeManager(shadowRoot, config);
    this.setupThemeManagerListeners();

    // Bind methods to preserve context
    this.handleWindowResize = this.handleWindowResize.bind(this);
    this.handleWindowScroll = this.handleWindowScroll.bind(this);
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
  }

  public initialize(): void {
    if (this.isDestroyed) {
      throw new Error('OverlayManager has been destroyed');
    }

    // Start image detection
    this.imageDetector.startDetection();

    // Initialize responsive manager
    this.responsiveManager.initialize();

    // Initialize theme manager
    this.themeManager.initialize();

    // Setup global event listeners
    this.setupGlobalEventListeners();

    if (this.config.debug) {
      console.log('[OverlayManager] Initialized');
    }
  }

  public destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;

    // Clear position update timer
    if (this.positionUpdateTimer) {
      clearTimeout(this.positionUpdateTimer);
      this.positionUpdateTimer = null;
    }

    // Destroy image detector
    this.imageDetector.destroy();

    // Destroy responsive manager
    this.responsiveManager.destroy();

    // Destroy theme manager
    this.themeManager.destroy();

    // Remove global event listeners
    this.removeGlobalEventListeners();

    // Destroy all components
    for (const component of this.components.values()) {
      component.destroy();
    }
    this.components.clear();

    // Clear event listeners
    this.eventListeners.clear();

    if (this.config.debug) {
      console.log('[OverlayManager] Destroyed');
    }
  }

  public getState(): OverlayState {
    return { ...this.state };
  }

  public selectImage(image: HTMLImageElement): void {
    if (this.isDestroyed) {
      return;
    }

    try {
      const selectedImage = this.imageDetector.createSelectedImage(image);
      const previousImage = this.state.selectedImage;

      this.setState({
        selectedImage,
        sidebarVisible: true,
        chatBarVisible: true
      });

      // Emit specific events
      this.emit('imageSelected', selectedImage);
      
      if (previousImage) {
        this.emit('imageDeselected', previousImage);
      }

      if (this.config.debug) {
        console.log('[OverlayManager] Image selected:', image);
      }
    } catch (error) {
      console.error('[OverlayManager] Failed to select image:', error);
    }
  }

  public clearSelection(): void {
    if (this.isDestroyed) {
      return;
    }

    const previousImage = this.state.selectedImage;
    
    this.setState({
      selectedImage: null,
      sidebarVisible: false,
      chatBarVisible: false,
      currentAction: null
    });

    if (previousImage) {
      this.emit('imageDeselected', previousImage);
    }

    if (this.config.debug) {
      console.log('[OverlayManager] Selection cleared');
    }
  }

  public updateImagePosition(): void {
    if (this.isDestroyed || !this.state.selectedImage) {
      return;
    }

    try {
      const updatedRect = this.imageDetector.calculateImageBounds(
        this.state.selectedImage.element
      );

      const updatedSelectedImage: SelectedImage = {
        ...this.state.selectedImage,
        rect: updatedRect
      };

      this.setState({
        selectedImage: updatedSelectedImage
      });

      this.emit('imagePositionUpdated', updatedSelectedImage);

      if (this.config.debug) {
        console.log('[OverlayManager] Image position updated');
      }
    } catch (error) {
      console.error('[OverlayManager] Failed to update image position:', error);
      // If image is no longer valid, clear selection
      this.clearSelection();
    }
  }

  public setSidebarVisible(visible: boolean): void {
    if (this.isDestroyed) {
      return;
    }

    if (this.state.sidebarVisible !== visible) {
      this.setState({ sidebarVisible: visible });
      this.emit('sidebarToggled', visible);
    }
  }

  public setChatBarVisible(visible: boolean): void {
    if (this.isDestroyed) {
      return;
    }

    if (this.state.chatBarVisible !== visible) {
      this.setState({ chatBarVisible: visible });
      this.emit('chatBarToggled', visible);
    }
  }

  public setProcessingState(isProcessing: boolean, action?: string): void {
    if (this.isDestroyed) {
      return;
    }

    this.setState({
      isProcessing,
      currentAction: isProcessing ? action || null : null
    });

    this.emit('processingStateChanged', isProcessing, action);
  }

  public setState(updates: Partial<OverlayState>): void {
    if (this.isDestroyed) {
      return;
    }

    this.previousState = { ...this.state };
    this.state = { ...this.state, ...updates };

    // Update all components with new state
    this.updateComponents();

    // Emit state change event
    this.emit('stateChanged', this.state, this.previousState);

    if (this.config.debug) {
      console.log('[OverlayManager] State updated:', updates);
    }
  }

  public registerComponent(name: string, component: Component): void {
    if (this.isDestroyed) {
      throw new Error('Cannot register component on destroyed OverlayManager');
    }

    if (this.components.has(name)) {
      console.warn(`[OverlayManager] Component '${name}' already registered, replacing`);
      this.components.get(name)?.destroy();
    }

    this.components.set(name, component);

    // Update component with current state
    if (component.update) {
      component.update(this.state);
    }

    if (this.config.debug) {
      console.log(`[OverlayManager] Component '${name}' registered`);
    }
  }

  public unregisterComponent(name: string): void {
    const component = this.components.get(name);
    if (component) {
      component.destroy();
      this.components.delete(name);

      if (this.config.debug) {
        console.log(`[OverlayManager] Component '${name}' unregistered`);
      }
    }
  }

  public getComponent<T extends Component>(name: string): T | undefined {
    return this.components.get(name) as T | undefined;
  }

  public on<K extends keyof OverlayManagerEvents>(
    event: K,
    callback: OverlayManagerEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off<K extends keyof OverlayManagerEvents>(
    event: K,
    callback: OverlayManagerEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  public getImageDetector(): ImageDetector {
    return this.imageDetector;
  }

  public getShadowRoot(): ShadowRoot {
    return this.shadowRoot;
  }

  public getConfig(): Required<DinoOverlayConfig> {
    return { ...this.config };
  }

  public getResponsiveManager(): ResponsiveManager {
    return this.responsiveManager;
  }

  public getThemeManager(): ThemeManager {
    return this.themeManager;
  }

  public getCurrentTheme(): ThemeConfig {
    return this.themeManager.getCurrentTheme();
  }

  public setThemeMode(mode: ThemeMode): void {
    if (this.isDestroyed) {
      return;
    }

    this.themeManager.setMode(mode);
  }

  private createInitialState(): OverlayState {
    return {
      selectedImage: null,
      sidebarVisible: false,
      chatBarVisible: false,
      isProcessing: false,
      currentAction: null
    };
  }

  private setupImageDetectorListeners(): void {
    this.imageDetector.on('imageDetected', (image) => {
      // Add click listener to detected images
      this.attachImageClickListener(image);
    });

    this.imageDetector.on('imageRemoved', (image) => {
      // If the removed image was selected, clear selection
      if (this.state.selectedImage?.element === image) {
        this.clearSelection();
      }
      
      this.detachImageClickListener(image);
    });

    this.imageDetector.on('imageUpdated', (image) => {
      // If the updated image is selected, update its position
      if (this.state.selectedImage?.element === image) {
        this.schedulePositionUpdate();
      }
    });
  }

  private setupResponsiveManagerListeners(): void {
    this.responsiveManager.on('breakpointChanged', (viewport, previousViewport) => {
      if (this.config.debug) {
        console.log('[OverlayManager] Breakpoint changed:', { viewport, previousViewport });
      }
      
      // Update component positioning if needed
      if (this.state.selectedImage) {
        this.schedulePositionUpdate();
      }
    });

    this.responsiveManager.on('orientationChanged', (orientation) => {
      if (this.config.debug) {
        console.log('[OverlayManager] Orientation changed:', orientation);
      }
      
      // Update positioning after orientation change
      setTimeout(() => {
        if (this.state.selectedImage) {
          this.updateImagePosition();
        }
      }, 100);
    });
  }

  private setupThemeManagerListeners(): void {
    this.themeManager.on('themeChanged', (theme, previousTheme) => {
      if (this.config.debug) {
        console.log('[OverlayManager] Theme changed:', { 
          from: previousTheme.mode, 
          to: theme.mode 
        });
      }
      
      // Emit theme change event for components
      this.emit('themeChanged', theme, previousTheme);
      
      // Update all components with new theme
      this.updateComponents();
    });

    this.themeManager.on('modeChanged', (mode, previousMode) => {
      if (this.config.debug) {
        console.log('[OverlayManager] Theme mode changed:', { 
          from: previousMode, 
          to: mode 
        });
      }
    });

    this.themeManager.on('detectionCompleted', (result) => {
      if (this.config.debug) {
        console.log('[OverlayManager] Theme detection completed:', result);
      }
    });
  }

  private attachImageClickListener(image: HTMLImageElement): void {
    const handleClick = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      this.selectImage(image);
    };

    image.addEventListener('click', handleClick);
    (image as any).__dinoClickListener = handleClick;
  }

  private detachImageClickListener(image: HTMLImageElement): void {
    const listener = (image as any).__dinoClickListener;
    if (listener) {
      image.removeEventListener('click', listener);
      delete (image as any).__dinoClickListener;
    }
  }

  private setupGlobalEventListeners(): void {
    window.addEventListener('resize', this.handleWindowResize, { passive: true });
    window.addEventListener('scroll', this.handleWindowScroll, { passive: true });
    document.addEventListener('click', this.handleDocumentClick);
  }

  private removeGlobalEventListeners(): void {
    window.removeEventListener('resize', this.handleWindowResize);
    window.removeEventListener('scroll', this.handleWindowScroll);
    document.removeEventListener('click', this.handleDocumentClick);
  }

  private handleWindowResize(): void {
    this.schedulePositionUpdate();
  }

  private handleWindowScroll(): void {
    this.schedulePositionUpdate();
  }

  private handleDocumentClick(event: Event): void {
    // Check if click is outside the overlay system
    const target = event.target as Element;
    
    // Don't close if clicking on an editable image
    if (target instanceof HTMLImageElement && 
        target.classList.contains('editable-room')) {
      return;
    }

    // Don't close if clicking inside the shadow DOM
    if (this.shadowRoot.contains(target)) {
      return;
    }

    // Close sidebar and chat bar if clicking outside
    if (this.state.sidebarVisible || this.state.chatBarVisible) {
      this.setState({
        sidebarVisible: false,
        chatBarVisible: false
      });
    }
  }

  private schedulePositionUpdate(): void {
    if (this.positionUpdateTimer) {
      clearTimeout(this.positionUpdateTimer);
    }

    this.positionUpdateTimer = window.setTimeout(() => {
      this.updateImagePosition();
    }, 16); // ~60fps
  }

  private updateComponents(): void {
    const currentTheme = this.themeManager.getCurrentTheme();
    
    for (const component of this.components.values()) {
      if (component.update) {
        try {
          component.update(this.state);
        } catch (error) {
          console.error('[OverlayManager] Error updating component:', error);
        }
      }
      
      if (component.updateTheme) {
        try {
          component.updateTheme(currentTheme);
        } catch (error) {
          console.error('[OverlayManager] Error updating component theme:', error);
        }
      }
    }
  }

  private emit<K extends keyof OverlayManagerEvents>(
    event: K,
    ...args: Parameters<OverlayManagerEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          (listener as any)(...args);
        } catch (error) {
          console.error(`[OverlayManager] Error in ${event} listener:`, error);
        }
      }
    }
  }
}
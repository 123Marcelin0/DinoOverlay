# Implementation Plan

- [x] 1. Set up project structure and build configuration





  - Create TypeScript project structure with src/, dist/, and test/ directories
  - Configure Vite/Rollup for single-file bundle output targeting vanilla JS
  - Set up Tailwind CSS with glassmorphic utility classes
  - Configure Jest for unit testing and Playwright for E2E testing
  - _Requirements: 4.1, 4.3, 7.1, 7.2, 7.3_

- [x] 2. Implement core widget loader and Shadow DOM isolation





  - Create DinoOverlayLoader class that initializes the widget system
  - Implement Shadow DOM container creation with CSS isolation
  - Write async script loading mechanism with error handling
  - Create configuration interface and validation logic
  - Write unit tests for loader initialization and Shadow DOM creation
  - _Requirements: 4.1, 4.2, 4.3, 4.4_





- [ ] 3. Build image detection and DOM scanning system

  - Implement ImageDetector class with MutationObserver for dynamic content
  - Create scanning logic for `.editable-room` class detection


  - Write image bounds calculation with border radius detection
  - Implement debounced event handling for scroll and resize events
  - Create unit tests for image detection and DOM observation
  - _Requirements: 1.1, 1.2, 1.4, 7.5_

- [x] 4. Create overlay manager and state management





  - Implement OverlayManager class with centralized state management
  - Create SelectedImage interface and image selection logic
  - Write state update methods with proper event emission
  - Implement image position tracking and update mechanisms
  - Create unit tests for state management and image selection
  - _Requirements: 1.1, 1.3, 1.5, 6.4_

- [x] 5. Build glassmorphic image highlighter component






  - Create ImageHighlighter class with glassmorphic border rendering
  - Implement dynamic border radius matching for highlighted images
  - Write glow animation system with CSS-in-JS or inline styles
  - Create close button with proper positioning and styling
  - Write unit tests for highlighter rendering and animations
  - _Requirements: 1.2, 1.3, 1.4, 6.1, 6.2, 6.3_

- [x] 6. Implement quick action sidebar component





  - Create QuickActionSidebar class with slide-in animation
  - Implement pre-defined action buttons (Minimalist, Scandi Style, Add Sofa, etc.)
  - Write glassmorphic styling with backdrop-blur and transparency
  - Create action button click handlers with loading states
  - Write unit tests for sidebar rendering and interactions
  - _Requirements: 2.1, 2.2, 2.4, 2.6, 6.1, 6.2, 6.5_

- [x] 7. Build floating chat bar component





  - Create FloatingChatBar class with glassmorphic input styling
  - Implement text input with placeholder and send button
  - Write positioning logic for bottom-right corner placement
  - Create typing indicator and loading state animations
  - Write unit tests for chat bar rendering and input handling
  - _Requirements: 3.1, 3.2, 3.6, 6.1, 6.2, 6.5_

- [x] 8. Implement API client for backend communication





  - Create APIClient class with proper error handling and retries
  - Implement editImage endpoint integration with base64 image handling
  - Write sendChatMessage endpoint integration with conversation context
  - Create request/response interfaces and validation
  - Write unit tests with mocked API responses and error scenarios
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 9. Build error handling and user feedback system






  - Create ErrorManager class with categorized error handling
  - Implement user-friendly error messages and retry mechanisms
  - Write network error handling with offline detection
  - Create rate limiting and API quota management
  - Write unit tests for error scenarios and recovery mechanisms
  - _Requirements: 5.4, 5.5, 5.6_





- [ ] 10. Implement responsive design and mobile support


  - Create responsive breakpoint handling for mobile devices
  - Implement touch-friendly interactions and gesture support



  - Write adaptive positioning for sidebar and chat bar on small screens

  - Create mobile-optimized glassmorphic styling
  - Write unit tests for responsive behavior and touch interactions
  - _Requirements: 6.6, 7.5_

- [-] 11. Add animation system and smooth transitions




  - Create animation utilities for slide-in, fade, and scale effects
  - Implement smooth transitions for sidebar, chat bar, and highlighter
  - Write CSS-in-JS animation system with proper cleanup
  - Create hover and focus state animations for interactive elements
  - Write unit tests for animation timing and cleanup
  - _Requirements: 6.3, 6.4, 6.5_

- [x] 12. Build theme system and dark mode support




  - Create ThemeConfig interface and theme switching logic
  - Implement automatic theme detection based on host site
  - Write glassmorphic color schemes for light and dark themes
  - Create theme-aware component styling with CSS custom properties
  - Write unit tests for theme switching and color adaptation
  - _Requirements: 6.6_

- [x] 13. Implement bundle optimization and performance features




  - Configure tree shaking and code splitting for optimal bundle size
  - Implement lazy loading for non-critical components
  - Write image optimization with WebP support and compression
  - Create performance monitoring and metrics collection
  - Write performance tests for bundle size and load time requirements
  - _Requirements: 4.1, 4.3_

- [x] 14. Create comprehensive test suite






  - Write unit tests for all components with 90% coverage requirement
  - Implement integration tests for complete user workflows
  - Create E2E tests with Playwright for cross-browser compatibility
  - Write performance tests for bundle size and load time validation
  - Create accessibility tests for WCAG 2.1 AA compliance
  - _Requirements: 4.4, 7.1, 7.2, 7.3, 7.4, 7.5_

- [-] 15. Build script snippet and CDN integration






  - Create minified script snippet for easy website integration
  - Implement CDN deployment configuration with versioning
  - Write fallback loading mechanism for CDN failures
  - Create integrity hash generation for security
  - Write integration examples and documentation
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 16. Implement framework compatibility layer











  - Create WordPress plugin compatibility with common themes
  - Write React application integration without virtual DOM conflicts
  - Implement Vue.js compatibility with proper lifecycle management
  - Create plain HTML integration with jQuery compatibility
  - Write unit tests for each framework integration scenario
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 17. Add security features and CSP compliance








  - Implement Content Security Policy headers and nonce support
  - Create input sanitization for all user inputs and API responses
  - Write XSS prevention measures with proper escaping
  - Implement API key encryption and secure transmission
  - Write security tests for common attack vectors
  - _Requirements: 4.3, 4.4_

- [x] 18. Create backend API endpoints









  - Implement POST /overlay/edit-image endpoint with AI integration
  - Create POST /overlay/chat endpoint with conversation management
  - Write image processing pipeline with format validation
  - Implement rate limiting and API quota management
  - Write API tests for all endpoints and error scenarios
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_


- [x] 19. Integrate AI image processing services






  - Connect to Google Gemini flash 2.5 imagen (Nano Banana) API
  - Implement prompt processing and image generation pipeline
  - Write image format conversion and optimization
  - Create processing queue and status tracking
  - Write integration tests for AI service responses
  - _Requirements: 2.3, 2.5, 3.3, 3.4, 3.5_

- [x] 20. Final integration and deployment testing









  - Test complete system integration with real estate websites
  - Validate cross-browser compatibility and performance
  - Test CDN deployment and script snippet functionality
  - Verify API integration and AI processing workflows
  - Create deployment documentation and troubleshooting guides
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5_
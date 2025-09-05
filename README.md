# DinoOverlay Widget

A universal real estate image editing overlay that can be injected into any website via a simple script tag. The system provides a glassmorphic UI overlay that detects room images and offers AI-powered editing capabilities.

## Project Structure

```
├── src/                    # Source code
│   ├── core/              # Core widget functionality
│   ├── types/             # TypeScript type definitions
│   └── styles/            # CSS and styling
├── test/                  # Unit tests
├── e2e/                   # End-to-end tests
├── dist/                  # Build output
├── vite.config.ts         # Vite build configuration
├── jest.config.js         # Jest test configuration
├── playwright.config.ts   # Playwright E2E test configuration
└── tailwind.config.js     # Tailwind CSS configuration
```

## Development Scripts

```bash
# Build the widget for production
pnpm run build:widget

# Build in watch mode for development
pnpm run dev:widget

# Run unit tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run tests with coverage report
pnpm run test:coverage

# Run end-to-end tests
pnpm run test:e2e

# Run E2E tests with UI
pnpm run test:e2e:ui
```

## Build Configuration

- **Vite**: Configured for single-file IIFE bundle output
- **TypeScript**: Strict mode with ES2020 target
- **Tailwind CSS**: Custom glassmorphic utilities and animations
- **Jest**: Unit testing with 90% coverage requirement
- **Playwright**: Cross-browser E2E testing

## Usage

```html
<script src="https://cdn.dinooverlay.com/v1/dino-overlay.iife.js"></script>
<script>
  DinoOverlay.init({
    apiEndpoint: 'https://api.dinooverlay.com',
    apiKey: 'your-api-key',
    theme: 'auto'
  });
</script>
```

## Testing

The project includes comprehensive testing:

- **Unit Tests**: Jest with jsdom environment
- **E2E Tests**: Playwright across multiple browsers
- **Coverage**: Minimum 90% code coverage required
- **Test Files**: Located in `test/` and `e2e/` directories

## Build Output

The build process generates:
- `dist/dino-overlay.iife.js` - Main widget bundle
- `dist/dino-overlay.iife.js.map` - Source map for debugging
- `dist/test.html` - Test page for development

## Requirements Addressed

This setup addresses the following requirements:
- **4.1**: Asynchronous loading without blocking page rendering
- **4.3**: Shadow DOM isolation and framework independence  
- **7.1**: WordPress compatibility
- **7.2**: React application compatibility
- **7.3**: Plain HTML compatibility
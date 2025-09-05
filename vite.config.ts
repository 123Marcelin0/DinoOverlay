import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DinoOverlay',
      fileName: 'dino-overlay',
      formats: ['iife'] // Single file bundle for script tag usage
    },
    rollupOptions: {
      output: {
        // Ensure single file output for main bundle
        inlineDynamicImports: true,
        manualChunks: undefined
      },
      // External dependencies that shouldn't be bundled
      external: [],
      // Tree shaking configuration
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false
      }
    },
    outDir: 'dist',
    minify: 'terser',
    sourcemap: true,
    // Bundle size optimization
    target: 'es2020',
    // Enable code splitting for dynamic imports
    chunkSizeWarningLimit: 200, // 200KB warning threshold
    // Terser configuration for optimal minification
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2 // Multiple passes for better compression
      },
      mangle: {
        properties: {
          regex: /^_/ // Mangle private properties starting with _
        }
      },
      format: {
        comments: false // Remove all comments
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  css: {
    postcss: './postcss.config.js'
  },
  // Development optimizations
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@vite/client', '@vite/env']
  },
  // Performance monitoring in development
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PERFORMANCE_MONITORING__: JSON.stringify(true)
  }
});
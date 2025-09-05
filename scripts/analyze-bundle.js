#!/usr/bin/env node

/**
 * Bundle analysis script
 * Analyzes the built bundle for size, dependencies, and optimization opportunities
 */

const fs = require('fs');
const path = require('path');
const { gzipSync } = require('zlib');

const BUNDLE_PATH = path.resolve(__dirname, '../dist/dino-overlay.iife.js');
const SOURCE_MAP_PATH = path.resolve(__dirname, '../dist/dino-overlay.iife.js.map');
const MAX_BUNDLE_SIZE = 200 * 1024; // 200KB
const MAX_GZIP_SIZE = 50 * 1024; // 50KB

function analyzeBundle() {
  console.log('🔍 Analyzing DinoOverlay Bundle...\n');

  // Check if bundle exists
  if (!fs.existsSync(BUNDLE_PATH)) {
    console.error('❌ Bundle not found. Run "npm run build:widget" first.');
    process.exit(1);
  }

  const bundleContent = fs.readFileSync(BUNDLE_PATH);
  const bundleSize = bundleContent.length;
  const gzipSize = gzipSync(bundleContent).length;

  // Basic size analysis
  console.log('📊 Size Analysis:');
  console.log(`   Raw size: ${(bundleSize / 1024).toFixed(2)}KB`);
  console.log(`   Gzipped:  ${(gzipSize / 1024).toFixed(2)}KB`);
  console.log(`   Compression: ${((1 - gzipSize / bundleSize) * 100).toFixed(1)}%`);
  
  // Size thresholds
  const sizeStatus = bundleSize <= MAX_BUNDLE_SIZE ? '✅' : '❌';
  const gzipStatus = gzipSize <= MAX_GZIP_SIZE ? '✅' : '❌';
  
  console.log(`\n🎯 Thresholds:`);
  console.log(`   Raw size limit:  ${(MAX_BUNDLE_SIZE / 1024).toFixed(0)}KB ${sizeStatus}`);
  console.log(`   Gzip size limit: ${(MAX_GZIP_SIZE / 1024).toFixed(0)}KB ${gzipStatus}`);

  // Content analysis
  const bundleText = bundleContent.toString();
  analyzeContent(bundleText);

  // Source map analysis
  if (fs.existsSync(SOURCE_MAP_PATH)) {
    analyzeSourceMap();
  }

  // Performance recommendations
  generateRecommendations(bundleSize, gzipSize, bundleText);

  console.log('\n✨ Analysis complete!');
}

function analyzeContent(bundleText) {
  console.log('\n📝 Content Analysis:');
  
  // Check for development code
  const hasConsoleLog = /console\.log/.test(bundleText);
  const hasDebugger = /debugger/.test(bundleText);
  const hasDevCode = /__DEV__.*?true/.test(bundleText);
  
  console.log(`   Console statements: ${hasConsoleLog ? '❌ Found' : '✅ Removed'}`);
  console.log(`   Debugger statements: ${hasDebugger ? '❌ Found' : '✅ Removed'}`);
  console.log(`   Development code: ${hasDevCode ? '❌ Found' : '✅ Removed'}`);

  // Check for minification
  const lines = bundleText.split('\n');
  const avgLineLength = bundleText.length / lines.length;
  const isMinified = avgLineLength > 100;
  
  console.log(`   Minification: ${isMinified ? '✅ Applied' : '❌ Missing'}`);
  console.log(`   Average line length: ${avgLineLength.toFixed(0)} chars`);

  // Check for key components
  const components = [
    'DinoOverlayLoader',
    'OverlayManager',
    'ImageDetector',
    'PerformanceMonitor',
    'ImageOptimizer'
  ];

  console.log('\n🧩 Components:');
  components.forEach(component => {
    const found = bundleText.includes(component);
    console.log(`   ${component}: ${found ? '✅' : '❌'}`);
  });
}

function analyzeSourceMap() {
  console.log('\n🗺️  Source Map Analysis:');
  
  try {
    const sourceMapContent = fs.readFileSync(SOURCE_MAP_PATH, 'utf-8');
    const sourceMap = JSON.parse(sourceMapContent);
    
    console.log(`   Version: ${sourceMap.version}`);
    console.log(`   Sources: ${sourceMap.sources?.length || 0} files`);
    console.log(`   Mappings: ${sourceMap.mappings ? '✅ Present' : '❌ Missing'}`);
    
    // Analyze source files
    if (sourceMap.sources) {
      const sourceTypes = sourceMap.sources.reduce((acc, source) => {
        const ext = path.extname(source);
        acc[ext] = (acc[ext] || 0) + 1;
        return acc;
      }, {});
      
      console.log('   File types:');
      Object.entries(sourceTypes).forEach(([ext, count]) => {
        console.log(`     ${ext || 'no-ext'}: ${count} files`);
      });
    }
  } catch (error) {
    console.log('   ❌ Failed to parse source map');
  }
}

function generateRecommendations(bundleSize, gzipSize, bundleText) {
  console.log('\n💡 Recommendations:');
  
  const recommendations = [];
  
  if (bundleSize > MAX_BUNDLE_SIZE) {
    recommendations.push('Consider removing unused dependencies');
    recommendations.push('Enable more aggressive tree shaking');
    recommendations.push('Split large components into separate chunks');
  }
  
  if (gzipSize > MAX_GZIP_SIZE) {
    recommendations.push('Enable Brotli compression for better compression ratios');
    recommendations.push('Consider using shorter variable names');
  }
  
  if (/console\.log/.test(bundleText)) {
    recommendations.push('Remove console.log statements in production build');
  }
  
  if (bundleText.includes('React')) {
    recommendations.push('Consider using Preact for smaller bundle size');
  }
  
  if (recommendations.length === 0) {
    console.log('   ✅ Bundle is well optimized!');
  } else {
    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }
}

// Run analysis
if (require.main === module) {
  analyzeBundle();
}

module.exports = { analyzeBundle };
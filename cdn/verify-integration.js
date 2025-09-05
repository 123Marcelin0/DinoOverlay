#!/usr/bin/env node

/**
 * DinoOverlay CDN Integration Verification Script
 * 
 * This script verifies that all CDN files are properly generated,
 * integrity hashes are correct, and the integration is ready for deployment.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Generate SHA-384 hash for a file
 */
function generateSHA384(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash('sha384').update(fileBuffer).digest('base64');
  return `sha384-${hash}`;
}

/**
 * Check if a file exists
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Verify required files exist
 */
function verifyRequiredFiles() {
  log('\n📁 Verifying required files...', 'bold');
  
  const requiredFiles = [
    'dino-overlay-0.1.0.js',
    'dino-overlay-0.1.0.js.map',
    'dino-overlay-loader.min-0.1.0.js',
    'integration-examples.md',
    'cdn-config.json',
    'integrity-manifest.json',
    'csp-config.json',
    'security-headers.json',
    '.htaccess',
    'nginx.conf',
    'README.md',
    'deployment-guide.md',
    'demo.html'
  ];
  
  let allFilesExist = true;
  
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (fileExists(filePath)) {
      const size = getFileSize(filePath);
      logSuccess(`${file} (${formatFileSize(size)})`);
    } else {
      logError(`${file} - Missing!`);
      allFilesExist = false;
    }
  }
  
  return allFilesExist;
}

/**
 * Verify integrity hashes
 */
function verifyIntegrityHashes() {
  log('\n🔒 Verifying integrity hashes...', 'bold');
  
  const manifestPath = path.join(__dirname, 'integrity-manifest.json');
  if (!fileExists(manifestPath)) {
    logError('Integrity manifest not found!');
    return false;
  }
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  let allHashesValid = true;
  
  for (const [filename, fileInfo] of Object.entries(manifest.files)) {
    const filePath = path.join(__dirname, filename);
    
    if (!fileExists(filePath)) {
      logError(`${filename} - File not found!`);
      allHashesValid = false;
      continue;
    }
    
    const actualHash = generateSHA384(filePath);
    const expectedHash = fileInfo.sri;
    
    if (actualHash === expectedHash) {
      logSuccess(`${filename} - Hash verified`);
    } else {
      logError(`${filename} - Hash mismatch!`);
      logError(`  Expected: ${expectedHash}`);
      logError(`  Actual:   ${actualHash}`);
      allHashesValid = false;
    }
  }
  
  return allHashesValid;
}

/**
 * Verify CDN configuration
 */
function verifyCDNConfiguration() {
  log('\n⚙️  Verifying CDN configuration...', 'bold');
  
  const configPath = path.join(__dirname, 'cdn-config.json');
  if (!fileExists(configPath)) {
    logError('CDN configuration not found!');
    return false;
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  let configValid = true;
  
  // Check version
  if (config.version) {
    logSuccess(`Version: ${config.version}`);
  } else {
    logError('Version not specified in configuration');
    configValid = false;
  }
  
  // Check CDN URLs
  if (config.cdn && config.cdn.primary && config.cdn.fallback) {
    logSuccess(`Primary CDN: ${config.cdn.primary}`);
    logSuccess(`Fallback CDN: ${config.cdn.fallback}`);
  } else {
    logError('CDN URLs not properly configured');
    configValid = false;
  }
  
  // Check files configuration
  if (config.files && Array.isArray(config.files) && config.files.length > 0) {
    logSuccess(`Configured files: ${config.files.length}`);
    
    for (const file of config.files) {
      if (file.source && file.integrity && file.size) {
        logSuccess(`  ${file.source} - ${formatFileSize(file.size)}`);
      } else {
        logError(`  ${file.source || 'Unknown'} - Missing required properties`);
        configValid = false;
      }
    }
  } else {
    logError('No files configured for CDN deployment');
    configValid = false;
  }
  
  return configValid;
}

/**
 * Verify security configuration
 */
function verifySecurityConfiguration() {
  log('\n🛡️  Verifying security configuration...', 'bold');
  
  const securityPath = path.join(__dirname, 'security-headers.json');
  if (!fileExists(securityPath)) {
    logError('Security headers configuration not found!');
    return false;
  }
  
  const security = JSON.parse(fs.readFileSync(securityPath, 'utf8'));
  let securityValid = true;
  
  const requiredHeaders = [
    'Content-Security-Policy',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
    'Referrer-Policy',
    'Strict-Transport-Security'
  ];
  
  for (const header of requiredHeaders) {
    if (security[header]) {
      logSuccess(`${header}: Configured`);
    } else {
      logError(`${header}: Missing!`);
      securityValid = false;
    }
  }
  
  // Check CSP specifically
  if (security['Content-Security-Policy']) {
    const csp = security['Content-Security-Policy'];
    if (csp.includes('https://cdn.dinooverlay.com') && 
        csp.includes('https://backup-cdn.dinooverlay.com') &&
        csp.includes('https://api.dinooverlay.com')) {
      logSuccess('CSP includes required domains');
    } else {
      logWarning('CSP may be missing required domains');
    }
  }
  
  return securityValid;
}

/**
 * Verify example files
 */
function verifyExampleFiles() {
  log('\n📚 Verifying example files...', 'bold');
  
  const examplesDir = path.join(__dirname, 'examples');
  if (!fs.existsSync(examplesDir)) {
    logWarning('Examples directory not found');
    return false;
  }
  
  const exampleFiles = [
    'shopify-integration.liquid',
    'squarespace-integration.html',
    'webflow-integration.html',
    'drupal-integration.php'
  ];
  
  let allExamplesExist = true;
  
  for (const file of exampleFiles) {
    const filePath = path.join(examplesDir, file);
    if (fileExists(filePath)) {
      logSuccess(`${file} - Available`);
    } else {
      logWarning(`${file} - Missing (optional)`);
    }
  }
  
  return allExamplesExist;
}

/**
 * Verify bundle size requirements
 */
function verifyBundleSize() {
  log('\n📊 Verifying bundle size requirements...', 'bold');
  
  const mainBundlePath = path.join(__dirname, 'dino-overlay-0.1.0.js');
  const loaderPath = path.join(__dirname, 'dino-overlay-loader.min-0.1.0.js');
  
  if (!fileExists(mainBundlePath) || !fileExists(loaderPath)) {
    logError('Bundle files not found!');
    return false;
  }
  
  const mainBundleSize = getFileSize(mainBundlePath);
  const loaderSize = getFileSize(loaderPath);
  const totalSize = mainBundleSize + loaderSize;
  
  // Size requirements from spec
  const maxMainBundle = 200 * 1024; // 200KB
  const maxLoader = 10 * 1024; // 10KB
  const maxTotal = 210 * 1024; // 210KB
  
  let sizeValid = true;
  
  if (mainBundleSize <= maxMainBundle) {
    logSuccess(`Main bundle: ${formatFileSize(mainBundleSize)} (within ${formatFileSize(maxMainBundle)} limit)`);
  } else {
    logError(`Main bundle: ${formatFileSize(mainBundleSize)} (exceeds ${formatFileSize(maxMainBundle)} limit)`);
    sizeValid = false;
  }
  
  if (loaderSize <= maxLoader) {
    logSuccess(`Loader script: ${formatFileSize(loaderSize)} (within ${formatFileSize(maxLoader)} limit)`);
  } else {
    logError(`Loader script: ${formatFileSize(loaderSize)} (exceeds ${formatFileSize(maxLoader)} limit)`);
    sizeValid = false;
  }
  
  if (totalSize <= maxTotal) {
    logSuccess(`Total size: ${formatFileSize(totalSize)} (within ${formatFileSize(maxTotal)} limit)`);
  } else {
    logError(`Total size: ${formatFileSize(totalSize)} (exceeds ${formatFileSize(maxTotal)} limit)`);
    sizeValid = false;
  }
  
  return sizeValid;
}

/**
 * Verify demo page functionality
 */
function verifyDemoPage() {
  log('\n🎮 Verifying demo page...', 'bold');
  
  const demoPath = path.join(__dirname, 'demo.html');
  if (!fileExists(demoPath)) {
    logError('Demo page not found!');
    return false;
  }
  
  const demoContent = fs.readFileSync(demoPath, 'utf8');
  let demoValid = true;
  
  // Check for required elements
  const requiredElements = [
    'editable-room',
    'dino-overlay-loader',
    'DinoOverlayConfig'
  ];
  
  for (const element of requiredElements) {
    if (demoContent.includes(element)) {
      logSuccess(`Demo includes: ${element}`);
    } else {
      logError(`Demo missing: ${element}`);
      demoValid = false;
    }
  }
  
  return demoValid;
}

/**
 * Main verification function
 */
function runVerification() {
  log('🚀 DinoOverlay CDN Integration Verification', 'bold');
  log('='.repeat(50), 'blue');
  
  const results = {
    files: verifyRequiredFiles(),
    integrity: verifyIntegrityHashes(),
    cdn: verifyCDNConfiguration(),
    security: verifySecurityConfiguration(),
    examples: verifyExampleFiles(),
    bundleSize: verifyBundleSize(),
    demo: verifyDemoPage()
  };
  
  // Summary
  log('\n📋 Verification Summary', 'bold');
  log('='.repeat(30), 'blue');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  for (const [check, result] of Object.entries(results)) {
    const status = result ? '✅ PASS' : '❌ FAIL';
    const checkName = check.charAt(0).toUpperCase() + check.slice(1);
    log(`${status} ${checkName}`);
  }
  
  log(`\n📊 Overall: ${passed}/${total} checks passed`, passed === total ? 'green' : 'red');
  
  if (passed === total) {
    log('\n🎉 All verifications passed! CDN integration is ready for deployment.', 'green');
    return true;
  } else {
    log('\n⚠️  Some verifications failed. Please fix the issues before deployment.', 'red');
    return false;
  }
}

// Run verification if script is executed directly
if (require.main === module) {
  const success = runVerification();
  process.exit(success ? 0 : 1);
}

module.exports = {
  runVerification,
  verifyRequiredFiles,
  verifyIntegrityHashes,
  verifyCDNConfiguration,
  verifySecurityConfiguration,
  verifyExampleFiles,
  verifyBundleSize,
  verifyDemoPage
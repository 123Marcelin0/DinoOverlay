#!/usr/bin/env node

/**
 * DinoOverlay Integrity Hash Generator
 * 
 * This script generates SHA-384 integrity hashes for all CDN files
 * and updates the integrity manifest with current file information.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Generate multiple hash types for a file
 */
function generateHashes(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  
  return {
    md5: crypto.createHash('md5').update(fileBuffer).digest('hex'),
    sha256: 'sha256-' + crypto.createHash('sha256').update(fileBuffer).digest('base64'),
    sha384: 'sha384-' + crypto.createHash('sha384').update(fileBuffer).digest('base64'),
    sha512: 'sha512-' + crypto.createHash('sha512').update(fileBuffer).digest('base64')
  };
}

/**
 * Get file size in bytes
 */
function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

/**
 * Generate integrity manifest for all CDN files
 */
function generateIntegrityManifest() {
  const cdnDir = __dirname;
  const manifestPath = path.join(cdnDir, 'integrity-manifest.json');
  
  // Files to include in the manifest
  const filesToHash = [
    'dino-overlay-0.1.0.js',
    'dino-overlay-0.1.0.js.map',
    'dino-overlay-loader.min-0.1.0.js',
    'fallback-loader.js',
    'script-snippet.html',
    'cdn-config.json',
    'csp-config.json',
    'security-headers.json'
  ];
  
  const manifest = {
    generated: new Date().toISOString(),
    files: {}
  };
  
  console.log('🔒 Generating integrity hashes...\n');
  
  for (const filename of filesToHash) {
    const filePath = path.join(cdnDir, filename);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Warning: ${filename} not found, skipping...`);
      continue;
    }
    
    try {
      const size = getFileSize(filePath);
      const hashes = generateHashes(filePath);
      
      manifest.files[filename] = {
        size,
        hashes,
        sri: hashes.sha384 // Use SHA-384 for SRI
      };
      
      console.log(`✅ ${filename}`);
      console.log(`   Size: ${size} bytes`);
      console.log(`   SHA-384: ${hashes.sha384}`);
      console.log('');
      
    } catch (error) {
      console.error(`❌ Error processing ${filename}:`, error.message);
    }
  }
  
  // Write the manifest
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`📄 Integrity manifest written to: ${manifestPath}`);
  
  return manifest;
}

/**
 * Update CDN configuration with new integrity hashes
 */
function updateCDNConfig(manifest) {
  const configPath = path.join(__dirname, 'cdn-config.json');
  
  if (!fs.existsSync(configPath)) {
    console.error('❌ CDN configuration file not found');
    return;
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  // Update integrity hashes for main files
  for (const file of config.files) {
    const manifestEntry = manifest.files[file.source];
    if (manifestEntry) {
      file.integrity = manifestEntry.sri;
      file.size = manifestEntry.size;
    }
  }
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('✅ CDN configuration updated with new integrity hashes');
}

/**
 * Update CSP configuration with new hashes
 */
function updateCSPConfig(manifest) {
  const cspPath = path.join(__dirname, 'csp-config.json');
  
  if (!fs.existsSync(cspPath)) {
    console.error('❌ CSP configuration file not found');
    return;
  }
  
  const csp = JSON.parse(fs.readFileSync(cspPath, 'utf8'));
  
  // Build script-src with integrity hashes
  const scriptHashes = [];
  const scriptFiles = [
    'dino-overlay-0.1.0.js',
    'dino-overlay-loader.min-0.1.0.js',
    'fallback-loader.js'
  ];
  
  for (const filename of scriptFiles) {
    const manifestEntry = manifest.files[filename];
    if (manifestEntry) {
      scriptHashes.push(manifestEntry.sri);
    }
  }
  
  // Update script-src with new hashes
  const baseScriptSrc = "'self' https://cdn.dinooverlay.com https://backup-cdn.dinooverlay.com";
  csp['script-src'] = `${baseScriptSrc} '${scriptHashes.join("' '")}'`;
  
  fs.writeFileSync(cspPath, JSON.stringify(csp, null, 2));
  console.log('✅ CSP configuration updated with new integrity hashes');
}

/**
 * Generate script snippet with updated integrity hashes
 */
function updateScriptSnippet(manifest) {
  const snippetPath = path.join(__dirname, 'script-snippet.html');
  const loaderEntry = manifest.files['dino-overlay-loader.min-0.1.0.js'];
  
  if (!loaderEntry) {
    console.error('❌ Loader file not found in manifest');
    return;
  }
  
  const snippet = `<!-- DinoOverlay Widget Integration Snippet -->
<!-- Add this to your website's <head> section -->

<script 
  src="https://cdn.dinooverlay.com/v1/dino-overlay-loader.min-0.1.0.js"
  integrity="${loaderEntry.sri}"
  crossorigin="anonymous"
  async>
</script>

<script>
  window.DinoOverlayConfig = {
    apiKey: 'your-api-key-here',
    apiEndpoint: 'https://api.dinooverlay.com',
    theme: 'auto',
    enableAnalytics: true,
    debug: false
  };
</script>

<!-- 
  Usage: Add the 'editable-room' class to any images you want to make editable
  Example: <img src="room.jpg" alt="Living Room" class="editable-room" />
-->`;
  
  fs.writeFileSync(snippetPath, snippet);
  console.log('✅ Script snippet updated with new integrity hash');
}

/**
 * Main function
 */
function main() {
  console.log('🚀 DinoOverlay Integrity Hash Generator\n');
  
  try {
    // Generate integrity manifest
    const manifest = generateIntegrityManifest();
    
    // Update configuration files
    updateCDNConfig(manifest);
    updateCSPConfig(manifest);
    updateScriptSnippet(manifest);
    
    console.log('\n🎉 All integrity hashes generated and configurations updated!');
    console.log('\nNext steps:');
    console.log('1. Review the updated integrity-manifest.json');
    console.log('2. Test the integration with cdn/verify-integration.js');
    console.log('3. Deploy to CDN with the new integrity hashes');
    
  } catch (error) {
    console.error('❌ Error generating integrity hashes:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  generateHashes,
  generateIntegrityManifest,
  updateCDNConfig,
  updateCSPConfig,
  updateScriptSnippet
};
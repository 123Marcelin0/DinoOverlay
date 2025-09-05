#!/usr/bin/env node

/**
 * Integrity hash generation utility for CDN security
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Generate multiple hash types for security
 */
function generateHashes(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  
  return {
    sha256: crypto.createHash('sha256').update(fileBuffer).digest('base64'),
    sha384: crypto.createHash('sha384').update(fileBuffer).digest('base64'),
    sha512: crypto.createHash('sha512').update(fileBuffer).digest('base64'),
    md5: crypto.createHash('md5').update(fileBuffer).digest('hex'),
    size: fileBuffer.length
  };
}

/**
 * Generate SRI (Subresource Integrity) hash
 */
function generateSRIHash(filePath, algorithm = 'sha384') {
  const fileBuffer = fs.readFileSync(filePath);
  const hash = crypto.createHash(algorithm).update(fileBuffer).digest('base64');
  return `${algorithm}-${hash}`;
}

/**
 * Validate file integrity
 */
function validateIntegrity(filePath, expectedHash) {
  const [algorithm, expectedHashValue] = expectedHash.split('-');
  const actualHash = generateSRIHash(filePath, algorithm);
  return actualHash === expectedHash;
}

/**
 * Generate integrity manifest for all CDN files
 */
function generateIntegrityManifest(cdnDir) {
  const manifest = {
    generated: new Date().toISOString(),
    files: {}
  };
  
  const files = fs.readdirSync(cdnDir).filter(file => 
    file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.json')
  );
  
  for (const file of files) {
    const filePath = path.join(cdnDir, file);
    const hashes = generateHashes(filePath);
    
    manifest.files[file] = {
      size: hashes.size,
      hashes: {
        md5: hashes.md5,
        sha256: `sha256-${hashes.sha256}`,
        sha384: `sha384-${hashes.sha384}`,
        sha512: `sha512-${hashes.sha512}`
      },
      sri: `sha384-${hashes.sha384}` // Default SRI hash
    };
  }
  
  return manifest;
}

/**
 * Generate CSP (Content Security Policy) configuration
 */
function generateCSPConfig(manifest) {
  const hashes = Object.values(manifest.files)
    .map(file => file.hashes.sha384)
    .join(' ');
  
  return {
    'script-src': [
      "'self'",
      'https://cdn.dinooverlay.com',
      'https://backup-cdn.dinooverlay.com',
      `'${hashes}'`
    ].join(' '),
    'connect-src': [
      "'self'",
      'https://api.dinooverlay.com'
    ].join(' '),
    'img-src': [
      "'self'",
      'data:',
      'https://api.dinooverlay.com'
    ].join(' '),
    'style-src': [
      "'self'",
      "'unsafe-inline'" // For dynamic glassmorphic styles
    ].join(' ')
  };
}

/**
 * Generate security headers configuration
 */
function generateSecurityHeaders(manifest) {
  return {
    'Content-Security-Policy': Object.entries(generateCSPConfig(manifest))
      .map(([directive, value]) => `${directive} ${value}`)
      .join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  };
}

/**
 * Main function to generate all security artifacts
 */
function generateSecurityArtifacts(cdnDir) {
  console.log('🔒 Generating security artifacts...');
  
  // Generate integrity manifest
  const manifest = generateIntegrityManifest(cdnDir);
  const manifestPath = path.join(cdnDir, 'integrity-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`✅ Integrity manifest: ${manifestPath}`);
  
  // Generate CSP configuration
  const cspConfig = generateCSPConfig(manifest);
  const cspPath = path.join(cdnDir, 'csp-config.json');
  fs.writeFileSync(cspPath, JSON.stringify(cspConfig, null, 2));
  console.log(`✅ CSP configuration: ${cspPath}`);
  
  // Generate security headers
  const securityHeaders = generateSecurityHeaders(manifest);
  const headersPath = path.join(cdnDir, 'security-headers.json');
  fs.writeFileSync(headersPath, JSON.stringify(securityHeaders, null, 2));
  console.log(`✅ Security headers: ${headersPath}`);
  
  // Generate .htaccess for Apache
  const htaccess = generateHtaccess(securityHeaders);
  const htaccessPath = path.join(cdnDir, '.htaccess');
  fs.writeFileSync(htaccessPath, htaccess);
  console.log(`✅ Apache .htaccess: ${htaccessPath}`);
  
  // Generate nginx configuration
  const nginxConfig = generateNginxConfig(securityHeaders);
  const nginxPath = path.join(cdnDir, 'nginx.conf');
  fs.writeFileSync(nginxPath, nginxConfig);
  console.log(`✅ Nginx configuration: ${nginxPath}`);
  
  console.log(`🔒 Security artifacts generated for ${Object.keys(manifest.files).length} files`);
  
  return {
    manifest,
    cspConfig,
    securityHeaders
  };
}

/**
 * Generate Apache .htaccess configuration
 */
function generateHtaccess(headers) {
  return `# DinoOverlay CDN Security Configuration
# Generated on ${new Date().toISOString()}

# Enable CORS for CDN assets
<IfModule mod_headers.c>
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type"
    
    # Security headers
${Object.entries(headers)
  .map(([header, value]) => `    Header always set "${header}" "${value}"`)
  .join('\n')}
</IfModule>

# Cache control for static assets
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/json "access plus 1 hour"
</IfModule>

# Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
    AddOutputFilterByType DEFLATE application/json
</IfModule>

# Prevent access to sensitive files
<Files "*.json">
    <RequireAll>
        Require all denied
        Require uri /integrity-manifest.json
        Require uri /cdn-config.json
    </RequireAll>
</Files>`;
}

/**
 * Generate Nginx configuration
 */
function generateNginxConfig(headers) {
  return `# DinoOverlay CDN Security Configuration
# Generated on ${new Date().toISOString()}

server {
    listen 443 ssl http2;
    server_name cdn.dinooverlay.com backup-cdn.dinooverlay.com;
    
    # SSL configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
${Object.entries(headers)
  .map(([header, value]) => `    add_header "${header}" "${value}" always;`)
  .join('\n')}
    
    # CORS headers
    add_header "Access-Control-Allow-Origin" "*" always;
    add_header "Access-Control-Allow-Methods" "GET, OPTIONS" always;
    add_header "Access-Control-Allow-Headers" "Content-Type" always;
    
    # Cache control
    location ~* \\.(js|css)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location ~* \\.(json)$ {
        expires 1h;
        add_header Cache-Control "public";
    }
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # Security restrictions
    location ~ /\\. {
        deny all;
    }
    
    location ~* \\.(json)$ {
        location ~ ^/(integrity-manifest|cdn-config)\\.json$ {
            # Allow access to specific JSON files
        }
        deny all;
    }
}`;
}

// CLI interface
if (require.main === module) {
  const cdnDir = process.argv[2] || path.resolve(__dirname, '../cdn');
  
  if (!fs.existsSync(cdnDir)) {
    console.error(`CDN directory not found: ${cdnDir}`);
    process.exit(1);
  }
  
  try {
    generateSecurityArtifacts(cdnDir);
    console.log('🎉 Security artifacts generated successfully!');
  } catch (error) {
    console.error('❌ Failed to generate security artifacts:', error.message);
    process.exit(1);
  }
}

module.exports = {
  generateHashes,
  generateSRIHash,
  validateIntegrity,
  generateIntegrityManifest,
  generateCSPConfig,
  generateSecurityHeaders,
  generateSecurityArtifacts
};
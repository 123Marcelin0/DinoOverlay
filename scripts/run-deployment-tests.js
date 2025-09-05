#!/usr/bin/env node

/**
 * Comprehensive Deployment Test Runner
 * Executes all integration and deployment validation tests
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Test configuration
const TEST_CONFIG = {
  timeout: 300000, // 5 minutes
  retries: 2,
  parallel: true,
  browsers: ['chromium', 'firefox', 'webkit'],
  environments: ['development', 'staging', 'production']
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  log(`\n${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  log(`${colors.bright}${colors.blue}${title}${colors.reset}`);
  log(`${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`);
}

function logSuccess(message) {
  log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
  log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logWarning(message) {
  log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logInfo(message) {
  log(`${colors.cyan}ℹ️  ${message}${colors.reset}`);
}

/**
 * Execute command with proper error handling
 */
function executeCommand(command, description, options = {}) {
  log(`\n${colors.cyan}Running: ${description}${colors.reset}`);
  log(`${colors.cyan}Command: ${command}${colors.reset}`);
  
  try {
    const result = execSync(command, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'test' },
      ...options
    });
    
    logSuccess(`${description} completed successfully`);
    return { success: true, output: result };
  } catch (error) {
    logError(`${description} failed`);
    logError(`Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Check system prerequisites
 */
function checkPrerequisites() {
  logSection('Checking Prerequisites');
  
  const checks = [
    {
      name: 'Node.js version',
      command: 'node --version',
      validator: (output) => {
        const version = output.toString().trim();
        const majorVersion = parseInt(version.replace('v', '').split('.')[0]);
        return majorVersion >= 16;
      }
    },
    {
      name: 'npm availability',
      command: 'npm --version',
      validator: () => true
    },
    {
      name: 'Playwright installation',
      command: 'npx playwright --version',
      validator: () => true
    },
    {
      name: 'Project dependencies',
      command: 'npm list --depth=0',
      validator: () => true,
      optional: true
    }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    try {
      const output = execSync(check.command, { stdio: 'pipe' });
      const isValid = check.validator(output);
      
      if (isValid) {
        logSuccess(`${check.name}: OK`);
      } else {
        logError(`${check.name}: Invalid`);
        if (!check.optional) allPassed = false;
      }
    } catch (error) {
      logError(`${check.name}: Not available`);
      if (!check.optional) allPassed = false;
    }
  }
  
  if (!allPassed) {
    logError('Prerequisites check failed. Please install missing dependencies.');
    process.exit(1);
  }
  
  logSuccess('All prerequisites satisfied');
  return true;
}

/**
 * Build project for testing
 */
function buildProject() {
  logSection('Building Project');
  
  const buildSteps = [
    {
      command: 'npm run build:widget',
      description: 'Building widget bundle'
    },
    {
      command: 'npm run build:cdn',
      description: 'Building CDN files'
    },
    {
      command: 'npm run build:security',
      description: 'Generating security artifacts'
    }
  ];
  
  for (const step of buildSteps) {
    const result = executeCommand(step.command, step.description);
    if (!result.success) {
      logError('Build process failed. Cannot proceed with testing.');
      process.exit(1);
    }
  }
  
  logSuccess('Project build completed successfully');
  return true;
}

/**
 * Verify build artifacts
 */
function verifyBuildArtifacts() {
  logSection('Verifying Build Artifacts');
  
  const requiredFiles = [
    'dist/dino-overlay-0.1.0.js',
    'dist/dino-overlay-0.1.0.js.map',
    'cdn/dino-overlay-loader.min-0.1.0.js',
    'cdn/cdn-config.json',
    'cdn/integrity-manifest.json',
    'cdn/security-headers.json'
  ];
  
  let allFilesExist = true;
  
  for (const file of requiredFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const sizeKB = Math.round(stats.size / 1024);
      logSuccess(`${file} (${sizeKB}KB)`);
    } else {
      logError(`Missing: ${file}`);
      allFilesExist = false;
    }
  }
  
  if (!allFilesExist) {
    logError('Required build artifacts are missing');
    process.exit(1);
  }
  
  // Verify CDN integration
  const result = executeCommand(
    'node cdn/verify-integration.js',
    'Verifying CDN integration'
  );
  
  if (!result.success) {
    logError('CDN integration verification failed');
    process.exit(1);
  }
  
  logSuccess('All build artifacts verified');
  return true;
}

/**
 * Run unit tests
 */
function runUnitTests() {
  logSection('Running Unit Tests');
  
  const result = executeCommand(
    'npm run test:coverage',
    'Running unit tests with coverage'
  );
  
  if (!result.success) {
    logError('Unit tests failed');
    return false;
  }
  
  // Check coverage threshold
  const coveragePath = path.join(process.cwd(), 'coverage/coverage-summary.json');
  if (fs.existsSync(coveragePath)) {
    const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    const totalCoverage = coverage.total;
    
    logInfo(`Coverage Summary:`);
    logInfo(`  Lines: ${totalCoverage.lines.pct}%`);
    logInfo(`  Functions: ${totalCoverage.functions.pct}%`);
    logInfo(`  Branches: ${totalCoverage.branches.pct}%`);
    logInfo(`  Statements: ${totalCoverage.statements.pct}%`);
    
    const minCoverage = 90;
    const coverageOk = totalCoverage.lines.pct >= minCoverage &&
                      totalCoverage.functions.pct >= minCoverage &&
                      totalCoverage.branches.pct >= minCoverage &&
                      totalCoverage.statements.pct >= minCoverage;
    
    if (coverageOk) {
      logSuccess(`Coverage meets ${minCoverage}% requirement`);
    } else {
      logWarning(`Coverage below ${minCoverage}% requirement`);
    }
  }
  
  logSuccess('Unit tests completed');
  return true;
}

/**
 * Run integration tests
 */
function runIntegrationTests() {
  logSection('Running Integration Tests');
  
  const integrationTests = [
    {
      command: 'npm test -- test/integration/real-estate-integration.test.ts',
      description: 'Real estate platform integration tests'
    },
    {
      command: 'npm test -- test/integration/cdn-deployment.test.ts',
      description: 'CDN deployment integration tests'
    },
    {
      command: 'npm test -- test/integration/api-workflow.test.ts',
      description: 'API workflow integration tests'
    }
  ];
  
  let allPassed = true;
  
  for (const test of integrationTests) {
    const result = executeCommand(test.command, test.description);
    if (!result.success) {
      allPassed = false;
      logError(`Integration test failed: ${test.description}`);
    }
  }
  
  if (allPassed) {
    logSuccess('All integration tests passed');
  } else {
    logError('Some integration tests failed');
  }
  
  return allPassed;
}

/**
 * Run E2E tests
 */
function runE2ETests() {
  logSection('Running End-to-End Tests');
  
  const e2eTests = [
    {
      command: 'npm run test:e2e',
      description: 'Core E2E functionality tests'
    },
    {
      command: 'npm run test:e2e:cross-browser',
      description: 'Cross-browser compatibility tests'
    },
    {
      command: 'npm run test:e2e:accessibility',
      description: 'E2E accessibility tests'
    }
  ];
  
  let allPassed = true;
  
  for (const test of e2eTests) {
    const result = executeCommand(test.command, test.description);
    if (!result.success) {
      allPassed = false;
      logError(`E2E test failed: ${test.description}`);
    }
  }
  
  if (allPassed) {
    logSuccess('All E2E tests passed');
  } else {
    logError('Some E2E tests failed');
  }
  
  return allPassed;
}

/**
 * Run performance tests
 */
function runPerformanceTests() {
  logSection('Running Performance Tests');
  
  const performanceTests = [
    {
      command: 'npm run test:bundle-size',
      description: 'Bundle size performance tests'
    },
    {
      command: 'npm run test:performance',
      description: 'Load time performance tests'
    }
  ];
  
  let allPassed = true;
  
  for (const test of performanceTests) {
    const result = executeCommand(test.command, test.description);
    if (!result.success) {
      allPassed = false;
      logError(`Performance test failed: ${test.description}`);
    }
  }
  
  if (allPassed) {
    logSuccess('All performance tests passed');
  } else {
    logError('Some performance tests failed');
  }
  
  return allPassed;
}

/**
 * Run deployment validation tests
 */
function runDeploymentValidation() {
  logSection('Running Deployment Validation');
  
  const result = executeCommand(
    'npm test -- test/integration/deployment-validation.test.ts',
    'Comprehensive deployment validation'
  );
  
  if (result.success) {
    logSuccess('Deployment validation passed');
  } else {
    logError('Deployment validation failed');
  }
  
  return result.success;
}

/**
 * Generate test report
 */
function generateTestReport(results) {
  logSection('Generating Test Report');
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: os.platform(),
      arch: os.arch(),
      memory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB'
    },
    results: results,
    summary: {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    }
  };
  
  const reportPath = path.join(process.cwd(), 'deployment-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  logInfo(`Test report saved to: ${reportPath}`);
  
  // Console summary
  log(`\n${colors.bright}Test Summary:${colors.reset}`);
  log(`${colors.bright}=============${colors.reset}`);
  log(`Total test suites: ${report.summary.total}`);
  log(`${colors.green}Passed: ${report.summary.passed}${colors.reset}`);
  log(`${colors.red}Failed: ${report.summary.failed}${colors.reset}`);
  
  // Detailed results
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    const color = result.success ? colors.green : colors.red;
    log(`${color}${status} ${result.name}${colors.reset}`);
  });
  
  return report;
}

/**
 * Main test execution function
 */
async function runDeploymentTests() {
  log(`${colors.bright}${colors.magenta}DinoOverlay Deployment Test Suite${colors.reset}`);
  log(`${colors.bright}${colors.magenta}=================================${colors.reset}`);
  
  const startTime = Date.now();
  const results = [];
  
  try {
    // Prerequisites
    checkPrerequisites();
    
    // Build
    const buildResult = buildProject();
    results.push({ name: 'Project Build', success: buildResult });
    
    // Verify artifacts
    const artifactsResult = verifyBuildArtifacts();
    results.push({ name: 'Build Artifacts Verification', success: artifactsResult });
    
    // Unit tests
    const unitResult = runUnitTests();
    results.push({ name: 'Unit Tests', success: unitResult });
    
    // Integration tests
    const integrationResult = runIntegrationTests();
    results.push({ name: 'Integration Tests', success: integrationResult });
    
    // E2E tests
    const e2eResult = runE2ETests();
    results.push({ name: 'End-to-End Tests', success: e2eResult });
    
    // Performance tests
    const performanceResult = runPerformanceTests();
    results.push({ name: 'Performance Tests', success: performanceResult });
    
    // Deployment validation
    const deploymentResult = runDeploymentValidation();
    results.push({ name: 'Deployment Validation', success: deploymentResult });
    
  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
    results.push({ name: 'Test Execution', success: false, error: error.message });
  }
  
  // Generate report
  const report = generateTestReport(results);
  
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  log(`\n${colors.bright}Execution completed in ${duration} seconds${colors.reset}`);
  
  // Final status
  const allPassed = results.every(r => r.success);
  
  if (allPassed) {
    log(`\n${colors.green}${colors.bright}🎉 All tests passed! System is ready for deployment.${colors.reset}`);
    process.exit(0);
  } else {
    log(`\n${colors.red}${colors.bright}❌ Some tests failed. Please fix issues before deployment.${colors.reset}`);
    process.exit(1);
  }
}

/**
 * CLI interface
 */
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
DinoOverlay Deployment Test Runner

Usage: node scripts/run-deployment-tests.js [options]

Options:
  --help, -h          Show this help message
  --skip-build        Skip the build step
  --skip-unit         Skip unit tests
  --skip-integration  Skip integration tests
  --skip-e2e          Skip E2E tests
  --skip-performance  Skip performance tests
  --verbose           Enable verbose output
  --parallel          Run tests in parallel (default)
  --sequential        Run tests sequentially

Examples:
  node scripts/run-deployment-tests.js
  node scripts/run-deployment-tests.js --skip-build --verbose
  node scripts/run-deployment-tests.js --skip-e2e --skip-performance
    `);
    process.exit(0);
  }
  
  // Handle process termination
  process.on('SIGINT', () => {
    log(`\n${colors.yellow}Test execution interrupted by user${colors.reset}`);
    process.exit(1);
  });
  
  process.on('uncaughtException', (error) => {
    logError(`Uncaught exception: ${error.message}`);
    process.exit(1);
  });
  
  // Run tests
  runDeploymentTests().catch((error) => {
    logError(`Test runner failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runDeploymentTests,
  checkPrerequisites,
  buildProject,
  verifyBuildArtifacts,
  runUnitTests,
  runIntegrationTests,
  runE2ETests,
  runPerformanceTests,
  runDeploymentValidation,
  generateTestReport
};
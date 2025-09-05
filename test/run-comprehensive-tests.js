#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Runs all test suites and generates coverage reports
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n${colors.blue}Running: ${description}${colors.reset}`);
  log(`${colors.cyan}Command: ${command}${colors.reset}`);
  
  try {
    const output = execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: 'test' }
    });
    log(`${colors.green}✓ ${description} completed successfully${colors.reset}`);
    return true;
  } catch (error) {
    log(`${colors.red}✗ ${description} failed${colors.reset}`);
    log(`${colors.red}Error: ${error.message}${colors.reset}`);
    return false;
  }
}

function checkPrerequisites() {
  log(`${colors.bright}Checking prerequisites...${colors.reset}`);
  
  // Check if dist directory exists
  const distPath = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distPath)) {
    log(`${colors.yellow}Warning: dist directory not found. Building widget...${colors.reset}`);
    if (!runCommand('npm run build:widget', 'Widget build')) {
      log(`${colors.red}Failed to build widget. Some tests may fail.${colors.reset}`);
      return false;
    }
  }
  
  // Check if test server can be started
  try {
    execSync('npx serve --version', { stdio: 'ignore' });
  } catch (error) {
    log(`${colors.red}Error: 'serve' package not found. Install with: npm install -g serve${colors.reset}`);
    return false;
  }
  
  return true;
}

function generateTestReport(results) {
  const reportPath = path.join(process.cwd(), 'test-results.json');
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    },
    results: results,
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`${colors.cyan}Test report saved to: ${reportPath}${colors.reset}`);
  
  return report;
}

async function main() {
  log(`${colors.bright}${colors.magenta}DinoOverlay Comprehensive Test Suite${colors.reset}`);
  log(`${colors.bright}=====================================${colors.reset}`);
  
  if (!checkPrerequisites()) {
    process.exit(1);
  }
  
  const testSuites = [
    {
      name: 'Unit Tests',
      command: 'npm run test:coverage',
      description: 'Running unit tests with coverage',
      required: true,
    },
    {
      name: 'Integration Tests',
      command: 'npm test -- test/integration',
      description: 'Running integration tests',
      required: true,
    },
    {
      name: 'Performance Tests - Bundle Size',
      command: 'npm run test:bundle-size',
      description: 'Running bundle size performance tests',
      required: true,
    },
    {
      name: 'Performance Tests - Load Time',
      command: 'npm run test:performance',
      description: 'Running load time performance tests',
      required: false,
    },
    {
      name: 'Accessibility Tests - Unit',
      command: 'npm test -- test/accessibility',
      description: 'Running accessibility unit tests',
      required: true,
    },
    {
      name: 'E2E Tests - Core Functionality',
      command: 'npm run test:e2e',
      description: 'Running end-to-end tests',
      required: true,
    },
    {
      name: 'E2E Tests - Cross-browser',
      command: 'npx playwright test e2e/cross-browser-compatibility.spec.ts',
      description: 'Running cross-browser compatibility tests',
      required: false,
    },
    {
      name: 'E2E Tests - Accessibility',
      command: 'npx playwright test e2e/accessibility.spec.ts',
      description: 'Running E2E accessibility tests',
      required: true,
    },
  ];
  
  const results = [];
  let hasFailures = false;
  
  for (const suite of testSuites) {
    const success = runCommand(suite.command, suite.description);
    
    results.push({
      name: suite.name,
      command: suite.command,
      success: success,
      required: suite.required,
    });
    
    if (!success && suite.required) {
      hasFailures = true;
      log(`${colors.red}Required test suite failed: ${suite.name}${colors.reset}`);
    } else if (!success) {
      log(`${colors.yellow}Optional test suite failed: ${suite.name}${colors.reset}`);
    }
  }
  
  // Generate coverage report
  log(`\n${colors.blue}Generating comprehensive coverage report...${colors.reset}`);
  runCommand('npm run test:coverage -- --coverageReporters=html --coverageReporters=text-summary', 'Coverage report generation');
  
  // Generate test report
  const report = generateTestReport(results);
  
  // Print summary
  log(`\n${colors.bright}Test Summary:${colors.reset}`);
  log(`${colors.bright}=============${colors.reset}`);
  log(`Total test suites: ${report.summary.total}`);
  log(`${colors.green}Passed: ${report.summary.passed}${colors.reset}`);
  log(`${colors.red}Failed: ${report.summary.failed}${colors.reset}`);
  
  if (hasFailures) {
    log(`\n${colors.red}${colors.bright}Some required tests failed. Please fix the issues before proceeding.${colors.reset}`);
    process.exit(1);
  } else {
    log(`\n${colors.green}${colors.bright}All required tests passed! 🎉${colors.reset}`);
    
    if (report.summary.failed > 0) {
      log(`${colors.yellow}Note: Some optional tests failed. Consider fixing them for better coverage.${colors.reset}`);
    }
    
    // Check coverage threshold
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    if (fs.existsSync(coveragePath)) {
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const totalCoverage = coverage.total;
      
      log(`\n${colors.bright}Coverage Summary:${colors.reset}`);
      log(`Lines: ${totalCoverage.lines.pct}%`);
      log(`Functions: ${totalCoverage.functions.pct}%`);
      log(`Branches: ${totalCoverage.branches.pct}%`);
      log(`Statements: ${totalCoverage.statements.pct}%`);
      
      const minCoverage = 90;
      const coverageOk = totalCoverage.lines.pct >= minCoverage &&
                        totalCoverage.functions.pct >= minCoverage &&
                        totalCoverage.branches.pct >= minCoverage &&
                        totalCoverage.statements.pct >= minCoverage;
      
      if (coverageOk) {
        log(`${colors.green}✓ Coverage meets 90% requirement${colors.reset}`);
      } else {
        log(`${colors.yellow}⚠ Coverage below 90% requirement${colors.reset}`);
      }
    }
    
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log(`\n${colors.yellow}Test run interrupted by user${colors.reset}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log(`${colors.red}Uncaught exception: ${error.message}${colors.reset}`);
  process.exit(1);
});

main().catch((error) => {
  log(`${colors.red}Test runner failed: ${error.message}${colors.reset}`);
  process.exit(1);
});
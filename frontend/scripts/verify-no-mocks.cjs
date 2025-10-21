#!/usr/bin/env node

/**
 * Build-time verification script
 * Ensures production bundles do NOT contain mock authentication code
 * SECURITY: This prevents accidental deployment of mock auth to production
 */

const fs = require('fs');
const path = require('path');

// Patterns that should NEVER appear in production bundles
const FORBIDDEN_PATTERNS = [
  'mockLogin',
  'mockRegister',
  'mockUserProfile',
  'mock-access-token',
  'mock-refresh-token',
  '/mocks/auth',
  'src/mocks',
];

// Files to check (all JavaScript bundles)
const DIST_PATH = path.join(__dirname, '..', 'dist', 'assets');

// Get all .js files in dist/assets using Node.js built-in methods
const jsFiles = fs.existsSync(DIST_PATH)
  ? fs
      .readdirSync(DIST_PATH)
      .filter((file) => file.endsWith('.js'))
      .map((file) => path.join(DIST_PATH, file))
  : [];

if (jsFiles.length === 0) {
  console.error('❌ ERROR: No JavaScript files found in dist/assets/');
  console.error('   Run `npm run build` first');
  process.exit(1);
}

let foundIssues = false;
const results = [];

console.log('🔍 Scanning production bundle for mock code...\n');

jsFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const fileName = path.basename(file);
  const fileSizeKB = (fs.statSync(file).size / 1024).toFixed(2);

  console.log(`   Checking: ${fileName} (${fileSizeKB} KB)`);

  const foundPatterns = [];

  FORBIDDEN_PATTERNS.forEach((pattern) => {
    if (content.includes(pattern)) {
      foundPatterns.push(pattern);
      foundIssues = true;
    }
  });

  if (foundPatterns.length > 0) {
    results.push({
      file: fileName,
      patterns: foundPatterns,
    });
  }
});

console.log('\n' + '='.repeat(60));

if (foundIssues) {
  console.error('\n❌ SECURITY VULNERABILITY: Mock code detected in production bundle!\n');

  results.forEach(({ file, patterns }) => {
    console.error(`   File: ${file}`);
    console.error(`   Found patterns: ${patterns.join(', ')}\n`);
  });

  console.error('⚠️  Mock authentication code MUST NOT be deployed to production!');
  console.error('   This is a CRITICAL security vulnerability.\n');
  console.error('Action Required:');
  console.error('  1. Ensure mocks are only imported with \`if (import.meta.env.DEV)\`');
  console.error('  2. Use dynamic imports: \`await import("../mocks/auth")\`');
  console.error('  3. Verify Vite tree-shaking is enabled');
  console.error('  4. Re-run \`npm run build\` and this script\n');

  process.exit(1);
} else {
  console.log('\n✅ SUCCESS: No mock code found in production bundle');
  console.log(`   Scanned ${jsFiles.length} JavaScript file(s)`);
  console.log('   All forbidden patterns checked: ' + FORBIDDEN_PATTERNS.join(', '));
  console.log('\n🔒 Production bundle is secure - safe to deploy\n');

  process.exit(0);
}

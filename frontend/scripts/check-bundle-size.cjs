#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const { gzipSizeSync } = require('gzip-size');

const BUDGETS = {
  'index-*.js': 300 * 1024, // 300 KB
  'react-vendor-*.js': 100 * 1024, // 100 KB
  'xstate-vendor-*.js': 100 * 1024, // 100 KB
  '*.css': 50 * 1024, // 50 KB
};

const distPath = path.join(__dirname, '..', 'dist', 'assets');

// Check if dist directory exists
if (!fs.existsSync(distPath)) {
  console.error('❌ dist/assets directory not found. Run build first.');
  process.exit(1);
}

let failed = false;
const results = [];

console.log('📦 Checking bundle sizes...\n');

Object.entries(BUDGETS).forEach(([pattern, budget]) => {
  const files = globSync(path.join(distPath, pattern));

  if (files.length === 0) {
    console.warn(`⚠️  No files found matching pattern: ${pattern}`);
    return;
  }

  files.forEach((file) => {
    const content = fs.readFileSync(file);
    const size = gzipSizeSync(content);
    const budgetKB = (budget / 1024).toFixed(2);
    const sizeKB = (size / 1024).toFixed(2);
    const percentage = ((size / budget) * 100).toFixed(1);

    const result = {
      file: path.basename(file),
      'size (KB)': sizeKB,
      'budget (KB)': budgetKB,
      'usage (%)': percentage,
      status: size <= budget ? '✅' : '❌',
    };

    results.push(result);

    if (size > budget) {
      failed = true;
      console.error(
        `❌ ${path.basename(file)}: ${sizeKB}KB exceeds budget of ${budgetKB}KB (${percentage}%)`
      );
    } else {
      console.log(
        `✅ ${path.basename(file)}: ${sizeKB}KB within budget of ${budgetKB}KB (${percentage}%)`
      );
    }
  });
});

// Generate summary
console.log('\n📊 Bundle Size Summary');
console.table(results);

// Calculate total JS size
const allJsFiles = globSync(path.join(distPath, '*.js'));
const totalJsSize = allJsFiles.reduce((total, file) => {
  const content = fs.readFileSync(file);
  return total + gzipSizeSync(content);
}, 0);
const totalJsSizeKB = (totalJsSize / 1024).toFixed(2);

console.log(`\n📈 Total JS (gzipped): ${totalJsSizeKB}KB`);

if (failed) {
  console.error('\n❌ Bundle size check FAILED - some files exceed budget limits');
  process.exit(1);
} else {
  console.log('\n✅ All bundles within budget limits');
  process.exit(0);
}

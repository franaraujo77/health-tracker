/**
 * Tests for Validation Status Comment Generator
 */

const {
  generateStatusComment,
  generateValidationTable,
  generateSummary,
  generateErrorDetails,
  generateLinks,
  statusToEmoji,
  EMOJI,
} = require('./generate-status-comment');

// Test statusToEmoji
function testStatusToEmoji() {
  console.log('Testing statusToEmoji...');

  const tests = [
    { input: 'success', expected: EMOJI.SUCCESS },
    { input: 'SUCCESS', expected: EMOJI.SUCCESS },
    { input: 'failure', expected: EMOJI.FAIL },
    { input: 'FAILURE', expected: EMOJI.FAIL },
    { input: 'warning', expected: EMOJI.WARNING },
    { input: 'skipped', expected: EMOJI.SKIP },
    { input: 'unknown', expected: EMOJI.INFO },
    { input: null, expected: EMOJI.INFO },
    { input: undefined, expected: EMOJI.INFO },
  ];

  tests.forEach(({ input, expected }) => {
    const result = statusToEmoji(input);
    if (result !== expected) {
      throw new Error(`Failed: statusToEmoji(${input}) = ${result}, expected ${expected}`);
    }
  });

  console.log('✓ statusToEmoji tests passed');
}

// Test generateValidationTable
function testGenerateValidationTable() {
  console.log('Testing generateValidationTable...');

  // Test with all success
  const allSuccess = {
    frontend: {
      lintStatus: 'success',
      typeStatus: 'success',
      testStatus: 'success',
      buildStatus: 'success',
    },
    backend: {
      buildStatus: 'success',
      unitTestStatus: 'success',
      integrationTestStatus: 'success',
      coverageStatus: 'success',
    },
    security: {
      dependencyScanStatus: 'success',
      sastStatus: 'success',
    },
  };

  const table = generateValidationTable(allSuccess);

  if (!table.includes('| Stage | Check | Status | Details |')) {
    throw new Error('Table missing header row');
  }

  if (!table.includes('**Frontend**')) {
    throw new Error('Table missing Frontend section');
  }

  if (!table.includes('**Backend**')) {
    throw new Error('Table missing Backend section');
  }

  if (!table.includes('**Security**')) {
    throw new Error('Table missing Security section');
  }

  if (!table.includes(EMOJI.SUCCESS)) {
    throw new Error('Table missing success emoji');
  }

  // Test with failures
  const withFailures = {
    frontend: {
      lintStatus: 'failure',
      typeStatus: 'failure',
      testStatus: 'success',
      buildStatus: 'success',
    },
    backend: {},
    security: {},
  };

  const failTable = generateValidationTable(withFailures);
  if (!failTable.includes(EMOJI.FAIL)) {
    throw new Error('Table missing fail emoji for failures');
  }

  console.log('✓ generateValidationTable tests passed');
}

// Test generateSummary
function testGenerateSummary() {
  console.log('Testing generateSummary...');

  // Test all passed
  const summaryAllPass = generateSummary([], true, false);
  if (!summaryAllPass.includes('All validations passed')) {
    throw new Error('Summary missing "all passed" message');
  }

  // Test critical failures
  const errors = [
    { message: 'Error 1', severity: 'critical' },
    { message: 'Error 2', severity: 'critical' },
    { message: 'Warning 1', severity: 'warning' },
  ];
  const summaryCritical = generateSummary(errors, false, true);
  if (!summaryCritical.includes('Critical failures detected')) {
    throw new Error('Summary missing "critical failures" message');
  }
  if (!summaryCritical.includes('2 critical')) {
    throw new Error('Summary missing critical count');
  }
  if (!summaryCritical.includes('1 warnings')) {
    throw new Error('Summary missing warning count');
  }

  // Test non-critical issues
  const warnings = [{ message: 'Warning 1', severity: 'warning' }];
  const summaryWarnings = generateSummary(warnings, false, false);
  if (!summaryWarnings.includes('Non-critical issues')) {
    throw new Error('Summary missing "non-critical" message');
  }

  console.log('✓ generateSummary tests passed');
}

// Test generateErrorDetails
function testGenerateErrorDetails() {
  console.log('Testing generateErrorDetails...');

  // Test with no errors
  const noErrors = generateErrorDetails([]);
  if (noErrors !== '') {
    throw new Error('Expected empty string for no errors');
  }

  // Test with critical errors
  const criticalErrors = [
    { message: 'Critical error 1', severity: 'critical' },
    { message: 'Critical error 2', severity: 'critical' },
  ];
  const criticalDetails = generateErrorDetails(criticalErrors);
  if (!criticalDetails.includes('<details>')) {
    throw new Error('Missing details tag');
  }
  if (!criticalDetails.includes('Critical Failures')) {
    throw new Error('Missing critical failures section');
  }
  if (!criticalDetails.includes('Critical error 1')) {
    throw new Error('Missing error message');
  }

  // Test with warnings
  const warnings = [{ message: 'Warning 1', severity: 'warning' }];
  const warningDetails = generateErrorDetails(warnings);
  if (!warningDetails.includes('Warnings')) {
    throw new Error('Missing warnings section');
  }

  // Test with mixed errors
  const mixed = [
    { message: 'Critical 1', severity: 'critical' },
    { message: 'Warning 1', severity: 'warning' },
  ];
  const mixedDetails = generateErrorDetails(mixed);
  if (!mixedDetails.includes('Critical Failures') || !mixedDetails.includes('Warnings')) {
    throw new Error('Missing both critical and warning sections');
  }

  console.log('✓ generateErrorDetails tests passed');
}

// Test generateLinks
function testGenerateLinks() {
  console.log('Testing generateLinks...');

  const links = generateLinks('12345', 'https://github.com/user/repo/actions/runs/12345');

  if (!links.includes('### Links')) {
    throw new Error('Missing links header');
  }

  if (!links.includes('View Full Workflow Run')) {
    throw new Error('Missing workflow run link');
  }

  if (!links.includes('12345')) {
    throw new Error('Missing workflow run ID');
  }

  if (!links.includes('Updated:')) {
    throw new Error('Missing timestamp');
  }

  console.log('✓ generateLinks tests passed');
}

// Test generateStatusComment (integration test)
function testGenerateStatusComment() {
  console.log('Testing generateStatusComment...');

  const validationReport = {
    all_passed: true,
    has_critical_failures: false,
    errors: [],
    timestamp: '2025-10-19T20:00:00Z',
  };

  const options = {
    workflowRunId: '12345',
    workflowRunUrl: 'https://github.com/user/repo/actions/runs/12345',
    validationData: {
      frontend: {
        lintStatus: 'success',
        typeStatus: 'success',
        testStatus: 'success',
        buildStatus: 'success',
      },
      backend: {
        buildStatus: 'success',
        unitTestStatus: 'success',
        integrationTestStatus: 'success',
        coverageStatus: 'success',
      },
      security: {
        dependencyScanStatus: 'success',
        sastStatus: 'success',
      },
    },
  };

  const comment = generateStatusComment(validationReport, options);

  // Verify marker is present
  if (!comment.includes('<!-- validation-status-reporter -->')) {
    throw new Error('Missing comment marker');
  }

  // Verify header
  if (!comment.includes('## 🔍 Validation Status Report')) {
    throw new Error('Missing report header');
  }

  // Verify summary
  if (!comment.includes('All validations passed')) {
    throw new Error('Missing success summary');
  }

  // Verify table is present
  if (!comment.includes('| Stage | Check | Status | Details |')) {
    throw new Error('Missing validation table');
  }

  // Verify links
  if (!comment.includes('View Full Workflow Run')) {
    throw new Error('Missing workflow link');
  }

  // Verify footer
  if (!comment.includes('automatically updated')) {
    throw new Error('Missing footer');
  }

  // Test with failures
  const failedReport = {
    all_passed: false,
    has_critical_failures: true,
    errors: [
      { message: 'Frontend: Build failed (CRITICAL)', severity: 'critical' },
      { message: 'Backend: Tests failed (CRITICAL)', severity: 'critical' },
    ],
    timestamp: '2025-10-19T20:00:00Z',
  };

  const failedComment = generateStatusComment(failedReport, options);
  if (!failedComment.includes('Critical failures detected')) {
    throw new Error('Missing critical failure message in failed comment');
  }

  console.log('✓ generateStatusComment tests passed');
}

// Test edge cases
function testEdgeCases() {
  console.log('Testing edge cases...');

  // Empty validation data
  const emptyTable = generateValidationTable({});
  if (!emptyTable.includes('unknown')) {
    throw new Error('Empty data should show unknown status');
  }

  // Null errors
  const nullErrorDetails = generateErrorDetails(null);
  if (nullErrorDetails !== '') {
    throw new Error('Null errors should return empty string');
  }

  // Undefined status
  const undefinedEmoji = statusToEmoji(undefined);
  if (undefinedEmoji !== EMOJI.INFO) {
    throw new Error('Undefined status should return INFO emoji');
  }

  // JSON string input
  const jsonString = JSON.stringify({
    all_passed: true,
    has_critical_failures: false,
    errors: [],
  });
  const comment = generateStatusComment(jsonString, {});
  if (!comment.includes('Validation Status Report')) {
    throw new Error('Should handle JSON string input');
  }

  console.log('✓ Edge case tests passed');
}

// Run all tests
function runAllTests() {
  console.log('========================================');
  console.log('Running Validation Status Reporter Tests');
  console.log('========================================\n');

  try {
    testStatusToEmoji();
    testGenerateValidationTable();
    testGenerateSummary();
    testGenerateErrorDetails();
    testGenerateLinks();
    testGenerateStatusComment();
    testEdgeCases();

    console.log('\n========================================');
    console.log('✅ All tests passed!');
    console.log('========================================');
    process.exit(0);
  } catch (error) {
    console.error('\n========================================');
    console.error('❌ Test failed:', error.message);
    console.error('========================================');
    process.exit(1);
  }
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };

#!/usr/bin/env node

/**
 * Validation Status Comment Generator
 *
 * Generates comprehensive markdown comment for PR validation status
 * Includes tables, emoji indicators, links, and expandable details
 */

const fs = require('fs');
const path = require('path');

// Emoji constants for visual clarity
const EMOJI = {
  SUCCESS: '✅',
  FAIL: '❌',
  WARNING: '⚠️',
  SKIP: '⏭️',
  INFO: 'ℹ️',
  ROCKET: '🚀',
  CLOCK: '⏱️',
  CHECK: '✓',
  CROSS: '✗',
};

// Status to emoji mapping
function statusToEmoji(status) {
  switch (status?.toLowerCase()) {
    case 'success':
      return EMOJI.SUCCESS;
    case 'failure':
      return EMOJI.FAIL;
    case 'warning':
      return EMOJI.WARNING;
    case 'skipped':
      return EMOJI.SKIP;
    default:
      return EMOJI.INFO;
  }
}

// Generate markdown table for validation results
function generateValidationTable(validationData) {
  const { frontend = {}, backend = {}, security = {} } = validationData;

  const rows = [
    '| Stage | Check | Status | Details |',
    '|-------|-------|--------|---------|',
    // Frontend checks
    `| **Frontend** | Lint | ${statusToEmoji(frontend.lintStatus)} ${frontend.lintStatus || 'unknown'} | ${frontend.lintDetails || '-'} |`,
    `| | Type Check | ${statusToEmoji(frontend.typeStatus)} ${frontend.typeStatus || 'unknown'} | ${frontend.typeDetails || '-'} |`,
    `| | Tests | ${statusToEmoji(frontend.testStatus)} ${frontend.testStatus || 'unknown'} | ${frontend.testDetails || '-'} |`,
    `| | Build | ${statusToEmoji(frontend.buildStatus)} ${frontend.buildStatus || 'unknown'} | ${frontend.buildDetails || '-'} |`,
    // Backend checks
    `| **Backend** | Build | ${statusToEmoji(backend.buildStatus)} ${backend.buildStatus || 'unknown'} | ${backend.buildDetails || '-'} |`,
    `| | Unit Tests | ${statusToEmoji(backend.unitTestStatus)} ${backend.unitTestStatus || 'unknown'} | ${backend.unitTestDetails || '-'} |`,
    `| | Integration Tests | ${statusToEmoji(backend.integrationTestStatus)} ${backend.integrationTestStatus || 'unknown'} | ${backend.integrationTestDetails || '-'} |`,
    `| | Coverage | ${statusToEmoji(backend.coverageStatus)} ${backend.coverageStatus || 'unknown'} | ${backend.coverageDetails || '-'} |`,
    // Security checks
    `| **Security** | Dependency Scan | ${statusToEmoji(security.dependencyScanStatus)} ${security.dependencyScanStatus || 'unknown'} | ${security.dependencyScanDetails || '-'} |`,
    `| | SAST | ${statusToEmoji(security.sastStatus)} ${security.sastStatus || 'unknown'} | ${security.sastDetails || '-'} |`,
  ];

  return rows.join('\n');
}

// Generate summary counts
function generateSummary(errors, allPassed, hasCriticalFailures) {
  const criticalCount = errors?.filter((e) => e.severity === 'critical').length || 0;
  const warningCount = errors?.filter((e) => e.severity === 'warning').length || 0;

  let summary = '### Summary\n\n';

  if (allPassed) {
    summary += `${EMOJI.SUCCESS} **All validations passed!**\n\n`;
  } else if (hasCriticalFailures) {
    summary += `${EMOJI.FAIL} **Critical failures detected** (${criticalCount} critical, ${warningCount} warnings)\n\n`;
  } else {
    summary += `${EMOJI.WARNING} **Non-critical issues detected** (${warningCount} warnings)\n\n`;
  }

  return summary;
}

// Generate expandable error details
function generateErrorDetails(errors) {
  if (!errors || errors.length === 0) {
    return '';
  }

  const criticalErrors = errors.filter((e) => e.severity === 'critical');
  const warnings = errors.filter((e) => e.severity === 'warning');

  let details = '';

  if (criticalErrors.length > 0) {
    details += '<details>\n';
    details += '<summary><strong>❌ Critical Failures</strong></summary>\n\n';
    details += '```\n';
    criticalErrors.forEach((err) => {
      details += `${err.message}\n`;
    });
    details += '```\n';
    details += '</details>\n\n';
  }

  if (warnings.length > 0) {
    details += '<details>\n';
    details += '<summary><strong>⚠️ Warnings</strong></summary>\n\n';
    details += '```\n';
    warnings.forEach((warn) => {
      details += `${warn.message}\n`;
    });
    details += '```\n';
    details += '</details>\n\n';
  }

  return details;
}

// Generate links section
function generateLinks(workflowRunId, workflowRunUrl) {
  let links = '### Links\n\n';

  if (workflowRunUrl) {
    links += `- [${EMOJI.ROCKET} View Full Workflow Run](${workflowRunUrl})\n`;
  }

  if (workflowRunId) {
    links += `- ${EMOJI.INFO} Workflow Run ID: \`${workflowRunId}\`\n`;
  }

  links += `- ${EMOJI.CLOCK} Updated: ${new Date().toISOString()}\n`;

  return links;
}

// Main function to generate complete comment
function generateStatusComment(validationReport, options = {}) {
  const { workflowRunId, workflowRunUrl, validationData } = options;

  // Parse validation report if it's a string
  let report = validationReport;
  if (typeof validationReport === 'string') {
    report = JSON.parse(validationReport);
  }

  const { all_passed, has_critical_failures, errors, timestamp } = report;

  // Build comment sections
  const marker = '<!-- validation-status-reporter -->';
  const header = '## 🔍 Validation Status Report\n\n';
  const summary = generateSummary(errors, all_passed, has_critical_failures);
  const table = generateValidationTable(validationData || {});
  const errorDetails = generateErrorDetails(errors);
  const links = generateLinks(workflowRunId, workflowRunUrl);
  const footer = '\n\n---\n*This comment is automatically updated by the Validation Orchestrator*';

  // Assemble full comment
  return `${marker}\n${header}${summary}${table}\n\n${errorDetails}${links}${footer}`;
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: generate-status-comment.js <validation-report-path> [options-json]');
    process.exit(1);
  }

  const reportPath = args[0];
  const optionsJson = args[1] || '{}';

  try {
    const reportContent = fs.readFileSync(reportPath, 'utf-8');
    const options = JSON.parse(optionsJson);

    const comment = generateStatusComment(reportContent, options);
    console.log(comment);
  } catch (error) {
    console.error('Error generating status comment:', error.message);
    process.exit(1);
  }
}

// Export for testing
module.exports = {
  generateStatusComment,
  generateValidationTable,
  generateSummary,
  generateErrorDetails,
  generateLinks,
  statusToEmoji,
  EMOJI,
};

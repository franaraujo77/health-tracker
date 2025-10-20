#!/usr/bin/env bash

# Test Assertions Framework for Pipeline Integration Tests
# This script provides reusable assertion functions for verifying
# workflow outputs, job statuses, and artifact contents

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ASSERTIONS_PASSED=0
ASSERTIONS_FAILED=0
ASSERTIONS_TOTAL=0

# Assertion result storage
ASSERTION_RESULTS=()

#######################################
# Core Assertion Functions
#######################################

# Assert that two values are equal
# Arguments:
#   $1 - Actual value
#   $2 - Expected value
#   $3 - Assertion description
# Returns:
#   0 if equal, 1 if not equal
assert_equals() {
  local actual="$1"
  local expected="$2"
  local description="$3"

  ASSERTIONS_TOTAL=$((ASSERTIONS_TOTAL + 1))

  if [ "$actual" = "$expected" ]; then
    ASSERTIONS_PASSED=$((ASSERTIONS_PASSED + 1))
    ASSERTION_RESULTS+=("PASS: $description")
    echo -e "${GREEN}✓${NC} PASS: $description"
    echo "  Expected: '$expected'"
    echo "  Actual:   '$actual'"
    return 0
  else
    ASSERTIONS_FAILED=$((ASSERTIONS_FAILED + 1))
    ASSERTION_RESULTS+=("FAIL: $description")
    echo -e "${RED}✗${NC} FAIL: $description"
    echo "  Expected: '$expected'"
    echo "  Actual:   '$actual'"
    return 1
  fi
}

# Assert that a value is true (case-insensitive)
# Arguments:
#   $1 - Actual value
#   $2 - Assertion description
# Returns:
#   0 if true, 1 if not true
assert_true() {
  local actual="$1"
  local description="$2"

  assert_equals "$actual" "true" "$description"
}

# Assert that a value is false (case-insensitive)
# Arguments:
#   $1 - Actual value
#   $2 - Assertion description
# Returns:
#   0 if false, 1 if not false
assert_false() {
  local actual="$1"
  local description="$2"

  assert_equals "$actual" "false" "$description"
}

# Assert that a value is not empty
# Arguments:
#   $1 - Actual value
#   $2 - Assertion description
# Returns:
#   0 if not empty, 1 if empty
assert_not_empty() {
  local actual="$1"
  local description="$2"

  ASSERTIONS_TOTAL=$((ASSERTIONS_TOTAL + 1))

  if [ -n "$actual" ]; then
    ASSERTIONS_PASSED=$((ASSERTIONS_PASSED + 1))
    ASSERTION_RESULTS+=("PASS: $description")
    echo -e "${GREEN}✓${NC} PASS: $description"
    echo "  Value: '$actual' (not empty)"
    return 0
  else
    ASSERTIONS_FAILED=$((ASSERTIONS_FAILED + 1))
    ASSERTION_RESULTS+=("FAIL: $description")
    echo -e "${RED}✗${NC} FAIL: $description"
    echo "  Value is empty"
    return 1
  fi
}

# Assert that a string contains a substring
# Arguments:
#   $1 - Haystack (string to search in)
#   $2 - Needle (substring to find)
#   $3 - Assertion description
# Returns:
#   0 if contains, 1 if not contains
assert_contains() {
  local haystack="$1"
  local needle="$2"
  local description="$3"

  ASSERTIONS_TOTAL=$((ASSERTIONS_TOTAL + 1))

  if [[ "$haystack" == *"$needle"* ]]; then
    ASSERTIONS_PASSED=$((ASSERTIONS_PASSED + 1))
    ASSERTION_RESULTS+=("PASS: $description")
    echo -e "${GREEN}✓${NC} PASS: $description"
    echo "  Haystack contains: '$needle'"
    return 0
  else
    ASSERTIONS_FAILED=$((ASSERTIONS_FAILED + 1))
    ASSERTION_RESULTS+=("FAIL: $description")
    echo -e "${RED}✗${NC} FAIL: $description"
    echo "  Haystack: '$haystack'"
    echo "  Does not contain: '$needle'"
    return 1
  fi
}

#######################################
# File and Artifact Assertions
#######################################

# Assert that a file exists
# Arguments:
#   $1 - File path
#   $2 - Assertion description
# Returns:
#   0 if exists, 1 if not exists
assert_file_exists() {
  local file_path="$1"
  local description="$2"

  ASSERTIONS_TOTAL=$((ASSERTIONS_TOTAL + 1))

  if [ -f "$file_path" ]; then
    ASSERTIONS_PASSED=$((ASSERTIONS_PASSED + 1))
    ASSERTION_RESULTS+=("PASS: $description")
    echo -e "${GREEN}✓${NC} PASS: $description"
    echo "  File exists: $file_path"
    return 0
  else
    ASSERTIONS_FAILED=$((ASSERTIONS_FAILED + 1))
    ASSERTION_RESULTS+=("FAIL: $description")
    echo -e "${RED}✗${NC} FAIL: $description"
    echo "  File not found: $file_path"
    return 1
  fi
}

# Assert that a file does not exist
# Arguments:
#   $1 - File path
#   $2 - Assertion description
# Returns:
#   0 if not exists, 1 if exists
assert_file_not_exists() {
  local file_path="$1"
  local description="$2"

  ASSERTIONS_TOTAL=$((ASSERTIONS_TOTAL + 1))

  if [ ! -f "$file_path" ]; then
    ASSERTIONS_PASSED=$((ASSERTIONS_PASSED + 1))
    ASSERTION_RESULTS+=("PASS: $description")
    echo -e "${GREEN}✓${NC} PASS: $description"
    echo "  File correctly does not exist: $file_path"
    return 0
  else
    ASSERTIONS_FAILED=$((ASSERTIONS_FAILED + 1))
    ASSERTION_RESULTS+=("FAIL: $description")
    echo -e "${RED}✗${NC} FAIL: $description"
    echo "  File should not exist: $file_path"
    return 1
  fi
}

#######################################
# JSON Assertions
#######################################

# Assert that a JSON file is valid
# Arguments:
#   $1 - JSON file path
#   $2 - Assertion description
# Returns:
#   0 if valid, 1 if invalid
assert_json_valid() {
  local json_file="$1"
  local description="$2"

  ASSERTIONS_TOTAL=$((ASSERTIONS_TOTAL + 1))

  if jq empty "$json_file" 2>/dev/null; then
    ASSERTIONS_PASSED=$((ASSERTIONS_PASSED + 1))
    ASSERTION_RESULTS+=("PASS: $description")
    echo -e "${GREEN}✓${NC} PASS: $description"
    echo "  JSON is valid: $json_file"
    return 0
  else
    ASSERTIONS_FAILED=$((ASSERTIONS_FAILED + 1))
    ASSERTION_RESULTS+=("FAIL: $description")
    echo -e "${RED}✗${NC} FAIL: $description"
    echo "  JSON is invalid: $json_file"
    return 1
  fi
}

# Assert that a JSON field exists
# Arguments:
#   $1 - JSON file path
#   $2 - JQ query path (e.g., ".field" or ".nested.field")
#   $3 - Assertion description
# Returns:
#   0 if field exists, 1 if not exists
assert_json_field_exists() {
  local json_file="$1"
  local jq_path="$2"
  local description="$3"

  ASSERTIONS_TOTAL=$((ASSERTIONS_TOTAL + 1))

  if jq -e "$jq_path" "$json_file" >/dev/null 2>&1; then
    ASSERTIONS_PASSED=$((ASSERTIONS_PASSED + 1))
    ASSERTION_RESULTS+=("PASS: $description")
    echo -e "${GREEN}✓${NC} PASS: $description"
    echo "  Field exists: $jq_path in $json_file"
    return 0
  else
    ASSERTIONS_FAILED=$((ASSERTIONS_FAILED + 1))
    ASSERTION_RESULTS+=("FAIL: $description")
    echo -e "${RED}✗${NC} FAIL: $description"
    echo "  Field not found: $jq_path in $json_file"
    return 1
  fi
}

# Assert that a JSON field equals a value
# Arguments:
#   $1 - JSON file path
#   $2 - JQ query path
#   $3 - Expected value
#   $4 - Assertion description
# Returns:
#   0 if equal, 1 if not equal
assert_json_field_equals() {
  local json_file="$1"
  local jq_path="$2"
  local expected="$3"
  local description="$4"

  ASSERTIONS_TOTAL=$((ASSERTIONS_TOTAL + 1))

  local actual
  actual=$(jq -r "$jq_path" "$json_file" 2>/dev/null || echo "")

  if [ "$actual" = "$expected" ]; then
    ASSERTIONS_PASSED=$((ASSERTIONS_PASSED + 1))
    ASSERTION_RESULTS+=("PASS: $description")
    echo -e "${GREEN}✓${NC} PASS: $description"
    echo "  Field: $jq_path"
    echo "  Expected: '$expected'"
    echo "  Actual:   '$actual'"
    return 0
  else
    ASSERTIONS_FAILED=$((ASSERTIONS_FAILED + 1))
    ASSERTION_RESULTS+=("FAIL: $description")
    echo -e "${RED}✗${NC} FAIL: $description"
    echo "  Field: $jq_path"
    echo "  Expected: '$expected'"
    echo "  Actual:   '$actual'"
    return 1
  fi
}

# Assert that a JSON array has expected length
# Arguments:
#   $1 - JSON file path
#   $2 - JQ array path
#   $3 - Expected length
#   $4 - Assertion description
# Returns:
#   0 if length matches, 1 if not
assert_json_array_length() {
  local json_file="$1"
  local jq_path="$2"
  local expected_length="$3"
  local description="$4"

  ASSERTIONS_TOTAL=$((ASSERTIONS_TOTAL + 1))

  local actual_length
  actual_length=$(jq "$jq_path | length" "$json_file" 2>/dev/null || echo "-1")

  if [ "$actual_length" -eq "$expected_length" ]; then
    ASSERTIONS_PASSED=$((ASSERTIONS_PASSED + 1))
    ASSERTION_RESULTS+=("PASS: $description")
    echo -e "${GREEN}✓${NC} PASS: $description"
    echo "  Array: $jq_path"
    echo "  Expected length: $expected_length"
    echo "  Actual length:   $actual_length"
    return 0
  else
    ASSERTIONS_FAILED=$((ASSERTIONS_FAILED + 1))
    ASSERTION_RESULTS+=("FAIL: $description")
    echo -e "${RED}✗${NC} FAIL: $description"
    echo "  Array: $jq_path"
    echo "  Expected length: $expected_length"
    echo "  Actual length:   $actual_length"
    return 1
  fi
}

#######################################
# Workflow Output Assertions
#######################################

# Assert workflow job status
# Arguments:
#   $1 - Job result (success, failure, cancelled, skipped)
#   $2 - Expected result
#   $3 - Assertion description
# Returns:
#   0 if matches, 1 if not
assert_job_result() {
  local actual="$1"
  local expected="$2"
  local description="$3"

  assert_equals "$actual" "$expected" "$description"
}

#######################################
# Report Generation
#######################################

# Generate assertion report
# Outputs a summary of all assertions
generate_report() {
  echo ""
  echo "========================================="
  echo "Assertion Test Report"
  echo "========================================="
  echo ""
  echo "Total Assertions: $ASSERTIONS_TOTAL"
  echo -e "${GREEN}Passed: $ASSERTIONS_PASSED${NC}"
  echo -e "${RED}Failed: $ASSERTIONS_FAILED${NC}"
  echo ""

  if [ $ASSERTIONS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL ASSERTIONS PASSED${NC}"
    echo ""
    return 0
  else
    echo -e "${RED}✗ SOME ASSERTIONS FAILED${NC}"
    echo ""
    echo "Failed Assertions:"
    for result in "${ASSERTION_RESULTS[@]}"; do
      if [[ "$result" == FAIL:* ]]; then
        echo -e "  ${RED}✗${NC} ${result#FAIL: }"
      fi
    done
    echo ""
    return 1
  fi
}

# Generate GitHub Step Summary report
# Outputs assertion results to GITHUB_STEP_SUMMARY
generate_github_summary() {
  local summary_file="${GITHUB_STEP_SUMMARY:-/dev/null}"

  {
    echo "## Assertion Test Results"
    echo ""
    echo "| Metric | Count |"
    echo "|--------|-------|"
    echo "| Total Assertions | $ASSERTIONS_TOTAL |"
    echo "| Passed | $ASSERTIONS_PASSED |"
    echo "| Failed | $ASSERTIONS_FAILED |"
    echo ""

    if [ $ASSERTIONS_FAILED -eq 0 ]; then
      echo "### ✅ All Assertions Passed"
    else
      echo "### ❌ Some Assertions Failed"
      echo ""
      echo "**Failed Assertions:**"
      for result in "${ASSERTION_RESULTS[@]}"; do
        if [[ "$result" == FAIL:* ]]; then
          echo "- ❌ ${result#FAIL: }"
        fi
      done
    fi
    echo ""
  } >> "$summary_file"
}

# Exit with appropriate code based on assertion results
# Returns:
#   0 if all passed, 1 if any failed
exit_with_results() {
  generate_report
  generate_github_summary

  if [ $ASSERTIONS_FAILED -eq 0 ]; then
    exit 0
  else
    exit 1
  fi
}

#######################################
# Helper Functions
#######################################

# Print section header
section() {
  echo ""
  echo "-------------------------------------------"
  echo "$1"
  echo "-------------------------------------------"
}

# Print test info
info() {
  echo -e "${YELLOW}ℹ${NC} $1"
}

# Export functions for use in other scripts
export -f assert_equals
export -f assert_true
export -f assert_false
export -f assert_not_empty
export -f assert_contains
export -f assert_file_exists
export -f assert_file_not_exists
export -f assert_json_valid
export -f assert_json_field_exists
export -f assert_json_field_equals
export -f assert_json_array_length
export -f assert_job_result
export -f generate_report
export -f generate_github_summary
export -f exit_with_results
export -f section
export -f info

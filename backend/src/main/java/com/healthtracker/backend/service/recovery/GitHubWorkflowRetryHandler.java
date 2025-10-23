package com.healthtracker.backend.service.recovery;

import com.healthtracker.backend.dto.observability.AlertManagerWebhook;
import com.healthtracker.backend.dto.observability.RecoveryAttempt;
import com.healthtracker.backend.service.RecoveryOrchestrationService.RecoveryHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Recovery handler that automatically retries failed GitHub Actions workflows.
 * Triggers a workflow re-run via GitHub API when pipeline failures are detected.
 */
@Slf4j
@Component
public class GitHubWorkflowRetryHandler implements RecoveryHandler {

    private final RestTemplate restTemplate;
    private final String githubToken;
    private final String githubRepo;

    private static final int MAX_RETRY_ATTEMPTS = 3;
    private static final String GITHUB_API_BASE = "https://api.github.com";

    public GitHubWorkflowRetryHandler(
            RestTemplate restTemplate,
            @Value("${github.token:}") String githubToken,
            @Value("${github.repository:francisaraujo/health-tracker}") String githubRepo) {
        this.restTemplate = restTemplate;
        this.githubToken = githubToken;
        this.githubRepo = githubRepo;
    }

    @Override
    public String getStrategyName() {
        return "workflow-retry";
    }

    @Override
    public boolean attemptRecovery(AlertManagerWebhook.Alert alert, RecoveryAttempt attempt) {
        String workflowName = alert.getWorkflowName();
        if (workflowName == null || workflowName.isEmpty()) {
            log.warn("Cannot retry workflow: workflow name not found in alert");
            return false;
        }

        try {
            // Get the last failed run ID for the workflow
            String runId = getLastFailedWorkflowRun(workflowName);
            if (runId == null) {
                log.warn("No failed workflow run found for: {}", workflowName);
                return false;
            }

            attempt.setGithubRunId(runId);

            // Trigger workflow re-run
            boolean success = retryWorkflowRun(runId, attempt);

            if (success) {
                log.info("Successfully triggered retry for workflow: {}, run: {}", workflowName, runId);
            }

            return success;

        } catch (Exception e) {
            log.error("Failed to retry workflow: {}", workflowName, e);
            attempt.setErrorMessage("GitHub API error: " + e.getMessage());
            return false;
        }
    }

    /**
     * Get the last failed workflow run ID
     */
    private String getLastFailedWorkflowRun(String workflowName) {
        if (githubToken == null || githubToken.isEmpty()) {
            log.warn("GitHub token not configured, skipping API call");
            return null;
        }

        try {
            String url = String.format("%s/repos/%s/actions/runs?status=failure&per_page=1",
                    GITHUB_API_BASE, githubRepo);

            HttpHeaders headers = createGitHubHeaders();
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                List<Map<String, Object>> runs = (List<Map<String, Object>>) response.getBody().get("workflow_runs");
                if (runs != null && !runs.isEmpty()) {
                    Map<String, Object> run = runs.get(0);
                    return String.valueOf(((Number) run.get("id")).longValue());
                }
            }

            return null;

        } catch (Exception e) {
            log.error("Error getting failed workflow runs", e);
            return null;
        }
    }

    /**
     * Trigger workflow re-run via GitHub API
     */
    private boolean retryWorkflowRun(String runId, RecoveryAttempt attempt) {
        if (githubToken == null || githubToken.isEmpty()) {
            log.warn("GitHub token not configured, cannot retry workflow");
            return false;
        }

        try {
            String url = String.format("%s/repos/%s/actions/runs/%s/rerun-failed-jobs",
                    GITHUB_API_BASE, githubRepo, runId);

            HttpHeaders headers = createGitHubHeaders();
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<Void> response = restTemplate.exchange(
                    url, HttpMethod.POST, entity, Void.class);

            boolean success = response.getStatusCode() == HttpStatus.CREATED;

            if (success) {
                attempt.setRetryCount(attempt.getRetryCount() + 1);
            }

            return success;

        } catch (Exception e) {
            log.error("Error triggering workflow retry for run: {}", runId, e);
            return false;
        }
    }

    /**
     * Create headers for GitHub API requests
     */
    private HttpHeaders createGitHubHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + githubToken);
        headers.set("Accept", "application/vnd.github+json");
        headers.set("X-GitHub-Api-Version", "2022-11-28");
        return headers;
    }
}

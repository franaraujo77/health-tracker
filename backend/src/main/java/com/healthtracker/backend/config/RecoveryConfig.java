package com.healthtracker.backend.config;

import com.healthtracker.backend.service.RecoveryOrchestrationService;
import com.healthtracker.backend.service.recovery.GitHubWorkflowRetryHandler;
import com.healthtracker.backend.service.recovery.RateLimitRecoveryHandler;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * Configuration for automated recovery system.
 * Registers recovery handlers for different alert types.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class RecoveryConfig {

    private final RecoveryOrchestrationService orchestrationService;
    private final GitHubWorkflowRetryHandler workflowRetryHandler;
    private final RateLimitRecoveryHandler rateLimitRecoveryHandler;

    /**
     * Register all recovery handlers with the orchestration service
     */
    @PostConstruct
    public void registerRecoveryHandlers() {
        log.info("Registering automated recovery handlers...");

        // Register handler for pipeline failure alerts
        orchestrationService.registerHandler("PipelineFailure", workflowRetryHandler);
        orchestrationService.registerHandler("WorkflowFailed", workflowRetryHandler);
        orchestrationService.registerHandler("BuildFailure", workflowRetryHandler);

        // Register handler for rate limit alerts
        orchestrationService.registerHandler("RateLimitExceeded", rateLimitRecoveryHandler);
        orchestrationService.registerHandler("APIRateLimited", rateLimitRecoveryHandler);

        log.info("Registered {} recovery handlers", 5);
    }

    /**
     * RestTemplate for making HTTP requests to external APIs
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}

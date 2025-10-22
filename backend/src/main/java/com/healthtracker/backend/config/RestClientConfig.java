package com.healthtracker.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * Configuration for REST client beans.
 * Separated from RecoveryConfig to avoid circular dependencies.
 */
@Configuration
public class RestClientConfig {

    /**
     * RestTemplate for making HTTP requests to external APIs
     * Used by recovery handlers and other services
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}

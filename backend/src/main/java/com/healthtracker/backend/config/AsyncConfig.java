package com.healthtracker.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Configuration for asynchronous method execution
 * Required for async audit logging
 */
@Configuration
@EnableAsync
public class AsyncConfig {
}

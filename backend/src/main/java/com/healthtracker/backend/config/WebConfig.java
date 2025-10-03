package com.healthtracker.backend.config;

import com.healthtracker.backend.security.RateLimitInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web MVC Configuration.
 *
 * <p>Configures web-related concerns including interceptors for cross-cutting concerns
 * such as rate limiting.</p>
 *
 * @author Health Tracker Backend Team
 * @since 1.0.0
 */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final RateLimitInterceptor rateLimitInterceptor;

    /**
     * Registers interceptors for web requests.
     *
     * <p>Configures rate limiting for authentication endpoints to prevent brute force attacks.</p>
     *
     * @param registry the interceptor registry
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Apply rate limiting to authentication endpoints
        registry.addInterceptor(rateLimitInterceptor)
                .addPathPatterns(
                        "/api/v1/auth/login",
                        "/api/v1/auth/register",
                        "/api/v1/auth/refresh"
                )
                .order(0); // Execute before other interceptors
    }
}

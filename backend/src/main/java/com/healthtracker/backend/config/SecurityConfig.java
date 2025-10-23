package com.healthtracker.backend.config;

import com.healthtracker.backend.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Spring Security Configuration
 * Configures JWT authentication, RBAC, CORS, and security headers
 *
 * This configuration is excluded when the 'test' profile is active.
 * Tests use TestSecurityConfig instead, which disables CSRF protection.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
@Profile("!test")
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Enable CSRF protection with cookie-based tokens for cookie authentication
                // Exclude auth endpoints as they handle cookies directly
                .csrf(csrf -> csrf
                        .ignoringRequestMatchers(
                                "/api/v1/auth/login",
                                "/api/v1/auth/register",
                                "/api/v1/auth/refresh",
                                "/api/v1/auth/logout",
                                "/api/v1/observability/alerts/**"  // Exclude AlertManager webhooks from CSRF
                        )
                        .csrfTokenRepository(org.springframework.security.web.csrf.CookieCsrfTokenRepository.withHttpOnlyFalse())
                )

                // Configure CORS (Spring will inject the bean)
                .cors(org.springframework.security.config.Customizer.withDefaults())

                // Configure authorization
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers(
                                "/api/v1/auth/**",
                                "/actuator/health/**",
                                "/actuator/info",
                                "/api/v1/observability/alerts/**"  // Allow AlertManager webhooks
                        ).permitAll()

                        // Health metrics endpoints - require PATIENT or PROVIDER role
                        .requestMatchers("/api/v1/health-metrics/**")
                        .hasAnyRole("PATIENT", "PROVIDER")

                        // Goals endpoints - require PATIENT role
                        .requestMatchers("/api/v1/goals/**")
                        .hasRole("PATIENT")

                        // Admin endpoints - require ADMIN role
                        .requestMatchers("/api/v1/admin/**")
                        .hasRole("ADMIN")

                        // All other actuator endpoints require ADMIN
                        .requestMatchers("/actuator/**")
                        .hasRole("ADMIN")

                        // All other requests must be authenticated
                        .anyRequest().authenticated()
                )

                // Stateless session management (no sessions)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // Add JWT filter before UsernamePasswordAuthenticationFilter
                // Note: AuthenticationProvider is auto-configured from AuthenticationBeansConfig
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)

                // Configure security headers
                .headers(headers -> headers
                        .contentSecurityPolicy(csp -> csp
                                .policyDirectives("default-src 'self'")
                        )
                        .frameOptions(frame -> frame.deny())
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31536000)
                        )
                        .contentTypeOptions(contentType -> {})
                        .xssProtection(xss -> {})
                        .referrerPolicy(referrer -> referrer
                                .policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                        )
                );

        return http.build();
    }

    /**
     * Configures CORS (Cross-Origin Resource Sharing) with environment-specific origins.
     *
     * <p><b>Security Notes:</b>
     * <ul>
     *   <li>Origins are environment-specific (dev vs prod)</li>
     *   <li>Wildcard headers removed - only specific headers allowed</li>
     *   <li>Credentials enabled for cookie-based authentication</li>
     *   <li>Exposed headers include rate limiting information</li>
     * </ul>
     *
     * @param corsAllowedOrigins comma-separated list of allowed origins from configuration
     * @return CORS configuration source
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${cors.allowed-origins}") String corsAllowedOrigins) {
        CorsConfiguration configuration = new CorsConfiguration();

        // Environment-specific origins (no hardcoded values)
        configuration.setAllowedOrigins(
                Arrays.asList(corsAllowedOrigins.split(","))
        );

        // Allowed HTTP methods
        configuration.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "DELETE", "OPTIONS"
        ));

        // Specific headers only (no wildcard for security)
        configuration.setAllowedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "X-Requested-With",
                "X-XSRF-TOKEN"
        ));

        // Enable credentials for cookie-based authentication
        configuration.setAllowCredentials(true);

        // Cache preflight requests for 1 hour
        configuration.setMaxAge(3600L);

        // Expose security-related headers to frontend
        configuration.setExposedHeaders(Arrays.asList(
                "X-Rate-Limit-Remaining",
                "X-Rate-Limit-Reset",
                "X-XSRF-TOKEN"
        ));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

    // Note: PasswordEncoder, AuthenticationProvider, and AuthenticationManager beans
    // are now provided by AuthenticationBeansConfig to ensure availability in all profiles
}

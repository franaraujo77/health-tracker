package com.healthtracker.backend.config;

import com.healthtracker.backend.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Test-specific Security Configuration
 * Disables CSRF protection for integration tests using stateless JWT authentication.
 *
 * This configuration is only active when the 'test' profile is enabled.
 */
@TestConfiguration
@Profile("test")
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class TestSecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final UserDetailsService userDetailsService;
    private final org.springframework.security.authentication.AuthenticationProvider authenticationProvider;

    @Bean
    @Primary
    public SecurityFilterChain testSecurityFilterChain(HttpSecurity http) throws Exception {
        http
                // Disable CSRF for tests (stateless JWT authentication doesn't need it)
                .csrf(csrf -> csrf.disable())

                // Configure CORS (Spring will inject the bean)
                .cors(org.springframework.security.config.Customizer.withDefaults())

                // Configure authorization (same as production)
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints (authentication endpoints that don't require a token)
                        .requestMatchers(
                                "/api/v1/auth/login",
                                "/api/v1/auth/register",
                                "/api/v1/auth/refresh",
                                "/api/v1/auth/logout",
                                "/api/v1/observability/alerts/webhook",
                                "/api/v1/observability/alerts/health",
                                "/actuator/health/**",
                                "/actuator/info"
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

                        // All other requests must be authenticated (including /api/auth/me)
                        .anyRequest().authenticated()
                )

                // Stateless session management (no sessions)
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // Add JWT filter before UsernamePasswordAuthenticationFilter
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)

                // Configure authentication provider
                .authenticationProvider(authenticationProvider)

                // Configure exception handling to ensure proper 401/403 responses
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(401);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"" +
                                authException.getMessage() + "\"}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(403);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"error\":\"Forbidden\",\"message\":\"" +
                                accessDeniedException.getMessage() + "\"}");
                        })
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource testCorsConfigurationSource(
            @Value("${cors.allowed-origins:http://localhost:5173}") String corsAllowedOrigins) {
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
                "X-Requested-With"
        ));

        // Enable credentials for cookie-based authentication
        configuration.setAllowCredentials(true);

        // Cache preflight requests for 1 hour
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}

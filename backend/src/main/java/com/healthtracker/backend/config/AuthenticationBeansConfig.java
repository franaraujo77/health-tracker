package com.healthtracker.backend.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Shared Authentication Beans Configuration
 * Provides authentication-related beans for ALL profiles (production and test).
 *
 * <p>These beans are separated from SecurityConfig to ensure they remain available
 * when the test profile excludes the main security configuration via @Profile("!test").
 *
 * <p><b>Beans provided:</b>
 * <ul>
 *   <li>PasswordEncoder - BCrypt password hashing</li>
 *   <li>AuthenticationProvider - DAO-based authentication with UserDetailsService</li>
 *   <li>AuthenticationManager - Spring Security authentication manager</li>
 * </ul>
 */
@Configuration
@RequiredArgsConstructor
public class AuthenticationBeansConfig {

    private final UserDetailsService userDetailsService;

    /**
     * Password encoder using BCrypt hashing algorithm.
     * Used by AuthenticationService for password hashing and verification.
     *
     * @return BCryptPasswordEncoder instance
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Authentication provider that uses UserDetailsService and PasswordEncoder
     * to authenticate users with username/password credentials.
     *
     * @return configured DaoAuthenticationProvider
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    /**
     * Authentication manager for processing authentication requests.
     * Required by AuthenticationService for login operations.
     *
     * @param config Spring Security authentication configuration
     * @return AuthenticationManager instance
     * @throws Exception if authentication manager cannot be obtained
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
            throws Exception {
        return config.getAuthenticationManager();
    }
}

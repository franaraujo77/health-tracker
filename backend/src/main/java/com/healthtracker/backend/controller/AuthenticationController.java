package com.healthtracker.backend.controller;

import com.healthtracker.backend.dto.auth.AuthenticationResponse;
import com.healthtracker.backend.dto.auth.LoginRequest;
import com.healthtracker.backend.dto.auth.RegisterRequest;
import com.healthtracker.backend.service.AuthenticationService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Arrays;

/**
 * REST controller for authentication endpoints
 * Handles user registration, login, and token refresh
 * Uses httpOnly cookies for refresh tokens to prevent XSS attacks
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthenticationController {

    private final AuthenticationService authenticationService;

    @Value("${jwt.refresh-token-expiration:2592000000}")
    private long refreshTokenExpiration;

    @Value("${server.cookie.secure:false}")
    private boolean secureCookie;

    private static final String REFRESH_TOKEN_COOKIE_NAME = "refresh_token";

    /**
     * Register a new user
     * Sets refresh token in httpOnly cookie, returns access token in response body
     *
     * @param request Registration details
     * @param response HTTP response to set cookie
     * @return Access token and user info
     */
    @PostMapping("/register")
    public ResponseEntity<AuthenticationResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletResponse response
    ) {
        AuthenticationResponse authResponse = authenticationService.register(request);
        setRefreshTokenCookie(response, authResponse.getRefreshToken());

        // Don't send refresh token in response body
        authResponse.setRefreshToken(null);

        return ResponseEntity.ok(authResponse);
    }

    /**
     * Login user
     * Sets refresh token in httpOnly cookie, returns access token in response body
     *
     * @param request Login credentials
     * @param response HTTP response to set cookie
     * @return Access token and user info
     */
    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response
    ) {
        AuthenticationResponse authResponse = authenticationService.login(request);
        setRefreshTokenCookie(response, authResponse.getRefreshToken());

        // Don't send refresh token in response body
        authResponse.setRefreshToken(null);

        return ResponseEntity.ok(authResponse);
    }

    /**
     * Refresh access token using refresh token from httpOnly cookie
     *
     * @param request HTTP request containing refresh token cookie
     * @param response HTTP response to set new refresh token cookie
     * @return New access token
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthenticationResponse> refresh(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String refreshToken = extractRefreshTokenFromCookie(request);

        if (refreshToken == null) {
            return ResponseEntity.status(401).build();
        }

        AuthenticationResponse authResponse = authenticationService.refreshToken(refreshToken);
        setRefreshTokenCookie(response, authResponse.getRefreshToken());

        // Don't send refresh token in response body
        authResponse.setRefreshToken(null);

        return ResponseEntity.ok(authResponse);
    }

    /**
     * Logout user by clearing the refresh token cookie
     *
     * @param response HTTP response to clear cookie
     * @return Success response
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        clearRefreshTokenCookie(response);
        return ResponseEntity.ok().build();
    }

    /**
     * Set refresh token in httpOnly, secure cookie
     *
     * @param response HTTP response
     * @param refreshToken Refresh token to store
     */
    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE_NAME, refreshToken)
                .httpOnly(true)
                .secure(secureCookie) // Use true in production with HTTPS
                .path("/api/v1/auth")
                .maxAge(Duration.ofMillis(refreshTokenExpiration))
                .sameSite("Strict")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    /**
     * Clear refresh token cookie
     *
     * @param response HTTP response
     */
    private void clearRefreshTokenCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_TOKEN_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(secureCookie)
                .path("/api/v1/auth")
                .maxAge(0)
                .sameSite("Strict")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    /**
     * Extract refresh token from cookie
     *
     * @param request HTTP request
     * @return Refresh token or null if not found
     */
    private String extractRefreshTokenFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();

        if (cookies == null) {
            return null;
        }

        return Arrays.stream(cookies)
                .filter(cookie -> REFRESH_TOKEN_COOKIE_NAME.equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}

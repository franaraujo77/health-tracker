package com.healthtracker.backend.controller;

import com.healthtracker.backend.dto.auth.AuthenticationResponse;
import com.healthtracker.backend.dto.auth.LoginRequest;
import com.healthtracker.backend.dto.auth.RegisterRequest;
import com.healthtracker.backend.service.AuthenticationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for authentication endpoints
 * Handles user registration, login, and token refresh
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthenticationController {

    private final AuthenticationService authenticationService;

    /**
     * Register a new user
     *
     * @param request Registration details
     * @return JWT tokens
     */
    @PostMapping("/register")
    public ResponseEntity<AuthenticationResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        return ResponseEntity.ok(authenticationService.register(request));
    }

    /**
     * Login user
     *
     * @param request Login credentials
     * @return JWT tokens
     */
    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {
        return ResponseEntity.ok(authenticationService.login(request));
    }

    /**
     * Refresh access token
     *
     * @param refreshToken Valid refresh token
     * @return New JWT tokens
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthenticationResponse> refresh(
            @RequestHeader("Authorization") String refreshToken
    ) {
        // Remove "Bearer " prefix if present
        if (refreshToken != null && refreshToken.startsWith("Bearer ")) {
            refreshToken = refreshToken.substring(7);
        }

        return ResponseEntity.ok(authenticationService.refreshToken(refreshToken));
    }

    /**
     * Logout user (client should discard tokens)
     * This endpoint exists for symmetry and future token blacklist implementation
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        // In stateless JWT auth, logout is handled client-side by discarding tokens
        // Future: implement token blacklist/revocation
        return ResponseEntity.ok().build();
    }
}

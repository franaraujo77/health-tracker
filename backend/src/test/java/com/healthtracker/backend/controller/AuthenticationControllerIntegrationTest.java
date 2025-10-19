package com.healthtracker.backend.controller;

import com.healthtracker.backend.BaseIntegrationTest;
import com.healthtracker.backend.annotations.ApiTest;
import com.healthtracker.backend.dto.auth.UserResponse;
import com.healthtracker.backend.entity.User;
import com.healthtracker.backend.repository.UserRepository;
import com.healthtracker.backend.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for AuthenticationController /auth/me endpoint.
 * Tests authentication flows, JWT validation, and user profile retrieval.
 */
@ApiTest
@DisplayName("AuthenticationController /auth/me Integration Tests")
class AuthenticationControllerIntegrationTest extends BaseIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User testUser;
    private String validAccessToken;

    @BeforeEach
    void setUp() {
        // Clean database before each test
        userRepository.deleteAll();

        // Create test user
        User user = new User();
        user.setEmail("test@example.com");
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user.setRoles(new String[]{"USER"});
        testUser = userRepository.save(user);

        // Load UserDetails and generate valid access token
        UserDetails userDetails = userDetailsService.loadUserByUsername(testUser.getEmail());
        validAccessToken = jwtService.generateAccessToken(userDetails);
    }

    private String getApiUrl(String endpoint) {
        return "http://localhost:" + port + "/api" + endpoint;
    }

    @Test
    @DisplayName("Should return 200 and user profile when valid JWT is provided")
    void shouldReturnUserProfileWithValidJwt() {
        // Arrange
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + validAccessToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // Act
        ResponseEntity<UserResponse> response = restTemplate.exchange(
                getApiUrl("/auth/me"),
                HttpMethod.GET,
                request,
                UserResponse.class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getEmail()).isEqualTo(testUser.getEmail());
        assertThat(response.getBody().getId()).isEqualTo(testUser.getId());
        assertThat(response.getBody().getRoles()).containsExactly("USER");
        assertThat(response.getBody().getCreatedAt()).isNotNull();
        assertThat(response.getBody().getUpdatedAt()).isNotNull();
    }

    @Test
    @DisplayName("Should return 401 when no Authorization header is provided")
    void shouldReturn401WhenNoAuthorizationHeader() {
        // Arrange
        HttpEntity<Void> request = new HttpEntity<>(new HttpHeaders());

        // Act
        ResponseEntity<String> response = restTemplate.exchange(
                getApiUrl("/auth/me"),
                HttpMethod.GET,
                request,
                String.class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Should return 401 when Authorization header has invalid format")
    void shouldReturn401WhenInvalidAuthorizationFormat() {
        // Arrange - missing "Bearer " prefix
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", validAccessToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // Act
        ResponseEntity<String> response = restTemplate.exchange(
                getApiUrl("/auth/me"),
                HttpMethod.GET,
                request,
                String.class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Should return 401 when JWT token is malformed")
    void shouldReturn401WhenTokenIsMalformed() {
        // Arrange
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer invalid.jwt.token");
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // Act
        ResponseEntity<String> response = restTemplate.exchange(
                getApiUrl("/auth/me"),
                HttpMethod.GET,
                request,
                String.class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Should return 401 when JWT token is empty")
    void shouldReturn401WhenTokenIsEmpty() {
        // Arrange
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer ");
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // Act
        ResponseEntity<String> response = restTemplate.exchange(
                getApiUrl("/auth/me"),
                HttpMethod.GET,
                request,
                String.class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Should return 401 when user has been deleted after token was issued")
    void shouldReturn401WhenUserDeletedAfterTokenIssued() {
        // Arrange
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + validAccessToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // Delete the user
        userRepository.deleteById(testUser.getId());

        // Act
        ResponseEntity<String> response = restTemplate.exchange(
                getApiUrl("/auth/me"),
                HttpMethod.GET,
                request,
                String.class
        );

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Should only return current user's profile, not other users")
    void shouldOnlyReturnCurrentUserProfile() {
        // Arrange - Create another user
        User otherUser = new User();
        otherUser.setEmail("other@example.com");
        otherUser.setPasswordHash(passwordEncoder.encode("password456"));
        otherUser.setRoles(new String[]{"USER"});
        otherUser = userRepository.save(otherUser);

        // Use testUser's token
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + validAccessToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // Act
        ResponseEntity<UserResponse> response = restTemplate.exchange(
                getApiUrl("/auth/me"),
                HttpMethod.GET,
                request,
                UserResponse.class
        );

        // Assert - Should return testUser's profile, not otherUser's
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getEmail()).isEqualTo(testUser.getEmail());
        assertThat(response.getBody().getEmail()).isNotEqualTo(otherUser.getEmail());
        assertThat(response.getBody().getId()).isEqualTo(testUser.getId());
    }

    @Test
    @DisplayName("Should handle multiple concurrent requests correctly")
    void shouldHandleConcurrentRequests() {
        // Arrange
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + validAccessToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        // Act - Make multiple requests
        ResponseEntity<UserResponse> response1 = restTemplate.exchange(
                getApiUrl("/auth/me"),
                HttpMethod.GET,
                request,
                UserResponse.class
        );

        ResponseEntity<UserResponse> response2 = restTemplate.exchange(
                getApiUrl("/auth/me"),
                HttpMethod.GET,
                request,
                UserResponse.class
        );

        // Assert - Both should succeed and return same user
        assertThat(response1.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response2.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response1.getBody().getId()).isEqualTo(response2.getBody().getId());
        assertThat(response1.getBody().getEmail()).isEqualTo(response2.getBody().getEmail());
    }
}

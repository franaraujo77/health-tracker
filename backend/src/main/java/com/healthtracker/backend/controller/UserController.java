package com.healthtracker.backend.controller;

import com.healthtracker.backend.entity.User;
import com.healthtracker.backend.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;

    /**
     * Get current user information.
     * In a real application, user ID would come from JWT token.
     */
    @GetMapping("/me")
    public ResponseEntity<User> getCurrentUser(@RequestHeader("X-User-Id") UUID userId) {
        log.info("GET /api/v1/users/me - userId: {}", userId);
        return userService.findById(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Update current user information.
     */
    @PutMapping("/me")
    public ResponseEntity<User> updateCurrentUser(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestBody User user) {
        log.info("PUT /api/v1/users/me - userId: {}", userId);
        try {
            User updatedUser = userService.updateUser(userId, user);
            return ResponseEntity.ok(updatedUser);
        } catch (IllegalArgumentException e) {
            log.warn("User update failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Delete current user account.
     */
    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteCurrentUser(@RequestHeader("X-User-Id") UUID userId) {
        log.info("DELETE /api/v1/users/me - userId: {}", userId);
        try {
            userService.deleteUser(userId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            log.warn("User deletion failed: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Create a new user (registration endpoint).
     */
    @PostMapping("/register")
    public ResponseEntity<User> registerUser(@RequestBody User user) {
        log.info("POST /api/v1/users/register - email: {}", user.getEmail());
        try {
            User createdUser = userService.createUser(user);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdUser);
        } catch (IllegalArgumentException e) {
            log.warn("User registration failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Check if email exists (for registration validation).
     */
    @GetMapping("/check-email")
    public ResponseEntity<Boolean> checkEmail(@RequestParam String email) {
        log.debug("GET /api/v1/users/check-email - email: {}", email);
        boolean exists = userService.emailExists(email);
        return ResponseEntity.ok(exists);
    }

    /**
     * Get all users (admin only - should add security later).
     */
    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        log.info("GET /api/v1/users");
        List<User> users = userService.findAllUsers();
        return ResponseEntity.ok(users);
    }
}

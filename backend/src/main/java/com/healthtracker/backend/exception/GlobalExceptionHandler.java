package com.healthtracker.backend.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Global exception handler for RESTful API.
 *
 * <p>Provides centralized exception handling across all controllers. Transforms
 * exceptions into consistent, secure API responses that:</p>
 * <ul>
 *   <li>Don't leak sensitive system information</li>
 *   <li>Provide informative error messages for clients</li>
 *   <li>Log security events for monitoring and alerting</li>
 *   <li>Follow standard HTTP status code conventions</li>
 *   <li>Support HIPAA audit requirements</li>
 * </ul>
 *
 * <p>Security Considerations:</p>
 * <ul>
 *   <li>Generic error messages to prevent information disclosure</li>
 *   <li>Detailed logging for security monitoring</li>
 *   <li>Validation errors sanitized to prevent data leakage</li>
 *   <li>Stack traces never exposed to clients</li>
 * </ul>
 *
 * @author Health Tracker Backend Team
 * @since 1.0.0
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Handles validation errors from @Valid annotations on request DTOs.
     *
     * <p>Processes Jakarta Bean Validation errors (e.g., @NotBlank, @Email, @Size, @Pattern)
     * and returns a structured response with field-specific error messages.</p>
     *
     * <p>Response format:</p>
     * <pre>
     * {
     *   "timestamp": "2024-01-15T10:30:00",
     *   "status": 400,
     *   "error": "Validation Failed",
     *   "message": "Invalid input data",
     *   "errors": {
     *     "email": "Email must be a valid email address",
     *     "password": "Password must be at least 8 characters"
     *   }
     * }
     * </pre>
     *
     * @param ex the validation exception
     * @param request the web request
     * @return structured error response with validation details
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handleValidationExceptions(
            MethodArgumentNotValidException ex,
            WebRequest request
    ) {
        Map<String, String> fieldErrors = new HashMap<>();

        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            fieldErrors.put(fieldName, errorMessage);
        });

        // Log validation failure (not at WARN level to avoid alert fatigue)
        log.info("Validation failed for request: {} - Fields: {}",
                request.getDescription(false),
                fieldErrors.keySet());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Validation Failed")
                .message("Invalid input data")
                .errors(fieldErrors)
                .path(request.getDescription(false).replace("uri=", ""))
                .build();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * Handles authentication failures (bad credentials).
     *
     * <p>Returns a generic error message to prevent username enumeration attacks.
     * Logs the failed attempt for security monitoring.</p>
     *
     * <p>Security Note: The error message is intentionally generic to prevent
     * attackers from determining whether an email exists in the system.</p>
     *
     * @param ex the authentication exception
     * @param request the web request
     * @return generic authentication error response
     */
    @ExceptionHandler(BadCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ResponseEntity<ErrorResponse> handleBadCredentials(
            BadCredentialsException ex,
            WebRequest request
    ) {
        // Log failed login attempt for security monitoring
        log.warn("Authentication failed for request: {} - Reason: Bad credentials",
                request.getDescription(false));

        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.UNAUTHORIZED.value())
                .error("Authentication Failed")
                .message("Invalid email or password")
                .path(request.getDescription(false).replace("uri=", ""))
                .build();

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
    }

    /**
     * Handles generic runtime exceptions.
     *
     * <p>Provides a safe fallback for unexpected errors. Returns a generic error
     * message to avoid leaking system details while logging full details for debugging.</p>
     *
     * @param ex the runtime exception
     * @param request the web request
     * @return generic error response
     */
    @ExceptionHandler(RuntimeException.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ResponseEntity<ErrorResponse> handleRuntimeException(
            RuntimeException ex,
            WebRequest request
    ) {
        // Log the full exception for debugging
        log.error("Unexpected runtime exception for request: {} - Exception: {}",
                request.getDescription(false),
                ex.getMessage(),
                ex);

        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .error("Internal Server Error")
                .message("An unexpected error occurred. Please try again later.")
                .path(request.getDescription(false).replace("uri=", ""))
                .build();

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }

    /**
     * Handles illegal argument exceptions (e.g., invalid enum values, business rule violations).
     *
     * @param ex the illegal argument exception
     * @param request the web request
     * @return bad request error response
     */
    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
            IllegalArgumentException ex,
            WebRequest request
    ) {
        log.info("Invalid argument for request: {} - Message: {}",
                request.getDescription(false),
                ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Bad Request")
                .message(ex.getMessage())
                .path(request.getDescription(false).replace("uri=", ""))
                .build();

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    /**
     * Standard error response structure.
     *
     * <p>Provides consistent error format across all API endpoints.</p>
     */
    @lombok.Data
    @lombok.Builder
    public static class ErrorResponse {
        /**
         * Timestamp when the error occurred (ISO-8601 format).
         */
        private LocalDateTime timestamp;

        /**
         * HTTP status code (e.g., 400, 401, 500).
         */
        private int status;

        /**
         * Short error description (e.g., "Validation Failed", "Authentication Failed").
         */
        private String error;

        /**
         * User-friendly error message (safe to display to end users).
         */
        private String message;

        /**
         * Field-specific validation errors (optional).
         * Map of field name to error message.
         */
        private Map<String, String> errors;

        /**
         * Request path where the error occurred.
         */
        private String path;

        /**
         * Additional error details (optional, for debugging).
         */
        private String details;
    }
}

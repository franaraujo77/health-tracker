package com.healthtracker.backend.service;

import com.healthtracker.backend.entity.AuditLog;
import com.healthtracker.backend.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.UUID;

/**
 * Service for creating audit log entries
 * Handles asynchronous logging for HIPAA compliance
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    /**
     * Log an audit event (asynchronous)
     *
     * @param action Action performed (READ, CREATE, UPDATE, DELETE)
     * @param resourceType Type of resource accessed
     * @param resourceId ID of resource accessed
     */
    @Async
    public void logAuditEvent(String action, String resourceType, UUID resourceId) {
        logAuditEvent(action, resourceType, resourceId, null);
    }

    /**
     * Log an audit event with details (asynchronous)
     *
     * @param action Action performed
     * @param resourceType Type of resource
     * @param resourceId ID of resource
     * @param details Additional context (JSON)
     */
    @Async
    public void logAuditEvent(String action, String resourceType, UUID resourceId, String details) {
        try {
            // Get current user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UUID userId = getUserIdFromAuthentication(authentication);

            // Get request details
            HttpServletRequest request = getCurrentRequest();
            String ipAddress = request != null ? getClientIpAddress(request) : "unknown";
            String userAgent = request != null ? request.getHeader("User-Agent") : "unknown";

            // Create audit log entry
            AuditLog auditLog = AuditLog.builder()
                    .userId(userId)
                    .action(action)
                    .resourceType(resourceType)
                    .resourceId(resourceId)
                    .ipAddress(ipAddress)
                    .userAgent(userAgent)
                    .details(details)
                    .build();

            auditLogRepository.save(auditLog);

            log.info("Audit log created: user={}, action={}, resource={}:{}, ip={}",
                    userId, action, resourceType, resourceId, ipAddress);

        } catch (Exception e) {
            // Log error but don't fail the operation
            log.error("Failed to create audit log: {}", e.getMessage(), e);
        }
    }

    /**
     * Extract user ID from authentication
     */
    private UUID getUserIdFromAuthentication(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        // In a real implementation, you would extract the actual user ID from the authentication
        // For now, return a placeholder (should be updated to get from UserDetails)
        try {
            String username = authentication.getName();
            // TODO: Look up user ID by username
            return UUID.randomUUID(); // Placeholder
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Get current HTTP request
     */
    private HttpServletRequest getCurrentRequest() {
        ServletRequestAttributes attributes =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attributes != null ? attributes.getRequest() : null;
    }

    /**
     * Get client IP address from request
     * Handles proxied requests
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String[] headerNames = {
                "X-Forwarded-For",
                "X-Real-IP",
                "Proxy-Client-IP",
                "WL-Proxy-Client-IP",
                "HTTP_CLIENT_IP",
                "HTTP_X_FORWARDED_FOR"
        };

        for (String header : headerNames) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                // X-Forwarded-For can contain multiple IPs, take the first one
                return ip.split(",")[0].trim();
            }
        }

        return request.getRemoteAddr();
    }
}

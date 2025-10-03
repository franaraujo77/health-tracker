package com.healthtracker.backend.security;

import com.healthtracker.backend.config.RateLimitConfig;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

/**
 * Interceptor for rate limiting authentication endpoints.
 *
 * <p>Implements token bucket algorithm via Bucket4j to prevent brute force attacks
 * on authentication endpoints. Rate limits are applied per IP address with automatic
 * cleanup of stale entries.</p>
 *
 * <p>Key security features:</p>
 * <ul>
 *   <li>Per-IP rate limiting to prevent distributed attacks</li>
 *   <li>Automatic retry-after header to inform clients</li>
 *   <li>Detailed security event logging for monitoring</li>
 *   <li>Thread-safe bucket management</li>
 *   <li>Production-ready with distributed cache support</li>
 * </ul>
 *
 * <p>Rate limit violations are logged with IP address, endpoint, and remaining wait time
 * for security monitoring and alerting purposes.</p>
 *
 * <p>Thread Safety: This interceptor is thread-safe. The underlying Bucket4j ProxyManager
 * handles concurrent access to buckets safely, and all methods are stateless.</p>
 *
 * @author Health Tracker Backend Team
 * @since 1.0.0
 * @see io.github.bucket4j.Bucket
 * @see RateLimitConfig
 */
@Slf4j
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final ProxyManager<String> proxyManager;
    private final Supplier<BucketConfiguration> bucketConfigSupplier;

    /**
     * HTTP header name for indicating retry delay to clients.
     */
    private static final String RETRY_AFTER_HEADER = "X-Rate-Limit-Retry-After-Seconds";

    /**
     * HTTP header for remaining requests in current window.
     */
    private static final String REMAINING_HEADER = "X-Rate-Limit-Remaining";

    /**
     * HTTP header for rate limit reset time (Unix timestamp).
     */
    private static final String RESET_HEADER = "X-Rate-Limit-Reset";

    /**
     * Constructs a new RateLimitInterceptor.
     *
     * @param proxyManager the bucket proxy manager for managing rate limit buckets
     * @param bucketConfigSupplier supplier for bucket configuration
     */
    public RateLimitInterceptor(
            ProxyManager<String> proxyManager,
            Supplier<BucketConfiguration> bucketConfigSupplier
    ) {
        this.proxyManager = proxyManager;
        this.bucketConfigSupplier = bucketConfigSupplier;
    }

    /**
     * Intercepts requests to apply rate limiting before they reach the controller.
     *
     * <p>Process flow:</p>
     * <ol>
     *   <li>Extract client IP address from request</li>
     *   <li>Retrieve or create bucket for IP address</li>
     *   <li>Attempt to consume one token from bucket</li>
     *   <li>If successful, allow request to proceed</li>
     *   <li>If rate limit exceeded, return 429 Too Many Requests with retry information</li>
     * </ol>
     *
     * <p>Thread Safety: Multiple concurrent requests from the same IP will be handled
     * safely by Bucket4j's internal synchronization.</p>
     *
     * @param request the HTTP request
     * @param response the HTTP response
     * @param handler the handler (controller method)
     * @return true if request should proceed, false if rate limit exceeded
     */
    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler
    ) throws Exception {
        String ipAddress = extractIpAddress(request);
        String requestUri = request.getRequestURI();

        // Resolve or create bucket for this IP address
        Bucket bucket = RateLimitConfig.resolveBucket(
                ipAddress,
                proxyManager,
                bucketConfigSupplier
        );

        // Try to consume 1 token from the bucket
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            // Request allowed - add informational headers
            response.addHeader(REMAINING_HEADER, String.valueOf(probe.getRemainingTokens()));

            // Calculate reset time (current time + nanosToWaitForRefill converted to seconds)
            long resetTimeSeconds = System.currentTimeMillis() / 1000 +
                    TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill());
            response.addHeader(RESET_HEADER, String.valueOf(resetTimeSeconds));

            log.debug("Rate limit check passed for IP: {} on endpoint: {} - Remaining: {}",
                    ipAddress, requestUri, probe.getRemainingTokens());

            return true;
        } else {
            // Rate limit exceeded
            long waitForRefillSeconds = TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill());

            // Set response headers
            response.addHeader(RETRY_AFTER_HEADER, String.valueOf(waitForRefillSeconds));
            response.addHeader(REMAINING_HEADER, "0");
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");

            // Log security event
            log.warn(
                    "Rate limit exceeded for IP: {} on endpoint: {}. " +
                    "Retry after {} seconds. This may indicate a brute force attack.",
                    ipAddress,
                    requestUri,
                    waitForRefillSeconds
            );

            // Send JSON error response
            String jsonResponse = String.format(
                    "{\"error\":\"Too many requests\",\"message\":\"Rate limit exceeded. Please retry after %d seconds.\",\"retryAfterSeconds\":%d}",
                    waitForRefillSeconds,
                    waitForRefillSeconds
            );
            response.getWriter().write(jsonResponse);

            return false;
        }
    }

    /**
     * Extracts the client IP address from the request.
     *
     * <p>Checks the following headers in order (for proxy/load balancer support):</p>
     * <ol>
     *   <li>X-Forwarded-For (standard proxy header)</li>
     *   <li>X-Real-IP (nginx proxy header)</li>
     *   <li>Proxy-Client-IP (WebLogic proxy header)</li>
     *   <li>WL-Proxy-Client-IP (WebLogic proxy header)</li>
     *   <li>HTTP_X_FORWARDED_FOR (fallback)</li>
     *   <li>HTTP_X_FORWARDED (fallback)</li>
     *   <li>HTTP_X_CLUSTER_CLIENT_IP (fallback)</li>
     *   <li>HTTP_CLIENT_IP (fallback)</li>
     *   <li>HTTP_FORWARDED_FOR (fallback)</li>
     *   <li>HTTP_FORWARDED (fallback)</li>
     *   <li>HTTP_VIA (fallback)</li>
     *   <li>REMOTE_ADDR (direct connection)</li>
     * </ol>
     *
     * <p>For X-Forwarded-For, takes the first IP address (original client IP)
     * as the list may contain multiple proxy IPs.</p>
     *
     * <p>Security Note: In production, configure your load balancer/proxy to set
     * X-Forwarded-For header and ensure this header cannot be spoofed by clients.</p>
     *
     * @param request the HTTP request
     * @return the client IP address
     */
    private String extractIpAddress(HttpServletRequest request) {
        String[] headerNames = {
                "X-Forwarded-For",
                "X-Real-IP",
                "Proxy-Client-IP",
                "WL-Proxy-Client-IP",
                "HTTP_X_FORWARDED_FOR",
                "HTTP_X_FORWARDED",
                "HTTP_X_CLUSTER_CLIENT_IP",
                "HTTP_CLIENT_IP",
                "HTTP_FORWARDED_FOR",
                "HTTP_FORWARDED",
                "HTTP_VIA",
                "REMOTE_ADDR"
        };

        for (String header : headerNames) {
            String ip = request.getHeader(header);
            if (ip != null && !ip.isEmpty() && !"unknown".equalsIgnoreCase(ip)) {
                // X-Forwarded-For may contain multiple IPs, take the first one
                if (ip.contains(",")) {
                    ip = ip.split(",")[0].trim();
                }
                return ip;
            }
        }

        // Fallback to remote address
        return request.getRemoteAddr();
    }
}

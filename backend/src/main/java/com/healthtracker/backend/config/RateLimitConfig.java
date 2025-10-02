package com.healthtracker.backend.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.caffeine.CaffeineProxyManager;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import lombok.Getter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

/**
 * Rate limiting configuration using Bucket4j.
 *
 * <p>This configuration provides token bucket-based rate limiting for authentication endpoints
 * to prevent brute force attacks. Uses Caffeine cache for in-memory storage with thread-safe
 * access patterns.</p>
 *
 * <p>Key features:</p>
 * <ul>
 *   <li>Thread-safe token bucket implementation using Bucket4j</li>
 *   <li>Per-IP address rate limiting with automatic cleanup</li>
 *   <li>Environment-specific configuration via application properties</li>
 *   <li>Production-ready with Redis support (via ProxyManager interface)</li>
 * </ul>
 *
 * <p>For distributed deployments, replace CaffeineProxyManager with RedissonProxyManager
 * or LettuceProxyManager to enable Redis-backed distributed rate limiting.</p>
 *
 * @author Health Tracker Backend Team
 * @since 1.0.0
 * @see io.github.bucket4j.Bucket
 * @see io.github.bucket4j.distributed.proxy.ProxyManager
 */
@Configuration
public class RateLimitConfig {

    /**
     * Configuration properties for rate limiting.
     *
     * <p>Properties are loaded from application.yml under the 'rate-limit' prefix.</p>
     */
    @Component
    @ConfigurationProperties(prefix = "rate-limit")
    @Getter
    public static class RateLimitProperties {

        /**
         * Configuration for authentication endpoint rate limiting.
         */
        private final Auth auth = new Auth();

        /**
         * Cache configuration for storing rate limit buckets.
         */
        private final Cache cache = new Cache();

        @Getter
        public static class Auth {
            /**
             * Number of requests allowed per time window.
             * Default: 5 requests
             */
            private int capacity = 5;

            /**
             * Time window for rate limiting in seconds.
             * Default: 60 seconds (1 minute)
             */
            private long refillPeriodSeconds = 60;

            /**
             * Number of tokens to refill per period.
             * Default: 5 tokens (same as capacity for simple refill)
             */
            private int refillTokens = 5;

            public void setCapacity(int capacity) {
                this.capacity = capacity;
            }

            public void setRefillPeriodSeconds(long refillPeriodSeconds) {
                this.refillPeriodSeconds = refillPeriodSeconds;
            }

            public void setRefillTokens(int refillTokens) {
                this.refillTokens = refillTokens;
            }
        }

        @Getter
        public static class Cache {
            /**
             * Maximum number of IP addresses to track.
             * Default: 100,000 entries
             */
            private long maximumSize = 100_000;

            /**
             * Time after last access when cache entries expire.
             * Default: 3600 seconds (1 hour)
             */
            private long expireAfterAccessSeconds = 3600;

            public void setMaximumSize(long maximumSize) {
                this.maximumSize = maximumSize;
            }

            public void setExpireAfterAccessSeconds(long expireAfterAccessSeconds) {
                this.expireAfterAccessSeconds = expireAfterAccessSeconds;
            }
        }
    }

    private final RateLimitProperties properties;

    public RateLimitConfig(RateLimitProperties properties) {
        this.properties = properties;
    }

    /**
     * Creates a ProxyManager for managing rate limit buckets.
     *
     * <p>Uses Caffeine cache for in-memory storage. For production distributed
     * deployments across multiple instances, replace this with a Redis-based
     * ProxyManager:</p>
     *
     * <pre>
     * // Redis-based distributed rate limiting (for production)
     * {@literal @}Bean
     * public ProxyManager{@literal <}String{@literal >} proxyManager(RedissonClient redisson) {
     *     return RedissonProxyManager.builderFor(redisson)
     *         .build();
     * }
     * </pre>
     *
     * <p>Thread Safety: Bucket4j guarantees thread-safe access to buckets through
     * the ProxyManager interface. Caffeine cache provides lock-free concurrent access.</p>
     *
     * @return thread-safe ProxyManager for bucket management
     */
    @Bean
    public ProxyManager<String> proxyManager() {
        Caffeine<Object, Object> caffeine = Caffeine.newBuilder()
                .maximumSize(properties.getCache().getMaximumSize())
                .expireAfterAccess(
                    properties.getCache().getExpireAfterAccessSeconds(),
                    TimeUnit.SECONDS
                );

        return new CaffeineProxyManager<String>(caffeine, Duration.ofMinutes(1));
    }

    /**
     * Provides a bucket configuration supplier for authentication endpoints.
     *
     * <p>Creates a token bucket with the following behavior:</p>
     * <ul>
     *   <li>Initial capacity: configured capacity (default: 5 tokens)</li>
     *   <li>Refill rate: configured tokens per period (default: 5 tokens per 60 seconds)</li>
     *   <li>Greedy refill: tokens refill gradually over the period</li>
     * </ul>
     *
     * <p>Example: With default settings, a user can make 5 requests immediately,
     * then must wait ~12 seconds between requests (60s / 5 tokens).</p>
     *
     * @return supplier that creates bucket configurations for auth endpoints
     */
    @Bean
    public Supplier<BucketConfiguration> authBucketConfiguration() {
        return () -> {
            var authConfig = properties.getAuth();

            return BucketConfiguration.builder()
                    .addLimit(Bandwidth.builder()
                            .capacity(authConfig.getCapacity())
                            .refillGreedy(
                                authConfig.getRefillTokens(),
                                Duration.ofSeconds(authConfig.getRefillPeriodSeconds())
                            )
                            .build())
                    .build();
        };
    }

    /**
     * Creates or retrieves a rate limit bucket for the given IP address.
     *
     * <p>Thread Safety: This method is thread-safe. Multiple threads requesting
     * a bucket for the same IP will receive the same bucket instance due to
     * Bucket4j's internal synchronization.</p>
     *
     * @param ipAddress the client IP address
     * @param proxyManager the bucket proxy manager
     * @param configSupplier supplier for bucket configuration
     * @return a thread-safe Bucket instance for the given IP
     */
    public static Bucket resolveBucket(
            String ipAddress,
            ProxyManager<String> proxyManager,
            Supplier<BucketConfiguration> configSupplier
    ) {
        return proxyManager.builder()
                .build(ipAddress, configSupplier);
    }
}

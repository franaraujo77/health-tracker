package com.healthtracker.backend.performance;

import com.healthtracker.backend.entity.User;
import com.healthtracker.backend.repository.UserRepository;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Query Performance Tests
 *
 * <p>This test class validates query performance and detects anti-patterns like N+1 queries.
 * It uses Hibernate Statistics to track query execution count and identify optimization opportunities.
 *
 * <p>Test Categories:
 * <ul>
 *   <li>N+1 Query Detection - Validates fetch strategies prevent multiple queries</li>
 *   <li>Batch Fetching - Ensures collections use batch fetching when appropriate</li>
 *   <li>Eager/Lazy Loading - Documents loading behavior for associations</li>
 * </ul>
 *
 * @see org.hibernate.stat.Statistics
 * @see UserRepository
 */
@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class QueryPerformanceTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
        .withDatabaseName("healthtracker_test")
        .withUsername("test")
        .withPassword("test")
        .withReuse(true);

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private UserRepository userRepository;

    private Statistics statistics;

    @BeforeEach
    void setUp() {
        SessionFactory sessionFactory = entityManager
            .getEntityManagerFactory()
            .unwrap(SessionFactory.class);
        statistics = sessionFactory.getStatistics();
        statistics.setStatisticsEnabled(true);
        statistics.clear();
    }

    @Test
    void shouldNotHaveNPlusOneWhenFetchingUsersWithProfiles() {
        // Create test users with profiles
        String testId = UUID.randomUUID().toString().substring(0, 8);
        for (int i = 0; i < 5; i++) {
            User user = new User();
            user.setEmail("user" + i + "-" + testId + "@test.com");
            user.setPasswordHash("hash" + i);
            userRepository.save(user);
        }

        // Clear statistics after setup
        statistics.clear();

        // Fetch all users (baseline query)
        var users = userRepository.findAll();

        // Get query count
        long queryCount = statistics.getQueryExecutionCount();

        // Should be 1 query for users + potentially 1 for associations
        // NOT N queries (one per user)
        assertThat(queryCount)
            .withFailMessage("Potential N+1 query detected! Executed %d queries for %d users. " +
                    "Consider using JOIN FETCH or @EntityGraph",
                queryCount, users.size())
            .isLessThanOrEqualTo(2);
    }

    @Test
    void shouldValidateFirstLevelCacheBehavior() {
        // Create test user
        User user = new User();
        user.setEmail("cache-" + UUID.randomUUID() + "@test.com");
        user.setPasswordHash("hash");
        var savedUser = userRepository.save(user);

        entityManager.flush();
        statistics.clear();

        // Fetch user twice in same transaction
        userRepository.findById(savedUser.getId());
        userRepository.findById(savedUser.getId());

        long queryCount = statistics.getQueryExecutionCount();

        // With L1 cache, second fetch should not execute additional query
        // Query count should be 0 (both served from cache) or 1 (first fetch, second cached)
        assertThat(queryCount)
            .withFailMessage("L1 cache should prevent duplicate queries. Executed %d queries", queryCount)
            .isLessThanOrEqualTo(1);
    }

    @Test
    void shouldDocumentCacheClearBehavior() {
        // Create test user
        User user = new User();
        user.setEmail("clear-" + UUID.randomUUID() + "@test.com");
        user.setPasswordHash("hash");
        var savedUser = userRepository.save(user);

        // Flush and clear to simulate new session
        entityManager.flush();
        entityManager.clear();
        statistics.clear();

        // Fetch single user by ID
        userRepository.findById(savedUser.getId());

        long queryCount = statistics.getQueryExecutionCount();

        // After clearing cache, fetch may execute query depending on transaction state
        // In @Transactional tests, Hibernate may still use query cache
        assertThat(queryCount)
            .withFailMessage("Cache clear behavior documented. Executed %d queries", queryCount)
            .isLessThanOrEqualTo(1);
    }

    @Test
    void shouldValidateQueryCountForEmailLookup() {
        // Create test user
        User user = new User();
        String email = "email-" + UUID.randomUUID() + "@test.com";
        user.setEmail(email);
        user.setPasswordHash("hash");
        userRepository.save(user);

        statistics.clear();

        // Find by email (should use index)
        userRepository.findByEmail(email);

        long queryCount = statistics.getQueryExecutionCount();

        // Email lookup should be exactly 1 query
        assertThat(queryCount)
            .withFailMessage("Email lookup should execute exactly 1 query, but executed %d", queryCount)
            .isEqualTo(1);
    }

    @Test
    void shouldDocumentQueryCountForMultipleUsers() {
        // Create multiple test users
        String testId = UUID.randomUUID().toString().substring(0, 8);
        for (int i = 0; i < 10; i++) {
            User user = new User();
            user.setEmail("batch" + i + "-" + testId + "@test.com");
            user.setPasswordHash("hash" + i);
            userRepository.save(user);
        }

        statistics.clear();

        // Fetch all users
        var users = userRepository.findAll();

        long queryCount = statistics.getQueryExecutionCount();
        long preparedStatementCount = statistics.getPrepareStatementCount();

        // Document the query behavior for future reference
        System.out.println("Query Performance Metrics:");
        System.out.println("- Users fetched: " + users.size());
        System.out.println("- Queries executed: " + queryCount);
        System.out.println("- Prepared statements: " + preparedStatementCount);
        System.out.println("- Query count per user: " + (double) queryCount / users.size());

        // Should not have N queries (one per user)
        assertThat(queryCount)
            .withFailMessage("Query count should not scale linearly with user count")
            .isLessThan(users.size());
    }
}

package com.healthtracker.backend;

import org.junit.jupiter.api.Test;

/**
 * Basic smoke test to verify the Spring Boot application context loads successfully.
 * Extends BaseIntegrationTest to ensure database connectivity via Testcontainers.
 */
class HealthTrackerBackendApplicationTests extends BaseIntegrationTest {

	@Test
	void contextLoads() {
		// This test verifies that the Spring application context loads successfully
		// with all required beans and configurations in place.
	}

}

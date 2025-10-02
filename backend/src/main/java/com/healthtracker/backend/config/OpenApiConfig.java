package com.healthtracker.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI healthTrackerOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Health Tracker API")
                        .description("RESTful API for tracking health metrics, setting goals, and monitoring progress. " +
                                "HIPAA-compliant health data management system.")
                        .version("v1.0.0")
                        .contact(new Contact()
                                .name("Health Tracker Team")
                                .email("support@healthtracker.com")
                                .url("https://github.com/healthtracker/health-tracker"))
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:8080")
                                .description("Development server"),
                        new Server()
                                .url("https://api.healthtracker.com")
                                .description("Production server")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
                .components(new io.swagger.v3.oas.models.Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .name("bearerAuth")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("JWT authentication token. Obtain from /api/v1/auth/login endpoint.")));
    }
}

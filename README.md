# Health Tracker

A comprehensive health tracking application built with modern technologies and enterprise-grade architecture.

## Project Overview

Health Tracker is a monorepo-based application designed to help users monitor and manage their health data securely. The platform features a React-based frontend and a Spring Boot backend, with full observability and HIPAA-compliant security measures.

## Architecture

### Technology Stack

**Frontend:**
- React 19 with Vite
- XState 5.x for complex state management
- TypeScript for type safety
- React Query for API state management
- Material Design 3 components

**Backend:**
- Java 21
- Spring Boot 3.2+
- Spring Security 6+ with JWT authentication
- PostgreSQL 15+ with HikariCP
- Spring Data JPA with Flyway migrations

**Infrastructure:**
- Docker containers with multi-stage builds
- GitHub Actions CI/CD
- Prometheus + Grafana for monitoring
- ELK Stack for logging
- Jaeger for distributed tracing

## Monorepo Structure

```
health-tracker/
├── frontend/              # React 19 + XState application
├── backend/               # Spring Boot Java 21 application
├── shared/                # Shared configurations and types
│   ├── types/            # TypeScript type definitions
│   └── configs/          # Common configuration files
├── infrastructure/        # DevOps and deployment
│   ├── terraform/        # Infrastructure as Code
│   └── docker/           # Docker configurations
├── docs/                  # Documentation
│   ├── architecture/     # Architecture diagrams
│   └── api/              # API documentation
└── .github/               # CI/CD workflows
    └── workflows/
```

## Getting Started

### Prerequisites

- Node.js 18+ (for frontend development)
- Java 21 (for backend development)
- Docker and Docker Compose
- PostgreSQL 15+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/[org]/health-tracker.git
cd health-tracker

# Install dependencies
npm ci

# Start development servers
npm run dev
```

### Development Workflow

```bash
# Run all tests
npm test

# Run linting
npm run lint

# Build all components
npm run build
```

## Security & Compliance

- **Authentication**: JWT-based with refresh token rotation
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: AES-256 encryption at rest, TLS 1.3 in transit
- **Compliance**: HIPAA-ready architecture with audit logging

## Contributing

1. Create a feature branch: `feature/ISSUE-123-description`
2. Follow Conventional Commits format
3. Ensure all tests pass
4. Submit a pull request with 1 approval required

## License

MIT License - See LICENSE file for details

## Documentation

- [Architecture Overview](docs/architecture/README.md)
- [API Documentation](docs/api/README.md)
- [Development Guide](docs/DEVELOPMENT.md)

## Support

For issues and questions, please open a GitHub issue or contact the development team.

---

**Status**: In Active Development
**Version**: 0.1.0
**Last Updated**: 2025-09-30

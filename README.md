# Health Tracker

[![CI/CD Pipeline](https://github.com/[org]/health-tracker/actions/workflows/validation-orchestrator.yml/badge.svg)](https://github.com/[org]/health-tracker/actions/workflows/validation-orchestrator.yml)
[![Frontend CI](https://github.com/[org]/health-tracker/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/[org]/health-tracker/actions/workflows/frontend-ci.yml)
[![Backend CI](https://github.com/[org]/health-tracker/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/[org]/health-tracker/actions/workflows/backend-ci.yml)
[![Security Scan](https://github.com/[org]/health-tracker/actions/workflows/security-validation.yml/badge.svg)](https://github.com/[org]/health-tracker/actions/workflows/security-validation.yml)

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

## CI/CD Pipeline

### Overview

Our CI/CD pipeline implements a **validation orchestrator pattern** that ensures code quality through comprehensive automated testing before allowing code reviews and merges. This approach reduces review noise, catches issues early, and maintains high code quality standards.

### Pipeline Architecture

```text
PR Created → Validation Orchestrator
              ↓
    ┌─────────┼─────────┐
    │         │         │
Frontend  Backend  Security
  CI        CI     Validation
    │         │         │
    └─────────┼─────────┘
              ↓
      Aggregate Results
              ↓
    ┌─────────┴─────────┐
    │                   │
All Pass         Any Fail
    │                   │
Claude Review    Skip Review
Triggered        (Fix Issues)
```

### Validation Stages

Our pipeline runs three parallel validation workflows:

1. **Frontend CI** (`frontend-ci.yml`)
   - Linting (ESLint)
   - Type checking (TypeScript)
   - Unit tests (Vitest)
   - Production build

2. **Backend CI** (`backend-ci.yml`)
   - Compilation (Maven)
   - Unit tests (JUnit)
   - Integration tests
   - Code coverage (JaCoCo - 80% threshold)

3. **Security Validation** (`security-validation.yml`)
   - Dependency scanning
   - SAST analysis (CodeQL)

### Business Value

✅ **Quality Gates**: Automated validation prevents broken code from being merged
✅ **Fast Feedback**: Parallel execution provides results in 2-3 minutes
✅ **Reduced Review Time**: Reviewers focus on logic, not syntax errors
✅ **Security First**: Every PR scanned for vulnerabilities before review
✅ **Cost Savings**: Catch bugs in development, not production

### Quick Validation

Run validations locally before pushing:

```bash
# Frontend validations
cd frontend
npm run lint && npm run type-check && npm test && npm run build

# Backend validations
cd backend
mvn clean verify

# All validations (from root)
npm run validate
```

### Documentation

Comprehensive pipeline documentation available in `.github/workflows/`:

- **[Pipeline Overview](.github/workflows/README.md)** - Complete system documentation
- **[Technical Documentation](.github/workflows/TECHNICAL.md)** - Architecture and implementation details
- **[Troubleshooting Guide](.github/workflows/TROUBLESHOOTING.md)** - Common issues and solutions
- **[DevOps Runbook](.github/workflows/RUNBOOK.md)** - Operational procedures and maintenance

<<<<<<< HEAD
## Code Quality & Linting

[![Lint and Format](https://github.com/[org]/health-tracker/actions/workflows/lint-and-format.yml/badge.svg)](https://github.com/[org]/health-tracker/actions/workflows/lint-and-format.yml)

Our project maintains high code quality through automated linting and formatting tools that run locally and in CI/CD.

### Linting Stack

- **ESLint** - JavaScript/TypeScript code quality and best practices
- **Prettier** - Automated code formatting for consistency
- **Stylelint** - CSS/SCSS linting with Material Design 3 token enforcement
- **Testing Library Rules** - React Testing Library and jest-dom best practices
- **Husky** - Git hooks for pre-commit linting
- **lint-staged** - Fast linting on staged files only

### Quick Reference

```bash
# Frontend linting commands
cd frontend

npm run lint              # Check TypeScript/JavaScript
npm run lint -- --fix     # Auto-fix TypeScript/JavaScript
npm run lint:css          # Check CSS
npm run lint:css -- --fix # Auto-fix CSS
npm run format            # Format all files with Prettier
npm run format:check      # Check formatting without changes
```

### Pre-commit Hooks

All commits automatically run linting on staged files via Husky + lint-staged:

- ESLint fixes TypeScript/JavaScript issues
- Stylelint fixes CSS property ordering and validates M3 tokens
- Prettier formats all files

Commits are blocked if violations cannot be auto-fixed.

### CI/CD Integration

The `lint-and-format.yml` workflow runs on every PR with three parallel checks:

1. **ESLint Check** - Validates TypeScript/JavaScript code quality
2. **Prettier Check** - Ensures consistent formatting
3. **Stylelint Check** - Validates CSS and M3 token usage

All checks must pass before PRs can be merged to protected branches.

### Documentation

For comprehensive linting setup, configuration, and troubleshooting:

- **[Linting Guide](docs/LINTING.md)** - Complete setup and usage documentation
- **[VS Code Setup](docs/linting/vscode-setup.md)** - IDE configuration for auto-fix on save
- **[Stylelint Guide](docs/linting/stylelint-setup.md)** - CSS linting and M3 tokens
- **[Pre-commit Hooks](docs/linting/pre-commit-hooks.md)** - Git hooks configuration
- **[Branch Protection](docs/BRANCH_PROTECTION.md)** - Required status checks setup

### New Developer Setup

1. Install dependencies: `npm install` (Husky hooks auto-install)
2. Install VS Code extensions (prompted automatically)
3. Start coding - linting runs automatically on save and commit!

See the [Linting Guide](docs/LINTING.md) for detailed setup instructions.

## Monorepo Structure

```text
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

**Required:**

- Node.js 20.x (for frontend development)
- Java 21 (for backend development)
- Maven 3.9+
- PostgreSQL 15+
- Git

**Optional:**

- Docker and Docker Compose (for containerized development)
- GitHub CLI (`gh`) for workflow management

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/[org]/health-tracker.git
cd health-tracker

# 2. Install dependencies
npm ci                    # Root dependencies
cd frontend && npm ci     # Frontend dependencies
cd ../backend && mvn dependency:go-offline  # Backend dependencies

# 3. Setup environment
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env

# 4. Start development servers
npm run dev              # Starts both frontend and backend
```

### Running Validations Locally

Before pushing code, run the same validations that CI will execute:

#### Frontend Validations

```bash
cd frontend

# Run linting
npm run lint

# Run type checking
npm run type-check

# Run tests
npm test

# Run build
npm run build

# Run all validations in sequence
npm run lint && npm run type-check && npm test && npm run build
```

#### Backend Validations

```bash
cd backend

# Compile/build
mvn clean compile

# Run unit tests
mvn test

# Run integration tests
mvn verify

# Check coverage (requires tests to run first)
mvn jacoco:report
open target/site/jacoco/index.html

# Run all validations
mvn clean verify
```

#### Security Checks

```bash
# Frontend dependency audit
cd frontend && npm audit

# Backend dependency check
cd backend && mvn dependency:tree
```

### Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/ISSUE-123-description

# 2. Make changes and test locally
cd frontend
npm run lint && npm run type-check && npm test && npm run build

cd ../backend
mvn clean verify

# 3. Commit with conventional commit format
git add .
git commit -m "feat(frontend): add new feature"

# 4. Push and create PR
git push origin feature/ISSUE-123-description
gh pr create

# 5. CI will automatically run validations
# Check PR for validation status comment

# 6. If validations pass, Claude Code review will be triggered
# 7. After approval, merge PR
```

### IDE Setup

**VS Code (Recommended for Frontend)**:

```bash
# Install recommended extensions
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss

# Extensions will auto-format on save
```

**IntelliJ IDEA (Recommended for Backend)**:

- Enable "Save Actions" plugin
- Configure auto-format on save
- Enable Maven auto-import

## Security & Compliance

- **Authentication**: JWT-based with refresh token rotation
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: AES-256 encryption at rest, TLS 1.3 in transit
- **Compliance**: HIPAA-ready architecture with audit logging

## Contributing

### Development Process

1. **Create a feature branch**

   ```bash
   git checkout -b feature/ISSUE-123-description
   ```

2. **Make your changes**
   - Write clean, documented code
   - Add tests for new functionality
   - Update documentation as needed

3. **Run validations locally** (Required before pushing)

   ```bash
   # Frontend
   cd frontend && npm run lint && npm run type-check && npm test && npm run build

   # Backend
   cd backend && mvn clean verify
   ```

4. **Commit with Conventional Commits format**

   ```bash
   git commit -m "type(scope): description"
   ```

   **Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

   **Examples**:
   - `feat(frontend): add user profile component`
   - `fix(backend): resolve authentication bug`
   - `docs(ci): update pipeline documentation`

5. **Push and create PR**
   ```bash
   git push origin feature/ISSUE-123-description
   gh pr create
   ```

### PR Requirements

**Automated Checks (Required)**:

- ✅ All frontend validations pass (lint, type-check, tests, build)
- ✅ All backend validations pass (compile, tests, coverage ≥80%)
- ✅ Security scans pass (no high/critical vulnerabilities)
- ✅ Claude Code review completed (triggers automatically after validations pass)

**Manual Review (Required)**:

- 👥 At least 1 approval from code owner
- 💬 All review comments resolved
- 📝 PR description clearly explains changes

### Validation Failures

If CI validations fail:

1. **Check the PR comment** for validation status details
2. **Reproduce locally** using the commands in the error report
3. **Fix the issues** and push again
4. **Repeat** until all validations pass

See [Troubleshooting Guide](.github/workflows/TROUBLESHOOTING.md) for common issues and solutions.

### Code Quality Standards

- **Frontend**: ESLint rules enforced, 0 warnings allowed in CI
- **Backend**: 80% code coverage minimum (JaCoCo)
- **TypeScript**: Strict mode enabled, no `any` types
- **Tests**: Unit tests required for all new features
- **Documentation**: JSDoc/JavaDoc for public APIs

### Branch Protection

The `main` branch is protected with the following rules:

- All status checks must pass
- At least 1 approval required
- No force pushes allowed
- Branches must be up to date before merge

## License

MIT License - See LICENSE file for details

## Documentation

### Application Documentation

- [Architecture Overview](docs/architecture/README.md)
- [API Documentation](docs/api/README.md)
- [Development Guide](docs/DEVELOPMENT.md)

### CI/CD Pipeline Documentation

- [Pipeline Overview](.github/workflows/README.md) - System architecture and workflow diagrams
- [Technical Documentation](.github/workflows/TECHNICAL.md) - Implementation details and configuration
- [Troubleshooting Guide](.github/workflows/TROUBLESHOOTING.md) - Common issues and debugging steps
- [DevOps Runbook](.github/workflows/RUNBOOK.md) - Operational procedures and incident response

### Additional Resources

- [Epic: Conditional Claude Review](https://www.notion.so/291088e8988b809d88d3ee41ca234ae7) - Epic overview and requirements
- [Story Dependencies](docs/epic-story-dependency-graph.md) - Visual dependency graph
- [Decision Tree](docs/claude-review-decision-tree.md) - Review trigger logic

## Support

For issues and questions:

- **Bugs**: Open a GitHub issue with the `bug` label
- **Features**: Open a GitHub issue with the `enhancement` label
- **Pipeline Issues**: Check [Troubleshooting Guide](.github/workflows/TROUBLESHOOTING.md) first
- **Urgent**: Contact DevOps on-call via PagerDuty

## Project Status

**Status**: ✅ In Active Development
**Version**: 0.2.0
**Pipeline**: ✅ Validation Orchestrator Active
**Last Updated**: 2025-10-19

### Recent Updates

- **2025-10-19**: Implemented validation orchestrator CI/CD pipeline with conditional Claude Code review
- **2025-10-18**: Eliminated mock authentication security vulnerability
- **2025-10-04**: Added PostgreSQL database persistence layer
- **2025-09-30**: Initial project setup and repository infrastructure

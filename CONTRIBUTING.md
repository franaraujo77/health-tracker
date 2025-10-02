# Contributing to Health Tracker

Thank you for your interest in contributing to Health Tracker! This guide will help you get started with development.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Running Locally](#running-locally)
- [Running Tests](#running-tests)
- [Code Style Guidelines](#code-style-guidelines)
- [Git Workflow](#git-workflow)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Common Tasks](#common-tasks)

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **Java 21** (OpenJDK or Microsoft Build)

  ```bash
  java -version  # Should show version 21.x.x
  ```

- **Node.js 20+** and **npm 10+**

  ```bash
  node --version  # Should show v20.x.x or higher
  npm --version   # Should show 10.x.x or higher
  ```

- **Docker Desktop** (with Docker Compose)

  ```bash
  docker --version         # Should show 24.x.x or higher
  docker-compose --version # Should show 2.x.x or higher
  ```

- **Git** (version 2.30+)

  ```bash
  git --version
  ```

- **Maven 3.9+** (or use included Maven wrapper)
  ```bash
  mvn --version
  ```

### Optional Tools

- **PostgreSQL Client** (psql) for database inspection
- **Redis CLI** for cache inspection
- **IDE**: IntelliJ IDEA, VS Code, or Eclipse with Java extensions

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/healthtracker/health-tracker.git
cd health-tracker
```

### 2. Set Up Environment Variables

Create a `.env` file in the project root:

```bash
# Database
DB_PASSWORD=secret

# JWT Configuration
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970

# Encryption (for PHI data)
ENCRYPTION_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970

# Observability
TRACING_SAMPLE_RATE=1.0

# Jaeger
JAEGER_ENDPOINT=http://localhost:4318/v1/traces
```

**⚠️ Security Note**: These are development credentials only. Never commit production secrets to version control.

### 3. Start Infrastructure Services

Start PostgreSQL, Redis, and the observability stack using Docker Compose:

```bash
docker-compose up -d
```

This starts:

- PostgreSQL (port 5433)
- Redis (port 6379)
- Prometheus (port 9090)
- Grafana (port 3001)
- Elasticsearch (port 9200)
- Logstash (port 5000)
- Kibana (port 5601)
- Jaeger (port 16686)

Verify services are running:

```bash
docker-compose ps
```

### 4. Build the Backend

```bash
cd backend

# Using Maven wrapper (recommended)
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./mvnw clean install

# Or using system Maven
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 mvn clean install
```

**Note**: On Linux/Mac, set `JAVA_HOME` to your Java 21 installation path. On Windows, use `set JAVA_HOME=C:\Path\To\Java21`.

### 5. Run Database Migrations

Flyway migrations run automatically on application startup, but you can verify:

```bash
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./mvnw flyway:info
```

### 6. Set Up the Frontend

```bash
cd ../frontend
npm install
```

## Running Locally

### Running with Docker Compose (Recommended)

Start all services including backend and frontend:

```bash
# From project root
docker-compose up
```

Access the application:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **API Docs**: http://localhost:8080/v3/api-docs

### Running Backend Separately

If you prefer to run the backend outside Docker:

```bash
cd backend
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 mvn spring-boot:run
```

The API will be available at http://localhost:8080.

**Health Check**:

```bash
curl http://localhost:8080/actuator/health
```

### Running Frontend Separately

If you prefer to run the frontend in development mode:

```bash
cd frontend
npm run dev
```

The frontend will be available at http://localhost:3000 with hot reload enabled.

### Accessing the Database

Connect to PostgreSQL using psql:

```bash
PGPASSWORD=secret psql -h localhost -p 5433 -U admin -d healthtracker
```

Common queries:

```sql
-- List all tables
\dt

-- View users
SELECT * FROM users;

-- View health metrics
SELECT * FROM health_metrics LIMIT 10;

-- View database schema
\d+ users
```

### Accessing Observability Tools

- **Prometheus**: http://localhost:9090 - Metrics and queries
- **Grafana**: http://localhost:3001 - Dashboards (admin/admin)
- **Kibana**: http://localhost:5601 - Logs and analytics
- **Jaeger**: http://localhost:16686 - Distributed tracing

## Running Tests

### Backend Tests

Run all tests:

```bash
cd backend
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 mvn test
```

Run specific test classes:

```bash
# Unit tests only
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 mvn test -Dtest="UserServiceTest,GoalServiceTest"

# Integration tests (uses Testcontainers)
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 mvn test -Dtest="*IntegrationTest"
```

Run tests with coverage:

```bash
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 mvn test jacoco:report
```

View coverage report at `target/site/jacoco/index.html`.

### Frontend Tests

```bash
cd frontend
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

### Integration Tests

End-to-end integration tests require all services running:

```bash
# Start all services
docker-compose up -d

# Run integration tests
cd backend
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 mvn verify -Pintegration-tests
```

## Code Style Guidelines

### Backend (Java)

We follow **Google Java Style Guide** with some modifications:

#### Formatting

- **Indentation**: 4 spaces (not tabs)
- **Line length**: 120 characters maximum
- **Braces**: K&R style (opening brace on same line)
- **Imports**: No wildcards, organize in groups

#### Naming Conventions

- **Classes**: PascalCase (e.g., `UserService`, `HealthMetricsController`)
- **Methods**: camelCase (e.g., `getUserById`, `recordHealthMetric`)
- **Variables**: camelCase (e.g., `userId`, `metricValue`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`)
- **Packages**: lowercase (e.g., `com.healthtracker.backend.service`)

#### Code Organization

```java
// 1. Package declaration
package com.healthtracker.backend.service;

// 2. Imports (organized)
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

import com.healthtracker.backend.entity.User;
import com.healthtracker.backend.repository.UserRepository;

// 3. Class declaration with Lombok
@Service
@RequiredArgsConstructor
public class UserService {

    // 4. Fields (final when possible)
    private final UserRepository userRepository;

    // 5. Methods
    public User getUserById(UUID id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("User not found"));
    }
}
```

#### Best Practices

- Use **Lombok** to reduce boilerplate (@Data, @RequiredArgsConstructor, @Slf4j)
- Prefer **constructor injection** over field injection
- Use **Optional** for nullable returns
- Add **@Transactional** for service methods that modify data
- Write **JavaDoc** for public APIs
- Use **meaningful variable names** (avoid abbreviations)

### Frontend (TypeScript/React)

We follow **Airbnb JavaScript Style Guide** with TypeScript:

#### Formatting

- **Indentation**: 2 spaces
- **Line length**: 100 characters maximum
- **Quotes**: Single quotes for strings
- **Semicolons**: Required

#### Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile.tsx`, `HealthMetricsChart.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth`, `useHealthMetrics`)
- **Functions**: camelCase (e.g., `fetchUserData`, `handleSubmit`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
- **Interfaces/Types**: PascalCase with descriptive names (e.g., `UserProfile`, `HealthMetric`)

#### Component Structure

```typescript
// 1. Imports
import React, { useState, useEffect } from 'react';
import { User } from '../types/user';
import { fetchUserProfile } from '../api/users';

// 2. Interface/Type definitions
interface UserProfileProps {
  userId: string;
}

// 3. Component
export const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
  // 4. Hooks
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, [userId]);

  // 5. Event handlers
  const loadUser = async () => {
    try {
      const data = await fetchUserProfile(userId);
      setUser(data);
    } finally {
      setLoading(false);
    }
  };

  // 6. Render
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div className="user-profile">
      <h1>{user.email}</h1>
    </div>
  );
};
```

#### Best Practices

- Use **functional components** with hooks
- Use **TypeScript interfaces** for props and state
- Prefer **named exports** over default exports
- Use **async/await** over promises
- Extract **reusable logic** into custom hooks
- Use **React Query** for server state management

### Documentation

- Add **JSDoc/JavaDoc** for public APIs
- Include **usage examples** in documentation
- Keep **README** files up to date
- Document **breaking changes** in commit messages
- Add **inline comments** for complex logic only

### Linting

Backend (Checkstyle):

```bash
cd backend
mvn checkstyle:check
```

Frontend (ESLint):

```bash
cd frontend
npm run lint
```

Fix auto-fixable issues:

```bash
npm run lint:fix
```

## Git Workflow

### Branching Strategy

We use **GitFlow** with the following branches:

- **main**: Production-ready code (protected)
- **develop**: Integration branch for features (protected)
- **feature/**: Feature branches (e.g., `feature/user-authentication`)
- **bugfix/**: Bug fix branches (e.g., `bugfix/login-error`)
- **hotfix/**: Production hotfix branches (e.g., `hotfix/security-patch`)
- **release/**: Release preparation branches (e.g., `release/v1.0.0`)

### Creating a Feature Branch

```bash
# Update develop branch
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/add-goal-tracking

# Make changes and commit
git add .
git commit -m "feat: add goal tracking functionality"

# Push to remote
git push -u origin feature/add-goal-tracking
```

### Commit Message Format

We use **Conventional Commits** format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, or tooling

**Examples**:

```bash
# Simple commit
git commit -m "feat: add password reset functionality"

# With scope
git commit -m "fix(auth): resolve JWT token expiration issue"

# With body and footer
git commit -m "feat(metrics): add blood pressure tracking

Implement blood pressure recording with systolic/diastolic values.
Add validation for normal ranges.

Closes #123"
```

### Commit Hooks

We use **Husky** for Git hooks:

- **pre-commit**: Runs linting and formatting
- **commit-msg**: Validates commit message format
- **pre-push**: Runs tests before pushing

To bypass hooks (use sparingly):

```bash
git commit --no-verify -m "WIP: temporary commit"
```

## Pull Request Process

### 1. Before Creating a PR

- Ensure all tests pass locally
- Run linting and fix issues
- Update documentation if needed
- Rebase on latest develop branch
- Squash WIP commits if applicable

```bash
# Rebase on develop
git checkout develop
git pull origin develop
git checkout feature/your-branch
git rebase develop

# Run tests
cd backend && mvn test
cd ../frontend && npm test

# Run linting
cd backend && mvn checkstyle:check
cd ../frontend && npm run lint
```

### 2. Creating a Pull Request

Use the PR template:

```markdown
## Description

Brief description of what this PR does.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues

Closes #123

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests pass locally
```

### 3. PR Review Process

#### For Authors:

1. **Create PR** against `develop` branch
2. **Assign reviewers** (at least 2 required)
3. **Link related issues** using "Closes #123"
4. **Respond to feedback** within 24 hours
5. **Request re-review** after addressing comments

#### For Reviewers:

1. **Review within 48 hours** of assignment
2. **Check code quality**: readability, maintainability, performance
3. **Verify tests**: coverage, edge cases, integration tests
4. **Test locally** for complex changes
5. **Approve or request changes** with constructive feedback

### 4. Merging

- **Squash and merge** for feature branches (keeps history clean)
- **Merge commit** for release branches (preserves branch history)
- **Delete branch** after merging

```bash
# After PR is approved and merged
git checkout develop
git pull origin develop
git branch -d feature/your-branch
git push origin --delete feature/your-branch
```

## Project Structure

```
health-tracker/
├── backend/                      # Spring Boot backend
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/healthtracker/backend/
│   │   │   │   ├── config/       # Spring configuration
│   │   │   │   ├── controller/   # REST controllers
│   │   │   │   ├── entity/       # JPA entities
│   │   │   │   ├── repository/   # Data repositories
│   │   │   │   ├── service/      # Business logic
│   │   │   │   ├── security/     # Security components
│   │   │   │   └── dto/          # Data transfer objects
│   │   │   └── resources/
│   │   │       ├── application.yml
│   │   │       └── db/migration/ # Flyway migrations
│   │   └── test/                 # Test classes
│   └── pom.xml
├── frontend/                     # React frontend
│   ├── src/
│   │   ├── components/           # React components
│   │   ├── pages/                # Page components
│   │   ├── hooks/                # Custom hooks
│   │   ├── api/                  # API client
│   │   ├── types/                # TypeScript types
│   │   └── utils/                # Utility functions
│   ├── package.json
│   └── vite.config.ts
├── docs/                         # Documentation
│   ├── architecture/             # Architecture diagrams
│   └── api/                      # API documentation
├── docker-compose.yml            # Docker services
├── .env.example                  # Environment template
└── CONTRIBUTING.md               # This file
```

## Common Tasks

### Adding a New Database Migration

1. Create migration file in `backend/src/main/resources/db/migration/`:

   ```
   V{version}__{description}.sql
   ```

   Example: `V6__add_medication_tracking.sql`

2. Write SQL:

   ```sql
   CREATE TABLE medications (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID NOT NULL REFERENCES users(id),
       name VARCHAR(255) NOT NULL,
       dosage VARCHAR(100),
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE INDEX idx_medications_user_id ON medications(user_id);
   ```

3. Test migration:
   ```bash
   env JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./mvnw flyway:migrate
   ```

### Adding a New REST Endpoint

1. Create DTO classes in `backend/src/main/java/com/healthtracker/backend/dto/`
2. Add service method in appropriate service class
3. Add controller method with OpenAPI annotations
4. Write unit and integration tests
5. Update API documentation if needed

### Adding a New React Component

1. Create component file in `frontend/src/components/`
2. Define TypeScript interfaces for props
3. Implement component with hooks
4. Add unit tests using React Testing Library
5. Export component from index file

### Updating Dependencies

Backend:

```bash
cd backend
mvn versions:display-dependency-updates
```

Frontend:

```bash
cd frontend
npm outdated
npm update
```

### Debugging

Backend (IntelliJ IDEA):

1. Set breakpoints in code
2. Run application in debug mode
3. Use "Debug" configuration

Backend (VS Code):

1. Install Java Extension Pack
2. Use launch configuration in `.vscode/launch.json`
3. Set breakpoints and press F5

Frontend (Browser DevTools):

1. Open browser DevTools (F12)
2. Use React DevTools extension
3. Check Network tab for API calls

### Troubleshooting

**Database connection issues**:

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

**Port already in use**:

```bash
# Find process using port 8080
lsof -i :8080

# Kill process
kill -9 <PID>
```

**Build failures**:

```bash
# Clean build
cd backend
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 mvn clean install -DskipTests

# Clear Maven cache
rm -rf ~/.m2/repository/com/healthtracker
```

## Getting Help

- **Documentation**: Check `/docs` directory
- **API Reference**: http://localhost:8080/swagger-ui.html
- **Issues**: https://github.com/healthtracker/health-tracker/issues
- **Discussions**: https://github.com/healthtracker/health-tracker/discussions
- **Email**: support@healthtracker.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

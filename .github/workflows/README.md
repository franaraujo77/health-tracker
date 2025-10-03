# CI/CD Workflows

This directory contains GitHub Actions workflows for automated testing, security scanning, and deployment.

## Workflows Overview

### 1. Frontend CI (`frontend-ci.yml`)

**Triggers:** Push/PR to main/develop with frontend changes

**Jobs:**

- **test**: Build, lint, type-check, and test frontend
  - Node.js 20 with npm caching
  - ESLint, TypeScript, Vitest
  - Build artifact upload (7 days)
  - Bundle size reporting
- **security**: Snyk vulnerability scanning
  - Dependency vulnerability detection
  - SARIF upload to GitHub Security
- **code-quality**: ESLint analysis with reports
- **notify**: Auto-create issues on failure

**Required Secrets:**

- `SNYK_TOKEN`: Snyk API token for security scanning

### 2. Backend CI (`backend-ci.yml`)

**Triggers:** Push/PR to main/develop with backend changes

**Jobs:**

- **test**: Build and test backend
  - Java 21 (Temurin) with Maven caching
  - PostgreSQL 15 service container
  - Test results and JAR artifact upload
- **coverage**: JaCoCo code coverage
  - Codecov integration
  - Coverage report generation
- **security**: Multi-tool security scanning
  - Snyk for dependency vulnerabilities
  - OWASP Dependency Check
- **code-quality**: SonarQube analysis
  - Code quality metrics
  - Technical debt analysis
- **notify**: Auto-create issues on failure

**Required Secrets:**

- `SNYK_TOKEN`: Snyk API token
- `SONAR_TOKEN`: SonarQube authentication token
- `SONAR_HOST_URL`: SonarQube server URL

### 3. Docker Build & Push (`docker-build-push.yml`)

**Triggers:**

- Push to main with Docker-related changes
- Release published
- Manual workflow dispatch

**Jobs:**

- **build-frontend**: Build and push frontend image
  - Multi-platform (amd64, arm64)
  - GitHub Container Registry (ghcr.io)
  - Trivy vulnerability scanning
  - Automatic tagging (semantic versioning)
- **build-backend**: Build and push backend image
  - Multi-platform (amd64, arm64)
  - GitHub Container Registry
  - Trivy vulnerability scanning
  - Automatic tagging
- **release-summary**: Generate release notes
  - Pull commands for new images
  - Vulnerability scan status
- **notify**: Auto-create issues on failure

**Required Permissions:**

- `packages: write` - Push to GitHub Container Registry
- `security-events: write` - Upload security scan results
- `contents: read` - Checkout repository

**Automatic Tagging:**

Images are tagged with:

- `latest` - Latest main branch build
- `<semver>` - Semantic version (from release)
- `<branch>-<sha>` - Branch + commit SHA
- `<major>.<minor>` - Major.minor version

## Setup Instructions

### 1. Configure Secrets

Go to **Settings → Secrets and variables → Actions** and add:

#### Required Secrets

- **SNYK_TOKEN**: Get from [Snyk Dashboard](https://app.snyk.io/account)
  ```bash
  # Test locally
  snyk auth
  snyk test
  ```

#### Optional Secrets

- **SONAR_TOKEN** + **SONAR_HOST_URL**: For SonarQube analysis

  ```bash
  # Self-hosted SonarQube
  SONAR_HOST_URL=https://sonarqube.example.com
  ```

- **CODECOV_TOKEN**: For Codecov.io (optional, works without token for public repos)

### 2. Enable Permissions

Go to **Settings → Actions → General**:

- ✅ Allow GitHub Actions to create pull requests
- ✅ Workflow permissions: Read and write
- ✅ Allow GitHub Actions to approve pull requests

### 3. Container Registry Access

GitHub Container Registry (ghcr.io) is enabled by default. Images are published to:

```
ghcr.io/<owner>/<repo>/frontend:latest
ghcr.io/<owner>/<repo>/backend:latest
```

Make packages public: **Packages → Package settings → Change visibility**

### 4. Pull Images

```bash
# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull images
docker pull ghcr.io/<owner>/<repo>/frontend:latest
docker pull ghcr.io/<owner>/<repo>/backend:latest
```

## Workflow Features

### Performance Optimizations

- **Dependency Caching**: Maven and npm dependencies cached
- **Build Caching**: Docker layer caching with GitHub Actions cache
- **Concurrency Control**: Cancel stale workflow runs
- **Path Filtering**: Only run when relevant files change

### Security Features

- **Snyk**: Dependency vulnerability scanning
- **Trivy**: Container image vulnerability scanning
- **OWASP**: Dependency security checks
- **SonarQube**: Code quality and security analysis
- **SARIF Upload**: Security findings in GitHub Security tab

### Monitoring & Notifications

- **GitHub Summary**: Build reports in workflow summary
- **Artifact Upload**: Test results, coverage, security reports
- **Auto-issue Creation**: Failed workflows create GitHub issues
- **Status Badges**: Add to README.md

## Status Badges

Add these to your README.md:

```markdown
![Frontend CI](https://github.com/<owner>/<repo>/actions/workflows/frontend-ci.yml/badge.svg)
![Backend CI](https://github.com/<owner>/<repo>/actions/workflows/backend-ci.yml/badge.svg)
![Docker Build](https://github.com/<owner>/<repo>/actions/workflows/docker-build-push.yml/badge.svg)
```

## Troubleshooting

### Workflow Fails: "Resource not accessible by integration"

**Solution**: Enable workflow permissions in Settings → Actions → General

### Snyk Fails: "Missing SNYK_TOKEN"

**Solution**: Add SNYK_TOKEN secret, or set `continue-on-error: true` to make it optional

### Docker Push Fails: "denied: permission_denied"

**Solution**: Check that `packages: write` permission is enabled in workflow

### PostgreSQL Service Fails to Start

**Solution**: Increase health check timeout or verify service configuration

### Maven Build Fails: "Cannot resolve dependencies"

**Solution**: Clear Maven cache or check internet connectivity

## Local Testing

### Test Workflows Locally with Act

```bash
# Install act
brew install act

# Run frontend CI
act -j test -W .github/workflows/frontend-ci.yml

# Run backend CI with PostgreSQL
act -j test -W .github/workflows/backend-ci.yml --container-daemon-socket -
```

### Validate Workflow Syntax

```bash
# Using GitHub CLI
gh workflow view frontend-ci.yml

# Using actionlint
brew install actionlint
actionlint .github/workflows/*.yml
```

## Best Practices

1. **Keep workflows fast**: Use caching, path filtering, and concurrency control
2. **Fail fast**: Run quick checks (lint, type-check) before slow tests
3. **Secure secrets**: Never commit secrets, use GitHub Secrets
4. **Monitor costs**: GitHub Actions minutes are limited on free tier
5. **Test locally**: Use act or Docker Compose before pushing
6. **Update dependencies**: Keep actions up to date (Dependabot)

## Next Steps

- Story 6: Observability Stack (Prometheus, Grafana, Jaeger)
- Story 8: Technical Documentation (architecture diagrams)

# Developer Setup Guide

This guide provides step-by-step instructions for setting up your development environment for the Health Tracker application.

## Quick Start

For experienced developers, here's the fastest path to getting started:

```bash
# Clone and navigate
git clone https://github.com/healthtracker/health-tracker.git
cd health-tracker

# Copy environment file
cp .env.example .env

# Start infrastructure
docker-compose up -d

# Build and run backend
cd backend
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./mvnw spring-boot:run

# In another terminal, run frontend
cd frontend
npm install
npm run dev
```

Access the application at http://localhost:3000.

## Detailed Setup Instructions

### 1. System Requirements

#### Hardware

- **CPU**: 2+ cores recommended (4+ for running full stack)
- **RAM**: 8GB minimum, 16GB recommended
- **Disk**: 10GB free space for tools, dependencies, and containers

#### Operating Systems

- **macOS**: 12.0 (Monterey) or later
- **Linux**: Ubuntu 20.04+, Fedora 35+, or equivalent
- **Windows**: 10/11 with WSL2

### 2. Installing Prerequisites

#### Java 21

**macOS (Homebrew)**:

```bash
# Install OpenJDK 21
brew install openjdk@21

# Link it
sudo ln -sfn /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk \
  /Library/Java/JavaVirtualMachines/openjdk-21.jdk

# Verify
java -version
```

**Linux (Ubuntu/Debian)**:

```bash
sudo apt update
sudo apt install openjdk-21-jdk

# Verify
java -version
```

**Windows**:

1. Download Microsoft Build of OpenJDK 21 from https://learn.microsoft.com/java/openjdk/download
2. Run installer
3. Add to PATH: `C:\Program Files\Microsoft\jdk-21.x.x\bin`
4. Verify in PowerShell: `java -version`

Set `JAVA_HOME` environment variable:

```bash
# macOS/Linux (add to ~/.bashrc or ~/.zshrc)
export JAVA_HOME=/opt/homebrew/opt/openjdk@21

# Windows (System Environment Variables)
JAVA_HOME=C:\Program Files\Microsoft\jdk-21.x.x
```

#### Node.js and npm

**macOS (Homebrew)**:

```bash
brew install node@20
node --version  # Should be 20.x.x
npm --version   # Should be 10.x.x
```

**Linux (using nvm - recommended)**:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

**Windows**:

1. Download Node.js 20 LTS from https://nodejs.org/
2. Run installer
3. Verify: `node --version` and `npm --version`

#### Docker Desktop

**macOS**:

1. Download from https://www.docker.com/products/docker-desktop
2. Install Docker.app
3. Start Docker Desktop
4. Verify:
   ```bash
   docker --version
   docker-compose --version
   ```

**Linux (Ubuntu)**:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker-compose --version
```

**Windows**:

1. Install WSL2 first
2. Download Docker Desktop for Windows
3. Enable WSL2 integration in Docker Desktop settings

#### Git

**macOS**:

```bash
brew install git
```

**Linux**:

```bash
sudo apt install git
```

**Windows**: Download from https://git-scm.com/download/win

Configure Git:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

#### Maven (Optional)

The project includes Maven wrapper (`mvnw`), but you can install Maven system-wide:

**macOS**:

```bash
brew install maven
```

**Linux**:

```bash
sudo apt install maven
```

**Windows**: Download from https://maven.apache.org/download.cgi

### 3. Project Setup

#### Clone Repository

```bash
git clone https://github.com/healthtracker/health-tracker.git
cd health-tracker
```

#### Environment Configuration

Create `.env` file from template:

```bash
cp .env.example .env
```

Edit `.env` with your preferred editor:

```bash
# Database Configuration
DB_PASSWORD=secret
POSTGRES_USER=admin
POSTGRES_PASSWORD=secret
POSTGRES_DB=healthtracker

# JWT Configuration (256-bit secret for HS256)
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970

# Encryption Configuration (for PHI data)
ENCRYPTION_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970

# Observability Configuration
TRACING_SAMPLE_RATE=1.0  # 100% sampling in development

# Jaeger Tracing
JAEGER_ENDPOINT=http://localhost:4318/v1/traces

# Application URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8080
```

**⚠️ Important**:

- These are development-only credentials
- Never commit actual secrets to version control
- Use different secrets for staging/production

#### Start Infrastructure Services

```bash
docker-compose up -d
```

This starts:

- **PostgreSQL** (port 5433)
- **Redis** (port 6379)
- **Prometheus** (port 9090)
- **Grafana** (port 3001)
- **Elasticsearch** (port 9200)
- **Logstash** (port 5000)
- **Kibana** (port 5601)
- **Jaeger** (port 16686)

Verify all services are running:

```bash
docker-compose ps
```

Expected output:

```
NAME                STATUS              PORTS
postgres            Up 10 seconds       0.0.0.0:5433->5432/tcp
redis               Up 10 seconds       0.0.0.0:6379->6379/tcp
prometheus          Up 10 seconds       0.0.0.0:9090->9090/tcp
grafana             Up 10 seconds       0.0.0.0:3001->3000/tcp
elasticsearch       Up 10 seconds       0.0.0.0:9200->9200/tcp
logstash            Up 10 seconds       0.0.0.0:5000->5000/tcp
kibana              Up 10 seconds       0.0.0.0:5601->5601/tcp
jaeger              Up 10 seconds       0.0.0.0:16686->16686/tcp
```

Wait for services to be healthy (especially Elasticsearch and Logstash):

```bash
# Check PostgreSQL
docker-compose logs postgres | tail -20

# Check Elasticsearch
curl http://localhost:9200/_cluster/health
```

### 4. Backend Setup

Navigate to backend directory:

```bash
cd backend
```

#### Build the Application

Using Maven wrapper (recommended):

```bash
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./mvnw clean install
```

Or using system Maven:

```bash
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 mvn clean install
```

This will:

1. Download dependencies
2. Compile Java code
3. Run Flyway database migrations
4. Execute unit and integration tests
5. Package the application

#### Verify Database Migrations

Check migration status:

```bash
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./mvnw flyway:info
```

Expected output:

```
+-----------+---------+-------------------------------------+------+---------------------+---------+
| Category  | Version | Description                         | Type | Installed On        | State   |
+-----------+---------+-------------------------------------+------+---------------------+---------+
| Versioned | 1       | Create users table                  | SQL  | 2025-10-02 10:00:00 | Success |
| Versioned | 2       | Create health metrics table         | SQL  | 2025-10-02 10:00:01 | Success |
| Versioned | 3       | Create goals table                  | SQL  | 2025-10-02 10:00:02 | Success |
| Versioned | 4       | Create audit logs table             | SQL  | 2025-10-02 10:00:03 | Success |
| Versioned | 5       | Add indexes for performance         | SQL  | 2025-10-02 10:00:04 | Success |
+-----------+---------+-------------------------------------+------+---------------------+---------+
```

#### Run the Backend

Development mode (with auto-reload):

```bash
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 mvn spring-boot:run
```

Or run the packaged JAR:

```bash
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 java -jar target/backend-0.0.1-SNAPSHOT.jar
```

The backend will start on http://localhost:8080.

#### Verify Backend is Running

Check health endpoint:

```bash
curl http://localhost:8080/actuator/health
```

Expected response:

```json
{
  "status": "UP",
  "components": {
    "db": {
      "status": "UP",
      "details": {
        "database": "PostgreSQL",
        "validationQuery": "isValid()"
      }
    },
    "diskSpace": {
      "status": "UP"
    },
    "ping": {
      "status": "UP"
    }
  }
}
```

Access Swagger UI for API documentation:

```
http://localhost:8080/swagger-ui.html
```

### 5. Frontend Setup

Open a new terminal and navigate to frontend directory:

```bash
cd frontend
```

#### Install Dependencies

```bash
npm install
```

This installs:

- React 19
- TypeScript
- Vite (build tool)
- React Router
- React Query
- Axios
- UI libraries

#### Run the Frontend

Development mode with hot reload:

```bash
npm run dev
```

The frontend will start on http://localhost:3000.

#### Verify Frontend is Running

Open http://localhost:3000 in your browser. You should see the Health Tracker application.

### 6. Verify Complete Setup

#### Test Authentication Flow

1. Open http://localhost:3000
2. Click "Register" and create a test account:
   - Email: test@example.com
   - Password: Test123!@#
3. Login with the account
4. You should be redirected to the dashboard

#### Test API Directly

Register a user via API:

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api-test@example.com",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!"
  }'
```

Login and get JWT token:

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api-test@example.com",
    "password": "SecurePass123!"
  }'
```

Save the `accessToken` from the response and use it:

```bash
export TOKEN="your-access-token-here"

curl http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### 7. Development Workflow

#### Making Code Changes

**Backend Changes**:

1. Edit Java files in `backend/src/main/java/`
2. Spring Boot DevTools will auto-reload
3. Refresh browser or re-run API calls

**Frontend Changes**:

1. Edit TypeScript/React files in `frontend/src/`
2. Vite will hot-reload automatically
3. Changes appear instantly in browser

#### Running Tests During Development

**Backend (watch mode)**:

```bash
cd backend
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 mvn test -Dsurefire.rerunFailingTestsCount=0
```

**Frontend (watch mode)**:

```bash
cd frontend
npm test -- --watch
```

#### Database Access

Using psql:

```bash
PGPASSWORD=secret psql -h localhost -p 5433 -U admin -d healthtracker
```

Common commands:

```sql
-- List tables
\dt

-- Describe table
\d+ users

-- Query data
SELECT * FROM users;
SELECT * FROM health_metrics ORDER BY recorded_at DESC LIMIT 10;

-- Clear data for testing
TRUNCATE TABLE health_metrics CASCADE;
TRUNCATE TABLE users CASCADE;

-- Exit
\q
```

Using a GUI tool:

- **DBeaver**: https://dbeaver.io/
- **pgAdmin**: https://www.pgadmin.org/
- **DataGrip**: https://www.jetbrains.com/datagrip/

Connection details:

- Host: localhost
- Port: 5433
- Database: healthtracker
- Username: admin
- Password: secret

### 8. Accessing Observability Tools

#### Prometheus (Metrics)

URL: http://localhost:9090

Example queries:

- `http_server_requests_seconds_count` - Request count
- `jvm_memory_used_bytes` - JVM memory usage
- `process_cpu_usage` - CPU usage

#### Grafana (Dashboards)

URL: http://localhost:3001

Default credentials:

- Username: admin
- Password: admin

Pre-configured dashboards:

- JVM Metrics
- Spring Boot Statistics
- PostgreSQL Performance

#### Elasticsearch & Kibana (Logs)

Kibana URL: http://localhost:5601

1. Go to Management → Stack Management → Index Patterns
2. Create index pattern: `logstash-*`
3. Go to Discover to view logs
4. Create visualizations and dashboards

#### Jaeger (Distributed Tracing)

URL: http://localhost:16686

1. Select service: `health-tracker-backend`
2. Click "Find Traces"
3. View request flows and performance

### 9. Troubleshooting

#### Port Already in Use

```bash
# Find process using port
lsof -i :8080

# Kill process
kill -9 <PID>

# Or use different port
SERVER_PORT=8081 mvn spring-boot:run
```

#### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres

# Connect manually to test
PGPASSWORD=secret psql -h localhost -p 5433 -U admin -d healthtracker
```

#### Maven Build Fails

```bash
# Clear Maven cache
rm -rf ~/.m2/repository/com/healthtracker

# Clean build
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 mvn clean install -DskipTests

# Check Java version
java -version
echo $JAVA_HOME
```

#### Frontend Won't Start

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# Check Node version
node --version  # Should be 20.x.x
```

#### Docker Services Not Starting

```bash
# Check Docker daemon
docker info

# View logs
docker-compose logs

# Remove volumes and restart
docker-compose down -v
docker-compose up -d

# Prune unused resources
docker system prune -a
```

#### Tests Failing

```bash
# Run specific test
env JAVA_HOME=/opt/homebrew/opt/openjdk@21 mvn test -Dtest=UserServiceTest

# Skip tests temporarily
mvn clean install -DskipTests

# Check test logs
cat backend/target/surefire-reports/*.txt
```

### 10. IDE Setup

#### IntelliJ IDEA

1. **Import Project**:
   - File → Open → Select `health-tracker` directory
   - Import as Maven project

2. **Configure JDK**:
   - File → Project Structure → Project SDK → Java 21

3. **Install Plugins**:
   - Lombok
   - Spring Boot
   - Database Tools

4. **Enable Annotation Processing**:
   - Preferences → Build → Compiler → Annotation Processors
   - Check "Enable annotation processing"

5. **Run Configuration**:
   - Create Spring Boot configuration
   - Main class: `com.healthtracker.backend.HealthTrackerBackendApplication`
   - Environment variables: Load from `.env`

#### VS Code

1. **Install Extensions**:
   - Extension Pack for Java (Microsoft)
   - Spring Boot Extension Pack
   - ESLint
   - Prettier
   - Docker

2. **Configure Java**:
   - Set `java.home` in settings.json to Java 21 path

3. **Run Configuration** (`.vscode/launch.json`):
   ```json
   {
     "configurations": [
       {
         "type": "java",
         "name": "Spring Boot",
         "request": "launch",
         "mainClass": "com.healthtracker.backend.HealthTrackerBackendApplication",
         "projectName": "backend",
         "envFile": "${workspaceFolder}/.env"
       }
     ]
   }
   ```

### 11. Performance Optimization

#### Backend

Enable JVM optimizations for development:

```bash
export MAVEN_OPTS="-Xmx2g -Xms512m -XX:+UseG1GC"
mvn spring-boot:run
```

#### Frontend

Enable Vite optimizations:

```bash
# Use --host to access from other devices
npm run dev -- --host

# Increase memory for large projects
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev
```

#### Database

Optimize PostgreSQL for development:

```sql
-- Connect to database
PGPASSWORD=secret psql -h localhost -p 5433 -U admin -d healthtracker

-- Analyze tables
ANALYZE;

-- Vacuum tables
VACUUM ANALYZE;

-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

### 12. Next Steps

Now that your development environment is set up:

1. **Read Documentation**:
   - [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
   - [docs/architecture/](architecture/) - Architecture diagrams
   - [docs/api/README.md](api/README.md) - API documentation

2. **Explore Codebase**:
   - Run the application and test features
   - Read through service classes
   - Examine database schema

3. **Pick a Task**:
   - Check GitHub Issues for "good first issue" labels
   - Start with small bug fixes or documentation improvements

4. **Join Community**:
   - GitHub Discussions
   - Development Slack channel

Happy coding! 🚀

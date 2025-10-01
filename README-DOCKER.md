# Docker Deployment Guide

This guide explains how to run the Health Tracker application using Docker and Docker Compose.

## Prerequisites

- Docker Desktop 4.0+ or Docker Engine 20.10+
- Docker Compose 2.0+ (included with Docker Desktop)
- 4GB RAM available for containers
- Ports 3000, 8080, 5433, 6379 available

## Quick Start

### 1. Build and Start All Services

```bash
# Build images and start all services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up --build -d
```

### 2. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **API Docs**: http://localhost:8080/swagger-ui.html
- **Health Check**: http://localhost:8080/actuator/health

### 3. Stop Services

```bash
# Stop services (preserves data)
docker-compose stop

# Stop and remove containers (preserves volumes)
docker-compose down

# Stop, remove containers, and delete data
docker-compose down -v
```

## Service Details

### Frontend (React + Nginx)

- **Port**: 3000
- **Image Size**: ~53MB
- **Build Time**: ~30 seconds
- **Health Check**: HTTP GET / every 30s

### Backend (Spring Boot + Java 21)

- **Port**: 8080
- **Image Size**: ~328MB
- **Build Time**: ~3 minutes (first build with dependency download)
- **Health Check**: Actuator /actuator/health every 30s
- **Startup Time**: ~40 seconds

### PostgreSQL Database

- **Port**: 5433 (external), 5432 (internal)
- **Version**: PostgreSQL 15 Alpine
- **Database**: healthtracker
- **User**: admin
- **Password**: secret (change for production!)
- **Data Volume**: health-tracker-postgres-data

### Redis Cache

- **Port**: 6379
- **Version**: Redis 7 Alpine
- **Persistence**: AOF (Append Only File)
- **Data Volume**: health-tracker-redis-data

## Development Workflow

### Watch Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Rebuild After Code Changes

```bash
# Rebuild backend only
docker-compose up --build backend

# Rebuild frontend only
docker-compose up --build frontend

# Rebuild everything
docker-compose up --build
```

### Run Database Migrations

Migrations run automatically on backend startup using Flyway.

To manually trigger:

```bash
docker-compose exec backend java -jar app.jar --spring.flyway.migrate=true
```

### Connect to Database

```bash
# Using docker exec
docker-compose exec postgres psql -U admin -d healthtracker

# Or from host (requires psql installed)
psql -h localhost -p 5433 -U admin -d healthtracker
# Password: secret
```

### Execute Commands in Containers

```bash
# Backend shell
docker-compose exec backend sh

# Database shell
docker-compose exec postgres sh

# Redis CLI
docker-compose exec redis redis-cli
```

## Environment Configuration

### Using .env File

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` with your configuration:

```env
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret
ENCRYPTION_SECRET=your-encryption-secret
```

3. Start services (will use .env automatically):

```bash
docker-compose up
```

### Generate Secure Secrets

```bash
# Generate JWT secret
openssl rand -hex 32

# Generate encryption secret
openssl rand -hex 32
```

## Troubleshooting

### Port Conflicts

If ports are already in use, modify `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - '3001:80' # Changed from 3000
  backend:
    ports:
      - '8081:8080' # Changed from 8080
```

### Container Won't Start

Check logs:

```bash
docker-compose logs backend
docker-compose logs postgres
```

Common issues:

- Database not ready: Wait for health check to pass
- Port already in use: Change port mapping
- Out of memory: Increase Docker Desktop memory limit

### Reset Everything

```bash
# Stop and remove all containers, networks, volumes
docker-compose down -v

# Remove images
docker rmi health-tracker-backend:latest
docker rmi health-tracker-frontend:latest

# Rebuild from scratch
docker-compose up --build
```

### Health Check Failures

Check service health:

```bash
docker-compose ps
```

Manually test health endpoints:

```bash
# Backend
curl http://localhost:8080/actuator/health

# Frontend
curl http://localhost:3000/

# Database
docker-compose exec postgres pg_isready -U admin
```

## Production Considerations

### Security

1. **Change default passwords**:
   - PostgreSQL password
   - JWT secret
   - Encryption secret

2. **Use secrets management**:

   ```bash
   # Don't commit .env to git
   echo ".env" >> .gitignore
   ```

3. **Run containers as non-root** (already configured)

### Performance

1. **Resource limits**:

   ```yaml
   backend:
     deploy:
       resources:
         limits:
           cpus: '2'
           memory: 2G
         reservations:
           cpus: '1'
           memory: 1G
   ```

2. **Connection pooling** (already configured in Spring Boot)

3. **Redis persistence**: AOF enabled for durability

### Monitoring

1. **Health checks**: Enabled for all services
2. **Actuator endpoints**: Available at /actuator/\*
3. **Logs**: Use `docker-compose logs -f` or external log aggregation

## Docker Commands Reference

```bash
# List running containers
docker-compose ps

# View resource usage
docker stats

# Clean up unused resources
docker system prune -a

# Inspect network
docker network inspect health-tracker-network

# List volumes
docker volume ls

# Inspect volume
docker volume inspect health-tracker-postgres-data
```

## Integration with CI/CD

This Docker Compose setup is for local development. For production:

1. Use Docker Swarm or Kubernetes for orchestration
2. Use managed databases (RDS, Cloud SQL)
3. Use container registries (ECR, GCR, Docker Hub)
4. Implement proper secrets management (AWS Secrets Manager, HashiCorp Vault)
5. Add monitoring and logging (Prometheus, Grafana, ELK Stack)

## Next Steps

- Story 4: CI/CD Pipeline (automates Docker builds)
- Story 6: Observability Stack (Prometheus, Grafana, Jaeger)
- Story 8: Technical Documentation (architecture diagrams)

# Health Tracker API Documentation

## Overview

The Health Tracker REST API provides endpoints for managing user health data, goals, and profiles. The API follows RESTful principles and uses JSON for request and response payloads.

## Base URL

- **Development**: `http://localhost:8080`
- **Production**: `https://api.healthtracker.com`

## Authentication

The API uses JWT (JSON Web Token) based authentication.

### Obtaining a Token

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response**:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 604800
}
```

### Using the Token

Include the access token in the Authorization header for all protected endpoints:

```http
GET /api/v1/health-metrics
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Refresh

When the access token expires, use the refresh token to obtain a new one:

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Interactive Documentation

### Swagger UI

Access the interactive API documentation at:

- **URL**: `http://localhost:8080/swagger-ui.html`
- **Features**:
  - Try out API endpoints
  - View request/response schemas
  - See example payloads
  - Test authentication flows

### OpenAPI Specification

The machine-readable OpenAPI 3.0 specification is available at:

- **URL**: `http://localhost:8080/v3/api-docs`
- **Format**: JSON
- **Use Cases**:
  - Generate client SDKs
  - Import into Postman
  - API testing automation

## API Endpoints

### Authentication Endpoints

#### Register New User

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "confirmPassword": "SecurePassword123!"
}
```

**Success Response (201 Created)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "newuser@example.com",
  "createdAt": "2025-09-30T17:30:00Z"
}
```

#### User Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Token Refresh

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### User Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### User Profile Endpoints

#### Get Current User Profile

```http
GET /api/v1/users/me
Authorization: Bearer <access_token>
```

**Response (200 OK)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "profile": {
    "dateOfBirth": "1990-01-15",
    "gender": "FEMALE",
    "heightCm": 165.5
  },
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-09-30T15:20:00Z"
}
```

#### Update User Profile

```http
PUT /api/v1/users/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "profile": {
    "dateOfBirth": "1990-01-15",
    "gender": "FEMALE",
    "heightCm": 165.5
  }
}
```

#### Delete User Account

```http
DELETE /api/v1/users/me
Authorization: Bearer <access_token>
```

**Response (204 No Content)**

### Health Metrics Endpoints

#### List Health Metrics

```http
GET /api/v1/health-metrics?type=BLOOD_PRESSURE&from=2025-09-01&to=2025-09-30&limit=10&offset=0
Authorization: Bearer <access_token>
```

**Query Parameters**:

- `type` (optional): Metric type filter (BLOOD_PRESSURE, HEART_RATE, WEIGHT, etc.)
- `from` (optional): Start date (ISO 8601 format)
- `to` (optional): End date (ISO 8601 format)
- `limit` (optional): Number of results (default: 20, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response (200 OK)**:

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "metricType": "BLOOD_PRESSURE",
      "value": 120.0,
      "unit": "mmHg",
      "recordedAt": "2025-09-30T08:30:00Z",
      "source": "MANUAL",
      "notes": "Morning reading before breakfast"
    }
  ],
  "meta": {
    "total": 45,
    "limit": 10,
    "offset": 0
  }
}
```

#### Record Health Metric

```http
POST /api/v1/health-metrics
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "metricType": "BLOOD_PRESSURE",
  "value": 120.0,
  "unit": "mmHg",
  "recordedAt": "2025-09-30T08:30:00Z",
  "source": "MANUAL",
  "notes": "Morning reading before breakfast"
}
```

**Success Response (201 Created)**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "metricType": "BLOOD_PRESSURE",
  "value": 120.0,
  "unit": "mmHg",
  "recordedAt": "2025-09-30T08:30:00Z",
  "source": "MANUAL",
  "notes": "Morning reading before breakfast"
}
```

#### Update Health Metric

```http
PUT /api/v1/health-metrics/{id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "value": 118.0,
  "notes": "Updated: Morning reading before breakfast (corrected)"
}
```

#### Delete Health Metric

```http
DELETE /api/v1/health-metrics/{id}
Authorization: Bearer <access_token>
```

**Response (204 No Content)**

### Goals Endpoints

#### List Goals

```http
GET /api/v1/goals?status=ACTIVE
Authorization: Bearer <access_token>
```

**Query Parameters**:

- `status` (optional): Filter by status (ACTIVE, COMPLETED, ABANDONED)

**Response (200 OK)**:

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "goalType": "WEIGHT_LOSS",
      "targetValue": 70.0,
      "currentValue": 75.5,
      "unit": "kg",
      "startDate": "2025-09-01T00:00:00Z",
      "endDate": "2025-12-31T23:59:59Z",
      "status": "ACTIVE",
      "progress": 55.0
    }
  ],
  "meta": {
    "total": 3
  }
}
```

#### Create Goal

```http
POST /api/v1/goals
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "goalType": "WEIGHT_LOSS",
  "targetValue": 70.0,
  "currentValue": 75.5,
  "unit": "kg",
  "startDate": "2025-09-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z"
}
```

#### Update Goal

```http
PUT /api/v1/goals/{id}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentValue": 74.2,
  "status": "ACTIVE"
}
```

#### Delete Goal

```http
DELETE /api/v1/goals/{id}
Authorization: Bearer <access_token>
```

#### Get Goal Progress

```http
GET /api/v1/goals/{id}/progress
Authorization: Bearer <access_token>
```

**Response (200 OK)**:

```json
{
  "goalId": "550e8400-e29b-41d4-a716-446655440002",
  "progress": 55.0,
  "achieved": 5.3,
  "remaining": 4.2,
  "daysRemaining": 92,
  "onTrack": true,
  "projectedCompletionDate": "2025-12-15T00:00:00Z"
}
```

## Error Responses

The API uses standard HTTP status codes and returns detailed error information in JSON format.

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": ["Email is required", "Password must be at least 8 characters"],
    "timestamp": "2025-09-30T17:30:00Z",
    "path": "/api/v1/auth/register"
  }
}
```

### Common HTTP Status Codes

| Code | Meaning               | Description                                      |
| ---- | --------------------- | ------------------------------------------------ |
| 200  | OK                    | Request succeeded                                |
| 201  | Created               | Resource created successfully                    |
| 204  | No Content            | Request succeeded with no response body          |
| 400  | Bad Request           | Invalid request parameters or body               |
| 401  | Unauthorized          | Missing or invalid authentication token          |
| 403  | Forbidden             | User lacks permission for the requested resource |
| 404  | Not Found             | Requested resource does not exist                |
| 409  | Conflict              | Resource conflict (e.g., duplicate email)        |
| 422  | Unprocessable Entity  | Validation failed                                |
| 429  | Too Many Requests     | Rate limit exceeded                              |
| 500  | Internal Server Error | Server-side error                                |

### Error Codes

| Error Code             | Description                     |
| ---------------------- | ------------------------------- |
| `VALIDATION_ERROR`     | Request validation failed       |
| `AUTHENTICATION_ERROR` | Authentication failed           |
| `AUTHORIZATION_ERROR`  | User lacks required permissions |
| `RESOURCE_NOT_FOUND`   | Requested resource not found    |
| `DUPLICATE_RESOURCE`   | Resource already exists         |
| `RATE_LIMIT_EXCEEDED`  | Too many requests               |
| `INTERNAL_ERROR`       | Unexpected server error         |

## Data Types

### Metric Types

| Type                | Description               | Unit  |
| ------------------- | ------------------------- | ----- |
| `BLOOD_PRESSURE`    | Blood pressure (systolic) | mmHg  |
| `HEART_RATE`        | Heart rate                | bpm   |
| `WEIGHT`            | Body weight               | kg    |
| `HEIGHT`            | Height                    | cm    |
| `TEMPERATURE`       | Body temperature          | °C    |
| `BLOOD_GLUCOSE`     | Blood glucose level       | mg/dL |
| `OXYGEN_SATURATION` | Blood oxygen saturation   | %     |
| `STEPS`             | Daily steps               | count |
| `CALORIES_BURNED`   | Calories burned           | kcal  |
| `SLEEP_DURATION`    | Sleep duration            | hours |

### Goal Types

| Type             | Description                    |
| ---------------- | ------------------------------ |
| `WEIGHT_LOSS`    | Weight reduction goal          |
| `WEIGHT_GAIN`    | Weight increase goal           |
| `EXERCISE`       | Exercise frequency or duration |
| `STEPS`          | Daily step count               |
| `SLEEP`          | Sleep duration improvement     |
| `NUTRITION`      | Calorie or nutrient intake     |
| `BLOOD_PRESSURE` | Blood pressure management      |
| `BLOOD_GLUCOSE`  | Blood glucose control          |

### Goal Status

| Status      | Description                     |
| ----------- | ------------------------------- |
| `ACTIVE`    | Goal is currently being pursued |
| `COMPLETED` | Goal has been achieved          |
| `ABANDONED` | Goal was discontinued           |

### Data Sources

| Source   | Description                    |
| -------- | ------------------------------ |
| `MANUAL` | Manually entered by user       |
| `DEVICE` | Imported from connected device |
| `API`    | Imported from external API     |

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authenticated requests**: 1000 requests per hour
- **Unauthenticated requests**: 100 requests per hour

Rate limit information is included in response headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 998
X-RateLimit-Reset: 1696089600
```

When the rate limit is exceeded, the API returns:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 3600

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please try again later.",
    "timestamp": "2025-09-30T17:30:00Z"
  }
}
```

## Pagination

List endpoints support pagination using `limit` and `offset` parameters:

```http
GET /api/v1/health-metrics?limit=20&offset=40
```

Response includes metadata:

```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 40,
    "hasMore": true
  }
}
```

## Date/Time Formats

All dates and times use ISO 8601 format in UTC:

- **Date**: `2025-09-30`
- **DateTime**: `2025-09-30T17:30:00Z`

## CORS

The API supports Cross-Origin Resource Sharing (CORS) for web applications.

Allowed origins:

- Development: `http://localhost:3000`
- Production: `https://app.healthtracker.com`

## Security Considerations

### HTTPS Required

All production API requests must use HTTPS. HTTP requests will be redirected to HTTPS.

### PHI Data Protection

Protected Health Information (PHI) is:

- Encrypted at rest (AES-256)
- Encrypted in transit (TLS 1.3)
- Masked in logs
- Subject to audit logging

### Audit Logging

All access to PHI is logged for HIPAA compliance:

- User ID
- Action (READ, WRITE, DELETE)
- Resource type and ID
- Timestamp
- IP address

## Client SDKs

### JavaScript/TypeScript

```typescript
import { HealthTrackerClient } from '@healthtracker/sdk';

const client = new HealthTrackerClient({
  baseUrl: 'http://localhost:8080',
  token: 'your-jwt-token',
});

// Record health metric
const metric = await client.healthMetrics.create({
  metricType: 'BLOOD_PRESSURE',
  value: 120.0,
  unit: 'mmHg',
  recordedAt: new Date(),
});
```

### Python

```python
from healthtracker import HealthTrackerClient

client = HealthTrackerClient(
    base_url='http://localhost:8080',
    token='your-jwt-token'
)

# Record health metric
metric = client.health_metrics.create(
    metric_type='BLOOD_PRESSURE',
    value=120.0,
    unit='mmHg',
    recorded_at=datetime.now()
)
```

## Webhooks (Future)

The API will support webhooks for real-time notifications:

- Goal completion
- Metric thresholds exceeded
- Data synchronization events

## Versioning

The API uses URL-based versioning:

- Current version: `/api/v1/`
- Future versions: `/api/v2/`, `/api/v3/`, etc.

API versions are maintained for at least 12 months after a new version is released.

## Support

- **Documentation**: https://docs.healthtracker.com
- **Email**: support@healthtracker.com
- **GitHub Issues**: https://github.com/healthtracker/health-tracker/issues

## Changelog

See [CHANGELOG.md](../../CHANGELOG.md) for API changes and version history.

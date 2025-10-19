/**
 * MSW Authentication Handlers
 * Mock Service Worker handlers for authentication endpoints
 * SECURITY: Only used in development/test environments
 */
import { http, HttpResponse, delay } from 'msw';

export interface User {
  id: string;
  email: string;
  name?: string;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string; // Excluded from response body (sent via httpOnly cookie)
}

/**
 * POST /api/v1/auth/login
 * Authenticates user with email and password
 */
const loginHandler = http.post('/api/v1/auth/login', async ({ request }) => {
  await delay(1000); // Simulate network delay

  const body = (await request.json()) as { email: string; password: string };

  // Mock validation
  if (!body.email || !body.password) {
    return HttpResponse.json({ message: 'Email and password are required' }, { status: 400 });
  }

  // Mock user data
  const user: User = {
    id: '1',
    email: body.email,
    name: body.email.split('@')[0],
    roles: ['USER'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const response: AuthResponse = {
    user,
    accessToken: 'mock-access-token',
    // refreshToken sent via httpOnly cookie (not in response body)
  };

  // Simulate setting refresh token cookie
  return HttpResponse.json(response, {
    status: 200,
    headers: {
      'Set-Cookie':
        'refresh_token=mock-refresh-token; Path=/api/v1/auth; HttpOnly; SameSite=Strict',
    },
  });
});

/**
 * POST /api/v1/auth/register
 * Registers a new user account
 */
const registerHandler = http.post('/api/v1/auth/register', async ({ request }) => {
  await delay(1000); // Simulate network delay

  const body = (await request.json()) as { email: string; password: string; name?: string };

  // Mock validation
  if (!body.email || !body.password) {
    return HttpResponse.json({ message: 'Email and password are required' }, { status: 400 });
  }

  // Mock user data
  const user: User = {
    id: '1',
    email: body.email,
    name: body.name || body.email.split('@')[0],
    roles: ['USER'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const response: AuthResponse = {
    user,
    accessToken: 'mock-access-token',
    // refreshToken sent via httpOnly cookie (not in response body)
  };

  // Simulate setting refresh token cookie
  return HttpResponse.json(response, {
    status: 200,
    headers: {
      'Set-Cookie':
        'refresh_token=mock-refresh-token; Path=/api/v1/auth; HttpOnly; SameSite=Strict',
    },
  });
});

/**
 * POST /api/v1/auth/refresh
 * Refreshes access token using refresh token from httpOnly cookie
 */
const refreshHandler = http.post('/api/v1/auth/refresh', async ({ cookies }) => {
  await delay(500); // Simulate network delay

  // Check for refresh token in cookies
  const refreshToken = cookies.refresh_token;

  if (!refreshToken) {
    return HttpResponse.json({ message: 'Refresh token not found' }, { status: 401 });
  }

  // Mock response with new access token
  const response = {
    accessToken: 'mock-refreshed-access-token',
  };

  // Simulate setting new refresh token cookie
  return HttpResponse.json(response, {
    status: 200,
    headers: {
      'Set-Cookie':
        'refresh_token=mock-new-refresh-token; Path=/api/v1/auth; HttpOnly; SameSite=Strict',
    },
  });
});

/**
 * GET /api/v1/auth/me
 * Returns authenticated user profile
 */
const meHandler = http.get('/api/v1/auth/me', async ({ request }) => {
  await delay(500); // Simulate network delay

  // Check for Authorization header
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Mock user profile data
  const user: User = {
    id: '1',
    email: 'user@example.com',
    name: 'Test User',
    roles: ['USER'],
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updatedAt: new Date().toISOString(),
  };

  return HttpResponse.json(user, { status: 200 });
});

/**
 * POST /api/v1/auth/logout
 * Logs out user by clearing refresh token cookie
 */
const logoutHandler = http.post('/api/v1/auth/logout', async () => {
  await delay(300); // Simulate network delay

  // Clear refresh token cookie
  return HttpResponse.json(null, {
    status: 200,
    headers: {
      'Set-Cookie': 'refresh_token=; Path=/api/v1/auth; HttpOnly; SameSite=Strict; Max-Age=0',
    },
  });
});

/**
 * GET /api/v1/auth/csrf
 * Returns CSRF token (for compatibility)
 */
const csrfHandler = http.get('/api/v1/auth/csrf', async () => {
  await delay(200);

  return HttpResponse.json(null, {
    status: 200,
    headers: {
      'Set-Cookie': 'XSRF-TOKEN=mock-csrf-token; Path=/; SameSite=Strict',
    },
  });
});

/**
 * Export all authentication handlers
 */
export const authHandlers = [
  loginHandler,
  registerHandler,
  refreshHandler,
  meHandler,
  logoutHandler,
  csrfHandler,
];

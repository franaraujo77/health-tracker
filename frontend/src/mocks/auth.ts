/**
 * Mock Authentication Functions
 * SECURITY: This file should ONLY be imported in development/test environments
 * Production builds must exclude this code via tree-shaking
 */

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * Mock login function
 * Simulates authentication API call with mock data
 */
export const mockLogin = async (email: string, password: string): Promise<AuthResponse> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Mock validation
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  // Mock user data
  return {
    user: {
      id: '1',
      email,
      name: email.split('@')[0],
    },
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };
};

/**
 * Mock register function
 * Simulates user registration API call with mock data
 */
export const mockRegister = async (
  email: string,
  password: string,
  name?: string
): Promise<AuthResponse> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Mock validation
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  // Mock user data
  return {
    user: {
      id: '1',
      email,
      name: name || email.split('@')[0],
    },
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };
};

/**
 * Mock user profile data
 * Used when /auth/me endpoint is not yet implemented
 */
export const mockUserProfile: User = {
  id: '1',
  email: 'user@example.com',
  name: 'Test User',
};

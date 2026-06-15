// api.test.ts
// Tests for loginApi and signupApi — verifies each issues a GET to /auth/me
// with the correct Authorization header and returns the parsed JSON body.

import '@testing-library/jest-dom';
import { loginApi } from '../api/login';
import { signupApi } from '../api/signup';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const AUTH_ME_URL = 'http://localhost:8000/auth/me';
const ACCESS_TOKEN = 'fake-access-token';

/** Builds a minimal fetch Response mock that resolves json() to the given body. */
const mockFetchResponse = (body: unknown) => ({
  json: jest.fn().mockResolvedValue(body),
});

// ---------------------------------------------------------------------------
// API function Tests
// ---------------------------------------------------------------------------

describe('auth API functions', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loginApi', () => {
    it('should send a GET request to /auth/me with the bearer authorization header', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse({}));

      // Act
      await loginApi(ACCESS_TOKEN);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(AUTH_ME_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      });
    });

    it('should return the parsed JSON from the response', async () => {
      // Arrange
      const expected = { user_id: '123', email: 'user@test.com' };
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(expected));

      // Act
      const result = await loginApi(ACCESS_TOKEN);

      // Assert
      expect(result).toEqual(expected);
    });
  });

  describe('signupApi', () => {
    it('should send a GET request to /auth/me with the bearer authorization header', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse({}));

      // Act
      await signupApi(ACCESS_TOKEN);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(AUTH_ME_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      });
    });

    it('should return the parsed JSON from the response', async () => {
      // Arrange
      const expected = { user_id: '456', email: 'newuser@test.com' };
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(expected));

      // Act
      const result = await signupApi(ACCESS_TOKEN);

      // Assert
      expect(result).toEqual(expected);
    });
  });
});

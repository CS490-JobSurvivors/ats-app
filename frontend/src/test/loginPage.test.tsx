// loginPage.test.tsx
// Tests for LoginPage — verifies supabase.auth.signInWithPassword calls and
// conditional invocation of loginApi based on the supabase result.

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../pages/loginPage';

import { supabase } from '../utils/supabaseClient';
import { loginApi } from '../api/login';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
  },
}));

jest.mock('../api/login', () => ({
  loginApi: jest.fn(),
}));

const mockSignIn = supabase.auth.signInWithPassword as jest.Mock;
const mockLoginApi = loginApi as jest.Mock;

// Named test data to avoid magic values scattered across tests.
const EMAIL = 'user@test.com';
const PASSWORD = 'correctpassword';
const ACCESS_TOKEN = 'valid-token';

/** Fills and submits the login form with the given credentials. */
const fillAndSubmit = async (email: string, password: string) => {
  await userEvent.type(screen.getByLabelText(/email/i), email);
  await userEvent.type(screen.getByLabelText(/password/i), password);
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
};

// ---------------------------------------------------------------------------
// LoginPage Tests
// ---------------------------------------------------------------------------

describe('LoginPage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('failed authentication', () => {
    it('should not call loginApi when supabase returns an error for an incorrect password', async () => {
      // Arrange
      mockSignIn.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid login credentials' },
      });
      render(<LoginPage />);

      // Act
      await fillAndSubmit(EMAIL, 'wrongpassword');

      // Assert
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({ email: EMAIL, password: 'wrongpassword' });
      });
      await waitFor(() => {
        expect(mockLoginApi).not.toHaveBeenCalled();
      });
    });

    it('should not call loginApi when supabase returns an error for an incorrect email', async () => {
      // Arrange
      mockSignIn.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid login credentials' },
      });
      render(<LoginPage />);

      // Act
      await fillAndSubmit('wrong@test.com', PASSWORD);

      // Assert
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({ email: 'wrong@test.com', password: PASSWORD });
      });
      await waitFor(() => {
        expect(mockLoginApi).not.toHaveBeenCalled();
      });
    });
  });

  describe('successful authentication', () => {
    it('should call loginApi with the access token when credentials are correct', async () => {
      // Arrange
      mockSignIn.mockResolvedValue({
        data: { session: { access_token: ACCESS_TOKEN } },
        error: null,
      });
      mockLoginApi.mockResolvedValue({ user_id: '123', email: EMAIL });
      render(<LoginPage />);

      // Act
      await fillAndSubmit(EMAIL, PASSWORD);

      // Assert
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({ email: EMAIL, password: PASSWORD });
      });
      await waitFor(() => {
        expect(mockLoginApi).toHaveBeenCalledWith(ACCESS_TOKEN);
      });
    });

    it('should redirect to home after successful login', async () => {
      // Arrange
      mockSignIn.mockResolvedValue({
        data: { session: { access_token: ACCESS_TOKEN } },
        error: null,
      });
      mockLoginApi.mockResolvedValue({ user_id: '123', email: EMAIL });
      render(<LoginPage />);

      // Act
      await fillAndSubmit(EMAIL, PASSWORD);

      // Assert
      await waitFor(() => {
        expect(window.location.href).toBe('http://localhost/');
      });
    });
  });

  describe('error messages', () => {
    const INCORRECT_CREDENTIALS_MESSAGE = 'Incorrect Email or Password. Try again.';
    const VERIFY_EMAIL_MESSAGE = 'Verify Email';

    it('should show the incorrect credentials message when supabase returns an error', async () => {
      // Arrange
      mockSignIn.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid login credentials' },
      });
      render(<LoginPage />);

      // Act
      await fillAndSubmit(EMAIL, 'wrongpassword');

      // Assert
      expect(await screen.findByText(INCORRECT_CREDENTIALS_MESSAGE)).toBeInTheDocument();
    });

    it('should show the verify email message when supabase returns no error but no session', async () => {
      // Arrange
      mockSignIn.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      render(<LoginPage />);

      // Act
      await fillAndSubmit(EMAIL, PASSWORD);

      // Assert
      expect(await screen.findByText(VERIFY_EMAIL_MESSAGE)).toBeInTheDocument();
    });
  });
});
//Generated by Github Copilot

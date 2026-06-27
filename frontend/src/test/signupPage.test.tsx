// signupPage.test.tsx
// Tests for SignupPage — verifies password matching, supabase.auth.signUp calls,
// and conditional invocation of signupApi based on the supabase result.

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignupPage from '../pages/signupPage';

import { supabase } from '../utils/supabaseClient';
import { signupApi } from '../api/signup';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
    },
  },
}));

jest.mock('../api/signup', () => ({
  signupApi: jest.fn(),
}));

const mockSignUp = supabase.auth.signUp as jest.Mock;
const mockSignupApi = signupApi as jest.Mock;

// Named test data to avoid magic values scattered across tests.
const EMAIL = 'test@test.com';
// Must satisfy validatePassword: 8–20 chars with upper, lower, digit, and special char.
const PASSWORD = 'Password123!';
const ACCESS_TOKEN = 'test-token';

/**
 * Fills the signup form fields. Pass an explicit confirm value to mismatch.
 *
 * Uses fireEvent.change rather than userEvent.type: the inputs are simple
 * controlled fields whose onChange reads e.target.value, so a single change
 * event is behavior-equivalent and avoids user-event v13's pathologically slow
 * per-keystroke processing on this React 19 + MUI stack.
 */
const fillForm = (email: string, password: string, confirmPassword: string = password) => {
  fireEvent.change(screen.getByPlaceholderText('Enter Email'), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText('Enter Password'), { target: { value: password } });
  fireEvent.change(screen.getByPlaceholderText('Retype Password'), {
    target: { value: confirmPassword },
  });
};

const submitForm = async () => {
  await userEvent.click(screen.getByRole('button', { name: /sign up/i }));
};

// ---------------------------------------------------------------------------
// SignupPage Tests
// ---------------------------------------------------------------------------

describe('SignupPage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('password confirmation', () => {
    it('should not call supabase.auth.signUp when passwords do not match', async () => {
      // Arrange
      render(<SignupPage />);
      fillForm(EMAIL, PASSWORD, 'different');

      // Act
      await submitForm();

      // Assert
      await waitFor(() => {
        expect(mockSignUp).not.toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(mockSignupApi).not.toHaveBeenCalled();
      });
    });

    it('should call supabase.auth.signUp with the email and password when passwords match', async () => {
      // Arrange
      mockSignUp.mockResolvedValue({
        data: { session: { access_token: ACCESS_TOKEN } },
        error: null,
      });
      mockSignupApi.mockResolvedValue({ user_id: '123', email: EMAIL });
      render(<SignupPage />);
      fillForm(EMAIL, PASSWORD);

      // Act
      await submitForm();

      // Assert
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({ email: EMAIL, password: PASSWORD });
      });
    });
  });

  describe('signupApi invocation', () => {
    it('should call signupApi with the access token when signup succeeds for a new email', async () => {
      // Arrange
      const newEmail = 'newuser@test.com';
      const newToken = 'new-token';
      mockSignUp.mockResolvedValue({
        data: { session: { access_token: newToken } },
        error: null,
      });
      mockSignupApi.mockResolvedValue({ user_id: '456', email: newEmail });
      render(<SignupPage />);
      fillForm(newEmail, PASSWORD);

      // Act
      await submitForm();

      // Assert
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({ email: newEmail, password: PASSWORD });
      });
      await waitFor(() => {
        expect(mockSignupApi).toHaveBeenCalledWith(newToken);
      });
    });

    it('should redirect to home after successful signup', async () => {
      // Arrange
      mockSignUp.mockResolvedValue({
        data: { session: { access_token: ACCESS_TOKEN } },
        error: null,
      });
      mockSignupApi.mockResolvedValue({ user_id: '123', email: EMAIL });
      render(<SignupPage />);
      fillForm(EMAIL, PASSWORD);

      // Act
      await submitForm();

      // Assert
      await waitFor(() => {
        expect(window.location.href).toBe('http://localhost/');
      });
    });

    it('should not call signupApi when supabase returns an error for an existing email', async () => {
      // Arrange
      const existingEmail = 'existing@test.com';
      mockSignUp.mockResolvedValue({
        data: { session: null },
        error: { message: 'User already registered' },
      });
      render(<SignupPage />);
      fillForm(existingEmail, PASSWORD);

      // Act
      await submitForm();

      // Assert
      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({ email: existingEmail, password: PASSWORD });
      });
      await waitFor(() => {
        expect(mockSignupApi).not.toHaveBeenCalled();
      });
    });
  });

  describe('error messages', () => {
    const PASSWORDS_DONT_MATCH_MESSAGE = 'Passwords Dont Match';
    const VERIFY_ACCOUNT_MESSAGE = 'Verify Account';

    it('should show the passwords do not match message when passwords differ', async () => {
      // Arrange
      render(<SignupPage />);
      fillForm(EMAIL, PASSWORD, 'different');

      // Act
      await submitForm();

      // Assert
      expect(await screen.findByText(PASSWORDS_DONT_MATCH_MESSAGE)).toBeInTheDocument();
    });

    it('should show the supabase error message when supabase returns an error for an existing email', async () => {
      // Arrange
      const existingEmail = 'existing@test.com';
      const supabaseErrorMessage = 'User already registered';
      mockSignUp.mockResolvedValue({
        data: { session: null },
        error: { message: supabaseErrorMessage },
      });
      render(<SignupPage />);
      fillForm(existingEmail, PASSWORD);

      // Act
      await submitForm();

      // Assert
      expect(await screen.findByText(supabaseErrorMessage)).toBeInTheDocument();
    });

    it('should show the verify account message when supabase returns no error but no session', async () => {
      // Arrange
      mockSignUp.mockResolvedValue({
        data: { session: null },
        error: null,
      });
      render(<SignupPage />);
      fillForm(EMAIL, PASSWORD);

      // Act
      await submitForm();

      // Assert
      expect(await screen.findByText(VERIFY_ACCOUNT_MESSAGE)).toBeInTheDocument();
    });
  });
});

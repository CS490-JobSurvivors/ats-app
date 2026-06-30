// resetPasswordPage.test.tsx
// Tests for ResetPasswordPage — verifies hash error detection, form validation,
// successful password update, and Supabase error handling.

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ResetPasswordPage from '../pages/resetPasswordPage';
import { supabase } from '../utils/supabaseClient';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      updateUser: jest.fn(),
    },
  },
}));

const mockUpdateUser = supabase.auth.updateUser as jest.Mock;

// Must satisfy validatePassword: 8–20 chars with upper, lower, digit, and special char.
const VALID_PASSWORD = 'Newpassword123!';

const EXPIRED_HASH =
  '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';

/** Renders ResetPasswordPage inside a router with a /settings stub for link navigation. */
const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/reset-password']}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/settings" element={<div>Settings Page</div>} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );

// fireEvent.change is used for text entry (controlled inputs reading
// e.target.value) to avoid user-event v13's slow per-keystroke processing on
// this React 19 + MUI stack; userEvent.click is kept for the submit action.
const fillAndSubmit = async (password: string, confirm: string = password) => {
  fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: password } });
  fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: confirm } });
  await userEvent.click(screen.getByRole('button', { name: /update password/i }));
};

// ---------------------------------------------------------------------------
// ResetPasswordPage Tests
// ---------------------------------------------------------------------------

describe('ResetPasswordPage', () => {
  afterEach(() => {
    jest.clearAllMocks();
    window.location.hash = '';
  });

  describe('expired or invalid link (hash error)', () => {
    it('shows the error description from the URL hash instead of the form', () => {
      window.location.hash = EXPIRED_HASH;
      renderPage();

      expect(screen.getByText(/email link is invalid or has expired/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /update password/i })).not.toBeInTheDocument();
    });

    it('renders a link back to settings when the link is expired', () => {
      window.location.hash = EXPIRED_HASH;
      renderPage();

      expect(screen.getByRole('link', { name: /request a new link/i })).toBeInTheDocument();
    });
  });

  describe('valid link (no hash error)', () => {
    it('renders the new password form', () => {
      renderPage();

      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('shows an error when the password is shorter than 8 characters', async () => {
      renderPage();

      await fillAndSubmit('short');

      expect(await screen.findByText(/invalid password/i)).toBeInTheDocument();
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it('shows an error when the passwords do not match', async () => {
      renderPage();

      await fillAndSubmit(VALID_PASSWORD, 'doesnotmatch');

      expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });
  });

  describe('successful password update', () => {
    it('calls supabase.auth.updateUser with the new password', async () => {
      mockUpdateUser.mockResolvedValue({ error: null });
      renderPage();

      await fillAndSubmit(VALID_PASSWORD);

      await waitFor(() => {
        expect(mockUpdateUser).toHaveBeenCalledWith({ password: VALID_PASSWORD });
      });
    });

    it('shows the success message after a valid update', async () => {
      mockUpdateUser.mockResolvedValue({ error: null });
      renderPage();

      await fillAndSubmit(VALID_PASSWORD);

      expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
    });
  });

  describe('Supabase error on submit', () => {
    it('shows the error message returned by Supabase', async () => {
      mockUpdateUser.mockResolvedValue({ error: { message: 'Auth session missing' } });
      renderPage();

      await fillAndSubmit(VALID_PASSWORD);

      expect(await screen.findByText(/auth session missing/i)).toBeInTheDocument();
    });

    it('keeps the form visible after a Supabase error', async () => {
      mockUpdateUser.mockResolvedValue({ error: { message: 'Auth session missing' } });
      renderPage();

      await fillAndSubmit(VALID_PASSWORD);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
      });
    });
  });
});

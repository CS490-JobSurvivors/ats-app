import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import SettingsPage from '../pages/settingsPage';
import { supabase } from '../utils/supabaseClient';

jest.mock('../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
  },
}));

const mockGetUser = supabase.auth.getUser as jest.Mock;

beforeEach(() => {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
});

describe('SettingsPage', () => {
  it('renders the page heading and subtitle', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByText(/manage your account and preferences/i)).toBeInTheDocument();
  });
  it('renders the Account section', () => {
    render(<SettingsPage />);
    expect(screen.getByText(/^account$/i)).toBeInTheDocument();
  });
  it('renders the Preferences section', () => {
    render(<SettingsPage />);
    expect(screen.getByText(/^preferences$/i)).toBeInTheDocument();
  });
});

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import SettingsPage from '../pages/settingsPage';

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

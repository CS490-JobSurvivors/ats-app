import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders profile page heading', () => {
  render(<App />);
  const headingElement = screen.getByText(/complete your profile/i);
  expect(headingElement).toBeInTheDocument();
});

test('renders only one save button and omits account identity fields', () => {
  render(<App />);

  expect(screen.queryByLabelText(/user id/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /save profile/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();
});

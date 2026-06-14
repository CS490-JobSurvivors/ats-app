import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders profile page heading', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /complete your profile/i });
  expect(heading).toBeInTheDocument();
});

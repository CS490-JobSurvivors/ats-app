import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders profile page heading', () => {
  render(<App />);
  const headingElement = screen.getByText(/complete your profile/i);
  expect(headingElement).toBeInTheDocument();
});

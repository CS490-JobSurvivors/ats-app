import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ProfilePage from '../pages/profilePage';

test('renders profile page heading', () => {
  render(<ProfilePage />);
  const heading = screen.getByRole('heading', { name: /complete your profile/i });
  expect(heading).toBeInTheDocument();
});

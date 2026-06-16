import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import DashboardPage from '../pages/dashboardPage';

describe('DashboardPage', () => {
  it('renders the page heading and subtitle', () => {
    render(<DashboardPage />);
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/track your applications and activity/i)).toBeInTheDocument();
  });

  it('renders the three stat cards with zero counts', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/total applications/i)).toBeInTheDocument();
    expect(screen.getByText(/interviews/i)).toBeInTheDocument();
    expect(screen.getByText(/offers/i)).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(3);
  });

  it('renders the recent applications section with empty state', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/recent applications/i)).toBeInTheDocument();
    expect(screen.getByText(/no applications yet/i)).toBeInTheDocument();
  });
});

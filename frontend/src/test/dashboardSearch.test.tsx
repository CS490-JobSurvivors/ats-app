import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '../pages/dashboardPage';
import { supabase } from '../utils/supabaseClient';
import { listJobs } from '../api/jobs';

jest.mock('../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('../api/jobs', () => ({
  listJobs: jest.fn(),
  listJobActivity: jest.fn(),
  createJob: jest.fn(),
  updateJob: jest.fn(),
}));

const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockListJobs = listJobs as jest.Mock;

const jobFixtures = [
  {
    job_id: 'job-1',
    company_name: 'Northstar Labs',
    job_title: 'Frontend Engineer',
    job_description: 'Build React dashboards for analytics workflows',
    application_link: null,
    job_stage: 'Applied',
    job_poster_id: 'user-1',
    updated_at: '2026-06-16T00:00:00Z',
    created_at: '2026-06-16T00:00:00Z',
  },
  {
    job_id: 'job-2',
    company_name: 'Acme Health',
    job_title: 'Backend Developer',
    job_description: 'Own FastAPI services and database integrations',
    application_link: null,
    job_stage: 'Interview',
    job_poster_id: 'user-1',
    updated_at: '2026-06-17T00:00:00Z',
    created_at: '2026-06-17T00:00:00Z',
  },
  {
    job_id: 'job-3',
    company_name: 'Design Co',
    job_title: 'Product Designer',
    job_description: 'Research mobile onboarding keywords and user journeys',
    application_link: null,
    job_stage: 'Interested',
    job_poster_id: 'user-1',
    updated_at: '2026-06-18T00:00:00Z',
    created_at: '2026-06-18T00:00:00Z',
  },
];

beforeEach(() => {
  mockGetSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } });
  mockListJobs.mockResolvedValue(jobFixtures);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Dashboard job search', () => {
  it('filters immediately by job title as the user types', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Frontend Engineer')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/search jobs/i), 'backend');

    expect(screen.getByText('Backend Developer')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
    expect(screen.queryByText('Product Designer')).not.toBeInTheDocument();
    expect(mockListJobs).toHaveBeenCalledTimes(1);
  });

  it('filters immediately by company name as the user types', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Frontend Engineer')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/search jobs/i), 'design');

    expect(screen.getByText('Product Designer')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
    expect(screen.queryByText('Backend Developer')).not.toBeInTheDocument();
    expect(mockListJobs).toHaveBeenCalledTimes(1);
  });

  it('filters immediately by description keywords as the user types', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Frontend Engineer')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/search jobs/i), 'fastapi');

    expect(screen.getByText('Backend Developer')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
    expect(screen.queryByText('Product Designer')).not.toBeInTheDocument();
    expect(mockListJobs).toHaveBeenCalledTimes(1);
  });

  it('updates results again when the search text changes', async () => {
    render(<DashboardPage />);

    const searchInput = await screen.findByLabelText(/search jobs/i);

    await userEvent.type(searchInput, 'react');
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Backend Developer')).not.toBeInTheDocument();

    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'mobile');

    expect(screen.getByText('Product Designer')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
    expect(mockListJobs).toHaveBeenCalledTimes(1);
  });

  it('shows an empty search state when no loaded jobs match', async () => {
    render(<DashboardPage />);

    await userEvent.type(await screen.findByLabelText(/search jobs/i), 'nomatch');

    expect(screen.getByText(/no applications match your search/i)).toBeInTheDocument();
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
    expect(mockListJobs).toHaveBeenCalledTimes(1);
  });
});

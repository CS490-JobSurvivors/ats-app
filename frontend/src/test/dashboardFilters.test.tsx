import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '../pages/dashboardPage';
import { supabase } from '../utils/supabaseClient';
import { listJobs, getJobMetrics } from '../api/jobs';

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
  listJobInterviews: jest.fn(),
  getJobMetrics: jest.fn(),
  listJobFollowUps: jest.fn(),
  createJob: jest.fn(),
  updateJob: jest.fn(),
  createJobInterview: jest.fn(),
  updateJobInterview: jest.fn(),
  createJobFollowUp: jest.fn(),
  updateJobFollowUp: jest.fn(),
  deleteJobFollowUp: jest.fn(),
}));

const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockListJobs = listJobs as jest.Mock;
const mockGetJobMetrics = getJobMetrics as jest.Mock;

const today = new Date();
const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};
const addDays = (days: number) => {
  const date = new Date(today);
  date.setDate(today.getDate() + days);
  return formatDate(date);
};

const jobFixtures = [
  {
    job_id: 'job-1',
    company_name: 'Northstar Labs',
    job_title: 'Frontend Engineer',
    job_description: 'Build React dashboards',
    application_link: null,
    job_location: 'New York',
    deadline: addDays(10),
    job_stage: 'Applied',
    job_poster_id: 'user-1',
    updated_at: '2026-06-16T00:00:00Z',
    created_at: '2026-06-16T00:00:00Z',
  },
  {
    job_id: 'job-2',
    company_name: 'Acme Health',
    job_title: 'Backend Developer',
    job_description: 'Own FastAPI services',
    application_link: null,
    job_location: 'Remote',
    deadline: addDays(3),
    job_stage: 'Interview',
    job_poster_id: 'user-1',
    updated_at: '2026-06-17T00:00:00Z',
    created_at: '2026-06-17T00:00:00Z',
  },
  {
    job_id: 'job-3',
    company_name: 'Design Co',
    job_title: 'Product Designer',
    job_description: 'Research mobile onboarding',
    application_link: null,
    job_location: 'New York',
    deadline: addDays(-1),
    job_stage: 'Rejected',
    job_poster_id: 'user-1',
    updated_at: '2026-06-18T00:00:00Z',
    created_at: '2026-06-18T00:00:00Z',
  },
  {
    job_id: 'job-4',
    company_name: 'No Deadline Co',
    job_title: 'QA Engineer',
    job_description: 'Manual and automated tests',
    application_link: null,
    job_location: null,
    deadline: null,
    job_stage: 'Interested',
    job_poster_id: 'user-1',
    updated_at: '2026-06-19T00:00:00Z',
    created_at: '2026-06-19T00:00:00Z',
  },
  {
    job_id: 'job-6',
    company_name: 'Old Co',
    job_title: 'Archived Role',
    job_description: 'No longer pursuing',
    application_link: null,
    job_location: 'Remote',
    deadline: null,
    job_stage: 'Archived',
    job_poster_id: 'user-1',
    updated_at: '2026-06-20T00:00:00Z',
    created_at: '2026-06-20T00:00:00Z',
  },
];

const openFilters = async () => {
  await userEvent.click(screen.getByRole('button', { name: /filters/i }));
};

const chooseFilter = async (label: RegExp, optionName: RegExp) => {
  await userEvent.click(screen.getByLabelText(label));
  const listbox = await screen.findByRole('listbox');
  await userEvent.click(within(listbox).getByRole('option', { name: optionName }));
};

beforeEach(() => {
  mockGetSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } });
  mockListJobs.mockResolvedValue(jobFixtures);
  mockGetJobMetrics.mockResolvedValue({
    total_applications: 0,
    awaiting_response: 0,
    responded: 0,
    stage_counts: {
      Interested: 0,
      Applied: 0,
      Interview: 0,
      Offer: 0,
      Rejected: 0,
      Archived: 0,
    },
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Dashboard job filters', () => {
  it('builds location and deadline filter options from loaded jobs', async () => {
    mockListJobs.mockResolvedValue([
      ...jobFixtures,
      {
        ...jobFixtures[0],
        job_id: 'job-5',
        company_name: 'Chicago Co',
        job_title: 'Security Engineer',
        job_location: 'Chicago',
        deadline: addDays(20),
      },
    ]);
    render(<DashboardPage />);

    expect(await screen.findByText('Frontend Engineer')).toBeInTheDocument();
    await openFilters();

    await userEvent.click(screen.getByLabelText(/location/i));
    let listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByRole('option', { name: /chicago/i })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    await userEvent.click(screen.getByLabelText(/deadline/i));
    listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByRole('option', { name: /upcoming/i })).toBeInTheDocument();
  });

  it('filters jobs by canonical stage', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Frontend Engineer')).toBeInTheDocument();
    await openFilters();
    await chooseFilter(/stage/i, /interview/i);

    expect(screen.getByText('Backend Developer')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
    expect(screen.queryByText('Product Designer')).not.toBeInTheDocument();
  });

  it('filters jobs by location', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Frontend Engineer')).toBeInTheDocument();
    await openFilters();
    await chooseFilter(/location/i, /remote/i);

    expect(screen.getByText('Backend Developer')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
  });

  it('filters jobs by deadline state', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Frontend Engineer')).toBeInTheDocument();
    await openFilters();
    await chooseFilter(/deadline/i, /expired/i);

    expect(screen.getByText('Product Designer')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
  });

  it('combines search, stage, location, and deadline filters', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Frontend Engineer')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/search jobs/i), { target: { value: 'developer' } });
    await openFilters();
    await chooseFilter(/stage/i, /interview/i);
    await chooseFilter(/location/i, /remote/i);
    await chooseFilter(/deadline/i, /due soon/i);

    expect(screen.getByText('Backend Developer')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
    expect(screen.queryByText('Product Designer')).not.toBeInTheDocument();
  });

  it('clears active filters and restores loaded jobs', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Frontend Engineer')).toBeInTheDocument();
    await openFilters();
    await chooseFilter(/stage/i, /interview/i);
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /clear filters/i }));

    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Backend Developer')).toBeInTheDocument();
  });

  it('shows an empty filter state when no loaded jobs match', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Frontend Engineer')).toBeInTheDocument();
    await openFilters();
    await chooseFilter(/stage/i, /offer/i);

    expect(screen.getByText(/no applications match your filters/i)).toBeInTheDocument();
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
  });

  it('hides archived jobs from the default "All" stage view', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Frontend Engineer')).toBeInTheDocument();
    expect(screen.queryByText('Archived Role')).not.toBeInTheDocument();
  });

  it('shows archived jobs when explicitly filtering by the Archived stage', async () => {
    render(<DashboardPage />);

    expect(await screen.findByText('Frontend Engineer')).toBeInTheDocument();
    await openFilters();
    await chooseFilter(/stage/i, /archived/i);

    expect(screen.getByText('Archived Role')).toBeInTheDocument();
    expect(screen.queryByText('Frontend Engineer')).not.toBeInTheDocument();
  });
});

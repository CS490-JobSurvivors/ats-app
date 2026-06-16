import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../pages/dashboardPage';
import { createJob, listJobs, updateJob } from '../api/jobs';
import { supabase } from '../utils/supabaseClient';

jest.mock('../api/jobs', () => ({
  createJob: jest.fn(),
  listJobs: jest.fn(),
  updateJob: jest.fn(),
}));

jest.mock('../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

const mockCreateJob = createJob as jest.Mock;
const mockListJobs = listJobs as jest.Mock;
const mockUpdateJob = updateJob as jest.Mock;
const mockGetSession = supabase.auth.getSession as jest.Mock;

const renderDashboard = () => {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );
};

describe('DashboardPage jobs workspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'valid-token' } },
    });
    mockListJobs.mockResolvedValue([]);
  });

  it('loads jobs for the authenticated user', async () => {
    mockListJobs.mockResolvedValue([
      {
        job_id: 'job-1',
        company_name: 'Acme',
        job_title: 'Software Engineer',
        job_description: 'Build product features.',
        application_link: null,
        job_poster_id: 'user-1',
        updated_at: '2026-01-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
      },
    ]);

    renderDashboard();

    expect(await screen.findByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(mockListJobs).toHaveBeenCalledWith('valid-token');
  });

  it('creates a job from the dashboard form', async () => {
    mockCreateJob.mockResolvedValue({
      job_id: 'job-2',
      company_name: 'Beta Co',
      job_title: 'Frontend Engineer',
      job_description: 'Build accessible UI.',
      application_link: 'https://example.com/apply',
      job_poster_id: 'user-1',
      updated_at: '2026-01-01T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    });

    renderDashboard();

    await waitFor(() => {
      expect(mockListJobs).toHaveBeenCalledWith('valid-token');
    });

    fireEvent.change(screen.getByLabelText(/company name/i), {
      target: { value: 'Beta Co' },
    });
    fireEvent.change(screen.getByLabelText(/job title/i), {
      target: { value: 'Frontend Engineer' },
    });
    fireEvent.change(screen.getByLabelText(/job description/i), {
      target: { value: 'Build accessible UI.' },
    });
    fireEvent.change(screen.getByLabelText(/application link/i), {
      target: { value: 'https://example.com/apply' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save job/i }));

    expect(await screen.findByText('Job saved.')).toBeInTheDocument();
    expect(screen.getByText('Frontend Engineer')).toBeInTheDocument();
    expect(mockCreateJob).toHaveBeenCalledWith('valid-token', {
      company_name: 'Beta Co',
      job_title: 'Frontend Engineer',
      job_description: 'Build accessible UI.',
      application_link: 'https://example.com/apply',
    });
  });

  it('shows a validation error when required job fields are missing', async () => {
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: /save job/i }));

    expect(
      screen.getByText('Company name, job title, and description are required.')
    ).toBeInTheDocument();
    expect(mockCreateJob).not.toHaveBeenCalled();
  });

  it('updates an existing job from the dashboard form', async () => {
    mockListJobs.mockResolvedValue([
      {
        job_id: 'job-3',
        company_name: 'Gamma Inc',
        job_title: 'Backend Engineer',
        job_description: 'Build services.',
        application_link: null,
        job_poster_id: 'user-1',
        updated_at: '2026-01-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
      },
    ]);
    mockUpdateJob.mockResolvedValue({
      job_id: 'job-3',
      company_name: 'Gamma Inc',
      job_title: 'Senior Backend Engineer',
      job_description: 'Build services and mentor developers.',
      application_link: null,
      job_poster_id: 'user-1',
      updated_at: '2026-01-02T00:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
    });

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: /edit job/i }));
    fireEvent.change(screen.getByLabelText(/job title/i), {
      target: { value: 'Senior Backend Engineer' },
    });
    fireEvent.change(screen.getByLabelText(/job description/i), {
      target: { value: 'Build services and mentor developers.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /update job/i }));

    expect(await screen.findByText('Job updated.')).toBeInTheDocument();
    expect(screen.getByText('Senior Backend Engineer')).toBeInTheDocument();
    expect(mockUpdateJob).toHaveBeenCalledWith('valid-token', 'job-3', {
      company_name: 'Gamma Inc',
      job_title: 'Senior Backend Engineer',
      job_description: 'Build services and mentor developers.',
      application_link: null,
    });
  });
});

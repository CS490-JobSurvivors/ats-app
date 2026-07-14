import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '../pages/dashboardPage';
import { supabase } from '../utils/supabaseClient';
import {
  listJobs,
  listJobActivity,
  listJobInterviews,
  getJobMetrics,
  listJobFollowUps,
  listJobDocuments,
  listDocuments,
  createJob,
  updateJob,
  deleteJob,
  deleteJobStageHistory,
  createJobInterview,
  updateJobInterview,
  createJobFollowUp,
  updateJobFollowUp,
  deleteJobFollowUp,
  createJobDocument,
  deleteJobDocument,
  getJobAnalytics,
  updateJobDocument,
  linkDocumentToJob,
  unlinkDocumentFromJob,
} from '../api/jobs';
import { generateResume } from '../api/resume';

jest.mock('../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('../api/resume', () => ({
  generateResume: jest.fn(),
  improveResume: jest.fn(),
  generateCoverLetter: jest.fn(),
}));

jest.mock('../api/jobs', () => ({
  listJobs: jest.fn(),
  listJobActivity: jest.fn(),
  listJobInterviews: jest.fn(),
  getJobMetrics: jest.fn(),
  listJobFollowUps: jest.fn(),
  listJobDocuments: jest.fn(),
  createJob: jest.fn(),
  updateJob: jest.fn(),
  deleteJob: jest.fn(),
  deleteJobStageHistory: jest.fn(),
  createJobInterview: jest.fn(),
  updateJobInterview: jest.fn(),
  createJobFollowUp: jest.fn(),
  updateJobFollowUp: jest.fn(),
  deleteJobFollowUp: jest.fn(),
  createJobDocument: jest.fn(),
  deleteJobDocument: jest.fn(),
  getJobAnalytics: jest.fn(),
  updateJobDocument: jest.fn(),
  listDocuments: jest.fn(),
  linkDocumentToJob: jest.fn(),
  unlinkDocumentFromJob: jest.fn(),
  listDocumentVersions: jest.fn(),
  generateCompanyResearch: jest.fn(),
}));

const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockListJobs = listJobs as jest.Mock;
const mockListJobActivity = listJobActivity as jest.Mock;
const mockListJobInterviews = listJobInterviews as jest.Mock;
const mockGetJobMetrics = getJobMetrics as jest.Mock;
const mockListJobFollowUps = listJobFollowUps as jest.Mock;
const mockListJobDocuments = listJobDocuments as jest.Mock;
const mockCreateJob = createJob as jest.Mock;
const mockUpdateJob = updateJob as jest.Mock;
const mockDeleteJob = deleteJob as jest.Mock;
const mockDeleteJobStageHistory = deleteJobStageHistory as jest.Mock;
const mockCreateJobInterview = createJobInterview as jest.Mock;
const mockUpdateJobInterview = updateJobInterview as jest.Mock;
const mockCreateJobFollowUp = createJobFollowUp as jest.Mock;
const mockUpdateJobFollowUp = updateJobFollowUp as jest.Mock;
const mockDeleteJobFollowUp = deleteJobFollowUp as jest.Mock;
const mockCreateJobDocument = createJobDocument as jest.Mock;
const mockDeleteJobDocument = deleteJobDocument as jest.Mock;
const mockGetJobAnalytics = getJobAnalytics as jest.Mock;
const mockUpdateJobDocument = updateJobDocument as jest.Mock;
const mockListDocuments = listDocuments as jest.Mock;
const mockLinkDocumentToJob = linkDocumentToJob as jest.Mock;
const mockUnlinkDocumentFromJob = unlinkDocumentFromJob as jest.Mock;
const mockGenerateResume = generateResume as jest.Mock;

const zeroMetrics = {
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
};

const sampleJob = {
  job_id: 'job-1',
  company_name: 'Test Co',
  job_title: 'Software Engineer',
  job_description: 'A test job',
  application_link: null,
  job_stage: 'Interested',
  job_poster_id: 'user-1',
  updated_at: '2026-06-16T00:00:00Z',
  created_at: '2026-06-16T00:00:00Z',
};

beforeEach(() => {
  mockGetSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } });
  mockListJobs.mockResolvedValue([]);
  mockListJobActivity.mockResolvedValue([]);
  mockListJobInterviews.mockResolvedValue([]);
  mockGetJobMetrics.mockResolvedValue(zeroMetrics);
  mockListJobFollowUps.mockResolvedValue([]);
  mockListJobDocuments.mockResolvedValue([]);
  mockGetJobAnalytics.mockResolvedValue({
    conversion_rates: [],
    time_in_stage: [],
    weekly_velocity: [],
  });
  mockCreateJob.mockReset();
  mockUpdateJob.mockReset();
  mockDeleteJob.mockReset();
  mockDeleteJobStageHistory.mockReset();
  mockCreateJobInterview.mockReset();
  mockUpdateJobInterview.mockReset();
  mockCreateJobFollowUp.mockReset();
  mockUpdateJobFollowUp.mockReset();
  mockDeleteJobFollowUp.mockReset();
  mockCreateJobDocument.mockReset();
  mockDeleteJobDocument.mockReset();
  mockUpdateJobDocument.mockReset();
  mockListDocuments.mockResolvedValue([]);
  mockLinkDocumentToJob.mockReset();
  mockUnlinkDocumentFromJob.mockReset();
  mockGenerateResume.mockReset();
});

describe('DashboardPage', () => {
  it('renders the page heading and subtitle', () => {
    render(<DashboardPage />);
    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/track your applications and activity/i)).toBeInTheDocument();
  });

  it('renders baseline dashboard metrics with zero counts when there are no jobs', () => {
    render(<DashboardPage />);
    expect(screen.getByText(/total applications/i)).toBeInTheDocument();
    expect(screen.getByText(/awaiting response/i)).toBeInTheDocument();
    expect(screen.getByText(/^responded$/i)).toBeInTheDocument();
    expect(screen.getByText(/applications by stage/i)).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(9);
  });

  it('renders the recent applications section with empty state', async () => {
    render(<DashboardPage />);
    expect(screen.getByText(/recent applications/i)).toBeInTheDocument();
    expect(await screen.findByText(/no recent applications/i)).toBeInTheDocument();
  });

  it('renders job cards and dashboard metrics fetched from the metrics endpoint', async () => {
    mockListJobs.mockResolvedValue([
      sampleJob,
      { ...sampleJob, job_id: 'job-2', job_stage: 'Interview' },
      { ...sampleJob, job_id: 'job-3', job_stage: 'Offer' },
    ]);
    mockGetJobMetrics.mockResolvedValue({
      total_applications: 3,
      awaiting_response: 0,
      responded: 2,
      stage_counts: {
        Interested: 1,
        Applied: 0,
        Interview: 1,
        Offer: 1,
        Rejected: 0,
        Archived: 0,
      },
    });
    render(<DashboardPage />);
    expect(await screen.findAllByText('Software Engineer')).toHaveLength(3);
    expect(await screen.findByText('3')).toBeInTheDocument(); // Total Applications
    expect(screen.getByText('2')).toBeInTheDocument(); // Responded
    expect(screen.getAllByText('1')).toHaveLength(3); // Interested, Interview, Offer stage counts
    expect(screen.getAllByText('0')).toHaveLength(4); // Awaiting Response, Applied, Rejected, Archived
  });

  it('renders metrics from the API without recomputing them from the loaded jobs list', async () => {
    mockListJobs.mockResolvedValue([
      { ...sampleJob, job_id: 'job-1', job_stage: 'Interested' },
      { ...sampleJob, job_id: 'job-2', job_stage: 'Applied' },
      { ...sampleJob, job_id: 'job-3', job_stage: 'Offer' },
      { ...sampleJob, job_id: 'job-4', job_stage: 'Rejected' },
    ]);
    mockGetJobMetrics.mockResolvedValue({
      total_applications: 4,
      awaiting_response: 1,
      responded: 1,
      stage_counts: {
        Interested: 1,
        Applied: 1,
        Interview: 0,
        Offer: 1,
        Rejected: 1,
        Archived: 0,
      },
    });
    render(<DashboardPage />);

    expect(await screen.findAllByText('Software Engineer')).toHaveLength(4);
    expect(await screen.findByText('4')).toBeInTheDocument(); // Total Applications
    expect(screen.getAllByText('1')).toHaveLength(6); // Awaiting Response, Responded, and 4 stage counts of 1
    expect(screen.getAllByText('0')).toHaveLength(2); // Interview and Offer stage counts
  });

  it('refetches metrics after creating a job', async () => {
    mockCreateJob.mockResolvedValue({ ...sampleJob, job_id: 'job-new' });
    render(<DashboardPage />);

    await userEvent.click(await screen.findByRole('button', { name: /new application/i }));
    fireEvent.change(screen.getByLabelText(/company/i), { target: { value: 'New Co' } });
    fireEvent.change(screen.getByLabelText(/job title/i), { target: { value: 'New Role' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Details' } });
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(mockGetJobMetrics).toHaveBeenCalledTimes(2));
  });

  it('opens the create dialog when "New Application" is clicked', async () => {
    render(<DashboardPage />);
    await userEvent.click(await screen.findByRole('button', { name: /new application/i }));
    expect(screen.getByRole('heading', { name: /add job/i })).toBeInTheDocument();
  });

  it('shows a validation error and does not call createJob when required fields are empty', async () => {
    render(<DashboardPage />);
    await userEvent.click(await screen.findByRole('button', { name: /new application/i }));
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(
      await screen.findByText(/company, title, and description are required/i)
    ).toBeInTheDocument();
    expect(mockCreateJob).not.toHaveBeenCalled();
  });

  it('calls createJob and refreshes the list when the create form is submitted', async () => {
    mockCreateJob.mockResolvedValue({ ...sampleJob, job_id: 'job-new' });
    render(<DashboardPage />);
    await userEvent.click(await screen.findByRole('button', { name: /new application/i }));
    fireEvent.change(screen.getByLabelText(/company/i), { target: { value: 'New Co' } });
    fireEvent.change(screen.getByLabelText(/job title/i), { target: { value: 'QA Engineer' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'A new role' } });
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => {
      expect(mockCreateJob).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          company_name: 'New Co',
          job_title: 'QA Engineer',
          job_description: 'A new role',
        })
      );
    });
    expect(mockListJobs).toHaveBeenCalledTimes(2);
  });

  it('shows confirmation dialog when Delete is clicked in job detail', async () => {
    mockListJobs.mockResolvedValue([sampleJob]);
    render(<DashboardPage />);
    await userEvent.click(await screen.findByText('Software Engineer'));
    await userEvent.click(screen.getByRole('button', { name: /more options/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /^delete$/i }));
    expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
  });

  it('loads activity timeline when a job detail is opened', async () => {
    mockListJobs.mockResolvedValue([sampleJob]);
    mockListJobActivity.mockResolvedValue([
      {
        event_id: 'activity-1',
        event_type: 'applied',
        title: 'Applied',
        description: 'Software Engineer at Test Co',
        occurred_at: '2026-06-16T00:00:00Z',
      },
    ]);
    render(<DashboardPage />);
    await userEvent.click(await screen.findByText('Software Engineer'));
    expect(await screen.findByText('Applied')).toBeInTheDocument();
    expect(mockListJobActivity).toHaveBeenCalledWith('test-token', 'job-1');
  });

  it('adds an interview from job detail', async () => {
    mockListJobs.mockResolvedValue([sampleJob]);
    mockListJobInterviews.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        interview_id: 'interview-1',
        job_id: 'job-1',
        user_id: 'user-1',
        round_type: 'Technical',
        scheduled_at_date: '2026-07-08',
        scheduled_at_time: '2026-07-08T15:30:00.000Z',
        interview_notes: 'Review system design.',
      },
    ]);
    mockCreateJobInterview.mockResolvedValue({
      interview_id: 'interview-1',
      job_id: 'job-1',
      user_id: 'user-1',
      round_type: 'Technical',
      scheduled_at_date: '2026-07-08',
      scheduled_at_time: '2026-07-08T15:30:00.000Z',
      interview_notes: 'Review system design.',
    });
    render(<DashboardPage />);
    await userEvent.click(await screen.findByText('Software Engineer'));

    await userEvent.click(await screen.findByRole('button', { name: /add interview/i }));
    fireEvent.change(screen.getByLabelText(/round type/i), { target: { value: 'Technical' } });
    fireEvent.change(screen.getByLabelText(/^date$/i), { target: { value: '2026-07-08' } });
    fireEvent.change(screen.getByLabelText(/^time$/i), { target: { value: '15:30' } });
    fireEvent.change(screen.getByLabelText(/^notes$/i), {
      target: { value: 'Review system design.' },
    });
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mockCreateJobInterview).toHaveBeenCalledWith(
        'test-token',
        'job-1',
        expect.objectContaining({
          round_type: 'Technical',
          scheduled_at_date: '2026-07-08',
          scheduled_at_time: new Date('2026-07-08T15:30').toISOString(),
          interview_notes: 'Review system design.',
        })
      );
    });
    expect(await screen.findByText('Technical')).toBeInTheDocument();
  });

  it('shows an error when adding an interview fails', async () => {
    mockListJobs.mockResolvedValue([sampleJob]);
    mockCreateJobInterview.mockRejectedValue(new Error('save failed'));
    render(<DashboardPage />);
    await userEvent.click(await screen.findByText('Software Engineer'));

    await userEvent.click(await screen.findByRole('button', { name: /add interview/i }));
    fireEvent.change(screen.getByLabelText(/round type/i), { target: { value: 'Technical' } });
    fireEvent.change(screen.getByLabelText(/^date$/i), { target: { value: '2026-07-08' } });
    fireEvent.change(screen.getByLabelText(/^time$/i), { target: { value: '15:30' } });
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(
      await screen.findByText('Unable to save that interview. Please try again.')
    ).toBeInTheDocument();
    expect(screen.getByText('Unable to save interview. Please try again.')).toBeInTheDocument();
  });

  it('edits an interview from job detail', async () => {
    mockListJobs.mockResolvedValue([sampleJob]);
    mockListJobInterviews
      .mockResolvedValueOnce([
        {
          interview_id: 'interview-1',
          job_id: 'job-1',
          user_id: 'user-1',
          round_type: 'Phone screen',
          scheduled_at_date: '2026-07-08',
          scheduled_at_time: '2026-07-08T15:30:00.000Z',
          interview_notes: 'Initial recruiter call.',
        },
      ])
      .mockResolvedValueOnce([
        {
          interview_id: 'interview-1',
          job_id: 'job-1',
          user_id: 'user-1',
          round_type: 'Final',
          scheduled_at_date: '2026-07-10',
          scheduled_at_time: '2026-07-10T18:00:00.000Z',
          interview_notes: 'Meet hiring manager.',
        },
      ]);
    mockUpdateJobInterview.mockResolvedValue({
      interview_id: 'interview-1',
      job_id: 'job-1',
      user_id: 'user-1',
      round_type: 'Final',
      scheduled_at_date: '2026-07-10',
      scheduled_at_time: '2026-07-10T18:00:00.000Z',
      interview_notes: 'Meet hiring manager.',
    });
    render(<DashboardPage />);
    await userEvent.click(await screen.findByText('Software Engineer'));
    expect(await screen.findByText('Phone screen')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: /^edit$/i })[1]);
    fireEvent.change(screen.getByLabelText(/round type/i), { target: { value: 'Final' } });
    fireEvent.change(screen.getByLabelText(/^date$/i), { target: { value: '2026-07-10' } });
    fireEvent.change(screen.getByLabelText(/^time$/i), { target: { value: '18:00' } });
    fireEvent.change(screen.getByLabelText(/^notes$/i), {
      target: { value: 'Meet hiring manager.' },
    });
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mockUpdateJobInterview).toHaveBeenCalledWith(
        'test-token',
        'job-1',
        'interview-1',
        expect.objectContaining({
          round_type: 'Final',
          scheduled_at_date: '2026-07-10',
          scheduled_at_time: new Date('2026-07-10T18:00').toISOString(),
          interview_notes: 'Meet hiring manager.',
        })
      );
    });
    expect(await screen.findByText('Final')).toBeInTheDocument();
  });

  it('adds a follow-up from job detail', async () => {
    mockListJobs.mockResolvedValue([sampleJob]);
    mockListJobFollowUps.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        followup_id: 'followup-1',
        job_id: 'job-1',
        user_id: 'user-1',
        due_date: '2026-07-09',
        notes: 'Email recruiter.',
        is_completed: false,
      },
    ]);
    mockCreateJobFollowUp.mockResolvedValue({
      followup_id: 'followup-1',
      job_id: 'job-1',
      user_id: 'user-1',
      due_date: '2026-07-09',
      notes: 'Email recruiter.',
      is_completed: false,
    });
    render(<DashboardPage />);
    await userEvent.click(await screen.findByText('Software Engineer'));

    await userEvent.click(await screen.findByRole('button', { name: /add follow-up/i }));
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2026-07-09' } });
    fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: 'Email recruiter.' } });
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mockCreateJobFollowUp).toHaveBeenCalledWith('test-token', 'job-1', {
        due_date: '2026-07-09',
        notes: 'Email recruiter.',
        is_completed: false,
      });
    });
    expect(await screen.findByText('Email recruiter.')).toBeInTheDocument();
  });

  it('edits a follow-up from job detail', async () => {
    mockListJobs.mockResolvedValue([sampleJob]);
    mockListJobFollowUps
      .mockResolvedValueOnce([
        {
          followup_id: 'followup-1',
          job_id: 'job-1',
          user_id: 'user-1',
          due_date: '2026-07-09',
          notes: 'Email recruiter.',
          is_completed: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          followup_id: 'followup-1',
          job_id: 'job-1',
          user_id: 'user-1',
          due_date: '2026-07-12',
          notes: 'Followed up.',
          is_completed: true,
        },
      ]);
    mockUpdateJobFollowUp.mockResolvedValue({
      followup_id: 'followup-1',
      job_id: 'job-1',
      user_id: 'user-1',
      due_date: '2026-07-12',
      notes: 'Followed up.',
      is_completed: true,
    });
    render(<DashboardPage />);
    await userEvent.click(await screen.findByText('Software Engineer'));
    expect(await screen.findByText('Email recruiter.')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: /^edit$/i })[1]);
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2026-07-12' } });
    fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: 'Followed up.' } });
    await userEvent.click(screen.getByLabelText(/completed/i));
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mockUpdateJobFollowUp).toHaveBeenCalledWith('test-token', 'job-1', 'followup-1', {
        due_date: '2026-07-12',
        notes: 'Followed up.',
        is_completed: true,
      });
    });
    expect(await screen.findByText('Followed up.')).toBeInTheDocument();
  });

  it('shows an error when saving a follow-up fails', async () => {
    mockListJobs.mockResolvedValue([sampleJob]);
    mockCreateJobFollowUp.mockRejectedValue(new Error('save failed'));
    render(<DashboardPage />);
    await userEvent.click(await screen.findByText('Software Engineer'));

    await userEvent.click(await screen.findByRole('button', { name: /add follow-up/i }));
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2026-07-09' } });
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(
      await screen.findByText('Unable to save that follow-up. Please try again.')
    ).toBeInTheDocument();
    expect(screen.getByText('Unable to save follow-up. Please try again.')).toBeInTheDocument();
  });

  it('deletes a follow-up from job detail', async () => {
    mockListJobs.mockResolvedValue([sampleJob]);
    mockListJobFollowUps
      .mockResolvedValueOnce([
        {
          followup_id: 'followup-1',
          job_id: 'job-1',
          user_id: 'user-1',
          due_date: '2026-07-09',
          notes: 'Email recruiter.',
          is_completed: false,
        },
      ])
      .mockResolvedValueOnce([]);
    mockDeleteJobFollowUp.mockResolvedValue(undefined);
    render(<DashboardPage />);
    await userEvent.click(await screen.findByText('Software Engineer'));
    expect(await screen.findByText('Email recruiter.')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: /^delete$/i })[0]);
    const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i });
    await userEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(mockDeleteJobFollowUp).toHaveBeenCalledWith('test-token', 'job-1', 'followup-1');
    });
    expect(await screen.findByText('No follow-ups scheduled.')).toBeInTheDocument();
  });

  it('saves a generated resume as a document from job detail', async () => {
    mockListJobs.mockResolvedValue([sampleJob]);
    mockGenerateResume.mockResolvedValue({ resume: '# Resume draft' });
    mockListJobDocuments.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        document_id: 'doc-1',
        user_id: 'user-1',
        job_id: 'job-1',
        doc_type: 'resume',
        doc_title: 'Resume - Software Engineer at Test Co',
        content: '# Resume draft',
        doc_version: 1,
        status: 'active',
        tags: [],
        updated_at: null,
        created_at: '2026-06-20T00:00:00Z',
      },
    ]);
    mockCreateJobDocument.mockResolvedValue({
      document_id: 'doc-1',
      user_id: 'user-1',
      job_id: 'job-1',
      doc_type: 'resume',
      doc_title: 'Resume - Software Engineer at Test Co',
      content: '# Resume draft',
      doc_version: 1,
      status: 'active',
      tags: [],
      updated_at: null,
      created_at: '2026-06-20T00:00:00Z',
    });
    render(<DashboardPage />);
    await userEvent.click(await screen.findByText('Software Engineer'));
    expect(await screen.findByText('No saved drafts yet.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /more options/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /generate resume/i }));
    await screen.findByText('Generated Resume');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mockCreateJobDocument).toHaveBeenCalledWith('test-token', 'job-1', {
        doc_type: 'resume',
        doc_title: 'Resume - Software Engineer at Test Co',
        content: '# Resume draft',
      });
    });
    expect(await screen.findByText('Resume - Software Engineer at Test Co')).toBeInTheDocument();
  });

  it('deletes a saved document from job detail', async () => {
    mockListJobs.mockResolvedValue([sampleJob]);
    mockListJobDocuments
      .mockResolvedValueOnce([
        {
          document_id: 'doc-1',
          user_id: 'user-1',
          job_id: 'job-1',
          doc_type: 'resume',
          doc_title: 'Resume - Software Engineer at Test Co',
          content: '# Resume draft',
          doc_version: 1,
          status: 'active',
          tags: [],
          updated_at: null,
          created_at: '2026-06-20T00:00:00Z',
        },
      ])
      .mockResolvedValueOnce([]);
    mockDeleteJobDocument.mockResolvedValue(undefined);
    render(<DashboardPage />);
    await userEvent.click(await screen.findByText('Software Engineer'));
    expect(await screen.findByText('Resume - Software Engineer at Test Co')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: /^delete$/i })[0]);
    const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i });
    await userEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(mockDeleteJobDocument).toHaveBeenCalledWith('test-token', 'job-1', 'doc-1');
    });
    expect(await screen.findByText('No saved drafts yet.')).toBeInTheDocument();
  });

  it('deletes a stage history event from the activity timeline', async () => {
    mockListJobs
      .mockResolvedValueOnce([{ ...sampleJob, job_stage: 'Rejected' }])
      .mockResolvedValueOnce([{ ...sampleJob, job_stage: 'Offer' }]);
    mockListJobActivity
      .mockResolvedValueOnce([
        {
          event_id: 'history-1',
          event_type: 'outcome',
          title: 'Marked rejected',
          description: 'Offer to Rejected',
          occurred_at: '2026-06-16T00:00:00Z',
          can_delete: true,
        },
      ])
      .mockResolvedValueOnce([]);
    mockDeleteJobStageHistory.mockResolvedValue(undefined);
    render(<DashboardPage />);
    await userEvent.click(await screen.findByText('Software Engineer'));
    expect(await screen.findByText('Marked rejected')).toBeInTheDocument();
    expect(screen.getAllByText('Rejected').length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: /delete marked rejected history/i }));
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(mockDeleteJobStageHistory).toHaveBeenCalledWith('test-token', 'job-1', 'history-1');
    });
    await waitFor(() => {
      expect(screen.queryByText('Marked rejected')).not.toBeInTheDocument();
    });
    expect(screen.getAllByText('Offer').length).toBeGreaterThan(0);
  });

  it('shows an error when deleting a stage history event fails', async () => {
    mockListJobs.mockResolvedValue([{ ...sampleJob, job_stage: 'Rejected' }]);
    mockListJobActivity.mockResolvedValue([
      {
        event_id: 'history-1',
        event_type: 'outcome',
        title: 'Marked rejected',
        description: 'Offer to Rejected',
        occurred_at: '2026-06-16T00:00:00Z',
        can_delete: true,
      },
    ]);
    mockDeleteJobStageHistory.mockRejectedValue(new Error('delete failed'));
    render(<DashboardPage />);
    await userEvent.click(await screen.findByText('Software Engineer'));
    expect(await screen.findByText('Marked rejected')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /delete marked rejected history/i }));
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(
      await screen.findByText('Unable to delete that stage history. Please try again.')
    ).toBeInTheDocument();
    expect(screen.getByText('Marked rejected')).toBeInTheDocument();
  });

  it('calls deleteJob and removes job from list when confirmed', async () => {
    mockListJobs.mockResolvedValue([sampleJob]);
    mockDeleteJob.mockResolvedValue(undefined);
    render(<DashboardPage />);
    await userEvent.click(await screen.findByText('Software Engineer'));
    await userEvent.click(screen.getByRole('button', { name: /more options/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /^delete$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    await waitFor(() => {
      expect(mockDeleteJob).toHaveBeenCalledWith('test-token', 'job-1');
    });
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Software Engineer' })).not.toBeInTheDocument();
    });
  });

  it('does not delete job when confirmation is cancelled', async () => {
    mockListJobs.mockResolvedValue([sampleJob]);
    render(<DashboardPage />);
    await userEvent.click(await screen.findByText('Software Engineer'));
    await userEvent.click(screen.getByRole('button', { name: /more options/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /^delete$/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockDeleteJob).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.queryByText(/are you sure/i)).not.toBeVisible();
    });
  });

  it('opens inline edit mode and calls updateJob on save', async () => {
    mockListJobs.mockResolvedValue([sampleJob]);
    mockUpdateJob.mockResolvedValue({ ...sampleJob, job_title: 'Senior Engineer' });
    render(<DashboardPage />);
    await userEvent.click(await screen.findByText('Software Engineer'));
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    const titleInput = screen.getByDisplayValue('Software Engineer');
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Senior Engineer');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => {
      expect(mockUpdateJob).toHaveBeenCalledWith(
        'test-token',
        'job-1',
        expect.objectContaining({ job_title: 'Senior Engineer' })
      );
    });
  });

  // -------------------------------------------------------------------------
  // Document metadata updates (S3-002)
  // -------------------------------------------------------------------------

  describe('updating document metadata', () => {
    const DOCUMENT_TITLE = 'Resume - Software Engineer at Test Co';

    const savedDocument = {
      document_id: 'doc-1',
      user_id: 'user-1',
      job_id: 'job-1',
      doc_type: 'resume',
      doc_title: DOCUMENT_TITLE,
      content: '# Resume draft',
      file_path: null,
      doc_version: 1,
      status: 'active',
      tags: ['backend'],
      updated_at: null,
      created_at: '2026-06-20T00:00:00Z',
    };

    /**
     * Scopes queries to the saved document's row. The job detail dialog also
     * renders its own "Edit" button, so row-scoping is required to disambiguate.
     */
    const getDocumentRow = (): HTMLElement => {
      // eslint-disable-next-line testing-library/no-node-access
      let element = screen.getByText(DOCUMENT_TITLE).parentElement;
      // eslint-disable-next-line testing-library/no-node-access
      while (element && !within(element).queryByRole('button', { name: /^view$/i })) {
        // eslint-disable-next-line testing-library/no-node-access
        element = element.parentElement;
      }
      return element as HTMLElement;
    };

    /** Opens the job, then the document's "Edit Document" modal. */
    const openDocumentEditor = async (): Promise<HTMLElement> => {
      await userEvent.click(await screen.findByText('Software Engineer'));
      expect(await screen.findByText(DOCUMENT_TITLE)).toBeInTheDocument();
      await userEvent.click(within(getDocumentRow()).getByRole('button', { name: /^edit$/i }));
      // eslint-disable-next-line testing-library/no-node-access
      return screen.getByText('Edit Document').closest('[role="dialog"]') as HTMLElement;
    };

    it('should call updateJobDocument with the token, ids, and edited metadata', async () => {
      // Arrange
      mockListJobs.mockResolvedValue([sampleJob]);
      mockListJobDocuments.mockResolvedValue([savedDocument]);
      mockUpdateJobDocument.mockResolvedValue({ ...savedDocument, status: 'archived' });
      render(<DashboardPage />);

      // Act
      const editDialog = await openDocumentEditor();
      fireEvent.change(within(editDialog).getByLabelText('Tags'), {
        target: { value: 'backend, remote' },
      });
      await userEvent.click(within(editDialog).getByRole('button', { name: /^save$/i }));

      // Assert
      await waitFor(() => {
        expect(mockUpdateJobDocument).toHaveBeenCalledWith('test-token', 'job-1', 'doc-1', {
          doc_title: DOCUMENT_TITLE,
          status: 'active',
          tags: ['backend', 'remote'],
        });
      });
    });

    it('should reload the job documents so the updated metadata is displayed', async () => {
      // Arrange
      const renamedTitle = 'Resume (final)';
      mockListJobs.mockResolvedValue([sampleJob]);
      mockListJobDocuments
        .mockResolvedValueOnce([savedDocument])
        .mockResolvedValueOnce([{ ...savedDocument, doc_title: renamedTitle, status: 'archived' }]);
      mockUpdateJobDocument.mockResolvedValue({ ...savedDocument, doc_title: renamedTitle });
      render(<DashboardPage />);

      // Act
      const editDialog = await openDocumentEditor();
      fireEvent.change(within(editDialog).getByLabelText('Title'), {
        target: { value: renamedTitle },
      });
      await userEvent.click(within(editDialog).getByRole('button', { name: /^save$/i }));

      // Assert
      expect(await screen.findByText(renamedTitle)).toBeInTheDocument();
      expect(await screen.findByText('archived')).toBeInTheDocument();
    });

    it('should surface an error message when the update request fails', async () => {
      // Arrange
      mockListJobs.mockResolvedValue([sampleJob]);
      mockListJobDocuments.mockResolvedValue([savedDocument]);
      mockUpdateJobDocument.mockRejectedValue(new Error('Unable to update document.'));
      render(<DashboardPage />);

      // Act
      const editDialog = await openDocumentEditor();
      await userEvent.click(within(editDialog).getByRole('button', { name: /^save$/i }));

      // Assert
      expect(
        await screen.findByText('Unable to update that document. Please try again.')
      ).toBeInTheDocument();
    });

    it('should not call updateJobDocument when there is no active session token', async () => {
      // Arrange
      mockListJobs.mockResolvedValue([sampleJob]);
      mockListJobDocuments.mockResolvedValue([savedDocument]);
      render(<DashboardPage />);
      const editDialog = await openDocumentEditor();

      // Act
      mockGetSession.mockResolvedValueOnce({ data: { session: null } });
      await userEvent.click(within(editDialog).getByRole('button', { name: /^save$/i }));

      // Assert
      await waitFor(() => expect(mockGetSession).toHaveBeenCalled());
      expect(mockUpdateJobDocument).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Link and unlink document flows (S3-009)
  // -------------------------------------------------------------------------

  describe('link and unlink document flows', () => {
    const linkedDoc = {
      document_id: 'doc-linked',
      user_id: 'user-1',
      job_id: 'job-1',
      doc_type: 'resume',
      doc_title: 'My Resume',
      content: '# Resume',
      file_path: null,
      doc_version: 1,
      status: 'active',
      tags: [],
      updated_at: null,
      created_at: '2026-06-20T00:00:00Z',
    };

    const libraryDoc = {
      document_id: 'doc-library',
      user_id: 'user-1',
      job_id: null,
      doc_type: 'resume',
      doc_title: 'Library Resume',
      content: '# Library Resume',
      file_path: null,
      doc_version: 1,
      status: 'active',
      tags: [],
      updated_at: null,
      created_at: '2026-06-21T00:00:00Z',
    };

    const openJobDetail = async () => {
      await userEvent.click(await screen.findByText('Software Engineer'));
      // Wait for the dialog's Close button to confirm it is mounted
      expect(await screen.findByRole('button', { name: /^close$/i })).toBeInTheDocument();
    };

    it('calls linkDocumentToJob when Link is clicked in the picker with no conflict', async () => {
      // Arrange — job has no linked docs, library has one doc
      mockListJobs.mockResolvedValue([sampleJob]);
      mockListJobDocuments.mockResolvedValue([]);
      mockListDocuments.mockResolvedValue([libraryDoc]);
      mockLinkDocumentToJob.mockResolvedValue({ ...libraryDoc, job_id: 'job-1' });
      render(<DashboardPage />);

      // Act
      await openJobDetail();
      await userEvent.click(screen.getByRole('button', { name: /link from library/i }));
      expect(await screen.findByText('Library Resume')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /^link$/i }));

      // Assert
      await waitFor(() => {
        expect(mockLinkDocumentToJob).toHaveBeenCalledWith('test-token', 'job-1', 'doc-library');
      });
    });

    it('shows replace confirmation dialog when linking a doc of the same type already linked', async () => {
      // Arrange — job already has a resume linked; library also has a resume
      mockListJobs.mockResolvedValue([sampleJob]);
      mockListJobDocuments.mockResolvedValue([linkedDoc]);
      mockListDocuments.mockResolvedValue([libraryDoc]);
      render(<DashboardPage />);

      // Act
      await openJobDetail();
      await userEvent.click(screen.getByRole('button', { name: /link from library/i }));
      expect(await screen.findByText('Library Resume')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /^link$/i }));

      // Assert — picker closes, confirmation dialog appears
      expect(await screen.findByText(/replace existing document/i)).toBeInTheDocument();
      expect(mockLinkDocumentToJob).not.toHaveBeenCalled();
    });

    it('calls unlinkDocumentFromJob then linkDocumentToJob when Replace is confirmed', async () => {
      // Arrange
      mockListJobs.mockResolvedValue([sampleJob]);
      mockListJobDocuments.mockResolvedValue([linkedDoc]);
      mockListDocuments.mockResolvedValue([libraryDoc]);
      mockUnlinkDocumentFromJob.mockResolvedValue({ ...linkedDoc, job_id: null });
      mockLinkDocumentToJob.mockResolvedValue({ ...libraryDoc, job_id: 'job-1' });
      render(<DashboardPage />);

      // Act — trigger replace confirmation then confirm
      await openJobDetail();
      await userEvent.click(screen.getByRole('button', { name: /link from library/i }));
      expect(await screen.findByText('Library Resume')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /^link$/i }));
      expect(await screen.findByText(/replace existing document/i)).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /^replace$/i }));

      // Assert — unlink first, then link
      await waitFor(() => {
        expect(mockUnlinkDocumentFromJob).toHaveBeenCalledWith('test-token', 'job-1', 'doc-linked');
      });
      await waitFor(() => {
        expect(mockLinkDocumentToJob).toHaveBeenCalledWith('test-token', 'job-1', 'doc-library');
      });
    });

    it('calls unlinkDocumentFromJob when Unlink is clicked on a linked document', async () => {
      // Arrange
      mockListJobs.mockResolvedValue([sampleJob]);
      mockListJobDocuments.mockResolvedValue([linkedDoc]);
      mockListDocuments.mockResolvedValue([]);
      mockUnlinkDocumentFromJob.mockResolvedValue({ ...linkedDoc, job_id: null });
      render(<DashboardPage />);

      // Act
      await openJobDetail();
      expect(await screen.findByText('My Resume')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /^unlink$/i }));

      // Assert
      await waitFor(() => {
        expect(mockUnlinkDocumentFromJob).toHaveBeenCalledWith('test-token', 'job-1', 'doc-linked');
      });
    });
  });

  describe('analytics panels', () => {
    it('renders analytics panels when the analytics endpoint returns data', async () => {
      mockGetJobAnalytics.mockResolvedValueOnce({
        conversion_rates: [{ from_stage: 'Applied', to_stage: 'Interview', count: 5, rate: 0.5 }],
        time_in_stage: [{ stage: 'Applied', avg_days: 7.3, count: 4 }],
        weekly_velocity: [{ week_start: '2026-06-30', count: 3 }],
      });

      render(<DashboardPage />);

      expect(await screen.findByText('Stage Conversion Rates')).toBeInTheDocument();
      expect(screen.getByText('Avg. Time in Stage')).toBeInTheDocument();
      expect(screen.getByText('Weekly Application Volume')).toBeInTheDocument();
      // 50% = (rate 0.5 * 100).toFixed(0) + '%' — unique in the page (all stage counts are 0)
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('does not render analytics panels when all analytics data is empty', async () => {
      render(<DashboardPage />);
      await screen.findByText(/no recent applications/i);

      expect(screen.queryByText('Stage Conversion Rates')).not.toBeInTheDocument();
      expect(screen.queryByText('Avg. Time in Stage')).not.toBeInTheDocument();
      expect(screen.queryByText('Weekly Application Volume')).not.toBeInTheDocument();
    });
  });
});

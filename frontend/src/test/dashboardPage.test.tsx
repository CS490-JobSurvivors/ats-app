import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
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
    fireEvent.change(screen.getByLabelText(/notes/i), {
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

    await userEvent.click(screen.getAllByRole('button', { name: /^edit$/i })[0]);
    fireEvent.change(screen.getByLabelText(/round type/i), { target: { value: 'Final' } });
    fireEvent.change(screen.getByLabelText(/^date$/i), { target: { value: '2026-07-10' } });
    fireEvent.change(screen.getByLabelText(/^time$/i), { target: { value: '18:00' } });
    fireEvent.change(screen.getByLabelText(/notes/i), {
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

    await userEvent.click(screen.getAllByRole('button', { name: /^edit$/i })[0]);
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
      created_at: '2026-06-20T00:00:00Z',
    });
    render(<DashboardPage />);
    await userEvent.click(await screen.findByText('Software Engineer'));
    expect(await screen.findByText('No saved drafts yet.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /generate resume/i }));
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
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
    const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i });
    await userEvent.click(deleteButtons[deleteButtons.length - 1]);
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
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
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
});

import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobDetailDialog from '../components/JobDetailDialog';
import { DocumentRecord, FollowUpRecord, InterviewRecord, JobRecord } from '../api/jobs';
import { stageColors } from '../utils/stageColors';

const mockJob: JobRecord = {
  job_id: '123',
  company_name: 'Acme Corp',
  job_title: 'Software Engineer',
  job_description: 'Build cool stuff.',
  application_link: 'https://acme.com/jobs/1',
  job_stage: 'Applied',
  job_poster_id: 'user-1',
  updated_at: '2026-06-25T00:00:00Z',
  created_at: '2026-06-20T00:00:00Z',
};

const mockOnClose = jest.fn();
const mockOnSave = jest.fn();
const mockOnDelete = jest.fn();
const mockOnStageChange = jest.fn();
const mockOnDeleteStageHistory = jest.fn();
const mockOnSaveInterview = jest.fn();
const mockOnSaveFollowUp = jest.fn();
const mockOnDeleteFollowUp = jest.fn();
const interviews: InterviewRecord[] = [
  {
    interview_id: 'interview-1',
    job_id: '123',
    user_id: 'user-1',
    round_type: 'Phone screen',
    scheduled_at_date: '2026-07-08',
    scheduled_at_time: '2026-07-08T15:30:00.000Z',
    interview_notes: 'Initial recruiter call.',
  },
];
const followUps: FollowUpRecord[] = [
  {
    followup_id: 'followup-1',
    job_id: '123',
    user_id: 'user-1',
    due_date: '2026-07-09',
    notes: 'Email recruiter.',
    is_completed: false,
  },
];
const activityEvents = [
  {
    event_id: 'job-created-123',
    event_type: 'stage_change' as const,
    title: 'Added to pipeline',
    description: 'Software Engineer at Acme Corp',
    occurred_at: '2026-06-19T00:00:00Z',
    can_delete: false,
  },
  {
    event_id: 'activity-1',
    event_type: 'applied' as const,
    title: 'Applied',
    description: 'Software Engineer at Acme Corp',
    occurred_at: '2026-06-20T00:00:00Z',
  },
  {
    event_id: 'activity-2',
    event_type: 'follow_up' as const,
    title: 'Follow-up',
    description: 'Email recruiter (due)',
    occurred_at: '2026-06-22T00:00:00Z',
  },
  {
    event_id: 'activity-3',
    event_type: 'interview' as const,
    title: 'Technical interview scheduled',
    description: 'Bring portfolio',
    occurred_at: '2026-06-24T15:00:00Z',
  },
  {
    event_id: 'activity-4',
    event_type: 'outcome' as const,
    title: 'Offer received',
    description: 'Interview to Offer',
    occurred_at: '2026-06-25T00:00:00Z',
    can_delete: true,
  },
  {
    event_id: 'activity-5',
    event_type: 'outcome' as const,
    title: 'Marked rejected',
    description: 'Offer to Rejected',
    occurred_at: '2026-06-26T00:00:00Z',
    can_delete: true,
  },
];

const renderDialog = (job = mockJob) =>
  render(
    <JobDetailDialog
      open={true}
      job={job}
      onClose={mockOnClose}
      onSave={mockOnSave}
      onDelete={mockOnDelete}
      onStageChange={mockOnStageChange}
    />
  );

describe('JobDetailDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSaveInterview.mockResolvedValue(undefined);
    mockOnSaveFollowUp.mockResolvedValue(undefined);
    mockOnDeleteFollowUp.mockResolvedValue(undefined);
  });

  it('renders job details when open', () => {
    renderDialog();
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getAllByText('Applied').length).toBeGreaterThan(0);
    expect(screen.getByText('Build cool stuff.')).toBeInTheDocument();
  });

  it('renders application link when provided', () => {
    renderDialog();
    expect(screen.getByText('https://acme.com/jobs/1')).toBeInTheDocument();
  });

  it('renders job activity timeline events', () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        activityEvents={activityEvents}
      />
    );

    expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
    expect(screen.getByText('Added to pipeline')).toBeInTheDocument();
    expect(screen.getAllByText('Applied').length).toBeGreaterThan(0);
    expect(screen.getByText('Follow-up')).toBeInTheDocument();
    expect(screen.getByText('Technical interview scheduled')).toBeInTheDocument();
    expect(screen.getByText('Offer received')).toBeInTheDocument();
    expect(screen.getByText('Marked rejected')).toBeInTheDocument();
    expect(screen.getByTestId('CancelIcon')).toBeInTheDocument();
    expect(screen.getByTestId('activity-icon-activity-5')).toHaveStyle(
      `background-color: ${stageColors.Rejected.color}`
    );
  });

  it('does not render a delete button for the added to pipeline event', () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        onDeleteStageHistory={mockOnDeleteStageHistory}
        activityEvents={activityEvents}
      />
    );

    expect(screen.queryByRole('button', { name: /delete added to pipeline history/i })).toBeNull();
    expect(
      screen.getByRole('button', { name: /delete offer received history/i })
    ).toBeInTheDocument();
  });

  it('asks for confirmation before deleting a stage history event', async () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        onDeleteStageHistory={mockOnDeleteStageHistory}
        activityEvents={activityEvents}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /delete offer received history/i }));

    expect(screen.getByText(/delete stage history/i)).toBeInTheDocument();
    expect(screen.getByText(/remove/i)).toBeInTheDocument();
    expect(mockOnDeleteStageHistory).not.toHaveBeenCalled();
  });

  it('calls onDeleteStageHistory after confirming a stage history deletion', async () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        onDeleteStageHistory={mockOnDeleteStageHistory}
        activityEvents={activityEvents}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /delete offer received history/i }));
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(mockOnDeleteStageHistory).toHaveBeenCalledWith('activity-4');
  });

  it('does not delete a stage history event when confirmation is cancelled', async () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        onDeleteStageHistory={mockOnDeleteStageHistory}
        activityEvents={activityEvents}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /delete offer received history/i }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnDeleteStageHistory).not.toHaveBeenCalled();
  });

  it('renders activity loading state', () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        isActivityLoading={true}
      />
    );

    expect(screen.getByText(/loading activity/i)).toBeInTheDocument();
  });

  it('submits a new follow-up from the add follow-up form', async () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        onSaveFollowUp={mockOnSaveFollowUp}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /add follow-up/i }));
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2026-07-09' } });
    fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: 'Email recruiter.' } });
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mockOnSaveFollowUp).toHaveBeenCalledWith(
        {
          due_date: '2026-07-09',
          notes: 'Email recruiter.',
          is_completed: false,
        },
        undefined
      );
    });
  });

  it('submits updates from the edit follow-up form', async () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        onSaveFollowUp={mockOnSaveFollowUp}
        followUps={followUps}
      />
    );

    await userEvent.click(screen.getAllByRole('button', { name: /^edit$/i })[1]);
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2026-07-12' } });
    fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: 'Followed up.' } });
    await userEvent.click(screen.getByLabelText(/completed/i));
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mockOnSaveFollowUp).toHaveBeenCalledWith(
        {
          due_date: '2026-07-12',
          notes: 'Followed up.',
          is_completed: true,
        },
        'followup-1'
      );
    });
  });

  it('shows validation error when follow-up due date is missing', async () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        onSaveFollowUp={mockOnSaveFollowUp}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /add follow-up/i }));
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(await screen.findByText('Due date is required.')).toBeInTheDocument();
    expect(mockOnSaveFollowUp).not.toHaveBeenCalled();
  });

  it('keeps the follow-up form open and shows an error when follow-up save fails', async () => {
    mockOnSaveFollowUp.mockRejectedValue(new Error('save failed'));
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        onSaveFollowUp={mockOnSaveFollowUp}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /add follow-up/i }));
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2026-07-09' } });
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(
      await screen.findByText('Unable to save follow-up. Please try again.')
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /add follow-up/i })).toBeInTheDocument();
  });

  it('confirms before deleting a follow-up', async () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        onSaveFollowUp={mockOnSaveFollowUp}
        onDeleteFollowUp={mockOnDeleteFollowUp}
        followUps={followUps}
      />
    );

    await userEvent.click(screen.getAllByRole('button', { name: /^delete$/i })[0]);
    expect(screen.getByRole('heading', { name: /delete follow-up/i })).toBeInTheDocument();

    const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i });
    await userEvent.click(deleteButtons[deleteButtons.length - 1]);

    await waitFor(() => {
      expect(mockOnDeleteFollowUp).toHaveBeenCalledWith('followup-1');
    });
  });

  it('submits a new interview from the add interview form', async () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        onSaveInterview={mockOnSaveInterview}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /add interview/i }));
    fireEvent.change(screen.getByLabelText(/round type/i), { target: { value: 'Technical' } });
    fireEvent.change(screen.getByLabelText(/^date$/i), { target: { value: '2026-07-08' } });
    fireEvent.change(screen.getByLabelText(/^time$/i), { target: { value: '15:30' } });
    fireEvent.change(screen.getByLabelText(/^notes$/i), {
      target: { value: 'Review system design.' },
    });
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mockOnSaveInterview).toHaveBeenCalledWith(
        expect.objectContaining({
          round_type: 'Technical',
          scheduled_at_date: '2026-07-08',
          scheduled_at_time: new Date('2026-07-08T15:30').toISOString(),
          interview_notes: 'Review system design.',
        }),
        undefined
      );
    });
    await waitFor(() => {
      expect(
        screen.queryByText('Round type, date, and time are required.')
      ).not.toBeInTheDocument();
    });
  });

  it('submits updates from the edit interview form', async () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        onSaveInterview={mockOnSaveInterview}
        interviews={interviews}
      />
    );

    await userEvent.click(screen.getAllByRole('button', { name: /^edit$/i })[1]);
    fireEvent.change(screen.getByLabelText(/round type/i), { target: { value: 'Final' } });
    fireEvent.change(screen.getByLabelText(/^date$/i), { target: { value: '2026-07-10' } });
    fireEvent.change(screen.getByLabelText(/^time$/i), { target: { value: '18:00' } });
    fireEvent.change(screen.getByLabelText(/^notes$/i), {
      target: { value: 'Meet hiring manager.' },
    });
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mockOnSaveInterview).toHaveBeenCalledWith(
        expect.objectContaining({
          round_type: 'Final',
          scheduled_at_date: '2026-07-10',
          scheduled_at_time: new Date('2026-07-10T18:00').toISOString(),
          interview_notes: 'Meet hiring manager.',
        }),
        'interview-1'
      );
    });
  });

  it('shows validation error when required interview fields are missing', async () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        onSaveInterview={mockOnSaveInterview}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /add interview/i }));
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(await screen.findByText('Round type, date, and time are required.')).toBeInTheDocument();
    expect(mockOnSaveInterview).not.toHaveBeenCalled();
  });

  it('keeps the interview form open and shows an error when interview save fails', async () => {
    mockOnSaveInterview.mockRejectedValue(new Error('save failed'));
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        onSaveInterview={mockOnSaveInterview}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /add interview/i }));
    fireEvent.change(screen.getByLabelText(/round type/i), { target: { value: 'Technical' } });
    fireEvent.change(screen.getByLabelText(/^date$/i), { target: { value: '2026-07-08' } });
    fireEvent.change(screen.getByLabelText(/^time$/i), { target: { value: '15:30' } });
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(
      await screen.findByText('Unable to save interview. Please try again.')
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /add interview/i })).toBeInTheDocument();
  });

  it('includes prep_notes in the interview payload when filled in', async () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        onSaveInterview={mockOnSaveInterview}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /add interview/i }));
    fireEvent.change(screen.getByLabelText(/round type/i), { target: { value: 'Technical' } });
    fireEvent.change(screen.getByLabelText(/^date$/i), { target: { value: '2026-07-08' } });
    fireEvent.change(screen.getByLabelText(/^time$/i), { target: { value: '15:30' } });
    fireEvent.change(screen.getByLabelText(/preparation notes/i), {
      target: { value: 'Study graphs and dynamic programming.' },
    });
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mockOnSaveInterview).toHaveBeenCalledWith(
        expect.objectContaining({
          prep_notes: 'Study graphs and dynamic programming.',
        }),
        undefined
      );
    });
  });

  it('displays prep_notes on the interview card when present', () => {
    const interviewWithPrepNotes: InterviewRecord[] = [
      {
        ...interviews[0],
        prep_notes: 'Practice system design questions.',
      },
    ];
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        onSaveInterview={mockOnSaveInterview}
        interviews={interviewWithPrepNotes}
      />
    );

    expect(screen.getByText('Prep notes')).toBeInTheDocument();
    expect(screen.getByText('Practice system design questions.')).toBeInTheDocument();
  });

  it('does not show prep notes section when interview has no prep_notes', () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        onSaveInterview={mockOnSaveInterview}
        interviews={interviews}
      />
    );

    expect(screen.queryByText('Prep notes')).not.toBeInTheDocument();
  });

  it('includes company_research_notes in job save payload when filled in', async () => {
    mockOnSave.mockResolvedValue(undefined);
    renderDialog();
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.change(screen.getByLabelText(/company research notes/i), {
      target: { value: 'Founded 2010, Series C, engineering-first culture.' },
    });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          company_research_notes: 'Founded 2010, Series C, engineering-first culture.',
        })
      );
    });
  });

  it('displays company_research_notes when present on the job', () => {
    renderDialog({ ...mockJob, company_research_notes: 'Competes with Acme. Remote-friendly.' });
    expect(screen.getByText('Company Research Notes')).toBeInTheDocument();
    expect(screen.getByText('Competes with Acme. Remote-friendly.')).toBeInTheDocument();
  });

  it('does not show company research notes section when notes are null', () => {
    renderDialog({ ...mockJob, company_research_notes: null });
    expect(screen.queryByText('Company Research Notes')).not.toBeInTheDocument();
  });

  it('does not render application link when not provided', () => {
    renderDialog({ ...mockJob, application_link: null });
    expect(screen.queryByText('Application Link')).not.toBeInTheDocument();
  });

  it('calls onClose when Close button is clicked', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when Delete button is clicked', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: /more options/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: /^delete$/i }));
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when job is null', () => {
    const { container } = render(
      <JobDetailDialog
        open={true}
        job={null}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('switches to edit mode when Edit button is clicked', () => {
    renderDialog();
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Build cool stuff.')).toBeInTheDocument();
  });

  it('pre-fills edit form with current job data', () => {
    renderDialog();
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument();
  });

  it('calls onSave with updated payload when Save is clicked', async () => {
    mockOnSave.mockResolvedValue(undefined);
    renderDialog();
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.change(screen.getByDisplayValue('Software Engineer'), {
      target: { value: 'Senior Engineer' },
    });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({ job_title: 'Senior Engineer' })
      );
    });
  });

  it('shows error when saving with empty required fields', async () => {
    renderDialog();
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.change(screen.getByDisplayValue('Software Engineer'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByText('Save'));
    expect(
      await screen.findByText('Company, title, and description are required.')
    ).toBeInTheDocument();
  });

  it('returns to read view when Cancel is clicked in edit mode', () => {
    renderDialog();
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Software Engineer')).not.toBeInTheDocument();
  });

  it('calls onStageChange directly for a forward transition', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: 'Interview' }));
    expect(mockOnStageChange).toHaveBeenCalledWith('Interview');
    expect(screen.queryByText(/non-standard transition/i)).not.toBeInTheDocument();
  });

  it('shows warning dialog for a non-forward transition', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: /Interested/ }));
    expect(screen.getByText(/non-standard transition/i)).toBeInTheDocument();
    expect(mockOnStageChange).not.toHaveBeenCalled();
  });

  it('calls onStageChange after confirming a non-forward transition', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: /Interested/ }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(mockOnStageChange).toHaveBeenCalledWith('Interested');
  });

  it('does not call onStageChange when non-forward transition is cancelled', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: /Interested/ }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnStageChange).not.toHaveBeenCalled();
  });

  it('renders location when provided', () => {
    renderDialog({ ...mockJob, job_location: 'New York, NY' });
    expect(screen.getByText('New York, NY')).toBeInTheDocument();
  });

  it('pre-fills location in edit form', () => {
    renderDialog({ ...mockJob, job_location: 'New York, NY' });
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByDisplayValue('New York, NY')).toBeInTheDocument();
  });

  it('renders deadline when provided', () => {
    renderDialog({ ...mockJob, deadline: '2026-07-15' });
    expect(screen.getByText(/7\/15\/2026/)).toBeInTheDocument();
  });

  it('renders recruiter notes when provided', () => {
    renderDialog({ ...mockJob, recruiter_notes: 'Spoke with Jane from HR.' });
    expect(screen.getByText('Spoke with Jane from HR.')).toBeInTheDocument();
  });

  it('pre-fills deadline and recruiter notes in edit form', () => {
    renderDialog({ ...mockJob, deadline: '2026-07-15', recruiter_notes: 'Follow up Monday.' });
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByDisplayValue('2026-07-15')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Follow up Monday.')).toBeInTheDocument();
  });

  it('renders outcome notes when job stage is Rejected', () => {
    renderDialog({
      ...mockJob,
      job_stage: 'Rejected',
      outcome_notes: 'Went with an internal candidate.',
    });
    expect(screen.getByText('Went with an internal candidate.')).toBeInTheDocument();
  });

  it('does not render outcome notes for non-outcome stages', () => {
    renderDialog({ ...mockJob, job_stage: 'Applied', outcome_notes: 'Should not show.' });
    expect(screen.queryByText('Should not show.')).not.toBeInTheDocument();
  });

  it('pre-fills outcome notes in edit form when stage is an outcome stage', () => {
    renderDialog({
      ...mockJob,
      job_stage: 'Offer',
      outcome_notes: 'Negotiating start date.',
    });
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByDisplayValue('Negotiating start date.')).toBeInTheDocument();
  });

  it('does not show outcome notes field in edit form for non-outcome stages', () => {
    renderDialog({ ...mockJob, job_stage: 'Applied' });
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.queryByLabelText('Outcome Notes')).not.toBeInTheDocument();
  });

  const archivedActivityEvents = [
    ...activityEvents.slice(0, -1),
    {
      event_id: 'activity-6',
      event_type: 'outcome' as const,
      title: 'Archived',
      description: 'Offer to Archived',
      occurred_at: '2026-06-26T00:00:00Z',
      can_delete: true,
    },
  ];

  it('shows an Archive button for jobs that are not archived', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: /more options/i }));
    expect(screen.getByRole('menuitem', { name: 'Archive' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Restore' })).not.toBeInTheDocument();
  });

  it('opens the non-forward warning when archiving from a non-Offer stage', async () => {
    renderDialog();
    await userEvent.click(screen.getByRole('button', { name: /more options/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Archive' }));
    expect(screen.getByText(/non-standard transition/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(mockOnStageChange).toHaveBeenCalledWith('Archived');
  });

  it('shows a Restore button and confirmation for an archived job with a deletable archive event', async () => {
    render(
      <JobDetailDialog
        open={true}
        job={{ ...mockJob, job_stage: 'Archived' }}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        onDeleteStageHistory={mockOnDeleteStageHistory}
        activityEvents={archivedActivityEvents}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /more options/i }));
    expect(screen.queryByRole('menuitem', { name: 'Archive' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Restore' }));
    expect(screen.getByText(/restore job/i)).toBeInTheDocument();
    expect(screen.getByText('Offer')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^restore$/i }));
    expect(mockOnDeleteStageHistory).toHaveBeenCalledWith('activity-6');
  });

  it('does not call onDeleteStageHistory when restore is cancelled', async () => {
    render(
      <JobDetailDialog
        open={true}
        job={{ ...mockJob, job_stage: 'Archived' }}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        onDeleteStageHistory={mockOnDeleteStageHistory}
        activityEvents={archivedActivityEvents}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /more options/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Restore' }));
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnDeleteStageHistory).not.toHaveBeenCalled();
  });

  it('does not show a Restore button when an archived job has no deletable archive history', () => {
    render(
      <JobDetailDialog
        open={true}
        job={{ ...mockJob, job_stage: 'Archived' }}
        onClose={mockOnClose}
        onSave={mockOnSave}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
        onDeleteStageHistory={mockOnDeleteStageHistory}
        activityEvents={[activityEvents[0]]}
      />
    );

    expect(screen.queryByRole('button', { name: 'Restore' })).not.toBeInTheDocument();
  });

  describe('AI resume improve', () => {
    const GENERATED = '# Jane Doe\n\nOriginal summary.';
    const IMPROVED = '# Jane Doe\n\nPolished summary.';

    const renderWithResume = (
      onGenerateResume: () => Promise<string>,
      onImproveResume?: (draft: string) => Promise<string>
    ) =>
      render(
        <JobDetailDialog
          open={true}
          job={mockJob}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onStageChange={mockOnStageChange}
          onGenerateResume={onGenerateResume}
          onImproveResume={onImproveResume}
        />
      );

    it('does not show Improve Draft button when onImproveResume is not provided', async () => {
      renderWithResume(jest.fn().mockResolvedValue(GENERATED));
      await userEvent.click(screen.getByRole('button', { name: /more options/i }));
      await userEvent.click(screen.getByRole('menuitem', { name: /generate resume/i }));
      await screen.findByText('Generated Resume');
      expect(screen.queryByRole('button', { name: /improve draft/i })).not.toBeInTheDocument();
    });

    it('shows Improve Draft button when onImproveResume is provided', async () => {
      renderWithResume(
        jest.fn().mockResolvedValue(GENERATED),
        jest.fn().mockResolvedValue(IMPROVED)
      );
      await userEvent.click(screen.getByRole('button', { name: /more options/i }));
      await userEvent.click(screen.getByRole('menuitem', { name: /generate resume/i }));
      await screen.findByText('Generated Resume');
      expect(screen.getByRole('button', { name: /improve draft/i })).toBeInTheDocument();
    });

    it('calls onImproveResume with current draft text and shows toggle on success', async () => {
      const mockImprove = jest.fn().mockResolvedValue(IMPROVED);
      renderWithResume(jest.fn().mockResolvedValue(GENERATED), mockImprove);

      await userEvent.click(screen.getByRole('button', { name: /more options/i }));
      await userEvent.click(screen.getByRole('menuitem', { name: /generate resume/i }));
      await screen.findByText('Generated Resume');
      fireEvent.click(screen.getByRole('button', { name: /improve draft/i }));

      await waitFor(() => {
        expect(mockImprove).toHaveBeenCalledWith(GENERATED);
      });
      expect(await screen.findByRole('button', { name: /^original$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^improved$/i })).toBeInTheDocument();
    });

    it('toggles between original and improved text', async () => {
      const mockImprove = jest.fn().mockResolvedValue(IMPROVED);
      renderWithResume(jest.fn().mockResolvedValue(GENERATED), mockImprove);

      await userEvent.click(screen.getByRole('button', { name: /more options/i }));
      await userEvent.click(screen.getByRole('menuitem', { name: /generate resume/i }));
      await screen.findByText('Generated Resume');
      fireEvent.click(screen.getByRole('button', { name: /improve draft/i }));
      await screen.findByRole('button', { name: /^original$/i });

      fireEvent.click(screen.getByRole('button', { name: /^original$/i }));
      await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(GENERATED));

      fireEvent.click(screen.getByRole('button', { name: /^improved$/i }));
      await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(IMPROVED));
    });
  });

  describe('Saved documents', () => {
    const mockOnSaveDocument = jest.fn();
    const mockOnDeleteDocument = jest.fn();
    const savedDocuments = [
      {
        document_id: 'doc-1',
        user_id: 'user-1',
        job_id: '123',
        doc_type: 'resume' as const,
        doc_title: 'Resume - Software Engineer at Acme Corp',
        content: 'Some content',
        file_path: null,
        doc_version: 1,
        status: 'active' as const,
        tags: [] as string[],
        updated_at: null,
        created_at: '2026-06-20T00:00:00Z',
      },
    ];

    beforeEach(() => {
      mockOnSaveDocument.mockReset();
      mockOnDeleteDocument.mockReset();
      mockOnSaveDocument.mockResolvedValue(undefined);
      mockOnDeleteDocument.mockResolvedValue(undefined);
    });

    it('does not show a Save button in the resume dialog when onSaveDocument is not provided', async () => {
      render(
        <JobDetailDialog
          open={true}
          job={mockJob}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onStageChange={mockOnStageChange}
          onGenerateResume={jest.fn().mockResolvedValue('# Resume draft')}
        />
      );
      await userEvent.click(screen.getByRole('button', { name: /more options/i }));
      await userEvent.click(screen.getByRole('menuitem', { name: /generate resume/i }));
      await screen.findByText('Generated Resume');
      expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument();
    });

    it('saves the generated resume with an auto-generated title', async () => {
      render(
        <JobDetailDialog
          open={true}
          job={mockJob}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onStageChange={mockOnStageChange}
          onGenerateResume={jest.fn().mockResolvedValue('# Resume draft')}
          onSaveDocument={mockOnSaveDocument}
        />
      );
      await userEvent.click(screen.getByRole('button', { name: /more options/i }));
      await userEvent.click(screen.getByRole('menuitem', { name: /generate resume/i }));
      await screen.findByText('Generated Resume');
      await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

      expect(mockOnSaveDocument).toHaveBeenCalledWith({
        doc_type: 'resume',
        doc_title: 'Resume - Software Engineer at Acme Corp',
        content: '# Resume draft',
      });
    });

    it('shows an error when saving a generated resume fails', async () => {
      mockOnSaveDocument.mockRejectedValueOnce(new Error('save failed'));
      render(
        <JobDetailDialog
          open={true}
          job={mockJob}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onStageChange={mockOnStageChange}
          onGenerateResume={jest.fn().mockResolvedValue('# Resume draft')}
          onSaveDocument={mockOnSaveDocument}
        />
      );
      await userEvent.click(screen.getByRole('button', { name: /more options/i }));
      await userEvent.click(screen.getByRole('menuitem', { name: /generate resume/i }));
      await screen.findByText('Generated Resume');
      await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

      expect(
        await screen.findByText('Unable to save resume. Please try again.')
      ).toBeInTheDocument();
    });

    it('saves the generated cover letter with an auto-generated title', async () => {
      render(
        <JobDetailDialog
          open={true}
          job={mockJob}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onStageChange={mockOnStageChange}
          onGenerateCoverLetter={jest.fn().mockResolvedValue('Dear hiring manager...')}
          onSaveDocument={mockOnSaveDocument}
        />
      );
      await userEvent.click(screen.getByRole('button', { name: /more options/i }));
      await userEvent.click(screen.getByRole('menuitem', { name: /^cover letter$/i }));
      await screen.findByText('Generated Cover Letter');
      await userEvent.click(await screen.findByRole('button', { name: /^save$/i }));

      expect(mockOnSaveDocument).toHaveBeenCalledWith({
        doc_type: 'cover_letter',
        doc_title: 'Cover Letter - Software Engineer at Acme Corp',
        content: 'Dear hiring manager...',
      });
    });

    it('shows an error when saving a generated cover letter fails', async () => {
      mockOnSaveDocument.mockRejectedValueOnce(new Error('save failed'));
      render(
        <JobDetailDialog
          open={true}
          job={mockJob}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onStageChange={mockOnStageChange}
          onGenerateCoverLetter={jest.fn().mockResolvedValue('Dear hiring manager...')}
          onSaveDocument={mockOnSaveDocument}
        />
      );
      await userEvent.click(screen.getByRole('button', { name: /more options/i }));
      await userEvent.click(screen.getByRole('menuitem', { name: /^cover letter$/i }));
      await screen.findByText('Generated Cover Letter');
      await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

      expect(
        await screen.findByText('Unable to save cover letter. Please try again.')
      ).toBeInTheDocument();
    });

    it('shows an empty state when there are no saved drafts', () => {
      renderDialog();
      expect(screen.getByText('Saved Drafts')).toBeInTheDocument();
      expect(screen.getByText('No saved drafts yet.')).toBeInTheDocument();
    });

    it('renders saved drafts with version and date', () => {
      render(
        <JobDetailDialog
          open={true}
          job={mockJob}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onStageChange={mockOnStageChange}
          savedDocuments={savedDocuments}
        />
      );
      expect(screen.getByText('Resume - Software Engineer at Acme Corp')).toBeInTheDocument();
      expect(screen.getByText(/v1/)).toBeInTheDocument();
    });

    it('asks for confirmation before deleting a saved draft', async () => {
      render(
        <JobDetailDialog
          open={true}
          job={mockJob}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onStageChange={mockOnStageChange}
          savedDocuments={savedDocuments}
          onDeleteDocument={mockOnDeleteDocument}
        />
      );
      await userEvent.click(screen.getAllByRole('button', { name: /^delete$/i })[0]);
      expect(screen.getByText(/delete saved draft/i)).toBeInTheDocument();
      expect(mockOnDeleteDocument).not.toHaveBeenCalled();
    });

    it('calls onDeleteDocument after confirming deletion', async () => {
      render(
        <JobDetailDialog
          open={true}
          job={mockJob}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onStageChange={mockOnStageChange}
          savedDocuments={savedDocuments}
          onDeleteDocument={mockOnDeleteDocument}
        />
      );
      await userEvent.click(screen.getAllByRole('button', { name: /^delete$/i })[0]);
      const deleteButtons = screen.getAllByRole('button', { name: /^delete$/i });
      await userEvent.click(deleteButtons[deleteButtons.length - 1]);

      expect(mockOnDeleteDocument).toHaveBeenCalledWith('doc-1');
    });
  });

  // -------------------------------------------------------------------------
  // Document metadata: status, tags, updated_at (S3-002)
  // -------------------------------------------------------------------------

  describe('Document metadata', () => {
    const mockOnUpdateDocument = jest.fn();

    const buildDocument = (overrides: Partial<DocumentRecord> = {}): DocumentRecord => ({
      document_id: 'doc-1',
      user_id: 'user-1',
      job_id: '123',
      doc_type: 'resume',
      doc_title: 'Resume - Software Engineer at Acme Corp',
      content: 'Some content',
      file_path: null,
      doc_version: 1,
      status: 'active',
      tags: [],
      updated_at: null,
      created_at: '2026-06-20T00:00:00Z',
      ...overrides,
    });

    /** Renders the dialog with a single saved document and metadata editing enabled. */
    const renderWithDocument = (
      overrides: Partial<DocumentRecord> = {},
      { withUpdateHandler = true } = {}
    ) =>
      render(
        <JobDetailDialog
          open={true}
          job={mockJob}
          onClose={mockOnClose}
          onSave={mockOnSave}
          onDelete={mockOnDelete}
          onStageChange={mockOnStageChange}
          savedDocuments={[buildDocument(overrides)]}
          onUpdateDocument={withUpdateHandler ? mockOnUpdateDocument : undefined}
        />
      );

    const DOCUMENT_TITLE = 'Resume - Software Engineer at Acme Corp';

    /**
     * Scopes queries to a saved document's row. The dialog also renders an "Edit"
     * button for the job itself, so row-scoping is required to disambiguate.
     */
    const getDocumentRow = (title = DOCUMENT_TITLE): HTMLElement => {
      // eslint-disable-next-line testing-library/no-node-access
      let element = screen.getByText(title).parentElement;
      // eslint-disable-next-line testing-library/no-node-access
      while (element && !within(element).queryByRole('button', { name: /^view$/i })) {
        // eslint-disable-next-line testing-library/no-node-access
        element = element.parentElement;
      }
      return element as HTMLElement;
    };

    /** Scopes queries to the "Edit Document" modal, which is portaled alongside others. */
    const getEditDialog = () =>
      // eslint-disable-next-line testing-library/no-node-access
      screen.getByText('Edit Document').closest('[role="dialog"]') as HTMLElement;

    const openEditDialog = async () => {
      await userEvent.click(within(getDocumentRow()).getByRole('button', { name: /^edit$/i }));
      return getEditDialog();
    };

    beforeEach(() => {
      mockOnUpdateDocument.mockReset();
      mockOnUpdateDocument.mockResolvedValue(undefined);
    });

    describe('metadata display', () => {
      it('should render the document status as a chip when the document is active', () => {
        // Arrange & Act
        renderWithDocument({ status: 'active' });

        // Assert
        expect(screen.getByText('active')).toBeInTheDocument();
      });

      it('should render the archived status when the document is archived', () => {
        // Arrange & Act
        renderWithDocument({ status: 'archived' });

        // Assert
        expect(screen.getByText('archived')).toBeInTheDocument();
      });

      it('should render one chip per tag when the document has tags', () => {
        // Arrange & Act
        renderWithDocument({ tags: ['backend', 'remote'] });

        // Assert
        expect(screen.getByText('backend')).toBeInTheDocument();
        expect(screen.getByText('remote')).toBeInTheDocument();
      });

      it('should render no tag chips when the document has no tags', () => {
        // Arrange
        const tag = 'backend';

        // Act
        renderWithDocument({ tags: [] });

        // Assert
        expect(screen.queryByText(tag)).not.toBeInTheDocument();
      });

      it('should show the updated timestamp in the viewer when the document has been edited', async () => {
        // Arrange
        renderWithDocument({ updated_at: '2026-07-01T12:00:00Z' });

        // Act
        await userEvent.click(within(getDocumentRow()).getByRole('button', { name: /^view$/i }));

        // Assert
        expect(await screen.findByText(/Updated/)).toBeInTheDocument();
      });

      it('should omit the updated timestamp in the viewer when the document has never been edited', async () => {
        // Arrange
        renderWithDocument({ updated_at: null });

        // Act
        await userEvent.click(within(getDocumentRow()).getByRole('button', { name: /^view$/i }));

        // Assert
        await waitFor(() => expect(screen.getAllByText(/^v1/).length).toBeGreaterThan(0));
        expect(screen.queryByText(/Updated/)).not.toBeInTheDocument();
      });
    });

    describe('edit affordance', () => {
      it('should not show an Edit button when onUpdateDocument is not provided', () => {
        // Arrange & Act
        renderWithDocument({}, { withUpdateHandler: false });

        // Assert
        expect(
          within(getDocumentRow()).queryByRole('button', { name: /^edit$/i })
        ).not.toBeInTheDocument();
      });

      it('should show an Edit button when onUpdateDocument is provided', () => {
        // Arrange & Act
        renderWithDocument();

        // Assert
        expect(
          within(getDocumentRow()).getByRole('button', { name: /^edit$/i })
        ).toBeInTheDocument();
      });

      it('should prefill the edit form with the current title, status, and comma-joined tags', async () => {
        // Arrange
        renderWithDocument({ status: 'draft', tags: ['backend', 'remote'] });

        // Act
        const editDialog = await openEditDialog();

        // Assert
        expect(within(editDialog).getByLabelText('Title')).toHaveValue(
          'Resume - Software Engineer at Acme Corp'
        );
        expect(within(editDialog).getByLabelText('Tags')).toHaveValue('backend, remote');
        expect(within(editDialog).getByRole('combobox')).toHaveTextContent('Draft');
      });
    });

    describe('saving metadata changes', () => {
      it('should call onUpdateDocument with the edited title, status, and tags', async () => {
        // Arrange
        renderWithDocument({ tags: ['backend'] });
        const editDialog = await openEditDialog();

        // Act
        fireEvent.change(within(editDialog).getByLabelText('Title'), {
          target: { value: 'Resume (final)' },
        });
        fireEvent.change(within(editDialog).getByLabelText('Tags'), {
          target: { value: 'senior, remote' },
        });
        await userEvent.click(within(editDialog).getByRole('button', { name: /^save$/i }));

        // Assert
        await waitFor(() =>
          expect(mockOnUpdateDocument).toHaveBeenCalledWith('doc-1', {
            doc_title: 'Resume (final)',
            status: 'active',
            tags: ['senior', 'remote'],
          })
        );
      });

      it('should submit the newly selected status when the status dropdown is changed', async () => {
        // Arrange
        renderWithDocument();
        const editDialog = await openEditDialog();

        // Act
        await userEvent.click(within(editDialog).getByRole('combobox'));
        await userEvent.click(await screen.findByRole('option', { name: 'Archived' }));
        await userEvent.click(within(editDialog).getByRole('button', { name: /^save$/i }));

        // Assert
        await waitFor(() =>
          expect(mockOnUpdateDocument).toHaveBeenCalledWith(
            'doc-1',
            expect.objectContaining({ status: 'archived' })
          )
        );
      });

      it('should trim whitespace and drop empty entries when parsing the tags input', async () => {
        // Arrange
        renderWithDocument();
        const editDialog = await openEditDialog();

        // Act
        fireEvent.change(within(editDialog).getByLabelText('Tags'), {
          target: { value: '  react ,, node ,  ' },
        });
        await userEvent.click(within(editDialog).getByRole('button', { name: /^save$/i }));

        // Assert
        await waitFor(() =>
          expect(mockOnUpdateDocument).toHaveBeenCalledWith(
            'doc-1',
            expect.objectContaining({ tags: ['react', 'node'] })
          )
        );
      });

      it('should submit an empty tag list when the tags input is cleared', async () => {
        // Arrange
        renderWithDocument({ tags: ['stale'] });
        const editDialog = await openEditDialog();

        // Act
        fireEvent.change(within(editDialog).getByLabelText('Tags'), { target: { value: '' } });
        await userEvent.click(within(editDialog).getByRole('button', { name: /^save$/i }));

        // Assert
        await waitFor(() =>
          expect(mockOnUpdateDocument).toHaveBeenCalledWith(
            'doc-1',
            expect.objectContaining({ tags: [] })
          )
        );
      });

      it('should close the edit dialog after a successful save', async () => {
        // Arrange
        renderWithDocument();
        const editDialog = await openEditDialog();

        // Act
        await userEvent.click(within(editDialog).getByRole('button', { name: /^save$/i }));

        // Assert
        await waitFor(() => expect(screen.queryByText('Edit Document')).not.toBeInTheDocument());
      });
    });

    describe('edit validation and error handling', () => {
      it('should disable the Save button when the title is empty', async () => {
        // Arrange
        renderWithDocument();
        const editDialog = await openEditDialog();

        // Act
        fireEvent.change(within(editDialog).getByLabelText('Title'), { target: { value: '' } });

        // Assert
        expect(within(editDialog).getByRole('button', { name: /^save$/i })).toBeDisabled();
      });

      it('should disable the Save button when the title is only whitespace', async () => {
        // Arrange
        renderWithDocument();
        const editDialog = await openEditDialog();

        // Act
        fireEvent.change(within(editDialog).getByLabelText('Title'), { target: { value: '   ' } });

        // Assert
        expect(within(editDialog).getByRole('button', { name: /^save$/i })).toBeDisabled();
      });

      it('should show an error alert and keep the dialog open when the update fails', async () => {
        // Arrange
        mockOnUpdateDocument.mockRejectedValue(new Error('Unable to update document.'));
        renderWithDocument();
        const editDialog = await openEditDialog();

        // Act
        await userEvent.click(within(editDialog).getByRole('button', { name: /^save$/i }));

        // Assert
        expect(await screen.findByText('Failed to update document.')).toBeInTheDocument();
        expect(screen.getByText('Edit Document')).toBeInTheDocument();
      });

      it('should close the dialog without calling onUpdateDocument when cancelled', async () => {
        // Arrange
        renderWithDocument();
        const editDialog = await openEditDialog();

        // Act
        await userEvent.click(within(editDialog).getByRole('button', { name: /^cancel$/i }));

        // Assert
        await waitFor(() => expect(screen.queryByText('Edit Document')).not.toBeInTheDocument());
        expect(mockOnUpdateDocument).not.toHaveBeenCalled();
      });
    });
  });
});

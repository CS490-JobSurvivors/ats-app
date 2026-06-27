import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobDetailDialog from '../components/JobDetailDialog';
import { JobRecord } from '../api/jobs';

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

  it('does not render application link when not provided', () => {
    renderDialog({ ...mockJob, application_link: null });
    expect(screen.queryByText('Application Link')).not.toBeInTheDocument();
  });

  it('calls onClose when Close button is clicked', () => {
    renderDialog();
    fireEvent.click(screen.getByText('Close'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when Delete button is clicked', () => {
    renderDialog();
    fireEvent.click(screen.getByText('Delete'));
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
});
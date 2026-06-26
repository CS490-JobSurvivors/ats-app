import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
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
const mockOnEdit = jest.fn();
const mockOnDelete = jest.fn();
const mockOnStageChange = jest.fn();

describe('JobDetailDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders job details when open', () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
      />
    );
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getAllByText('Applied').length).toBeGreaterThan(0);
    expect(screen.getByText('Build cool stuff.')).toBeInTheDocument();
  });

  it('renders application link when provided', () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
      />
    );
    expect(screen.getByText('https://acme.com/jobs/1')).toBeInTheDocument();
  });

  it('does not render application link when not provided', () => {
    const jobNoLink = { ...mockJob, application_link: null };
    render(
      <JobDetailDialog
        open={true}
        job={jobNoLink}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
      />
    );
    expect(screen.queryByText('Application Link')).not.toBeInTheDocument();
  });

  it('calls onClose when Close button is clicked', () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
      />
    );
    fireEvent.click(screen.getByText('Close'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit when Edit button is clicked', () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
      />
    );
    fireEvent.click(screen.getByText('Edit'));
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when Delete button is clicked', () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
      />
    );
    fireEvent.click(screen.getByText('Delete'));
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it('calls onStageChange directly for a forward transition', async () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
      />
    );
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: 'Interview' }));
    expect(mockOnStageChange).toHaveBeenCalledWith('Interview');
    expect(screen.queryByText(/non-standard transition/i)).not.toBeInTheDocument();
  });

  it('shows warning dialog for a non-forward transition', async () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
      />
    );
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: /Interested/ }));
    expect(screen.getByText(/non-standard transition/i)).toBeInTheDocument();
    expect(mockOnStageChange).not.toHaveBeenCalled();
  });

  it('calls onStageChange after confirming a non-forward transition', async () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
      />
    );
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: /Interested/ }));
    fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
    expect(mockOnStageChange).toHaveBeenCalledWith('Interested');
  });

  it('does not call onStageChange when non-forward transition is cancelled', async () => {
    render(
      <JobDetailDialog
        open={true}
        job={mockJob}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
      />
    );
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: /Interested/ }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnStageChange).not.toHaveBeenCalled();
  });

  it('renders nothing when job is null', () => {
    const { container } = render(
      <JobDetailDialog
        open={true}
        job={null}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onStageChange={mockOnStageChange}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

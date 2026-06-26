import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
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
      />
    );
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Applied')).toBeInTheDocument();
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
      />
    );
    fireEvent.click(screen.getByText('Delete'));
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when job is null', () => {
    const { container } = render(
      <JobDetailDialog
        open={true}
        job={null}
        onClose={mockOnClose}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

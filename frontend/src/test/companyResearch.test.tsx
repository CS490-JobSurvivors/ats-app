import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobDetailDialog from '../components/JobDetailDialog';
import { JobRecord } from '../api/jobs';

const mockJob: JobRecord = {
  job_id: 'job-1',
  company_name: 'Acme Corp',
  job_title: 'Software Engineer',
  job_description: 'Build cool stuff.',
  job_stage: 'Applied',
  job_poster_id: 'user-1',
  updated_at: '2026-06-25T00:00:00Z',
  created_at: '2026-06-20T00:00:00Z',
};

const noop = jest.fn();

const renderWithResearch = (onGenerateResearch?: jest.Mock) =>
  render(
    <JobDetailDialog
      open={true}
      job={mockJob}
      onClose={noop}
      onSave={noop}
      onDelete={noop}
      onStageChange={noop}
      onGenerateResearch={onGenerateResearch}
    />
  );

const openEditMode = async () => {
  await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
};

describe('Company research UI', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not show research prompt when onGenerateResearch is not provided', async () => {
    renderWithResearch();
    await openEditMode();
    expect(screen.queryByLabelText(/what do you want to research/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /generate/i })).not.toBeInTheDocument();
  });

  it('shows research prompt and Generate button when onGenerateResearch is provided', async () => {
    renderWithResearch(jest.fn());
    await openEditMode();
    expect(screen.getByLabelText(/what do you want to research/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument();
  });

  it('Generate button is disabled when context input is empty', async () => {
    renderWithResearch(jest.fn());
    await openEditMode();
    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled();
  });

  it('Generate button is enabled after typing context', async () => {
    renderWithResearch(jest.fn());
    await openEditMode();
    await userEvent.type(
      screen.getByLabelText(/what do you want to research/i),
      'What is their tech stack?'
    );
    expect(screen.getByRole('button', { name: /generate/i })).toBeEnabled();
  });

  it('calls onGenerateResearch with trimmed context text on Generate click', async () => {
    const mockGenerate = jest.fn().mockResolvedValue('AI research output');
    renderWithResearch(mockGenerate);
    await openEditMode();
    await userEvent.type(screen.getByLabelText(/what do you want to research/i), '  tech stack  ');
    await userEvent.click(screen.getByRole('button', { name: /generate/i }));
    expect(mockGenerate).toHaveBeenCalledWith('tech stack');
  });

  it('populates Company Research Notes field with returned research text', async () => {
    const mockGenerate = jest.fn().mockResolvedValue('Acme uses Python and React.');
    renderWithResearch(mockGenerate);
    await openEditMode();
    await userEvent.type(screen.getByLabelText(/what do you want to research/i), 'tech stack');
    await userEvent.click(screen.getByRole('button', { name: /generate/i }));
    await waitFor(() => {
      const notesField = screen.getByLabelText(/company research notes/i);
      expect(notesField).toHaveValue('Acme uses Python and React.');
    });
  });

  it('clears context input after successful research generation', async () => {
    const mockGenerate = jest.fn().mockResolvedValue('Some research.');
    renderWithResearch(mockGenerate);
    await openEditMode();
    const contextInput = screen.getByLabelText(/what do you want to research/i);
    await userEvent.type(contextInput, 'culture');
    await userEvent.click(screen.getByRole('button', { name: /generate/i }));
    await waitFor(() => expect(contextInput).toHaveValue(''));
  });

  it('shows error message when onGenerateResearch rejects', async () => {
    const mockGenerate = jest.fn().mockRejectedValue(new Error('Network error'));
    renderWithResearch(mockGenerate);
    await openEditMode();
    await userEvent.type(screen.getByLabelText(/what do you want to research/i), 'recent news');
    await userEvent.click(screen.getByRole('button', { name: /generate/i }));
    expect(await screen.findByText(/failed to generate research/i)).toBeInTheDocument();
  });

  it('does not update Company Research Notes on failure', async () => {
    const mockGenerate = jest.fn().mockRejectedValue(new Error('fail'));
    renderWithResearch(mockGenerate);
    await openEditMode();
    const notesField = screen.getByLabelText(/company research notes/i);
    const originalValue = (notesField as HTMLTextAreaElement).value;
    await userEvent.type(screen.getByLabelText(/what do you want to research/i), 'values');
    await userEvent.click(screen.getByRole('button', { name: /generate/i }));
    expect(await screen.findByText(/failed to generate research/i)).toBeInTheDocument();
    expect((notesField as HTMLTextAreaElement).value).toBe(originalValue);
  });
});

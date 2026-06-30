import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JobFormDialog from '../components/JobFormDialog';

describe('JobFormDialog', () => {
  const onClose = jest.fn();
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const fillRequiredFields = () => {
    fireEvent.change(screen.getByLabelText(/company/i), { target: { value: 'Acme Corp' } });
    fireEvent.change(screen.getByLabelText(/job title/i), {
      target: { value: 'Software Engineer' },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Build things.' },
    });
  };

  it('saves successfully when the deadline is left blank', async () => {
    onSubmit.mockResolvedValue(undefined);
    render(<JobFormDialog open job={null} onClose={onClose} onSubmit={onSubmit} />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        company_name: 'Acme Corp',
        job_title: 'Software Engineer',
        job_description: 'Build things.',
        deadline: null,
      })
    );
    expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
  });

  it('blocks save and shows an error when required fields are missing', async () => {
    render(<JobFormDialog open job={null} onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(
      await screen.findByText('Company, title, and description are required.')
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sends the entered deadline as-is when provided', async () => {
    onSubmit.mockResolvedValue(undefined);
    render(<JobFormDialog open job={null} onClose={onClose} onSubmit={onSubmit} />);

    fillRequiredFields();
    fireEvent.change(screen.getByLabelText(/application deadline/i), {
      target: { value: '2026-08-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ deadline: '2026-08-01' })
    );
  });
});

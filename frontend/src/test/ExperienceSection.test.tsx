import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExperienceSection from '../components/ExperienceSection';
import { createExperience, updateExperience, deleteExperience } from '../api/experiences';
import { ExperienceRecord } from '../api/experiences';

jest.mock('../api/experiences', () => ({
  createExperience: jest.fn(),
  updateExperience: jest.fn(),
  deleteExperience: jest.fn(),
  reorderExperiences: jest.fn(),
  listExperiences: jest.fn(),
}));

const mockCreateExperience = createExperience as jest.Mock;
const mockUpdateExperience = updateExperience as jest.Mock;
const mockDeleteExperience = deleteExperience as jest.Mock;

const mockExperience: ExperienceRecord = {
  experience_id: 'exp-1',
  experience_user_id: 'user-1',
  company: 'Acme Corp',
  title: 'Software Engineer',
  start_date: '2022-01-01',
  end_date: '2023-01-01',
  experience_description: 'Built cool stuff.',
  is_current: false,
  position_number: 0,
};

const mockOnChange = jest.fn();
const ACCESS_TOKEN = 'test-token';

const renderSection = (experiences: ExperienceRecord[] = []) =>
  render(
    <ExperienceSection
      experiences={experiences}
      accessToken={ACCESS_TOKEN}
      onExperiencesChange={mockOnChange}
    />
  );

describe('ExperienceSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no experiences', () => {
    renderSection();
    expect(screen.getByText(/no experience entries yet/i)).toBeInTheDocument();
  });

  it('renders existing experience entries', () => {
    renderSection([mockExperience]);
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Built cool stuff.')).toBeInTheDocument();
  });

  it('shows "Present" for current positions', () => {
    renderSection([{ ...mockExperience, is_current: true, end_date: null }]);
    expect(screen.getByText(/Present/)).toBeInTheDocument();
  });

  it('opens add dialog when "+ Add" is clicked', () => {
    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    expect(screen.getByText('Add Experience')).toBeInTheDocument();
  });

  it('shows validation errors when saving empty form', async () => {
    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(await screen.findByText('Company is required.')).toBeInTheDocument();
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText('Start date is required.')).toBeInTheDocument();
  });

  it('shows error when end date is before start date', async () => {
    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.change(screen.getByLabelText(/company/i), { target: { value: 'Acme' } });
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Engineer' } });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2023-01-01' } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2022-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(await screen.findByText(/end date cannot be earlier/i)).toBeInTheDocument();
    expect(mockCreateExperience).not.toHaveBeenCalled();
  });

  it('calls createExperience and updates list on valid submission', async () => {
    const created = { ...mockExperience, experience_id: 'exp-new' };
    mockCreateExperience.mockResolvedValue(created);

    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.change(screen.getByLabelText(/company/i), { target: { value: 'Acme Corp' } });
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Software Engineer' } });
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2022-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mockCreateExperience).toHaveBeenCalledWith(
        ACCESS_TOKEN,
        expect.objectContaining({ company: 'Acme Corp', title: 'Software Engineer' })
      );
    });
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([created]);
    });
  });

  it('opens edit dialog pre-filled with existing entry', () => {
    renderSection([mockExperience]);
    fireEvent.click(
      screen.getAllByRole('button').find((b) => b.querySelector('[data-testid="EditIcon"]'))!
    );
    expect(screen.getByText('Edit Experience')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Acme Corp')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
  });

  it('calls updateExperience on edit save', async () => {
    const updated = { ...mockExperience, title: 'Senior Engineer' };
    mockUpdateExperience.mockResolvedValue(updated);

    renderSection([mockExperience]);
    fireEvent.click(
      screen.getAllByRole('button').find((b) => b.querySelector('[data-testid="EditIcon"]'))!
    );
    fireEvent.change(screen.getByDisplayValue('Software Engineer'), {
      target: { value: 'Senior Engineer' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mockUpdateExperience).toHaveBeenCalledWith(
        ACCESS_TOKEN,
        'exp-1',
        expect.objectContaining({ title: 'Senior Engineer' })
      );
    });
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([updated]);
    });
  });

  it('calls deleteExperience when delete button is clicked', async () => {
    mockDeleteExperience.mockResolvedValue(undefined);

    renderSection([mockExperience]);
    fireEvent.click(
      screen.getAllByRole('button').find((b) => b.querySelector('[data-testid="DeleteIcon"]'))!
    );

    await waitFor(() => {
      expect(mockDeleteExperience).toHaveBeenCalledWith(ACCESS_TOKEN, 'exp-1');
    });
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([]);
    });
  });

  it('hides end date field when "I currently work here" is checked', () => {
    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/i currently work here/i));
    expect(screen.queryByLabelText(/end date/i)).not.toBeInTheDocument();
  });
});

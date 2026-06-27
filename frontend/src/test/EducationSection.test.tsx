import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EducationSection from '../components/EducationSection';
import { createEducation, updateEducation, deleteEducation } from '../api/education';
import { EducationRecord } from '../api/education';

jest.mock('../api/education', () => ({
  createEducation: jest.fn(),
  updateEducation: jest.fn(),
  deleteEducation: jest.fn(),
  reorderEducation: jest.fn(),
  listEducation: jest.fn(),
}));

const mockCreateEducation = createEducation as jest.Mock;
const mockUpdateEducation = updateEducation as jest.Mock;
const mockDeleteEducation = deleteEducation as jest.Mock;

const mockEducation: EducationRecord = {
  education_id: 'edu-1',
  education_user_id: 'user-1',
  institution_name: 'State University',
  degree: 'Bachelor of Science',
  major: 'Computer Science',
  start_date: '2020-09-01',
  end_date: '2024-05-01',
  GPA: 3.8,
  is_current: false,
  position_number: 0,
};

const mockOnChange = jest.fn();
const ACCESS_TOKEN = 'test-token';

const renderSection = (educations: EducationRecord[] = []) =>
  render(
    <EducationSection
      educations={educations}
      accessToken={ACCESS_TOKEN}
      onEducationsChange={mockOnChange}
    />
  );

describe('EducationSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no educations', () => {
    renderSection();
    expect(screen.getByText(/no education entries yet/i)).toBeInTheDocument();
  });

  it('renders existing education entries', () => {
    renderSection([mockEducation]);
    expect(screen.getByText('State University')).toBeInTheDocument();
    expect(screen.getByText('Bachelor of Science in Computer Science')).toBeInTheDocument();
    expect(screen.getByText('GPA: 3.8')).toBeInTheDocument();
  });

  it('shows "Present" for current education', () => {
    renderSection([{ ...mockEducation, is_current: true, end_date: null }]);
    expect(screen.getByText(/present/i)).toBeInTheDocument();
  });

  it('does not show GPA when null', () => {
    renderSection([{ ...mockEducation, GPA: null }]);
    expect(screen.queryByText(/GPA/i)).not.toBeInTheDocument();
  });

  it('opens dialog on "+ Add" click', () => {
    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    expect(screen.getByText('Add Education')).toBeInTheDocument();
  });

  it('shows validation errors when required fields are empty', async () => {
    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(screen.getByText('Institution name is required.')).toBeInTheDocument();
    });
    expect(screen.getByText('Degree is required.')).toBeInTheDocument();
    expect(screen.getByText('Major is required.')).toBeInTheDocument();
    expect(screen.getByText('Start date is required.')).toBeInTheDocument();
  });

  it('shows end date error when end date is before start date', async () => {
    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.change(screen.getByLabelText(/institution name/i), {
      target: { value: 'MIT' },
    });
    fireEvent.change(screen.getByLabelText(/^degree/i), {
      target: { value: 'BS' },
    });
    fireEvent.change(screen.getByLabelText(/major/i), {
      target: { value: 'Physics' },
    });
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: '2023-01-01' },
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: '2022-01-01' },
    });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(screen.getByText('End date cannot be earlier than start date.')).toBeInTheDocument();
    });
  });

  it('calls createEducation with correct payload and updates list', async () => {
    const created: EducationRecord = { ...mockEducation, education_id: 'edu-new' };
    mockCreateEducation.mockResolvedValueOnce(created);

    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.change(screen.getByLabelText(/institution name/i), {
      target: { value: 'State University' },
    });
    fireEvent.change(screen.getByLabelText(/^degree/i), {
      target: { value: 'Bachelor of Science' },
    });
    fireEvent.change(screen.getByLabelText(/major/i), {
      target: { value: 'Computer Science' },
    });
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: '2020-09-01' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCreateEducation).toHaveBeenCalledWith(
        ACCESS_TOKEN,
        expect.objectContaining({
          institution_name: 'State University',
          degree: 'Bachelor of Science',
          major: 'Computer Science',
          start_date: '2020-09-01',
        })
      );
    });
    expect(mockOnChange).toHaveBeenCalledWith([created]);
  });

  it('prefills form and calls updateEducation on edit', async () => {
    const updated: EducationRecord = { ...mockEducation, degree: 'Master of Science' };
    mockUpdateEducation.mockResolvedValueOnce(updated);

    renderSection([mockEducation]);
    fireEvent.click(screen.getByLabelText('edit education'));
    expect(screen.getByText('Edit Education')).toBeInTheDocument();
    expect(screen.getByDisplayValue('State University')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^degree/i), {
      target: { value: 'Master of Science' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockUpdateEducation).toHaveBeenCalledWith(
        ACCESS_TOKEN,
        'edu-1',
        expect.objectContaining({ degree: 'Master of Science' })
      );
    });
    expect(mockOnChange).toHaveBeenCalledWith([updated]);
  });

  it('calls deleteEducation and removes entry', async () => {
    mockDeleteEducation.mockResolvedValueOnce(undefined);

    renderSection([mockEducation]);
    fireEvent.click(screen.getByLabelText('delete education'));

    await waitFor(() => {
      expect(mockDeleteEducation).toHaveBeenCalledWith(ACCESS_TOKEN, 'edu-1');
    });
    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('hides end date field when is_current is checked', () => {
    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/i currently study here/i));
    expect(screen.queryByLabelText(/end date/i)).not.toBeInTheDocument();
  });

  it('saves without GPA when GPA field is left empty', async () => {
    const created: EducationRecord = { ...mockEducation, GPA: null, education_id: 'edu-new' };
    mockCreateEducation.mockResolvedValueOnce(created);

    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.change(screen.getByLabelText(/institution name/i), {
      target: { value: 'State University' },
    });
    fireEvent.change(screen.getByLabelText(/^degree/i), {
      target: { value: 'Bachelor of Science' },
    });
    fireEvent.change(screen.getByLabelText(/major/i), {
      target: { value: 'Computer Science' },
    });
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: '2020-09-01' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockCreateEducation).toHaveBeenCalledWith(
        ACCESS_TOKEN,
        expect.objectContaining({ GPA: null })
      );
    });
  });

  it('shows a save error message when createEducation rejects', async () => {
    mockCreateEducation.mockRejectedValueOnce(new Error('network down'));

    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.change(screen.getByLabelText(/institution name/i), {
      target: { value: 'State University' },
    });
    fireEvent.change(screen.getByLabelText(/^degree/i), {
      target: { value: 'Bachelor of Science' },
    });
    fireEvent.change(screen.getByLabelText(/major/i), {
      target: { value: 'Computer Science' },
    });
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: '2020-09-01' },
    });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(
        screen.getByText('Failed to save education record. Please try again.')
      ).toBeInTheDocument();
    });
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('closes the dialog without saving when Cancel is clicked', async () => {
    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    expect(screen.getByText('Add Education')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));

    await waitFor(() => {
      expect(screen.queryByText('Add Education')).not.toBeInTheDocument();
    });
    expect(mockCreateEducation).not.toHaveBeenCalled();
    expect(mockOnChange).not.toHaveBeenCalled();
  });
});

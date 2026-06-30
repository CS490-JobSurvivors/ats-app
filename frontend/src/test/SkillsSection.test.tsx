import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SkillsSection from '../components/SkillsSection';
import { createSkill, updateSkill, deleteSkill } from '../api/skills';
import { SkillRecord } from '../api/skills';

jest.mock('../api/skills', () => ({
  createSkill: jest.fn(),
  updateSkill: jest.fn(),
  deleteSkill: jest.fn(),
  reorderSkills: jest.fn(),
  listSkills: jest.fn(),
}));

const mockCreateSkill = createSkill as jest.Mock;
const mockUpdateSkill = updateSkill as jest.Mock;
const mockDeleteSkill = deleteSkill as jest.Mock;

const mockSkill: SkillRecord = {
  skill_id: 'skill-1',
  skill_user_id: 'user-1',
  skill_name: 'Python',
  category: 'Programming',
  proficiency: 'Advanced',
  position_number: 0,
};

const mockOnChange = jest.fn();
const ACCESS_TOKEN = 'test-token';

const renderSection = (skills: SkillRecord[] = []) =>
  render(
    <SkillsSection skills={skills} accessToken={ACCESS_TOKEN} onSkillsChange={mockOnChange} />
  );

describe('SkillsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no skills', () => {
    renderSection();
    expect(screen.getByText(/no skills added yet/i)).toBeInTheDocument();
  });

  it('renders existing skill entries', () => {
    renderSection([mockSkill]);
    expect(screen.getByText('Python')).toBeInTheDocument();
    expect(screen.getByText('Programming')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('opens add dialog when "+ Add" is clicked', () => {
    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    expect(screen.getByText('Add Skill')).toBeInTheDocument();
  });

  it('shows validation error when saving with empty skill name', async () => {
    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(await screen.findByText('Skill name is required.')).toBeInTheDocument();
    expect(mockCreateSkill).not.toHaveBeenCalled();
  });

  it('calls createSkill and updates list on valid submission', async () => {
    const created = { ...mockSkill, skill_id: 'skill-new' };
    mockCreateSkill.mockResolvedValue(created);

    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.change(screen.getByLabelText(/skill name/i), { target: { value: 'Python' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mockCreateSkill).toHaveBeenCalledWith(
        ACCESS_TOKEN,
        expect.objectContaining({ skill_name: 'Python' })
      );
    });
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([created]);
    });
  });

  it('shows field-level error when skill name already exists', async () => {
    mockCreateSkill.mockRejectedValue(new Error('A skill with this name already exists.'));

    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.change(screen.getByLabelText(/skill name/i), { target: { value: 'Python' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(await screen.findByText('A skill with this name already exists.')).toBeInTheDocument();
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('opens edit dialog pre-filled with existing entry', () => {
    renderSection([mockSkill]);
    fireEvent.click(screen.getByRole('button', { name: /edit skill/i }));
    expect(screen.getByText('Edit Skill')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Python')).toBeInTheDocument();
  });

  it('calls updateSkill on edit save', async () => {
    const updated = { ...mockSkill, skill_name: 'Python 3' };
    mockUpdateSkill.mockResolvedValue(updated);

    renderSection([mockSkill]);
    fireEvent.click(screen.getByRole('button', { name: /edit skill/i }));
    fireEvent.change(screen.getByDisplayValue('Python'), { target: { value: 'Python 3' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mockUpdateSkill).toHaveBeenCalledWith(
        ACCESS_TOKEN,
        'skill-1',
        expect.objectContaining({ skill_name: 'Python 3' })
      );
    });
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([updated]);
    });
  });

  it('calls deleteSkill when delete button is clicked', async () => {
    mockDeleteSkill.mockResolvedValue(undefined);

    renderSection([mockSkill]);
    fireEvent.click(screen.getByRole('button', { name: /delete skill/i }));

    await waitFor(() => {
      expect(mockDeleteSkill).toHaveBeenCalledWith(ACCESS_TOKEN, 'skill-1');
    });
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith([]);
    });
  });

  it('renders category and proficiency chips when provided', () => {
    renderSection([mockSkill]);
    expect(screen.getByText('Programming')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('does not render chips when category and proficiency are null', () => {
    renderSection([{ ...mockSkill, category: null, proficiency: null }]);
    expect(screen.queryByText('Programming')).not.toBeInTheDocument();
    expect(screen.queryByText('Advanced')).not.toBeInTheDocument();
  });

  it('shows error message when delete fails', async () => {
    mockDeleteSkill.mockRejectedValue(new Error('Network error'));

    renderSection([mockSkill]);
    fireEvent.click(screen.getByRole('button', { name: /delete skill/i }));

    expect(
      await screen.findByText('Failed to delete skill. Please try again.')
    ).toBeInTheDocument();
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('clears skill name error inline when user types after failed save', async () => {
    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(await screen.findByText('Skill name is required.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/skill name/i), { target: { value: 'Python' } });
    expect(screen.queryByText('Skill name is required.')).not.toBeInTheDocument();
  });

  it('enforces maxLength of 100 on skill name field', () => {
    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    expect(screen.getByLabelText(/skill name/i)).toHaveAttribute('maxlength', '100');
  });

  it('shows save error as an alert when createSkill fails with generic error', async () => {
    mockCreateSkill.mockRejectedValueOnce(new Error('network error'));
    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.change(screen.getByLabelText(/skill name/i), { target: { value: 'Python' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('network error');
  });
});

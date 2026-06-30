import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CareerPreferencesSection from '../components/CareerPreferencesSection';
import { saveCareerPreferences } from '../api/careerPreferences';
import { CareerPreferenceRecord } from '../api/careerPreferences';

jest.mock('../api/careerPreferences', () => ({
  saveCareerPreferences: jest.fn(),
  getCareerPreferences: jest.fn(),
}));

const mockSave = saveCareerPreferences as jest.Mock;
const mockOnChange = jest.fn();
const ACCESS_TOKEN = 'test-token';

const mockPrefs: CareerPreferenceRecord = {
  user_id: 'user-1',
  target_roles: ['Software Engineer', 'Backend Developer'],
  location_preference: 'New York',
  work_mode: 'Remote',
  salary_minimum: 80000,
};

const renderSection = (preferences: CareerPreferenceRecord | null = null) =>
  render(
    <CareerPreferencesSection
      preferences={preferences}
      accessToken={ACCESS_TOKEN}
      onPreferencesChange={mockOnChange}
    />
  );

describe('CareerPreferencesSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no preferences exist', () => {
    renderSection();
    expect(screen.getByText(/no career preferences added yet/i)).toBeInTheDocument();
    expect(screen.getByText('+ Add')).toBeInTheDocument();
  });

  it('renders existing preferences', () => {
    renderSection(mockPrefs);
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Backend Developer')).toBeInTheDocument();
    expect(screen.getByText(/new york/i)).toBeInTheDocument();
    expect(screen.getByText(/remote/i)).toBeInTheDocument();
    expect(screen.getByText(/80,000/)).toBeInTheDocument();
  });

  it('shows Edit button when preferences exist', () => {
    renderSection(mockPrefs);
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument();
  });

  it('opens add dialog when no preferences', () => {
    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    expect(screen.getByText('Add Career Preferences')).toBeInTheDocument();
  });

  it('opens edit dialog pre-filled when preferences exist', () => {
    renderSection(mockPrefs);
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    expect(screen.getByText('Edit Career Preferences')).toBeInTheDocument();
    expect(screen.getByDisplayValue('New York')).toBeInTheDocument();
  });

  it('can add a role via Add button', () => {
    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.change(screen.getByLabelText(/role input/i), {
      target: { value: 'Data Engineer' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(screen.getByText('Data Engineer')).toBeInTheDocument();
  });

  it('can add a role via Enter key', () => {
    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.change(screen.getByLabelText(/role input/i), {
      target: { value: 'ML Engineer' },
    });
    fireEvent.keyDown(screen.getByLabelText(/role input/i), { key: 'Enter' });
    expect(screen.getByText('ML Engineer')).toBeInTheDocument();
  });

  it('does not add duplicate roles', () => {
    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.change(screen.getByLabelText(/role input/i), { target: { value: 'SWE' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
    fireEvent.change(screen.getByLabelText(/role input/i), { target: { value: 'SWE' } });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(screen.getAllByText('SWE')).toHaveLength(1);
  });

  it('calls saveCareerPreferences and onPreferencesChange on save', async () => {
    const updated = { ...mockPrefs };
    mockSave.mockResolvedValue(updated);

    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(ACCESS_TOKEN, expect.any(Object));
    });
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith(updated);
    });
  });

  it('shows error alert when save fails', async () => {
    mockSave.mockRejectedValue(new Error('Network error'));

    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(await screen.findByText(/unable to save career preferences/i)).toBeInTheDocument();
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('does not render target roles section when roles are null', () => {
    renderSection({ ...mockPrefs, target_roles: null });
    expect(screen.queryByText('Target Roles')).not.toBeInTheDocument();
  });

  it('closes dialog on cancel', async () => {
    renderSection();
    fireEvent.click(screen.getByText('+ Add'));
    expect(screen.getByText('Add Career Preferences')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => {
      expect(screen.queryByText('Add Career Preferences')).not.toBeInTheDocument();
    });
  });
});

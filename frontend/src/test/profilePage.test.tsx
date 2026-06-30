import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProfilePage from '../pages/profilePage';

import { useProfile } from '../contexts/ProfileContext';
import { supabase } from '../utils/supabaseClient';
import { saveProfile } from '../api/profile';
import { listExperiences } from '../api/experiences';
import { listSkills } from '../api/skills';
import { getCareerPreferences } from '../api/careerPreferences';
import { listEducation } from '../api/education';

jest.mock('../contexts/ProfileContext', () => ({
  useProfile: jest.fn(),
}));

jest.mock('../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('../api/profile', () => ({
  saveProfile: jest.fn(),
}));

jest.mock('../api/experiences', () => ({
  listExperiences: jest.fn().mockResolvedValue([]),
  createExperience: jest.fn(),
  updateExperience: jest.fn(),
  deleteExperience: jest.fn(),
}));

jest.mock('../api/skills', () => ({
  listSkills: jest.fn().mockResolvedValue([]),
  createSkill: jest.fn(),
  updateSkill: jest.fn(),
  deleteSkill: jest.fn(),
  reorderSkills: jest.fn(),
}));

jest.mock('../api/careerPreferences', () => ({
  getCareerPreferences: jest.fn(),
  saveCareerPreferences: jest.fn(),
}));

jest.mock('../api/education', () => ({
  listEducation: jest.fn().mockResolvedValue([]),
  createEducation: jest.fn(),
  updateEducation: jest.fn(),
  deleteEducation: jest.fn(),
  reorderEducation: jest.fn(),
}));

const mockUseProfile = useProfile as jest.Mock;
const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockSaveProfile = saveProfile as jest.Mock;
const mockListExperiences = listExperiences as jest.Mock;
const mockListSkills = listSkills as jest.Mock;
const mockGetCareerPreferences = getCareerPreferences as jest.Mock;
const mockListEducation = listEducation as jest.Mock;

const emptyContext = { profile: null, loading: false, setProfile: jest.fn() };

const fillProfileForm = () => {
  fireEvent.change(screen.getByLabelText(/about/i), {
    target: { value: 'I am preparing my profile.' },
  });
  fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Alex' } });
  fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Morgan' } });
  fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Newark' } });
  fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '5551234567' } });
};

describe('ProfilePage', () => {
  beforeEach(() => {
    mockUseProfile.mockReturnValue(emptyContext);
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockListExperiences.mockResolvedValue([]);
    mockListSkills.mockResolvedValue([]);
    mockGetCareerPreferences.mockRejectedValue(new Error('NOT_FOUND'));
    mockListEducation.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders the profile fields without account identity fields', () => {
    render(<ProfilePage />);

    expect(
      screen.getByRole('heading', { name: /complete your basic profile/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/about/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/user id/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument();
  });

  test('updates the completion bar as fields are completed', () => {
    render(<ProfilePage />);

    expect(screen.getByText(/profile completion/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

    fireEvent.change(screen.getByLabelText(/about/i), {
      target: { value: 'I am preparing my profile.' },
    });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '20');

    fireEvent.change(screen.getByLabelText(/first name/i), { target: { value: 'Alex' } });
    fireEvent.change(screen.getByLabelText(/last name/i), { target: { value: 'Morgan' } });
    fireEvent.change(screen.getByLabelText(/city/i), { target: { value: 'Newark' } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '5551234567' } });

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  test('strips non-digits from phone and shows required errors when saving an incomplete form', async () => {
    render(<ProfilePage />);

    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '555-123' } });
    expect(screen.getByLabelText(/phone/i)).toHaveValue('555123');
    expect(screen.getByText(/phone may only contain numbers/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));
    expect(await screen.findByText(/about is required/i)).toBeInTheDocument();
    expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/city is required/i)).toBeInTheDocument();
  });

  test('caps bio input at 500 characters', () => {
    render(<ProfilePage />);

    const longText = 'a'.repeat(501);
    fireEvent.change(screen.getByLabelText(/about/i), { target: { value: longText } });

    expect(screen.getByLabelText(/about/i)).toHaveValue('a'.repeat(500));
  });

  test('caps phone input at 15 digits', () => {
    render(<ProfilePage />);

    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { value: '1234567890123456' },
    });

    expect(screen.getByLabelText(/phone/i)).toHaveValue('123456789012345');
  });

  test('shows error on save when phone is fewer than 7 digits', async () => {
    render(<ProfilePage />);
    fillProfileForm();

    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    expect(await screen.findByText(/phone must be between 7 and 15 digits/i)).toBeInTheDocument();
  });

  test('shows profile view when context already has a saved profile', () => {
    mockUseProfile.mockReturnValue({
      profile: {
        user_id: '1',
        first_name: 'Alex',
        last_name: 'Morgan',
        city: 'Newark',
        phone_number: '5551234567',
        summary: 'I am preparing my profile.',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      loading: false,
      setProfile: jest.fn(),
    });

    render(<ProfilePage />);

    expect(screen.getByText('Alex Morgan')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit profile/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save profile/i })).not.toBeInTheDocument();
  });

  test('calls saveProfile with correct payload on valid form submission', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } });
    mockSaveProfile.mockResolvedValue({
      user_id: '1',
      first_name: 'Alex',
      last_name: 'Morgan',
      city: 'Newark',
      phone_number: '5551234567',
      summary: 'I am preparing my profile.',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    });

    render(<ProfilePage />);
    fillProfileForm();
    fireEvent.click(screen.getByRole('button', { name: /save profile/i }));

    await waitFor(() => {
      expect(mockSaveProfile).toHaveBeenCalledWith('test-token', {
        first_name: 'Alex',
        last_name: 'Morgan',
        city: 'Newark',
        phone_number: '5551234567',
        summary: 'I am preparing my profile.',
      });
    });
  });
});

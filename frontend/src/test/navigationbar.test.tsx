import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import NavigationBar from '../components/navigationbar';
import { supabase } from '../utils/supabaseClient';
import { logout } from '../api/logout';

jest.mock('../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('../api/logout', () => ({
  logout: jest.fn(),
}));

const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockLogout = logout as jest.Mock;

const renderNavBar = () =>
  render(
    <MemoryRouter>
      <NavigationBar />
    </MemoryRouter>
  );

describe('NavigationBar', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the brand name', () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderNavBar();
    expect(screen.getByText('JobSurvivors')).toBeInTheDocument();
  });

  it('shows Login and Sign Up links when no session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    renderNavBar();
    expect(await screen.findByRole('link', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign out/i })).not.toBeInTheDocument();
  });

  it('shows authenticated nav links when a session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    renderNavBar();
    expect(await screen.findByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });

  it('hides Login and Sign Up when authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    renderNavBar();
    await screen.findByRole('button', { name: /sign out/i });
    expect(screen.queryByRole('link', { name: /login/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /sign up/i })).not.toBeInTheDocument();
  });

  it('shows an error alert when logout fails', async () => {
    mockLogout.mockRejectedValueOnce(new Error('network error'));
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    renderNavBar();
    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});

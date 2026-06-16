import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import NavigationBar from '../components/navigationbar';
import { logout } from '../api/logout';
import { supabase } from '../utils/supabaseClient';

jest.mock('../api/logout', () => ({
  logout: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockLogout = logout as jest.Mock;

const renderNavBar = () =>
  render(
    <MemoryRouter>
      <NavigationBar />
    </MemoryRouter>
  );

describe('NavigationBar logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Sign Out button when authenticated', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    renderNavBar();
    expect(await screen.findByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('calls logout when the Sign Out button is clicked', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    renderNavBar();
    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }));
    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });
});

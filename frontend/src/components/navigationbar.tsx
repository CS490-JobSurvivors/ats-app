import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Alert, AppBar, Box, Link, Toolbar, Typography } from '@mui/material';
import { supabase } from '../utils/supabaseClient';
import { logout } from '../api/logout';

const navLinkSx = {
  fontSize: '1rem',
  fontWeight: 600,
  color: '#a8a29e',
  '&.active': { color: '#faf7f2' },
  '&:hover': { color: '#f59e0b' },
};

const NavigationBar = () => {
  const [session, setSession] = useState<boolean>(false);
  const [signoutError, setSignoutError] = useState<boolean>(false);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
      setSignoutError(false);
    } catch {
      setSignoutError(true);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session);
    });
  }, []);

  return (
    <AppBar position="static">
      <Toolbar sx={{ px: 4 }}>
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, letterSpacing: '0.05em', color: '#faf7f2' }}
        >
          JobSurvivors
        </Typography>

        {/* Centered nav links — auth only */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '100px',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          {signoutError && <Alert severity="error">Error during signing out</Alert>}
          {session && (
            <>
              <Link component={NavLink} to="/" sx={navLinkSx}>
                Dashboard
              </Link>
              <Link component={NavLink} to="/profile" sx={navLinkSx}>
                Profile
              </Link>
              <Link component={NavLink} to="/settings" sx={navLinkSx}>
                Settings
              </Link>
            </>
          )}
        </Box>

        {/* Right side */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
          {!session ? (
            <>
              <Link component={NavLink} to="/login" sx={navLinkSx}>
                Login
              </Link>
              <Link component={NavLink} to="/signup" sx={navLinkSx}>
                Sign Up
              </Link>
            </>
          ) : (
            <Link
              component="button"
              onClick={handleLogout}
              sx={{ ...navLinkSx, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Sign Out
            </Link>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavigationBar;

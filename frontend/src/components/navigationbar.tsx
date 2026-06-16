import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Alert, AppBar, Box, Link, Toolbar, Typography } from '@mui/material';
import { supabase } from '../utils/supabaseClient';
import { logout } from '../api/logout';

const navLinkSx = {
  fontSize: '1.75rem',
  fontWeight: 700,
  textDecoration: 'underline',
  color: '#937ab8',
  '&.active': { color: '#c9bddb' },
  '&:hover': { color: '#ae9cc9' },
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
    <AppBar position="static" sx={{ backgroundColor: '#302442', boxShadow: 'none' }}>
      <Toolbar sx={{ px: 4 }}>
        <Typography
          variant="h5"
          sx={{ fontWeight: 700, color: '#c9bddb', letterSpacing: '0.05em' }}
        >
          ATS
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
              <Link component={NavLink} to="/" underline="always" sx={navLinkSx}>
                Dashboard
              </Link>
              <Link component={NavLink} to="/profile" underline="always" sx={navLinkSx}>
                Profile
              </Link>
              <Link component={NavLink} to="/settings" underline="always" sx={navLinkSx}>
                Settings
              </Link>
            </>
          )}
        </Box>

        {/* Right side */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
          {!session ? (
            <>
              <Link component={NavLink} to="/login" underline="always" sx={navLinkSx}>
                Login
              </Link>
              <Link component={NavLink} to="/signup" underline="always" sx={navLinkSx}>
                Sign Up
              </Link>
            </>
          ) : (
            <Link
              component="button"
              onClick={handleLogout}
              underline="always"
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

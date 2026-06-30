import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Alert, AppBar, Box, Link, Toolbar, Typography, useTheme } from '@mui/material';
import { supabase } from '../utils/supabaseClient';
import { logout } from '../api/logout';

const NavigationBar = () => {
  const theme = useTheme();
  const [session, setSession] = useState<boolean>(false);
  const [signoutError, setSignoutError] = useState<boolean>(false);

  const navLinkSx = {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#a8a29e', // no exact theme token; text.secondary (#78716c) is darker, may hurt readability on dark AppBar
    '&.active': { color: theme.palette.background.default },
    '&:hover': { color: theme.palette.primary.light },
  };

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <img
            src="/logo.png"
            alt="Job Survivors logo"
            style={{ height: 28, width: 'auto', display: 'block' }}
          />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: theme.palette.background.default,
            }}
          >
            Job Survivors
          </Typography>
        </Box>
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

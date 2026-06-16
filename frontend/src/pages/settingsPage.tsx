import { useEffect, useState } from 'react';
import { Container, Typography, Box, Divider, Paper } from '@mui/material';
import { supabase } from '../utils/supabaseClient';
import LogoutButton from '../components/LogoutButton';
import PasswordReset from '../components/passwordReset';

const SettingsPage = () => {
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email ?? '');
    });
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      {/* Account Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Account
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1">Email</Typography>
          <Typography variant="body2" color="text.secondary">
            {userEmail || 'Loading...'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body1">Password</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            ••••••••
          </Typography>
          <PasswordReset email={userEmail} />
        </Box>
      </Paper>

      {/* Preferences */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Preferences
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          No preferences configured yet.
        </Typography>
      </Paper>

      <LogoutButton />
    </Container>
  );
};

export default SettingsPage;

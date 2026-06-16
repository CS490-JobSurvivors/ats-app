import { Container, Typography, Box, Divider, Paper } from '@mui/material';
import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const SettingsPage = () => {
  const [email, setEmail] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.log(error.message);
        return;
      }
      if (data.user?.email) {
        setEmail(data.user.email);
      }
    };
    fetchUser();
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Account
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1">Email</Typography>
          <Typography variant="body2" color="text.secondary">
            {email || 'Loading...'}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body1">Password</Typography>
          <Typography variant="body2" color="text.secondary">
            ••••••••
          </Typography>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Preferences
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          No preferences configured yet.
        </Typography>
      </Paper>
    </Container>
  );
};

export default SettingsPage;

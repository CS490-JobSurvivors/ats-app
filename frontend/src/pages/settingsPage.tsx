import { useEffect, useState } from 'react';
import { Alert, Box, Button, Container, Divider, Paper, Typography } from '@mui/material';
import { supabase } from '../utils/supabaseClient';

const SettingsPage = () => {
  const [email, setEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        return;
      }
      if (data.user?.email) {
        setEmail(data.user.email);
      }
    };
    fetchUser();
  }, []);

  const handleResetPassword = async () => {
    if (!email) return;
    setResetStatus('idle');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetStatus(error ? 'error' : 'sent');
  };

  return (
    <Container maxWidth="md" sx={{ px: 3, py: 5 }}>
      <Typography variant="h4" fontWeight={700} mb={0.5}>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Manage your account settings.
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>
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
          <Typography variant="body1" mb={1}>
            Password
          </Typography>
          <Button variant="outlined" size="small" onClick={handleResetPassword}>
            Send Reset Link
          </Button>
          {resetStatus === 'sent' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Reset link sent to {email}. Check your inbox.
            </Typography>
          )}
          {resetStatus === 'error' && (
            <Alert severity="error" sx={{ mt: 1.5 }}>
              Failed to send reset link. Please try again.
            </Alert>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default SettingsPage;

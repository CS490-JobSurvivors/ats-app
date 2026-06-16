import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

const parseHashError = (): string | null => {
  const params = new URLSearchParams(window.location.hash.substring(1));
  return params.get('error')
    ? (params.get('error_description') ?? 'This reset link is invalid or has expired.')
    : null;
};

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [hashError] = useState<string | null>(parseHashError);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate('/'), 2000);
  };

  if (hashError) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Container maxWidth="sm">
          <Paper elevation={3} sx={{ p: 5, borderRadius: 3 }}>
            <Typography variant="h5" fontWeight={700} mb={2}>
              Invalid reset link
            </Typography>
            <Alert severity="error" sx={{ mb: 2 }}>
              {hashError}
            </Alert>
            <Typography variant="body2" color="text.secondary">
              <Link href="/settings">Request a new link</Link>
            </Typography>
          </Paper>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 64px)',
      }}
    >
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 5, borderRadius: 3 }}>
          <Typography variant="h5" fontWeight={700} mb={3}>
            Set new password
          </Typography>
          <Stack spacing={2}>
            {success && <Alert severity="success">Password updated! Redirecting…</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
            {!success && (
              <>
                <TextField
                  label="New Password"
                  type="password"
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <TextField
                  label="Confirm Password"
                  type="password"
                  fullWidth
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
                <Button variant="contained" fullWidth disabled={submitting} onClick={handleSubmit}>
                  {submitting ? 'Updating…' : 'Update Password'}
                </Button>
              </>
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default ResetPasswordPage;

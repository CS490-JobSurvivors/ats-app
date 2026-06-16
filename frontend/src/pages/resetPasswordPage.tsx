import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Container, Link, Stack, TextField, Typography } from '@mui/material';
import { supabase } from '../utils/supabaseClient';

const parseHashError = () => {
  const params = new URLSearchParams(window.location.hash.substring(1));
  return params.get('error')
    ? (params.get('error_description') ?? 'This reset link is invalid or has expired.')
    : null;
};

const ResetPasswordPage = () => {
  const [hashError] = useState<string | null>(parseHashError);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    const next: Record<string, string> = {};
    if (password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (password !== confirm) next.confirm = 'Passwords do not match.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setSubmitError('');

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate('/'), 2000);
  };

  return (
    <Container maxWidth="sm" sx={{ px: 3, py: 5 }}>
      <Typography variant="h4" fontWeight={700} mb={0.5}>
        Set New Password
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Enter your new password below.
      </Typography>

      {hashError ? (
        <Alert severity="error">
          {hashError}{' '}
          <Link href="/settings" underline="always">
            Request a new link
          </Link>
        </Alert>
      ) : success ? (
        <Alert severity="success">Password updated. Redirecting to dashboard…</Alert>
      ) : (
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <TextField
              label="New Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!errors.password}
              helperText={errors.password}
            />
            <TextField
              label="Confirm Password"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={!!errors.confirm}
              helperText={errors.confirm}
            />
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Updating…' : 'Update Password'}
            </Button>
          </Stack>
        </form>
      )}
    </Container>
  );
};

export default ResetPasswordPage;

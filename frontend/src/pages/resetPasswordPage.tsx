import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
          <Typography variant="h4" align="center" gutterBottom>
            Set New Password
          </Typography>

          {hashError ? (
            <Stack spacing={2}>
              <Alert severity="error">
                {hashError}{' '}
                <Link href="/settings" underline="always">
                  Request a new link
                </Link>
              </Alert>
              <Typography variant="body2" align="center">
                <Link href="/login">Back to Login</Link>
              </Typography>
            </Stack>
          ) : success ? (
            <Alert severity="success">Password updated. Redirecting to dashboard…</Alert>
          ) : (
            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                {submitError && <Alert severity="error">{submitError}</Alert>}
                <TextField
                  required
                  fullWidth
                  label="New Password"
                  placeholder="Enter new password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={!!errors.password}
                  helperText={errors.password}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((prev) => !prev)}
                          edge="end"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  required
                  fullWidth
                  label="Confirm Password"
                  placeholder="Retype new password"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  error={!!errors.confirm}
                  helperText={errors.confirm}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirm((prev) => !prev)}
                          edge="end"
                          aria-label={showConfirm ? 'Hide password' : 'Show password'}
                        >
                          {showConfirm ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button type="submit" fullWidth variant="contained" disabled={loading}>
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Update Password'}
                </Button>
                <Typography variant="body2" align="center">
                  <Link href="/login">Back to Login</Link>
                </Typography>
              </Stack>
            </form>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default ResetPasswordPage;

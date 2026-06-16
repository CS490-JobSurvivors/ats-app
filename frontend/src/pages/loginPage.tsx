import {
  Button,
  TextField,
  Container,
  Stack,
  Alert,
  Typography,
  Link,
  Box,
  Paper,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { loginApi } from '../api/login';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
  const checkSession = async () => {
    try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          window.location.href = '/';
        }
      } catch {
        // ignore session check failures; user just sees the login/signup form
      }
    };
    checkSession();
  }, []);

  const handleLogin = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMessage('Incorrect Email or Password. Try again.');
      setIsSubmitting(false);
      return;
    }
    if (!data.session) {
      setErrorMessage('Verify Email');
      setIsSubmitting(false);
      return;
    }
    const userData = await loginApi(data.session.access_token);
    window.location.href = '/';
    return userData;
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
            Welcome Back
          </Typography>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
            <Stack spacing={2}>
              {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
              <TextField
                required
                fullWidth
                type="email"
                placeholder="Enter Email"
                onChange={(e) => setEmail(e.target.value.trim())}
                label="email"
              />
              <TextField
                required
                fullWidth
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter Password"
                onChange={(e) => setPassword(e.target.value)}
                label="password"
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
              <Button type="submit" fullWidth variant="contained" disabled={isSubmitting}>
                {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Login'}
              </Button>
              <Typography variant="body2" align="center">
                Don't have an account? <Link href="/signup">Register</Link>
              </Typography>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;

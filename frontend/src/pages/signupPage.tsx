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
import { signupApi } from '../api/signup';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmedPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      setErrorMessage('Passwords Dont Match');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }
    if (!data.session) {
      setErrorMessage('Verify Account');
      setIsSubmitting(false);
      return;
    }
    const userData = await signupApi(data.session?.access_token);
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
            Create Account
          </Typography>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSignup();
            }}
          >
            <Stack spacing={2}>
              {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
              <TextField
                required
                fullWidth
                type="email"
                placeholder="Enter Email"
                label="email"
                onChange={(e) => {
                  setEmail(e.target.value.trim());
                }}
              />
              <TextField
                required
                fullWidth
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter Password"
                label="password"
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
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
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Retype Password"
                label="Confirm Password"
                onChange={(e) => {
                  setConfirmedPassword(e.target.value);
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        edge="end"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button type="submit" fullWidth variant="contained" disabled={isSubmitting}>
                {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Sign up'}
              </Button>
              <Typography variant="body2" align="center">
                Already have an account? <Link href="/login">Login</Link>
              </Typography>
            </Stack>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default SignupPage;

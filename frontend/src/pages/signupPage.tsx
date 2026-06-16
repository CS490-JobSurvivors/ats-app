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
} from '@mui/material';
import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { signupApi } from '../api/signup';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmedPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignup = async () => {
    if (password !== confirmPassword) {
      setErrorMessage('Passwords Dont Match');
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    if (!data.session) {
      setErrorMessage('Verify Account');
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
        minHeight: '100vh',
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
                placeholder="Enter Email"
                label="email"
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />
              <TextField
                required
                fullWidth
                placeholder="Enter Password"
                label="password"
                type="password"
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
              />
              <TextField
                required
                fullWidth
                placeholder="Retype Password"
                label="passwordConfirmation"
                type="password"
                onChange={(e) => {
                  setConfirmedPassword(e.target.value);
                }}
              />
              <Button type="submit" fullWidth variant="contained">
                Sign up
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

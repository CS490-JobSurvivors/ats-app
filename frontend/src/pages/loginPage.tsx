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
import { loginApi } from '../api/login';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErrorMessage('Incorrect Email or Password. Try again.');
      return;
    }
    if (!data.session) {
      setErrorMessage('Verify Email');
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
        minHeight: '100vh',
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
                placeholder="Enter Email"
                onChange={(e) => setEmail(e.target.value)}
                label="email"
              />
              <TextField
                required
                fullWidth
                placeholder="Enter Password"
                onChange={(e) => setPassword(e.target.value)}
                label="password"
                type="password"
              />
              <Button type="submit" fullWidth variant="contained">
                Login
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

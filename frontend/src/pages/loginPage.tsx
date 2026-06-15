import { Button, TextField, Container, Stack, Alert, Typography, Link } from '@mui/material';
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
    <Container maxWidth="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleLogin();
        }}
      >
        <Stack>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          <TextField
            required
            placeholder="Enter Email"
            onChange={(e) => {
              setEmail(e.target.value);
            }}
            label="email"
          />
          <TextField
            required
            placeholder="Enter Password"
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            label="password"
            type="password"
          />
          <Button type="submit" onClick={() => {}}>
            Login
          </Button>
          <Typography variant="body2" align="center">
            Don't have an account? <Link href="/signup">Register</Link>
          </Typography>
        </Stack>
      </form>
    </Container>
  );
};

export default LoginPage;

import { Button, TextField, Container, Stack, Alert, Typography, Box } from '@mui/material';
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
    <Container maxWidth="sm">
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700} mb={0.5}>
          Create an account
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Sign up to start tracking your applications.
        </Typography>
      </Box>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSignup();
        }}
      >
        <Stack>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          <TextField
            required
            placeholder="Enter Email"
            label="email"
            onChange={(e) => {
              setEmail(e.target.value);
            }}
          />
          <TextField
            required
            placeholder="Enter Password"
            label="password"
            type="password"
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
          <TextField
            required
            placeholder="Retype Password"
            label="passwordConfirmation"
            type="password"
            onChange={(e) => {
              setConfirmedPassword(e.target.value);
            }}
          />
          <Button type="submit" variant="contained" fullWidth sx={{ py: 1.5 }}>
            Sign up
          </Button>
        </Stack>
      </form>
    </Container>
  );
};

export default SignupPage;

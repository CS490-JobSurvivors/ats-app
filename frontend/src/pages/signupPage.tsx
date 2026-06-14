import { Button, TextField, Container, Stack } from '@mui/material';
import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { signupApi } from '../api/signup';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmedPassword] = useState('');

  const handleSignup = async () => {
    if (password != confirmPassword) {
      console.log('Passwords Dont Match');
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.log(error.message);
      return;
    }

    if (!data.session) {
      return;
    }

    const userData = await signupApi(data.session?.access_token);
    return userData;
  };

  return (
    <Container maxWidth="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSignup();
        }}
      >
        <Stack>
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
          <Button type="submit">Sign up</Button>
        </Stack>
      </form>
    </Container>
  );
};

export default SignupPage;

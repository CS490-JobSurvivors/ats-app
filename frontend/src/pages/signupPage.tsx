import { Button, TextField, Container, Stack } from '@mui/material';
import { useState } from 'react';

const SignupPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmedPassword] = useState('');

  const handleSignup = () => {
    if (password != confirmPassword) {
      console.log('Passwords Dont Match');
      return;
    }
    console.log(`${username} -> ${email} -> ${password}`);
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
            placeholder="Enter Username"
            label="username"
            onChange={(e) => {
              setUsername(e.target.value);
            }}
          />
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

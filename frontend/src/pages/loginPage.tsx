import { Button, TextField, Container, Stack } from '@mui/material';
import { useState } from 'react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    console.log(`${email} -> ${password}`);
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
        </Stack>
      </form>
    </Container>
  );
};

export default LoginPage;

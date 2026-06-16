import { useState } from 'react';
import { Alert, Button, TextField } from '@mui/material';
import { supabase } from '../utils/supabaseClient';

interface PasswordResetProps {
  email?: string;
}

const PasswordReset = ({ email }: PasswordResetProps) => {
  const [inputEmail, setInputEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleReset = async () => {
    const target = email || inputEmail;
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setMessage('Something went wrong. Try again.');
    } else {
      setMessage('Check your email for a reset link.');
    }
  };

  return (
    <div>
      {!email && (
        <TextField
          label="Email"
          type="email"
          value={inputEmail}
          onChange={(e) => setInputEmail(e.target.value)}
          fullWidth
          margin="normal"
        />
      )}
      <Button variant="outlined" onClick={handleReset}>
        Send Reset Link
      </Button>
      {message && <Alert severity="info" sx={{ mt: 1 }}>{message}</Alert>}
    </div>
  );
};

export default PasswordReset;

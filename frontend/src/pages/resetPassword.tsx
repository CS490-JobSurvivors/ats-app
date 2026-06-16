// Password Reset Page

// This is the Password Reset Page component.
import { Button, TextField, Container, Stack, Alert, Typography, Link } from '@mui/material';
import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { loginApi } from '../api/login';

// Password reset page is here, user was directed here by their supabase auth email
const ResetPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);
    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    };

    const handleResetPassword = async () => {
        if (!email) {
            setAlert({ severity: 'error', message: 'Please enter your email.' });
            return;
        }

        setLoading(true);
        setAlert(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) {
                throw error;
            }
            setAlert({ severity: 'success', message: 'Password reset email sent.' });
        } catch (error) {
            setAlert({ severity: 'error', message: 'Failed to send password reset email.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Stack spacing={2} mt={4}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Reset Password
                </Typography>
                <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    fullWidth
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleResetPassword}
                    disabled={loading}
                >
                    {loading ? 'Sending...' : 'Reset Password'}
                </Button>
                {alert && (
                    <Alert severity={alert.severity} onClose={() => setAlert(null)}>
                        {alert.message}
                    </Alert>
                )}
            </Stack>
        </Container>
    );
};

export default ResetPasswordPage;
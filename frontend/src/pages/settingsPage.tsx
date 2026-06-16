import { Container, Typography, Box, Divider, Paper } from '@mui/material';

const SettingsPage = () => {
  return (
    <Container maxWidth="md" sx={{ px: 3, py: 5 }}>
      <Typography variant="h4" fontWeight={700} mb={0.5}>
        Settings
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Manage your account and preferences.
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>
          Account
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1">Email</Typography>
          <Typography variant="body2" color="text.secondary">
            user@example.com
          </Typography>
        </Box>
        <Box>
          <Typography variant="body1">Password</Typography>
          <Typography variant="body2" color="text.secondary">
            ••••••••
          </Typography>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>
          Preferences
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          No preferences configured yet.
        </Typography>
      </Paper>
    </Container>
  );
};

export default SettingsPage;

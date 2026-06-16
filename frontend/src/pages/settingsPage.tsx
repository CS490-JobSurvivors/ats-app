import { Container, Typography, Box, Divider, Paper } from '@mui/material';

const SettingsPage = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      {/* Account Settings */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
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

      {/* Preferences */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
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

import { Container, Typography, Box, Paper } from '@mui/material';

const DashboardPage = () => {
  return (
    <Container maxWidth="lg" sx={{ px: 3, py: 5 }}>
      <Typography variant="h4" fontWeight={700} mb={0.5}>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Track your applications and activity at a glance.
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center', flex: 1 }}>
          <Typography variant="h6" fontWeight={600} mb={1}>
            Total Applications
          </Typography>
          <Typography variant="h3" fontWeight={700}>
            0
          </Typography>
        </Paper>
        <Paper sx={{ p: 3, textAlign: 'center', flex: 1 }}>
          <Typography variant="h6" fontWeight={600} mb={1}>
            Interviews
          </Typography>
          <Typography variant="h3" fontWeight={700}>
            0
          </Typography>
        </Paper>
        <Paper sx={{ p: 3, textAlign: 'center', flex: 1 }}>
          <Typography variant="h6" fontWeight={600} mb={1}>
            Offers
          </Typography>
          <Typography variant="h3" fontWeight={700}>
            0
          </Typography>
        </Paper>
      </Box>

      <Typography variant="h6" fontWeight={600} mb={2}>
        Recent Applications
      </Typography>
      <Box
        sx={{
          p: 3,
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          textAlign: 'center',
        }}
      >
        <Typography color="text.secondary">No applications yet.</Typography>
      </Box>
    </Container>
  );
};

export default DashboardPage;

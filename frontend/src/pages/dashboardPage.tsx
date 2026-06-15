import { Container, Typography, Box, Paper } from '@mui/material';
import { Link } from 'react-router-dom';

const DashboardPage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {/* Header with Settings link */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">My Dashboard</Typography>
        <Link to="/settings">Settings</Link>
      </Box>

      {/* Stats Row */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center', flex: 1 }}>
          <Typography variant="h6">Total Applications</Typography>
          <Typography variant="h3">0</Typography>
        </Paper>
        <Paper sx={{ p: 3, textAlign: 'center', flex: 1 }}>
          <Typography variant="h6">Interviews</Typography>
          <Typography variant="h3">0</Typography>
        </Paper>
        <Paper sx={{ p: 3, textAlign: 'center', flex: 1 }}>
          <Typography variant="h6">Offers</Typography>
          <Typography variant="h3">0</Typography>
        </Paper>
      </Box>

      {/* Job Board Section */}
      <Typography variant="h5" gutterBottom>
        Recent Applications
      </Typography>
      <Box sx={{ p: 3, border: '1px dashed grey', borderRadius: 2, textAlign: 'center' }}>
        <Typography color="text.secondary">No applications yet.</Typography>
      </Box>
    </Container>
  );
};

export default DashboardPage;
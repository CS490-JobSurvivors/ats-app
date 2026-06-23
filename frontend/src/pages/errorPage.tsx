import HomeIcon from '@mui/icons-material/Home';
import { Box, Button, Container, Paper, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const ErrorPage = () => {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 4, md: 6 },
          border: '1px solid',
          borderColor: 'divider',
          textAlign: 'center',
        }}
      >
        <Typography variant="h3" fontWeight={700} mb={2}>
          Page not found
        </Typography>
        <Typography color="text.secondary" mb={4}>
          The page you are looking for does not exist or may have been moved.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button component={RouterLink} to="/" variant="contained" startIcon={<HomeIcon />}>
            Dashboard
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ErrorPage;

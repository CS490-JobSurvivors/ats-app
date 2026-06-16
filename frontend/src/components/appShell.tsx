import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import NavigationBar from './navigationbar';

const AppShell = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      bgcolor: 'background.default',
    }}
  >
    <NavigationBar />
    <Box component="main" sx={{ flex: 1 }}>
      <Outlet />
    </Box>
  </Box>
);

export default AppShell;

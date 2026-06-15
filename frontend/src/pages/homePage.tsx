import { Typography, Button } from '@mui/material';
import { logout } from '../api/logout';
import NavigationBar from '../components/navigationbar';

const handleLogout = async () => {
  await logout();
  window.location.href = '/login';
  //TODO: include a visible error message if the logout fails once we have dashboard/other pages
};

const HomePage = () => {
  return (
    <div>
      <NavigationBar />
      <Typography variant="h1">Welcome to the Sample Dashboard</Typography>
      <Button onClick={handleLogout} sx={{ textTransform: 'none' }}>
        Log Out
      </Button>
    </div>
  );
};
export default HomePage;
//Logout placed here for now, should be moved to the navigation bar in the future

import { Button } from '@mui/material';
import { logout } from '../api/logout';

const handleLogout = async () => {
  await logout();
  window.location.href = '/login';
  //TODO: include a visible error message if the logout fails once we have dashboard/other pages
};

const HomePage = () => {
  return (
    <div>
      <h1>Welcome to the Home Page</h1>
      <Button onClick={handleLogout}>Log Out</Button>
    </div>
  );
};
export default HomePage;

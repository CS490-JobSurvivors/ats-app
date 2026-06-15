import { Link, Typography } from '@mui/material';
import React from 'react';
import NavigationBar from '../components/navigationbar';

const HomePage = () => {
  return (
    <div>
      <NavigationBar />
      <Typography>Home Page</Typography>
      <Link href="/login">Login</Link>
    </div>
  );
};

export default HomePage;

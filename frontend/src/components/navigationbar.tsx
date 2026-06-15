import React from 'react';
import { Link } from '@mui/material';

const NavigationBar = () => {
  return (
    <div>
      <Link href="/">Home Page</Link>
      <br />
      <Link href="/login">Login</Link>
      <br />
      <Link href="/signup">Sign Up</Link>
      <br />
    </div>
  );
};
export default NavigationBar;

import { Button } from '@mui/material';
import { supabase } from '../utils/supabaseClient';

const LogoutButton = () => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <Button variant="outlined" color="error" onClick={handleLogout}>
      Log Out
    </Button>
  );
};

export default LogoutButton;

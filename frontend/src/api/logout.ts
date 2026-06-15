import { supabase } from '../utils/supabaseClient';

export const logout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
  //TODO: add a visible error message if the logout fails
};

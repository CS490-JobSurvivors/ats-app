const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export interface ProfileRecord {
  user_id: string;
  first_name: string;
  last_name: string;
  city: string;
  phone_number: string;
  summary: string;
  created_at: string;
  updated_at: string;
}

export interface ProfilePayload {
  first_name: string;
  last_name: string;
  city: string;
  phone_number: string;
  summary: string;
}

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
});

export const getProfile = async (accessToken: string): Promise<ProfileRecord | null> => {
  const response = await fetch(`${API_URL}/profile`, {
    headers: authHeaders(accessToken),
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Failed to load profile.');

  return response.json();
};

export const saveProfile = async (
  accessToken: string,
  data: ProfilePayload
): Promise<ProfileRecord> => {
  const response = await fetch(`${API_URL}/profile`, {
    method: 'PUT',
    headers: authHeaders(accessToken),
    body: JSON.stringify(data),
  });

  if (!response.ok) throw new Error('Failed to save profile.');

  return response.json();
};

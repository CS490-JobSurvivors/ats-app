const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export const loginApi = async (data: string) => {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${data}`,
    },
  });

  return await response.json();
};

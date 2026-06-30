const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export interface CareerPreferenceRecord {
  user_id: string;
  target_roles: string[] | null;
  location_preference: string | null;
  work_mode: string | null;
  salary_minimum: number | null;
}

export interface CareerPreferencePayload {
  target_roles?: string[] | null;
  location_preference?: string | null;
  work_mode?: string | null;
  salary_minimum?: number | null;
}

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export const getCareerPreferences = async (
  accessToken: string
): Promise<CareerPreferenceRecord> => {
  const response = await fetch(`${API_URL}/career-preferences`, {
    headers: authHeaders(accessToken),
  });
  if (response.status === 404) throw new Error('NOT_FOUND');
  if (!response.ok) throw new Error('Unable to load career preferences.');
  return response.json();
};

export const saveCareerPreferences = async (
  accessToken: string,
  payload: CareerPreferencePayload
): Promise<CareerPreferenceRecord> => {
  const response = await fetch(`${API_URL}/career-preferences`, {
    method: 'PUT',
    headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Unable to save career preferences.');
  return response.json();
};

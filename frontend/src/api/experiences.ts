const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export interface ExperienceRecord {
  experience_id: string;
  experience_user_id: string;
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
  experience_description: string | null;
  is_current: boolean;
}

export interface ExperiencePayload {
  company: string;
  title: string;
  start_date: string;
  end_date?: string | null;
  experience_description?: string | null;
  is_current: boolean;
}

export type ExperienceUpdatePayload = Partial<ExperiencePayload>;

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export const listExperiences = async (accessToken: string): Promise<ExperienceRecord[]> => {
  const response = await fetch(`${API_URL}/experiences`, {
    headers: authHeaders(accessToken),
  });
  if (!response.ok) throw new Error('Unable to load experiences.');
  return response.json();
};

export const createExperience = async (
  accessToken: string,
  payload: ExperiencePayload
): Promise<ExperienceRecord> => {
  const response = await fetch(`${API_URL}/experiences`, {
    method: 'POST',
    headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Unable to create experience.');
  return response.json();
};

export const updateExperience = async (
  accessToken: string,
  experienceId: string,
  payload: ExperienceUpdatePayload
): Promise<ExperienceRecord> => {
  const response = await fetch(`${API_URL}/experiences/${experienceId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Unable to update experience.');
  return response.json();
};

export const deleteExperience = async (
  accessToken: string,
  experienceId: string
): Promise<void> => {
  const response = await fetch(`${API_URL}/experiences/${experienceId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
  if (!response.ok) throw new Error('Unable to delete experience.');
};

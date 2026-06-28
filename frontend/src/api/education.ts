const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export interface EducationRecord {
  education_id: string;
  education_user_id: string;
  institution_name: string;
  degree: string;
  major: string;
  start_date: string;
  end_date: string | null;
  GPA: number | null;
  is_current: boolean;
  position_number: number;
}

export interface EducationPayload {
  institution_name: string;
  degree: string;
  major: string;
  start_date: string;
  end_date?: string | null;
  GPA?: number | null;
  is_current: boolean;
}

export type EducationUpdatePayload = Partial<EducationPayload>;

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export const listEducation = async (accessToken: string): Promise<EducationRecord[]> => {
  const response = await fetch(`${API_URL}/education`, {
    headers: authHeaders(accessToken),
  });
  if (!response.ok) throw new Error('Unable to load education.');
  return response.json();
};

export const createEducation = async (
  accessToken: string,
  payload: EducationPayload
): Promise<EducationRecord> => {
  const response = await fetch(`${API_URL}/education`, {
    method: 'POST',
    headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Unable to create education record.');
  return response.json();
};

export const updateEducation = async (
  accessToken: string,
  educationId: string,
  payload: EducationUpdatePayload
): Promise<EducationRecord> => {
  const response = await fetch(`${API_URL}/education/${educationId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Unable to update education record.');
  return response.json();
};

export const deleteEducation = async (accessToken: string, educationId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/education/${educationId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
  if (!response.ok) throw new Error('Unable to delete education record.');
};

export const reorderEducation = async (
  accessToken: string,
  entries: Array<{ education_id: string; position_number: number }>
): Promise<void> => {
  const response = await fetch(`${API_URL}/education/reorder`, {
    method: 'PATCH',
    headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify(entries),
  });
  if (!response.ok) throw new Error('Unable to reorder education records.');
};

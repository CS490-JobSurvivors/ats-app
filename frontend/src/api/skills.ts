const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export interface SkillRecord {
  skill_id: string;
  skill_user_id: string;
  skill_name: string;
  category: string | null;
  proficiency: string | null;
  position_number: number;
}

export interface SkillPayload {
  skill_name: string;
  category?: string | null;
  proficiency?: string | null;
}

export type SkillUpdatePayload = Partial<SkillPayload>;

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export const listSkills = async (accessToken: string): Promise<SkillRecord[]> => {
  const response = await fetch(`${API_URL}/skills`, {
    headers: authHeaders(accessToken),
  });
  if (!response.ok) throw new Error('Unable to load skills.');
  return response.json();
};

export const createSkill = async (
  accessToken: string,
  payload: SkillPayload
): Promise<SkillRecord> => {
  const response = await fetch(`${API_URL}/skills`, {
    method: 'POST',
    headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (response.status === 409) throw new Error('A skill with this name already exists.');
  if (!response.ok) throw new Error('Unable to create skill.');
  return response.json();
};

export const updateSkill = async (
  accessToken: string,
  skillId: string,
  payload: SkillUpdatePayload
): Promise<SkillRecord> => {
  const response = await fetch(`${API_URL}/skills/${skillId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (response.status === 409) throw new Error('A skill with this name already exists.');
  if (!response.ok) throw new Error('Unable to update skill.');
  return response.json();
};

export const deleteSkill = async (accessToken: string, skillId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/skills/${skillId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
  if (!response.ok) throw new Error('Unable to delete skill.');
};

export const reorderSkills = async (
  accessToken: string,
  entries: Array<{ skill_id: string; position_number: number }>
): Promise<void> => {
  const response = await fetch(`${API_URL}/skills/reorder`, {
    method: 'PATCH',
    headers: { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
    body: JSON.stringify(entries),
  });
  if (!response.ok) throw new Error('Unable to reorder skills.');
};

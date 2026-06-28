const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export const generateResume = async (
  accessToken: string,
  jobId: string
): Promise<{ resume: string }> => {
  const response = await fetch(`${API_URL}/resume/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ job_id: jobId }),
  });
  if (!response.ok) throw new Error('Failed to generate resume. Please try again.');
  return response.json();
};

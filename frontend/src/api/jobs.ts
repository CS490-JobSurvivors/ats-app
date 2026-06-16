const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface JobRecord {
  job_id: string;
  company_name: string;
  job_title: string;
  job_description: string;
  application_link?: string | null;
  job_poster_id: string;
  updated_at: string;
  created_at: string;
}

export interface JobPayload {
  company_name: string;
  job_title: string;
  job_description: string;
  application_link?: string | null;
}

const authHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export const listJobs = async (accessToken: string): Promise<JobRecord[]> => {
  const response = await fetch(`${API_URL}/jobs`, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('Unable to load jobs.');
  }

  return await response.json();
};

export const createJob = async (accessToken: string, job: JobPayload): Promise<JobRecord> => {
  const response = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(job),
  });

  if (!response.ok) {
    throw new Error('Unable to save job.');
  }

  return await response.json();
};

export const updateJob = async (
  accessToken: string,
  jobId: string,
  job: JobPayload
): Promise<JobRecord> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}`, {
    method: 'PATCH',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(job),
  });

  if (!response.ok) {
    throw new Error('Unable to update job.');
  }

  return await response.json();
};

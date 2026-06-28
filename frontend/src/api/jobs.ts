const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export type JobStage = 'Interested' | 'Applied' | 'Interview' | 'Offer' | 'Rejected' | 'Archived';

export interface JobRecord {
  job_id: string;
  company_name: string;
  job_title: string;
  job_description: string;
  application_link?: string | null;
  job_location?: string | null;
  deadline?: string | null;
  recruiter_notes?: string | null;
  job_stage: JobStage;
  job_poster_id: string;
  updated_at: string;
  created_at: string;
}

export interface JobPayload {
  company_name: string;
  job_title: string;
  job_description: string;
  application_link?: string | null;
  job_location?: string | null;
  deadline?: string | null;
  recruiter_notes?: string | null;
  job_stage?: JobStage;
}

export type JobUpdatePayload = Partial<JobPayload>;
export type JobActivityEventType =
  | 'applied'
  | 'follow_up'
  | 'interview'
  | 'outcome'
  | 'stage_change';

export interface JobActivityEvent {
  event_id: string;
  event_type: JobActivityEventType;
  title: string;
  description?: string | null;
  occurred_at: string;
  can_delete?: boolean;
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

export const deleteJob = async (accessToken: string, jobId: string): Promise<void> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
  if (!response.ok) {
    throw new Error('Unable to delete job.');
  }
};

export const updateJob = async (
  accessToken: string,
  jobId: string,
  job: JobUpdatePayload
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

export const listJobActivity = async (
  accessToken: string,
  jobId: string
): Promise<JobActivityEvent[]> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/activity`, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('Unable to load job activity.');
  }

  return await response.json();
};

export const deleteJobStageHistory = async (
  accessToken: string,
  jobId: string,
  jobHistoryId: string
): Promise<void> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/stage-history/${jobHistoryId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('Unable to delete stage history.');
  }
};

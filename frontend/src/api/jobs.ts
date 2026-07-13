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
  outcome_notes?: string | null;
  company_research_notes?: string | null;
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
  outcome_notes?: string | null;
  company_research_notes?: string | null;
  job_stage?: JobStage;
}

export type JobUpdatePayload = Partial<JobPayload>;

export type StageCounts = Record<JobStage, number>;

export interface JobMetrics {
  total_applications: number;
  awaiting_response: number;
  responded: number;
  stage_counts: StageCounts;
}

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

export interface InterviewRecord {
  interview_id: string;
  job_id: string;
  user_id: string;
  round_type: string;
  scheduled_at_date: string;
  scheduled_at_time: string;
  interview_notes?: string | null;
  prep_notes?: string | null;
}

export interface InterviewPayload {
  round_type: string;
  scheduled_at_date: string;
  scheduled_at_time: string;
  interview_notes?: string | null;
  prep_notes?: string | null;
}

export type InterviewUpdatePayload = Partial<InterviewPayload>;

export interface FollowUpRecord {
  followup_id: string;
  job_id: string;
  user_id: string;
  due_date: string;
  notes?: string | null;
  is_completed: boolean;
  created_at?: string | null;
}

export interface FollowUpPayload {
  due_date: string;
  notes?: string | null;
  is_completed?: boolean;
}

export type FollowUpUpdatePayload = Partial<FollowUpPayload>;

export type DocType = 'resume' | 'cover_letter';
export type DocStatus = 'active' | 'archived' | 'draft';

export interface DocumentRecord {
  document_id: string;
  user_id: string;
  job_id: string | null;
  doc_type: DocType | null;
  doc_title: string;
  content: string | null;
  file_path: string | null;
  doc_version: number;
  status: DocStatus;
  tags: string[];
  updated_at: string | null;
  created_at: string;
}

export interface DocumentPayload {
  doc_type: DocType;
  doc_title: string;
  content?: string | null;
  status?: DocStatus;
  tags?: string[];
}

export interface DocumentUpdatePayload {
  doc_title?: string;
  status?: DocStatus;
  tags?: string[];
}

export interface DocumentVersion {
  version_id: string;
  document_id: string;
  user_id: string;
  version_number: number;
  content: string | null;
  file_path: string | null;
  created_at: string;
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

export const getJobMetrics = async (accessToken: string): Promise<JobMetrics> => {
  const response = await fetch(`${API_URL}/jobs/metrics`, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });
  if (!response.ok) {
    throw new Error('Unable to load job metrics.');
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

export const listJobInterviews = async (
  accessToken: string,
  jobId: string
): Promise<InterviewRecord[]> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/interviews`, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('Unable to load interviews.');
  }

  return await response.json();
};

export const createJobInterview = async (
  accessToken: string,
  jobId: string,
  interview: InterviewPayload
): Promise<InterviewRecord> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/interviews`, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(interview),
  });

  if (!response.ok) {
    throw new Error('Unable to save interview.');
  }

  return await response.json();
};

export const updateJobInterview = async (
  accessToken: string,
  jobId: string,
  interviewId: string,
  interview: InterviewUpdatePayload
): Promise<InterviewRecord> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/interviews/${interviewId}`, {
    method: 'PATCH',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(interview),
  });

  if (!response.ok) {
    throw new Error('Unable to update interview.');
  }

  return await response.json();
};

export const deleteJobInterview = async (
  accessToken: string,
  jobId: string,
  interviewId: string
): Promise<void> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/interviews/${interviewId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });
  if (!response.ok) {
    throw new Error('Unable to delete interview.');
  }
};

export const listJobFollowUps = async (
  accessToken: string,
  jobId: string
): Promise<FollowUpRecord[]> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/followups`, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('Unable to load follow-ups.');
  }

  return await response.json();
};

export const createJobFollowUp = async (
  accessToken: string,
  jobId: string,
  followUp: FollowUpPayload
): Promise<FollowUpRecord> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/followups`, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(followUp),
  });

  if (!response.ok) {
    throw new Error('Unable to save follow-up.');
  }

  return await response.json();
};

export const updateJobFollowUp = async (
  accessToken: string,
  jobId: string,
  followUpId: string,
  followUp: FollowUpUpdatePayload
): Promise<FollowUpRecord> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/followups/${followUpId}`, {
    method: 'PATCH',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(followUp),
  });

  if (!response.ok) {
    throw new Error('Unable to update follow-up.');
  }

  return await response.json();
};

export const deleteJobFollowUp = async (
  accessToken: string,
  jobId: string,
  followUpId: string
): Promise<void> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/followups/${followUpId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('Unable to delete follow-up.');
  }
};

export const listJobDocuments = async (
  accessToken: string,
  jobId: string
): Promise<DocumentRecord[]> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/documents`, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('Unable to load saved documents.');
  }

  return await response.json();
};

export const listDocuments = async (
  accessToken: string,
  includeArchived = false,
  docType?: DocType | '',
  tag?: string,
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<DocumentRecord[]> => {
  const params = new URLSearchParams({
    include_archived: String(includeArchived),
    sort_order: sortOrder,
  });
  if (docType) params.set('doc_type', docType);
  if (tag) params.set('tag', tag);
  const response = await fetch(`${API_URL}/jobs/documents?${params}`, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('Unable to load documents.');
  }

  return await response.json();
};

export const uploadDocument = async (
  accessToken: string,
  file: File,
  docType: DocType,
  docTitle: string
): Promise<DocumentRecord> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('doc_type', docType);
  formData.append('doc_title', docTitle);

  const response = await fetch(`${API_URL}/documents/upload`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || 'Upload failed.');
  }

  return await response.json();
};

export const archiveDocument = async (
  accessToken: string,
  documentId: string
): Promise<DocumentRecord> => {
  const response = await fetch(`${API_URL}/jobs/documents/${documentId}/archive`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('Unable to archive document.');
  }

  return await response.json();
};

export const getDocumentDownloadUrl = async (
  accessToken: string,
  documentId: string
): Promise<string> => {
  const response = await fetch(`${API_URL}/documents/download/${documentId}`, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('Unable to get download link.');
  }

  const body = await response.json();
  return body.url as string;
};

export const restoreDocument = async (
  accessToken: string,
  documentId: string
): Promise<DocumentRecord> => {
  const response = await fetch(`${API_URL}/jobs/documents/${documentId}/restore`, {
    method: 'PATCH',
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('Unable to restore document.');
  }

  return await response.json();
};

export const createJobDocument = async (
  accessToken: string,
  jobId: string,
  document: DocumentPayload
): Promise<DocumentRecord> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/documents`, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(document),
  });

  if (!response.ok) {
    throw new Error('Unable to save document.');
  }

  return await response.json();
};

export const deleteJobDocument = async (
  accessToken: string,
  jobId: string,
  documentId: string
): Promise<void> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/documents/${documentId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('Unable to delete document.');
  }
};

export const updateJobDocument = async (
  accessToken: string,
  jobId: string,
  documentId: string,
  payload: DocumentUpdatePayload
): Promise<DocumentRecord> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/documents/${documentId}`, {
    method: 'PATCH',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Unable to update document.');
  }

  return await response.json();
};

export const generateCompanyResearch = async (
  accessToken: string,
  jobId: string,
  userContext: string
): Promise<string> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/research`, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_context: userContext }),
  });

  if (!response.ok) {
    throw new Error('Unable to generate company research.');
  }

  const body = await response.json();
  return body.research as string;
};

export const listDocumentVersions = async (
  accessToken: string,
  jobId: string,
  documentId: string
): Promise<DocumentVersion[]> => {
  const response = await fetch(`${API_URL}/jobs/${jobId}/documents/${documentId}/versions`, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error('Unable to load document versions.');
  }

  return await response.json();
};

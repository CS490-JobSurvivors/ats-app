import { JobStage } from '../api/jobs';

export const FORWARD_TRANSITIONS: Record<JobStage, JobStage[]> = {
  Interested: ['Applied', 'Rejected'],
  Applied: ['Interview', 'Rejected'],
  Interview: ['Offer', 'Rejected'],
  Offer: ['Archived', 'Rejected'],
  Rejected: [],
  Archived: [],
};

export const isForwardTransition = (from: JobStage, to: JobStage): boolean =>
  FORWARD_TRANSITIONS[from].includes(to);

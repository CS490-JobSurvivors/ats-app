import { useCallback, useEffect, useMemo, useState } from 'react';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
} from '@mui/material';
import { supabase } from '../utils/supabaseClient';
import {
  listJobs,
  listJobActivity,
  listJobInterviews,
  listJobFollowUps,
  createJob,
  updateJob,
  deleteJob,
  deleteJobStageHistory,
  createJobInterview,
  updateJobInterview,
  createJobFollowUp,
  updateJobFollowUp,
  deleteJobFollowUp,
  InterviewPayload,
  InterviewRecord,
  FollowUpPayload,
  FollowUpRecord,
  JobActivityEvent,
  JobRecord,
  JobPayload,
  JobStage,
} from '../api/jobs';
import JobCard from '../components/JobCard';
import JobFormDialog from '../components/JobFormDialog';
import JobDetailDialog from '../components/JobDetailDialog';

type SortBy = 'last_activity' | 'deadline' | 'company' | 'created_date';
type SortOrder = 'asc' | 'desc';

const sortOptions: Array<{ value: SortBy; label: string }> = [
  { value: 'last_activity', label: 'Last Activity' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'company', label: 'Company' },
  { value: 'created_date', label: 'Created Date' },
];

const stageFilterOptions: Array<JobStage | 'All'> = [
  'All',
  'Interested',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
  'Archived',
];

const deadlineStateOrder = ['No deadline', 'Due soon', 'Upcoming', 'Expired'] as const;
type DeadlineState = (typeof deadlineStateOrder)[number];
type DeadlineFilter = DeadlineState | 'All';

const toStartOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getDeadlineState = (deadline?: string | null): DeadlineState => {
  if (!deadline) return 'No deadline';
  const deadlineDate = toStartOfDay(new Date(`${deadline}T00:00:00`));
  const today = toStartOfDay(new Date());
  const dueSoonEnd = new Date(today);
  dueSoonEnd.setDate(today.getDate() + 7);
  if (deadlineDate < today) return 'Expired';
  if (deadlineDate <= dueSoonEnd) return 'Due soon';
  return 'Upcoming';
};

const DashboardPage = () => {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState<JobStage | 'All'>('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>('All');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
  const [selectedJobActivity, setSelectedJobActivity] = useState<JobActivityEvent[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [selectedJobInterviews, setSelectedJobInterviews] = useState<InterviewRecord[]>([]);
  const [isInterviewsLoading, setIsInterviewsLoading] = useState(false);
  const [selectedJobFollowUps, setSelectedJobFollowUps] = useState<FollowUpRecord[]>([]);
  const [isFollowUpsLoading, setIsFollowUpsLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('last_activity');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fetchJobs = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const result = await listJobs(token);
      setJobs(result);
      return result;
    } catch {
      setErrorMessage('Unable to load your applications right now. Please try again later.');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const totalApplications = jobs.length;
  const interviewCount = jobs.filter((job) => job.job_stage === 'Interview').length;
  const offerCount = jobs.filter((job) => job.job_stage === 'Offer').length;

  const locationOptions = useMemo<string[]>(() => {
    const locations = jobs
      .map((job) => job.job_location?.trim())
      .filter((location): location is string => !!location);
    return ['All', ...Array.from(new Set(locations)).sort()];
  }, [jobs]);

  const deadlineFilterOptions = useMemo<DeadlineFilter[]>(() => {
    const availableStates = new Set(jobs.map((job) => getDeadlineState(job.deadline)));
    const orderedStates = deadlineStateOrder.filter((state) => availableStates.has(state));
    return ['All', ...orderedStates];
  }, [jobs]);

  useEffect(() => {
    if (!locationOptions.includes(locationFilter)) {
      setLocationFilter('All');
    }
  }, [locationFilter, locationOptions]);

  useEffect(() => {
    if (!deadlineFilterOptions.includes(deadlineFilter)) {
      setDeadlineFilter('All');
    }
  }, [deadlineFilter, deadlineFilterOptions]);

  const hasActiveFilters =
    stageFilter !== 'All' || locationFilter !== 'All' || deadlineFilter !== 'All';

  const filteredJobs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return jobs.filter(
      (job) =>
        (!normalizedQuery ||
          [job.job_title, job.company_name, job.job_description].some((value) =>
            (value ?? '').toLowerCase().includes(normalizedQuery)
          )) &&
        (stageFilter === 'All' || job.job_stage === stageFilter) &&
        (locationFilter === 'All' || job.job_location?.trim() === locationFilter) &&
        (deadlineFilter === 'All' || getDeadlineState(job.deadline) === deadlineFilter)
    );
  }, [deadlineFilter, jobs, locationFilter, searchQuery, stageFilter]);

  const sortedJobs = useMemo(() => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    return [...filteredJobs].sort((a, b) => {
      switch (sortBy) {
        case 'last_activity':
          return multiplier * (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
        case 'created_date':
          return multiplier * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        case 'company':
          return multiplier * a.company_name.localeCompare(b.company_name);
        case 'deadline': {
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return multiplier * (new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
        }
        default:
          return 0;
      }
    });
  }, [filteredJobs, sortBy, sortOrder]);

  const openCreateDialog = () => {
    setDialogOpen(true);
  };

  const clearFilters = () => {
    setStageFilter('All');
    setLocationFilter('All');
    setDeadlineFilter('All');
  };

  const loadJobActivity = async (jobId: string) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    setIsActivityLoading(true);
    try {
      const activity = await listJobActivity(token, jobId);
      setSelectedJobActivity(activity);
    } catch {
      setSelectedJobActivity([]);
    } finally {
      setIsActivityLoading(false);
    }
  };

  const loadJobInterviews = async (jobId: string) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    setIsInterviewsLoading(true);
    try {
      const interviews = await listJobInterviews(token, jobId);
      setSelectedJobInterviews(interviews);
    } catch {
      setSelectedJobInterviews([]);
    } finally {
      setIsInterviewsLoading(false);
    }
  };

  const loadJobFollowUps = async (jobId: string) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    setIsFollowUpsLoading(true);
    try {
      const followUps = await listJobFollowUps(token, jobId);
      setSelectedJobFollowUps(followUps);
    } catch {
      setSelectedJobFollowUps([]);
    } finally {
      setIsFollowUpsLoading(false);
    }
  };

  const openDetailDialog = async (job: JobRecord) => {
    setSelectedJob(job);
    setSelectedJobActivity([]);
    setSelectedJobInterviews([]);
    setSelectedJobFollowUps([]);
    setDetailOpen(true);
    await Promise.all([
      loadJobActivity(job.job_id),
      loadJobInterviews(job.job_id),
      loadJobFollowUps(job.job_id),
    ]);
  };

  const handleDelete = async () => {
    if (!selectedJob) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await deleteJob(token, selectedJob.job_id);
    setJobs((prev) => prev.filter((j) => j.job_id !== selectedJob.job_id));
    setConfirmDeleteOpen(false);
    setDetailOpen(false);
  };

  const handleDetailSave = async (payload: JobPayload) => {
    if (!selectedJob) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('No active session.');
    const updated = await updateJob(token, selectedJob.job_id, payload);
    setJobs((prev) => prev.map((j) => (j.job_id === updated.job_id ? updated : j)));
    setSelectedJob(updated);
  };

  const handleDeleteStageHistory = async (eventId: string) => {
    if (!selectedJob) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    setErrorMessage('');
    try {
      await deleteJobStageHistory(token, selectedJob.job_id, eventId);
      const refreshedJobs = await fetchJobs();
      const refreshedSelectedJob = refreshedJobs?.find((job) => job.job_id === selectedJob.job_id);
      if (refreshedSelectedJob) {
        setSelectedJob(refreshedSelectedJob);
      }
      await loadJobActivity(selectedJob.job_id);
    } catch {
      setErrorMessage('Unable to delete that stage history. Please try again.');
    }
  };

  const handleSaveInterview = async (payload: InterviewPayload, interviewId?: string) => {
    if (!selectedJob) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    setErrorMessage('');
    try {
      if (interviewId) {
        await updateJobInterview(token, selectedJob.job_id, interviewId, payload);
      } else {
        await createJobInterview(token, selectedJob.job_id, payload);
      }
      await Promise.all([
        loadJobInterviews(selectedJob.job_id),
        loadJobActivity(selectedJob.job_id),
      ]);
    } catch {
      setErrorMessage('Unable to save that interview. Please try again.');
      throw new Error('Unable to save interview.');
    }
  };

  const handleSaveFollowUp = async (payload: FollowUpPayload, followUpId?: string) => {
    if (!selectedJob) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    setErrorMessage('');
    try {
      if (followUpId) {
        await updateJobFollowUp(token, selectedJob.job_id, followUpId, payload);
      } else {
        await createJobFollowUp(token, selectedJob.job_id, payload);
      }
      await Promise.all([
        loadJobFollowUps(selectedJob.job_id),
        loadJobActivity(selectedJob.job_id),
      ]);
    } catch {
      setErrorMessage('Unable to save that follow-up. Please try again.');
      throw new Error('Unable to save follow-up.');
    }
  };

  const handleDeleteFollowUp = async (followUpId: string) => {
    if (!selectedJob) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    setErrorMessage('');
    try {
      await deleteJobFollowUp(token, selectedJob.job_id, followUpId);
      await Promise.all([
        loadJobFollowUps(selectedJob.job_id),
        loadJobActivity(selectedJob.job_id),
      ]);
    } catch {
      setErrorMessage('Unable to delete that follow-up. Please try again.');
    }
  };

  const handleDialogSubmit = async (payload: JobPayload) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('No active session.');
    await createJob(token, payload);
    setDialogOpen(false);
    await fetchJobs();
  };

  return (
    <Container maxWidth="lg" sx={{ px: 3, py: 5 }}>
      <Typography variant="h4" fontWeight={700} mb={0.5}>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Track your applications and activity at a glance.
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center', flex: 1 }}>
          <Typography variant="h6" fontWeight={600} mb={1}>
            Total Applications
          </Typography>
          <Typography variant="h3" fontWeight={700}>
            {totalApplications}
          </Typography>
        </Paper>
        <Paper sx={{ p: 3, textAlign: 'center', flex: 1 }}>
          <Typography variant="h6" fontWeight={600} mb={1}>
            Interviews
          </Typography>
          <Typography variant="h3" fontWeight={700}>
            {interviewCount}
          </Typography>
        </Paper>
        <Paper sx={{ p: 3, textAlign: 'center', flex: 1 }}>
          <Typography variant="h6" fontWeight={600} mb={1}>
            Offers
          </Typography>
          <Typography variant="h3" fontWeight={700}>
            {offerCount}
          </Typography>
        </Paper>
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          mb: 2,
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h6" fontWeight={600}>
            Recent Applications
          </Typography>
          <TextField
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            label="Search jobs"
            size="small"
            sx={{ minWidth: { xs: '100%', sm: 280 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            Filters
          </Button>
          <TextField
            select
            label="Sort by"
            size="small"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            sx={{ minWidth: 160 }}
          >
            {sortOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <Tooltip title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}>
            <IconButton
              size="small"
              onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            >
              {sortOrder === 'desc' ? (
                <ArrowDownwardIcon fontSize="small" />
              ) : (
                <ArrowUpwardIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>
        <Button variant="contained" onClick={openCreateDialog}>
          New Application
        </Button>
      </Box>

      {filtersOpen && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <TextField
            select
            label="Stage"
            size="small"
            value={stageFilter}
            onChange={(event) => setStageFilter(event.target.value as JobStage | 'All')}
            sx={{ minWidth: 180 }}
          >
            {stageFilterOptions.map((stage) => (
              <MenuItem key={stage} value={stage}>
                {stage === 'All' ? 'All stages' : stage}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Location"
            size="small"
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
            sx={{ minWidth: 180 }}
          >
            {locationOptions.map((location) => (
              <MenuItem key={location} value={location}>
                {location === 'All' ? 'All locations' : location}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Deadline"
            size="small"
            value={deadlineFilter}
            onChange={(event) => setDeadlineFilter(event.target.value as DeadlineFilter)}
            sx={{ minWidth: 180 }}
          >
            {deadlineFilterOptions.map((deadline) => (
              <MenuItem key={deadline} value={deadline}>
                {deadline === 'All' ? 'All deadlines' : deadline}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="text" onClick={clearFilters} disabled={!hasActiveFilters}>
            Clear filters
          </Button>
        </Paper>
      )}

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}
      {isLoading ? (
        <Typography color="text.secondary">Loading...</Typography>
      ) : jobs.length === 0 && !errorMessage ? (
        <Box
          sx={{
            p: 3,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <Typography color="text.secondary">No recent applications.</Typography>
        </Box>
      ) : filteredJobs.length === 0 && !errorMessage ? (
        <Box
          sx={{
            p: 3,
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          <Typography color="text.secondary">
            {hasActiveFilters
              ? 'No applications match your filters.'
              : 'No applications match your search.'}
          </Typography>
        </Box>
      ) : (
        sortedJobs.map((job) => (
          <JobCard
            key={job.job_id}
            title={job.job_title}
            company={job.company_name}
            stage={job.job_stage}
            lastActivity={new Date(job.updated_at).toLocaleDateString()}
            onClick={() => openDetailDialog(job)}
          />
        ))
      )}

      <JobFormDialog
        open={dialogOpen}
        job={null}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleDialogSubmit}
      />

      <JobDetailDialog
        open={detailOpen}
        job={selectedJob}
        onClose={() => setDetailOpen(false)}
        onSave={handleDetailSave}
        onDelete={() => setConfirmDeleteOpen(true)}
        onDeleteStageHistory={handleDeleteStageHistory}
        onSaveInterview={handleSaveInterview}
        interviews={selectedJobInterviews}
        isInterviewsLoading={isInterviewsLoading}
        onSaveFollowUp={handleSaveFollowUp}
        onDeleteFollowUp={handleDeleteFollowUp}
        followUps={selectedJobFollowUps}
        isFollowUpsLoading={isFollowUpsLoading}
        onStageChange={async (newStage) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (!token || !selectedJob) return;
          const updated = await updateJob(token, selectedJob.job_id, { job_stage: newStage });
          setJobs((prev) => prev.map((j) => (j.job_id === updated.job_id ? updated : j)));
          setSelectedJob(updated);
          await loadJobActivity(updated.job_id);
        }}
        activityEvents={selectedJobActivity}
        isActivityLoading={isActivityLoading}
      />

      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <DialogTitle>Delete job?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedJob?.job_title}</strong> at{' '}
            <strong>{selectedJob?.company_name}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DashboardPage;

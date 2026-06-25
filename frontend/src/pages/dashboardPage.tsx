import { useCallback, useEffect, useMemo, useState } from 'react';
import FilterListIcon from '@mui/icons-material/FilterList';
import SearchIcon from '@mui/icons-material/Search';
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
} from '@mui/material';
import { supabase } from '../utils/supabaseClient';
import { listJobs, createJob, updateJob, JobRecord, JobPayload, JobStage } from '../api/jobs';
import JobCard from '../components/JobCard';
import JobFormDialog from '../components/JobFormDialog';
import JobDetailDialog from '../components/JobDetailDialog';

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
  const [editingJob, setEditingJob] = useState<JobRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [stageFilter, setStageFilter] = useState<JobStage | 'All'>('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>('All');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);

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
    } catch {
      setErrorMessage('Unable to load your applications right now. Please try again later.');
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

  const openCreateDialog = () => {
    setEditingJob(null);
    setDialogOpen(true);
  };

  const openEditDialog = (job: JobRecord) => {
    setEditingJob(job);
    setDialogOpen(true);
  };

  const clearFilters = () => {
    setStageFilter('All');
    setLocationFilter('All');
    setDeadlineFilter('All');
  };

  const openDetailDialog = (job: JobRecord) => {
    setSelectedJob(job);
    setDetailOpen(true);
  };

  const handleDialogSubmit = async (payload: JobPayload) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      throw new Error('No active session.');
    }
    if (editingJob) {
      await updateJob(token, editingJob.job_id, payload);
    } else {
      await createJob(token, payload);
    }
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
        filteredJobs.map((job) => (
          <JobCard
            key={job.job_id}
            title={job.job_title}
            company={job.company_name}
            stage={job.job_stage}
            lastActivity={new Date(job.updated_at).toLocaleDateString()}
            onEdit={() => openEditDialog(job)}
            onClick={() => openDetailDialog(job)}
          />
        ))
      )}

      <JobFormDialog
        open={dialogOpen}
        job={editingJob}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleDialogSubmit}
      />

      <JobDetailDialog
        open={detailOpen}
        job={selectedJob}
        onClose={() => setDetailOpen(false)}
        onEdit={() => {
          setDetailOpen(false);
          openEditDialog(selectedJob!);
        }}
      />
    </Container>
  );
};

export default DashboardPage;
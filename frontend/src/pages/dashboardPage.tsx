import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from '@mui/material';
import { supabase } from '../utils/supabaseClient';
import { listJobs, createJob, updateJob, JobRecord, JobPayload } from '../api/jobs';
import JobCard from '../components/JobCard';
import JobFormDialog from '../components/JobFormDialog';

const DashboardPage = () => {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Fetches the logged-in user's jobs. Backend enforces auth (S1-BR-001)
  // and filters by owner_id server-side (S1-BR-006/008) — no client-side filtering needed.
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const totalApplications = jobs.length;
  const interviewCount = jobs.filter((job) => job.job_stage === 'Interview').length;
  const offerCount = jobs.filter((job) => job.job_stage === 'Offer').length;
  const filteredJobs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return jobs;

    return jobs.filter((job) =>
      [job.job_title, job.company_name, job.job_description].some((value) =>
        (value ?? '').toLowerCase().includes(normalizedQuery)
      )
    );
  }, [jobs, searchQuery]);

  const openCreateDialog = () => {
    setEditingJob(null);
    setDialogOpen(true);
  };

  const openEditDialog = (job: JobRecord) => {
    setEditingJob(job);
    setDialogOpen(true);
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
        </Box>
        <Button variant="contained" onClick={openCreateDialog}>
          New Application
        </Button>
      </Box>

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
          <Typography color="text.secondary">No applications match your search.</Typography>
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
          />
        ))
      )}

      <JobFormDialog
        open={dialogOpen}
        job={editingJob}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleDialogSubmit}
      />
    </Container>
  );
};

export default DashboardPage;

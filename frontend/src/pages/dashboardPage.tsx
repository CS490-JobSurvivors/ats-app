import { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper, Alert } from '@mui/material';
import { supabase } from '../utils/supabaseClient';
import { listJobs, JobRecord } from '../api/jobs';
import JobCard from '../components/JobCard';

const DashboardPage = () => {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetches the logged-in user's jobs. Backend enforces auth (S1-BR-001)
  // and filters by owner_id server-side (S1-BR-006/008) — no client-side filtering needed.
  useEffect(() => {
    const fetchJobs = async () => {
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
    };
    fetchJobs();
  }, []);

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
            0
          </Typography>
        </Paper>
        <Paper sx={{ p: 3, textAlign: 'center', flex: 1 }}>
          <Typography variant="h6" fontWeight={600} mb={1}>
            Interviews
          </Typography>
          <Typography variant="h3" fontWeight={700}>
            0
          </Typography>
        </Paper>
        <Paper sx={{ p: 3, textAlign: 'center', flex: 1 }}>
          <Typography variant="h6" fontWeight={600} mb={1}>
            Offers
          </Typography>
          <Typography variant="h3" fontWeight={700}>
            0
          </Typography>
        </Paper>
      </Box>

      <Typography variant="h6" fontWeight={600} mb={2}>
        Recent Applications
      </Typography>
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
          <Typography color="text.secondary">No applications yet.</Typography>
        </Box>
      ) : (
        jobs.map((job) => (
          <JobCard
            key={job.job_id}
            title={job.job_title}
            company={job.company_name}
            stage={job.job_stage}
            lastActivity={new Date(job.updated_at).toLocaleDateString()}
          />
        ))
      )}
    </Container>
  );
};

export default DashboardPage;

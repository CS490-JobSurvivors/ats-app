import { useEffect, useState } from 'react';
import { Alert, Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { createJob, JobPayload, JobRecord, listJobs, updateJob } from '../api/jobs';
import { supabase } from '../utils/supabaseClient';

const emptyJob: JobPayload = {
  company_name: '',
  job_title: '',
  job_description: '',
  application_link: '',
};

const DashboardPage = () => {
  const [accessToken, setAccessToken] = useState('');
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [jobForm, setJobForm] = useState<JobPayload>(emptyJob);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const loadJobs = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        setErrorMessage('Please log in to manage jobs.');
        return;
      }

      setAccessToken(token);

      try {
        setJobs(await listJobs(token));
      } catch {
        setErrorMessage('Unable to load saved jobs.');
      }
    };

    loadJobs();
  }, []);

  const handleFieldChange = (field: keyof JobPayload, value: string) => {
    setJobForm((current) => ({ ...current, [field]: value }));
    setErrorMessage('');
    setSuccessMessage('');
  };

  const resetForm = () => {
    setJobForm(emptyJob);
    setEditingJobId(null);
  };

  const handleEditJob = (job: JobRecord) => {
    setJobForm({
      company_name: job.company_name,
      job_title: job.job_title,
      job_description: job.job_description,
      application_link: job.application_link || '',
    });
    setEditingJobId(job.job_id);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSaveJob = async () => {
    if (!jobForm.company_name || !jobForm.job_title || !jobForm.job_description) {
      setErrorMessage('Company name, job title, and description are required.');
      return;
    }

    const payload = {
      ...jobForm,
      application_link: jobForm.application_link || null,
    };

    try {
      if (editingJobId) {
        const savedJob = await updateJob(accessToken, editingJobId, payload);
        setJobs((current) => current.map((job) => (job.job_id === editingJobId ? savedJob : job)));
        setSuccessMessage('Job updated.');
      } else {
        const savedJob = await createJob(accessToken, payload);
        setJobs((current) => [savedJob, ...current]);
        setSuccessMessage('Job saved.');
      }

      resetForm();
    } catch {
      setErrorMessage(editingJobId ? 'Unable to update job.' : 'Unable to save job.');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">My Dashboard</Typography>
        <Link to="/settings">Settings</Link>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 3, textAlign: 'center', flex: '1 1 220px', borderRadius: '30px' }}>
          <Typography variant="h6">Tracked Jobs</Typography>
          <Typography variant="h3">{jobs.length}</Typography>
        </Paper>
        <Paper sx={{ p: 3, textAlign: 'center', flex: '1 1 220px', borderRadius: '30px' }}>
          <Typography variant="h6">Interviews</Typography>
          <Typography variant="h3">0</Typography>
        </Paper>
        <Paper sx={{ p: 3, textAlign: 'center', flex: '1 1 220px', borderRadius: '30px' }}>
          <Typography variant="h6">Offers</Typography>
          <Typography variant="h3">0</Typography>
        </Paper>
      </Box>

      <Paper sx={{ p: 3, mb: 4, borderRadius: '30px' }}>
        <Typography variant="h5" gutterBottom>
          {editingJobId ? 'Edit Job' : 'Add Job'}
        </Typography>
        <Stack spacing={2}>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          {successMessage && <Alert severity="success">{successMessage}</Alert>}
          <TextField
            required
            label="Company name"
            value={jobForm.company_name}
            onChange={(event) => handleFieldChange('company_name', event.target.value)}
          />
          <TextField
            required
            label="Job title"
            value={jobForm.job_title}
            onChange={(event) => handleFieldChange('job_title', event.target.value)}
          />
          <TextField
            required
            multiline
            minRows={3}
            label="Job description"
            value={jobForm.job_description}
            onChange={(event) => handleFieldChange('job_description', event.target.value)}
          />
          <TextField
            label="Application link"
            value={jobForm.application_link}
            onChange={(event) => handleFieldChange('application_link', event.target.value)}
          />
          <Button
            type="button"
            variant="contained"
            onClick={handleSaveJob}
            sx={{ alignSelf: 'flex-start', backgroundColor: '#FF8C42' }}
          >
            {editingJobId ? 'Update Job' : 'Save Josb'}
          </Button>
          {editingJobId ? (
            <Button
              type="button"
              variant="text"
              onClick={resetForm}
              sx={{ alignSelf: 'flex-start' }}
            >
              Cancel Edit
            </Button>
          ) : null}
        </Stack>
      </Paper>

      <Typography variant="h5" gutterBottom>
        Recent Jobs
      </Typography>
      <Stack spacing={2}>
        {jobs.length === 0 ? (
          <Box sx={{ p: 3, border: '1px dashed grey', borderRadius: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">No jobs saved yet.</Typography>
          </Box>
        ) : (
          jobs.map((job) => (
            <Paper key={job.job_id} sx={{ p: 3, borderRadius: '30px' }}>
              <Typography variant="h6">{job.job_title}</Typography>
              <Typography>{job.company_name}</Typography>
              <Typography color="text.secondary">{job.job_description}</Typography>
              {job.application_link ? (
                <Link to={job.application_link} target="_blank" rel="noreferrer">
                  Application Link
                </Link>
              ) : null}
              <Button
                type="button"
                variant="outlined"
                onClick={() => handleEditJob(job)}
                sx={{ mt: 2 }}
              >
                Edit Job
              </Button>
            </Paper>
          ))
        )}
      </Stack>
    </Container>
  );
};

export default DashboardPage;

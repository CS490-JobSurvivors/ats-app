import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Alert,
} from '@mui/material';
import { JobRecord, JobPayload, JobStage } from '../api/jobs';

const stageOptions: JobStage[] = [
  'Interested',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
  'Archived',
];

interface JobFormDialogProps {
  open: boolean;
  job: JobRecord | null; // null = create mode, otherwise edit mode
  onClose: () => void;
  onSubmit: (payload: JobPayload) => Promise<void>;
}

const emptyForm: JobPayload = {
  company_name: '',
  job_title: '',
  job_description: '',
  application_link: '',
  job_location: '',
  deadline: '',
  job_stage: 'Interested',
};

const JobFormDialog = ({ open, job, onClose, onSubmit }: JobFormDialogProps) => {
  const [form, setForm] = useState<JobPayload>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (open) {
      setForm(
        job
          ? {
              company_name: job.company_name,
              job_title: job.job_title,
              job_description: job.job_description,
              application_link: job.application_link || '',
              job_location: job.job_location || '',
              deadline: job.deadline || '',
              job_stage: job.job_stage,
            }
          : emptyForm
      );
      setErrorMessage('');
    }
  }, [open, job]);

  const updateField = (field: keyof JobPayload, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.company_name.trim() || !form.job_title.trim() || !form.job_description.trim()) {
      setErrorMessage('Company, title, and description are required.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await onSubmit(form);
    } catch {
      setErrorMessage('Unable to save job. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{job ? 'Edit Job' : 'Add Job'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          <TextField
            label="Company"
            value={form.company_name}
            onChange={(e) => updateField('company_name', e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Job title"
            value={form.job_title}
            onChange={(e) => updateField('job_title', e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="Description"
            value={form.job_description}
            onChange={(e) => updateField('job_description', e.target.value)}
            fullWidth
            required
            multiline
            rows={3}
          />
          <TextField
            label="Application link"
            value={form.application_link || ''}
            onChange={(e) => updateField('application_link', e.target.value)}
            fullWidth
          />
          <TextField
            label="Location"
            value={form.job_location || ''}
            onChange={(e) => updateField('job_location', e.target.value)}
            fullWidth
          />
          <TextField
            label="Application deadline"
            type="date"
            value={form.deadline || ''}
            onChange={(e) => updateField('deadline', e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            select
            label="Stage"
            value={form.job_stage}
            onChange={(e) => updateField('job_stage', e.target.value)}
            fullWidth
          >
            {stageOptions.map((stage) => (
              <MenuItem key={stage} value={stage}>
                {stage}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JobFormDialog;

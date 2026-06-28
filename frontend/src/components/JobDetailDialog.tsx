import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TextField,
} from '@mui/material';
import { JobRecord, JobPayload, JobStage } from '../api/jobs';
import { generateResume } from '../api/resume';
import { stageColors } from '../utils/stageColors';
import { FORWARD_TRANSITIONS, isForwardTransition } from '../utils/stageTransitions';

const ALL_STAGES: JobStage[] = [
  'Interested',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
  'Archived',
];

interface JobDetailDialogProps {
  open: boolean;
  job: JobRecord | null;
  onClose: () => void;
  onDelete: () => void;
  onSave: (payload: JobPayload) => Promise<void>;
  onStageChange: (newStage: JobStage) => void;
  accessToken: string;
}

const JobDetailDialog = ({
  open,
  job,
  onClose,
  onDelete,
  onSave,
  onStageChange,
  accessToken,
}: JobDetailDialogProps) => {
  const [pendingStage, setPendingStage] = useState<JobStage | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState('');
  const [form, setForm] = useState({
    job_title: '',
    company_name: '',
    job_description: '',
    application_link: '',
    job_location: '',
    deadline: '',
    recruiter_notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (job) {
      setForm({
        job_title: job.job_title,
        company_name: job.company_name,
        job_description: job.job_description,
        application_link: job.application_link || '',
        job_location: job.job_location || '',
        deadline: job.deadline || '',
        recruiter_notes: job.recruiter_notes || '',
      });
    }
    setIsEditing(false);
    setErrorMessage('');
  }, [job, open]);

  if (!job) return null;

  const stageStyle = stageColors[job.job_stage] ?? { color: '#424242', bgcolor: '#F5F5F5' };

  const handleStageSelect = (selected: JobStage) => {
    if (selected === job.job_stage) return;
    if (isForwardTransition(job.job_stage, selected)) {
      onStageChange(selected);
    } else {
      setPendingStage(selected);
    }
  };

  const confirmOverride = () => {
    if (pendingStage) onStageChange(pendingStage);
    setPendingStage(null);
  };

  const handleGenerateResume = async () => {
    if (!job) return;
    setResumeLoading(true);
    setResumeError('');
    try {
      const text = await generateResume(accessToken, job.job_id);
      setResumeText(text);
      setResumeOpen(true);
    } catch {
      setResumeError('Failed to generate resume. Please try again.');
    } finally {
      setResumeLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.job_title.trim() || !form.company_name.trim() || !form.job_description.trim()) {
      setErrorMessage('Company, title, and description are required.');
      return;
    }
    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSave({
        job_title: form.job_title.trim(),
        company_name: form.company_name.trim(),
        job_description: form.job_description.trim(),
        application_link: form.application_link.trim() || null,
        job_location: form.job_location.trim() || null,
        deadline: form.deadline || null,
        recruiter_notes: form.recruiter_notes.trim() || null,
      });
      setIsEditing(false);
    } catch {
      setErrorMessage('Unable to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{isEditing ? 'Edit Job' : job.job_title}</Typography>
            <Chip
              label={job.job_stage}
              size="small"
              sx={{ color: stageStyle.color, bgcolor: stageStyle.bgcolor, fontWeight: 600 }}
            />
          </Box>
          {!isEditing && (
            <Typography variant="body2" color="text.secondary">
              {job.company_name}
            </Typography>
          )}
        </DialogTitle>

        <DialogContent>
          <Divider sx={{ mb: 2 }} />

          {!isEditing && (
            <FormControl size="small" sx={{ mb: 2, minWidth: 180 }}>
              <InputLabel>Stage</InputLabel>
              <Select
                value={job.job_stage}
                label="Stage"
                onChange={(e) => handleStageSelect(e.target.value as JobStage)}
                renderValue={(value) => {
                  const s = stageColors[value] ?? { color: '#424242', bgcolor: '#F5F5F5' };
                  return (
                    <Chip
                      label={value}
                      size="small"
                      sx={{ color: s.color, bgcolor: s.bgcolor, fontWeight: 600 }}
                    />
                  );
                }}
              >
                {ALL_STAGES.map((stage) => {
                  const s = stageColors[stage] ?? { color: '#424242', bgcolor: '#F5F5F5' };
                  const isForward = FORWARD_TRANSITIONS[job.job_stage].includes(stage);
                  const isCurrent = stage === job.job_stage;
                  return (
                    <MenuItem key={stage} value={stage} disabled={isCurrent}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color }}
                        />
                        <Typography variant="body2">{stage}</Typography>
                        {!isCurrent && !isForward && (
                          <Typography variant="caption" color="warning.main">
                            ⚠ non-standard
                          </Typography>
                        )}
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          )}

          {errorMessage && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {errorMessage}
            </Typography>
          )}

          {isEditing ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Job Title"
                value={form.job_title}
                onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
                fullWidth
                required
              />
              <TextField
                label="Company"
                value={form.company_name}
                onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                fullWidth
                required
              />
              <TextField
                label="Description"
                value={form.job_description}
                onChange={(e) => setForm((f) => ({ ...f, job_description: e.target.value }))}
                fullWidth
                required
                multiline
                rows={4}
              />
              <TextField
                label="Application Link"
                value={form.application_link}
                onChange={(e) => setForm((f) => ({ ...f, application_link: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Location"
                value={form.job_location}
                onChange={(e) => setForm((f) => ({ ...f, job_location: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Deadline"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                fullWidth
                type="date"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Recruiter / Contact Notes"
                value={form.recruiter_notes}
                onChange={(e) => setForm((f) => ({ ...f, recruiter_notes: e.target.value }))}
                fullWidth
                multiline
                rows={3}
              />
            </Box>
          ) : (
            <>
              <Typography variant="subtitle2" gutterBottom>
                Job Description
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2, whiteSpace: 'pre-wrap' }}
              >
                {job.job_description}
              </Typography>

              {job.application_link && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Application Link
                  </Typography>
                  <Typography
                    variant="body2"
                    component="a"
                    href={job.application_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ color: '#1565C0' }}
                  >
                    {job.application_link}
                  </Typography>
                </Box>
              )}

              {job.job_location && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Location
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {job.job_location}
                  </Typography>
                </Box>
              )}

              {job.deadline && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Deadline
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(`${job.deadline}T00:00:00`).toLocaleDateString()}
                  </Typography>
                </Box>
              )}

              {job.recruiter_notes && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Recruiter / Contact Notes
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ whiteSpace: 'pre-wrap' }}
                  >
                    {job.recruiter_notes}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Activity
              </Typography>
              <Box sx={{ pl: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Created: {new Date(job.created_at).toLocaleDateString()}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Last updated: {new Date(job.updated_at).toLocaleDateString()}
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>

        {resumeError && (
          <Typography color="error" variant="body2" sx={{ px: 3, pb: 1 }}>
            {resumeError}
          </Typography>
        )}
        <DialogActions>
          <Button onClick={onDelete} color="error" sx={{ mr: 'auto' }}>
            Delete
          </Button>
          {isEditing ? (
            <>
              <Button onClick={() => setIsEditing(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} variant="contained" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onClose}>Close</Button>
              <Button
                variant="outlined"
                onClick={handleGenerateResume}
                disabled={resumeLoading}
                startIcon={resumeLoading ? <CircularProgress size={16} /> : undefined}
              >
                {resumeLoading ? 'Generating...' : 'Generate Resume'}
              </Button>
              <Button onClick={() => setIsEditing(true)} variant="contained">
                Edit
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={resumeOpen} onClose={() => setResumeOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Generated Resume</DialogTitle>
        <DialogContent>
          <TextField
            value={resumeText}
            multiline
            rows={20}
            fullWidth
            InputProps={{ readOnly: true }}
            sx={{ fontFamily: 'monospace' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResumeOpen(false)}>Close</Button>
          <Button
            variant="contained"
            onClick={() => navigator.clipboard.writeText(resumeText)}
          >
            Copy
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!pendingStage} onClose={() => setPendingStage(null)}>
        <DialogTitle>Change stage?</DialogTitle>
        <DialogContent>
          <Typography>
            Moving from <strong>{job.job_stage}</strong> to <strong>{pendingStage}</strong> is a
            non-standard transition. Are you sure?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingStage(null)}>Cancel</Button>
          <Button onClick={confirmOverride} variant="contained" color="warning">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default JobDetailDialog;

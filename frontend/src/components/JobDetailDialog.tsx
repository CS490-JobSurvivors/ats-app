import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import { JobRecord, JobStage } from '../api/jobs';
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
  onEdit: () => void;
  onDelete: () => void;
  onStageChange: (newStage: JobStage) => void;
}

const JobDetailDialog = ({
  open,
  job,
  onClose,
  onEdit,
  onDelete,
  onStageChange,
}: JobDetailDialogProps) => {
  const [pendingStage, setPendingStage] = useState<JobStage | null>(null);

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

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{job.job_title}</Typography>
            <Chip
              label={job.job_stage}
              size="small"
              sx={{ color: stageStyle.color, bgcolor: stageStyle.bgcolor, fontWeight: 600 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            {job.company_name}
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Divider sx={{ mb: 2 }} />

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
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color }} />
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

          <Typography variant="subtitle2" gutterBottom>
            Job Description
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
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
        </DialogContent>

        <DialogActions>
          <Button onClick={onDelete} color="error" sx={{ mr: 'auto' }}>
            Delete
          </Button>
          <Button onClick={onClose}>Close</Button>
          <Button onClick={onEdit} variant="contained">
            Edit
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

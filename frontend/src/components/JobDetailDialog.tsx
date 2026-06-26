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
} from '@mui/material';
import { JobRecord } from '../api/jobs';
import { stageColors } from '../utils/stageColors';

interface JobDetailDialogProps {
  open: boolean;
  job: JobRecord | null;
  onClose: () => void;
  onEdit: () => void;
}

const JobDetailDialog = ({ open, job, onClose, onEdit }: JobDetailDialogProps) => {
  if (!job) return null;

  const stageStyle = stageColors[job.job_stage] ?? { color: '#424242', bgcolor: '#F5F5F5' };

  return (
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
        <Button onClick={onClose}>Close</Button>
        <Button onClick={onEdit} variant="contained">
          Edit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default JobDetailDialog;

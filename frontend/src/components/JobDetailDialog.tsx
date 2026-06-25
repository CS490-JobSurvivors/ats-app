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

const stageColors: Record<string, { color: string; bgcolor: string }> = {
  Interested: { color: '#1565C0', bgcolor: '#E3F2FD' },
  Applied: { color: '#E65100', bgcolor: '#FFF3E0' },
  Interview: { color: '#F57F17', bgcolor: '#FFFDE7' },
  Offer: { color: '#2E7D32', bgcolor: '#E8F5E9' },
  Rejected: { color: '#C62828', bgcolor: '#FFEBEE' },
  Archived: { color: '#424242', bgcolor: '#F5F5F5' },
};

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

        {/* Job Description */}
        <Typography variant="subtitle2" gutterBottom>
          Job Description
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, whiteSpace: 'pre-wrap' }}>
          {job.job_description}
        </Typography>

        {/* Application Link */}
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

        {/* Timeline */}
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

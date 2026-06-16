import { Paper, Typography, Box, Chip, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

interface JobCardProps {
  title: string;
  company: string;
  stage: string;
  lastActivity: string;
  onEdit: () => void;
}

const JobCard = ({ title, company, stage, lastActivity, onEdit }: JobCardProps) => {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h6">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {company}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label={stage} size="small" />
          <IconButton size="small" onClick={onEdit} aria-label={`Edit ${title}`}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Last activity: {lastActivity}
      </Typography>
    </Paper>
  );
};

export default JobCard;

import { Paper, Typography, Box, Chip, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

interface JobCardProps {
  title: string;
  company: string;
  stage: string;
  lastActivity: string;
  onEdit: () => void;
  onClick: () => void;
}

const stageColors: Record<string, { color: string; bgcolor: string }> = {
  Interested: { color: '#1565C0', bgcolor: '#E3F2FD' },
  Applied: { color: '#E65100', bgcolor: '#FFF3E0' },
  Interview: { color: '#F57F17', bgcolor: '#FFFDE7' },
  Offer: { color: '#2E7D32', bgcolor: '#E8F5E9' },
  Rejected: { color: '#C62828', bgcolor: '#FFEBEE' },
  Archived: { color: '#424242', bgcolor: '#F5F5F5' },
};

const JobCard = ({ title, company, stage, lastActivity, onEdit, onClick }: JobCardProps) => {
  const stageStyle = stageColors[stage] ?? { color: '#424242', bgcolor: '#F5F5F5' };

  return (
    <Paper sx={{ p: 2, mb: 2, cursor: 'pointer' }} onClick={onClick}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h6">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {company}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={stage}
            size="small"
            sx={{
              color: stageStyle.color,
              bgcolor: stageStyle.bgcolor,
              fontWeight: 600,
            }}
          />
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label={`Edit ${title}`}
          >
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

import { Paper, Typography, Box, Chip } from '@mui/material';
import { stageColors } from '../utils/stageColors';

interface JobCardProps {
  title: string;
  company: string;
  stage: string;
  lastActivity: string;
  onClick: () => void;
}

const JobCard = ({ title, company, stage, lastActivity, onClick }: JobCardProps) => {
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
        <Chip
          label={stage}
          size="small"
          sx={{
            color: stageStyle.color,
            bgcolor: stageStyle.bgcolor,
            fontWeight: 600,
          }}
        />
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Last activity: {lastActivity}
      </Typography>
    </Paper>
  );
};

export default JobCard;

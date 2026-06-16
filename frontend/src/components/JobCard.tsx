import { Paper, Typography, Box, Chip } from '@mui/material';

interface JobCardProps {
  title: string;
  company: string;
  stage: string;
  lastActivity: string;
}

const JobCard = ({ title, company, stage, lastActivity }: JobCardProps) => {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h6">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {company}
          </Typography>
        </Box>
        <Chip label={stage} size="small" />
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Last activity: {lastActivity}
      </Typography>
    </Paper>
  );
};

export default JobCard;

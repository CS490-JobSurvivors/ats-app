import { Paper, Typography, Box, Chip, ButtonBase } from '@mui/material';
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
    <Paper sx={{ mb: 2, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
        <ButtonBase
          onClick={onClick}
          aria-label={`${title} at ${company}, ${stage} stage`}
          sx={{
            flex: 1,
            p: 2,
            textAlign: 'left',
            display: 'block',
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: -2,
            },
          }}
        >
          <Typography variant="h6">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {company}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Last activity: {lastActivity}
          </Typography>
        </ButtonBase>

        <Box
          sx={{
            p: 1.5,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-end',
          }}
        >
          <Chip
            label={stage}
            size="small"
            sx={{ color: stageStyle.color, bgcolor: stageStyle.bgcolor, fontWeight: 600 }}
          />
        </Box>
      </Box>
    </Paper>
  );
};

export default JobCard;

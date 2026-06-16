import { Box, Button, Card, CardContent, Chip, Container, Typography } from '@mui/material';

const colors = {
  bgPage: '#1A1A2E',
  bgSidebar: '#16213E',
  bgCard: '#1E1E2E',
  bgElevated: '#2A2A3E',
  primary: '#FF8C42',
  primaryHover: '#E6732E',
  textPrimary: '#FFFFFF',
  textMuted: '#B0B0C0',
  success: '#4CAF50',
  error: '#F44336',
  warning: '#FFC107',
};

const jobs = [
  { title: 'Software Engineer', company: 'Acme Corp', stage: 'Interview', stageColor: colors.warning },
  { title: 'Frontend Developer', company: 'Beta Co', stage: 'Applied', stageColor: colors.primary },
  { title: 'Full Stack Engineer', company: 'Gamma Inc', stage: 'Offer', stageColor: colors.success },
  { title: 'Backend Engineer', company: 'Delta LLC', stage: 'Rejected', stageColor: colors.error },
];

const ColorSample = () => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: colors.bgPage }}>
      {/* Sidebar */}
      <Box sx={{ width: 220, backgroundColor: colors.bgSidebar, p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6" sx={{ color: colors.primary, fontWeight: 700, mb: 2 }}>
          ATS App
        </Typography>
        {['Dashboard', 'Profile', 'Settings'].map((item) => (
          <Typography
            key={item}
            sx={{
              color: item === 'Dashboard' ? colors.primary : colors.textMuted,
              cursor: 'pointer',
              fontWeight: item === 'Dashboard' ? 600 : 400,
            }}
          >
            {item}
          </Typography>
        ))}
      </Box>

      {/* Main content */}
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ color: colors.textPrimary, mb: 1 }}>
          Welcome back
        </Typography>
        <Typography variant="body1" sx={{ color: colors.textMuted, mb: 4 }}>
          Here's a summary of your job applications.
        </Typography>

        {/* Stat cards */}
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
          {[
            { label: 'Tracked', value: 4 },
            { label: 'Interviews', value: 1 },
            { label: 'Offers', value: 1 },
          ].map(({ label, value }) => (
            <Card key={label} sx={{ backgroundColor: colors.bgCard, flex: '1 1 140px', borderRadius: 3 }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: colors.textMuted }}>{label}</Typography>
                <Typography variant="h4" sx={{ color: colors.primary }}>{value}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Job cards */}
        <Typography variant="h6" sx={{ color: colors.textPrimary, mb: 2 }}>Recent Jobs</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {jobs.map((job) => (
            <Card key={job.title} sx={{ backgroundColor: colors.bgCard, borderRadius: 3 }}>
              <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6" sx={{ color: colors.textPrimary }}>{job.title}</Typography>
                  <Typography variant="body2" sx={{ color: colors.textMuted }}>{job.company}</Typography>
                </Box>
                <Chip label={job.stage} sx={{ backgroundColor: job.stageColor, color: '#fff', fontWeight: 600 }} />
              </CardContent>
            </Card>
          ))}
        </Box>

        {/* Buttons */}
        <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
          <Button variant="contained" sx={{ backgroundColor: colors.primary, '&:hover': { backgroundColor: colors.primaryHover } }}>
            Add Job
          </Button>
          <Button variant="outlined" sx={{ borderColor: colors.primary, color: colors.primary }}>
            View All
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default ColorSample;

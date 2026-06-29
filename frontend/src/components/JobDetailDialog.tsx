import { useEffect, useState } from 'react';
import {
  Alert,
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
  TextField,
  CircularProgress,
  IconButton,
  Checkbox,
  FormControlLabel,
  Alert,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import CloseIcon from '@mui/icons-material/Close';
import CancelIcon from '@mui/icons-material/Cancel';
import EventNoteIcon from '@mui/icons-material/EventNote';
import FlagIcon from '@mui/icons-material/Flag';
import SendIcon from '@mui/icons-material/Send';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import {
  FollowUpPayload,
  FollowUpRecord,
  InterviewPayload,
  InterviewRecord,
  JobActivityEvent,
  JobPayload,
  JobRecord,
  JobStage,
} from '../api/jobs';
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
  onDeleteStageHistory?: (eventId: string) => void;
  onSaveInterview?: (payload: InterviewPayload, interviewId?: string) => Promise<void>;
  onGenerateResume?: () => Promise<string>;
  interviews?: InterviewRecord[];
  isInterviewsLoading?: boolean;
  onSaveFollowUp?: (payload: FollowUpPayload, followUpId?: string) => Promise<void>;
  followUps?: FollowUpRecord[];
  isFollowUpsLoading?: boolean;
  onDeleteFollowUp?: (followUpId: string) => Promise<void>;
  activityEvents?: JobActivityEvent[];
  isActivityLoading?: boolean;
}

const emptyInterviewForm = {
  round_type: '',
  scheduled_at_date: '',
  scheduled_at_time: '',
  interview_notes: '',
};

const emptyFollowUpForm = {
  due_date: '',
  notes: '',
  is_completed: false,
};

const activityIcons: Record<JobActivityEvent['event_type'], typeof AssignmentTurnedInIcon> = {
  applied: SendIcon,
  follow_up: EventNoteIcon,
  interview: WorkHistoryIcon,
  outcome: FlagIcon,
  stage_change: AssignmentTurnedInIcon,
};

const formatActivityDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatActivityTime = (value: string) =>
  new Date(value).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

const formatInterviewTimeForInput = (value: string) => {
  const date = new Date(value);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
};

const buildInterviewPayload = (form: typeof emptyInterviewForm): InterviewPayload => ({
  round_type: form.round_type.trim(),
  scheduled_at_date: form.scheduled_at_date,
  scheduled_at_time: new Date(`${form.scheduled_at_date}T${form.scheduled_at_time}`).toISOString(),
  interview_notes: form.interview_notes.trim() || null,
});

const buildFollowUpPayload = (form: typeof emptyFollowUpForm): FollowUpPayload => ({
  due_date: form.due_date,
  notes: form.notes.trim() || null,
  is_completed: form.is_completed,
});

const isRejectedEvent = (event: JobActivityEvent) =>
  event.title.toLowerCase().includes('rejected') || event.description?.endsWith('to Rejected');

const getEventStage = (event: JobActivityEvent): JobStage | null => {
  if (event.description) {
    const targetStage = event.description.split(' to ').at(-1);
    if (targetStage && ALL_STAGES.includes(targetStage as JobStage)) {
      return targetStage as JobStage;
    }
  }

  if (event.title === 'Applied') return 'Applied';
  if (event.title === 'Interview stage started') return 'Interview';
  if (event.title === 'Offer received') return 'Offer';
  if (event.title === 'Marked rejected') return 'Rejected';
  if (event.title === 'Archived') return 'Archived';

  return null;
};

const getActivityColor = (event: JobActivityEvent) => {
  const eventStage = getEventStage(event);
  return eventStage ? stageColors[eventStage].color : stageColors.Interested.color;
};

const JobDetailDialog = ({
  open,
  job,
  onClose,
  onDelete,
  onSave,
  onStageChange,
  onDeleteStageHistory,
  onSaveInterview,
  onGenerateResume,
  interviews = [],
  isInterviewsLoading = false,
  onSaveFollowUp,
  followUps = [],
  isFollowUpsLoading = false,
  onDeleteFollowUp,
  activityEvents = [],
  isActivityLoading = false,
}: JobDetailDialogProps) => {
  const [pendingStage, setPendingStage] = useState<JobStage | null>(null);
  const [pendingDeleteEvent, setPendingDeleteEvent] = useState<JobActivityEvent | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [interviewFormOpen, setInterviewFormOpen] = useState(false);
  const [editingInterviewId, setEditingInterviewId] = useState<string | undefined>();
  const [interviewForm, setInterviewForm] = useState(emptyInterviewForm);
  const [interviewError, setInterviewError] = useState('');
  const [followUpFormOpen, setFollowUpFormOpen] = useState(false);
  const [editingFollowUpId, setEditingFollowUpId] = useState<string | undefined>();
  const [followUpForm, setFollowUpForm] = useState(emptyFollowUpForm);
  const [followUpError, setFollowUpError] = useState('');
  const [pendingDeleteFollowUp, setPendingDeleteFollowUp] = useState<FollowUpRecord | null>(null);
  const [isEditing, setIsEditing] = useState(false);
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResume, setGeneratedResume] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState('');

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

  const latestActivityEvent = activityEvents[activityEvents.length - 1] ?? null;
  const canRestoreFromArchive =
    job.job_stage === 'Archived' &&
    !!latestActivityEvent?.can_delete &&
    getEventStage(latestActivityEvent) === 'Archived';
  const restoreTargetStage = latestActivityEvent?.description?.split(' to ')[0];

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

  const confirmStageHistoryDelete = () => {
    if (pendingDeleteEvent && onDeleteStageHistory) {
      onDeleteStageHistory(pendingDeleteEvent.event_id);
    }
    setPendingDeleteEvent(null);
  };

  const confirmRestore = () => {
    if (latestActivityEvent && onDeleteStageHistory) {
      onDeleteStageHistory(latestActivityEvent.event_id);
    }
    setRestoreConfirmOpen(false);
  };

  const openInterviewForm = (interview?: InterviewRecord) => {
    setInterviewError('');
    setEditingInterviewId(interview?.interview_id);
    setInterviewForm(
      interview
        ? {
            round_type: interview.round_type,
            scheduled_at_date: interview.scheduled_at_date,
            scheduled_at_time: formatInterviewTimeForInput(interview.scheduled_at_time),
            interview_notes: interview.interview_notes || '',
          }
        : emptyInterviewForm
    );
    setInterviewFormOpen(true);
  };

  const closeInterviewForm = () => {
    setInterviewFormOpen(false);
    setEditingInterviewId(undefined);
    setInterviewForm(emptyInterviewForm);
    setInterviewError('');
  };

  const updateInterviewForm = (field: keyof typeof emptyInterviewForm, value: string) => {
    setInterviewForm((current) => ({ ...current, [field]: value }));
  };

  const submitInterviewForm = async () => {
    if (!onSaveInterview) return;
    if (
      !interviewForm.round_type.trim() ||
      !interviewForm.scheduled_at_date ||
      !interviewForm.scheduled_at_time
    ) {
      setInterviewError('Round type, date, and time are required.');
      return;
    }

    try {
      await onSaveInterview(buildInterviewPayload(interviewForm), editingInterviewId);
      closeInterviewForm();
    } catch {
      setInterviewError('Unable to save interview. Please try again.');
    }
  };

  const openFollowUpForm = (followUp?: FollowUpRecord) => {
    setFollowUpError('');
    setEditingFollowUpId(followUp?.followup_id);
    setFollowUpForm(
      followUp
        ? {
            due_date: followUp.due_date,
            notes: followUp.notes || '',
            is_completed: followUp.is_completed,
          }
        : emptyFollowUpForm
    );
    setFollowUpFormOpen(true);
  };

  const closeFollowUpForm = () => {
    setFollowUpFormOpen(false);
    setEditingFollowUpId(undefined);
    setFollowUpForm(emptyFollowUpForm);
    setFollowUpError('');
  };

  const updateFollowUpForm = (field: keyof typeof emptyFollowUpForm, value: string | boolean) => {
    setFollowUpForm((current) => ({ ...current, [field]: value }));
  };

  const submitFollowUpForm = async () => {
    if (!onSaveFollowUp) return;
    if (!followUpForm.due_date) {
      setFollowUpError('Due date is required.');
      return;
    }

    try {
      await onSaveFollowUp(buildFollowUpPayload(followUpForm), editingFollowUpId);
      closeFollowUpForm();
    } catch {
      setFollowUpError('Unable to save follow-up. Please try again.');
    }
  };

  const confirmDeleteFollowUp = async () => {
    if (!pendingDeleteFollowUp || !onDeleteFollowUp) return;
    await onDeleteFollowUp(pendingDeleteFollowUp.followup_id);
    setPendingDeleteFollowUp(null);
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
                            non-standard
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

              <Divider sx={{ mb: 2 }} />

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  mb: 1,
                }}
              >
                <Typography variant="subtitle2">Follow-ups</Typography>
                {onSaveFollowUp && (
                  <Button size="small" variant="outlined" onClick={() => openFollowUpForm()}>
                    Add Follow-up
                  </Button>
                )}
              </Box>
              {isFollowUpsLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">
                    Loading follow-ups...
                  </Typography>
                </Box>
              ) : followUps.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  No follow-ups scheduled.
                </Typography>
              ) : (
                <Box sx={{ display: 'grid', gap: 1, mb: 2 }}>
                  {followUps.map((followUp) => (
                    <Box
                      key={followUp.followup_id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 1.5,
                        bgcolor: 'background.default',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 1,
                        }}
                      >
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={700}>
                              {formatActivityDate(`${followUp.due_date}T00:00:00`)}
                            </Typography>
                            <Chip
                              label={followUp.is_completed ? 'Complete' : 'Open'}
                              size="small"
                              color={followUp.is_completed ? 'success' : 'default'}
                            />
                          </Box>
                          {followUp.notes && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {followUp.notes}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {onSaveFollowUp && (
                            <Button size="small" onClick={() => openFollowUpForm(followUp)}>
                              Edit
                            </Button>
                          )}
                          {onDeleteFollowUp && (
                            <Button
                              size="small"
                              color="error"
                              onClick={() => setPendingDeleteFollowUp(followUp)}
                            >
                              Delete
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}

              <Divider sx={{ mb: 2 }} />

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  mb: 1,
                }}
              >
                <Typography variant="subtitle2">Interviews</Typography>
                {onSaveInterview && (
                  <Button size="small" variant="outlined" onClick={() => openInterviewForm()}>
                    Add Interview
                  </Button>
                )}
              </Box>
              {isInterviewsLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">
                    Loading interviews...
                  </Typography>
                </Box>
              ) : interviews.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  No interviews scheduled.
                </Typography>
              ) : (
                <Box sx={{ display: 'grid', gap: 1, mb: 2 }}>
                  {interviews.map((interview) => (
                    <Box
                      key={interview.interview_id}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 1.5,
                        bgcolor: 'background.default',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 1,
                        }}
                      >
                        <Box>
                          <Typography variant="body2" fontWeight={700}>
                            {interview.round_type}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {formatActivityDate(interview.scheduled_at_time)} at{' '}
                            {formatActivityTime(interview.scheduled_at_time)}
                          </Typography>
                          {interview.interview_notes && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              {interview.interview_notes}
                            </Typography>
                          )}
                        </Box>
                        {onSaveInterview && (
                          <Button size="small" onClick={() => openInterviewForm(interview)}>
                            Edit
                          </Button>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}

              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Activity Timeline
              </Typography>
              {isActivityLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">
                    Loading activity...
                  </Typography>
                </Box>
              ) : activityEvents.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No activity yet.
                </Typography>
              ) : (
                <Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
                  {[...activityEvents].reverse().map((event, index) => {
                    const rejectedEvent = isRejectedEvent(event);
                    const Icon = rejectedEvent ? CancelIcon : activityIcons[event.event_type];
                    const eventColor = getActivityColor(event);
                    const isCurrent = index === 0;

                    return (
                      <Box
                        key={event.event_id}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '48px minmax(0, 1fr)',
                          gap: 2,
                          alignItems: 'start',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            position: 'relative',
                            minHeight: '100%',
                          }}
                        >
                          {index < activityEvents.length - 1 && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 44,
                                bottom: 8,
                                width: 2,
                              }}
                            >
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  bottom: 0,
                                  left: 0,
                                  width: 2,
                                  bgcolor: eventColor,
                                }}
                              />
                              <Box
                                sx={{
                                  position: 'absolute',
                                  top: 0,
                                  left: '50%',
                                  width: 0,
                                  height: 0,
                                  transform: 'translateX(-50%)',
                                  borderLeft: '5px solid transparent',
                                  borderRight: '5px solid transparent',
                                  borderBottom: `8px solid ${eventColor}`,
                                }}
                              />
                            </Box>
                          )}
                          <Box
                            data-testid={`activity-icon-${event.event_id}`}
                            sx={{
                              width: 42,
                              height: 42,
                              borderRadius: '50%',
                              bgcolor: eventColor,
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              zIndex: 1,
                              boxShadow: isCurrent ? `0 0 0 3px ${eventColor}22` : 'none',
                            }}
                          >
                            <Icon fontSize="small" />
                          </Box>
                        </Box>
                        <Box
                          sx={{
                            minWidth: 0,
                            border: '1px solid',
                            borderColor: isCurrent ? `${eventColor}55` : 'divider',
                            borderRadius: 1,
                            px: 2,
                            py: 1.5,
                            bgcolor: isCurrent ? `${eventColor}0f` : 'background.default',
                            position: 'relative',
                            boxShadow: isCurrent ? `0 0 0 1px ${eventColor}1f` : 'none',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'space-between',
                              gap: 1,
                            }}
                          >
                            <Box sx={{ minWidth: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                                {isCurrent && (
                                  <Chip
                                    label="Current"
                                    size="small"
                                    sx={{
                                      height: 24,
                                      color: '#fff',
                                      bgcolor: eventColor,
                                      fontWeight: 700,
                                    }}
                                  />
                                )}
                                <Typography variant="body1" fontWeight={700}>
                                  {event.title}
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2,
                                  flexWrap: 'wrap',
                                  mb: event.description ? 0.75 : 0,
                                }}
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                  <CalendarTodayIcon
                                    sx={{ fontSize: 16, color: 'text.secondary' }}
                                  />
                                  <Typography variant="caption" color="text.secondary">
                                    {formatActivityDate(event.occurred_at)}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                  <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {formatActivityTime(event.occurred_at)}
                                  </Typography>
                                </Box>
                              </Box>
                              {event.description && (
                                <Typography variant="body2" color="text.secondary">
                                  {event.description}
                                </Typography>
                              )}
                            </Box>
                            {event.can_delete && onDeleteStageHistory && (
                              <IconButton
                                size="small"
                                aria-label={`Delete ${event.title} history`}
                                onClick={() => setPendingDeleteEvent(event)}
                                sx={{ color: 'text.secondary', p: 0.5 }}
                              >
                                <CloseIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </>
          )}
        </DialogContent>

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
              {onGenerateResume && (
                <Button
                  onClick={async () => {
                    setResumeError('');
                    setIsGenerating(true);
                    try {
                      const text = await onGenerateResume();
                      setGeneratedResume(text);
                    } catch {
                      setResumeError('Failed to generate resume. Please try again.');
                    } finally {
                      setIsGenerating(false);
                    }
                  }}
                  disabled={isGenerating}
                  startIcon={isGenerating ? <CircularProgress size={16} /> : undefined}
                >
                  {isGenerating ? 'Generating...' : 'Generate Resume'}
                </Button>
              )}
              <Button onClick={onClose}>Close</Button>
              {job.job_stage !== 'Archived' && (
                <Button onClick={() => handleStageSelect('Archived')} color="secondary">
                  Archive
                </Button>
              )}
              {canRestoreFromArchive && (
                <Button onClick={() => setRestoreConfirmOpen(true)} color="secondary">
                  Restore
                </Button>
              )}
              <Button onClick={() => setIsEditing(true)} variant="contained">
                Edit
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={restoreConfirmOpen} onClose={() => setRestoreConfirmOpen(false)}>
        <DialogTitle>Restore job?</DialogTitle>
        <DialogContent>
          <Typography>
            This will restore <strong>{job.job_title}</strong> to its previous stage
            {restoreTargetStage ? (
              <>
                {' '}
                (<strong>{restoreTargetStage}</strong>)
              </>
            ) : null}
            . Interviews and follow-ups will be kept.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmRestore} variant="contained">
            Restore
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

      <Dialog open={!!pendingDeleteEvent} onClose={() => setPendingDeleteEvent(null)}>
        <DialogTitle>Delete stage history?</DialogTitle>
        <DialogContent>
          <Typography>
            Remove <strong>{pendingDeleteEvent?.title}</strong> from this job&apos;s activity
            timeline?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDeleteEvent(null)}>Cancel</Button>
          <Button onClick={confirmStageHistoryDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {resumeError && (
        <Alert severity="error" onClose={() => setResumeError('')} sx={{ mt: 1 }}>
          {resumeError}
        </Alert>
      )}

      <Dialog
        open={generatedResume !== null}
        onClose={() => setGeneratedResume(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Generated Resume</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            fullWidth
            minRows={20}
            value={generatedResume ?? ''}
            onChange={(e) => setGeneratedResume(e.target.value)}
            inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (generatedResume) navigator.clipboard.writeText(generatedResume);
            }}
          >
            Copy
          </Button>
          <Button onClick={() => setGeneratedResume(null)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={interviewFormOpen} onClose={closeInterviewForm} fullWidth maxWidth="xs">
        <DialogTitle>{editingInterviewId ? 'Edit Interview' : 'Add Interview'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField
              label="Round type"
              size="small"
              value={interviewForm.round_type}
              onChange={(event) => updateInterviewForm('round_type', event.target.value)}
            />
            <TextField
              label="Date"
              type="date"
              size="small"
              value={interviewForm.scheduled_at_date}
              onChange={(event) => updateInterviewForm('scheduled_at_date', event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Time"
              type="time"
              size="small"
              value={interviewForm.scheduled_at_time}
              onChange={(event) => updateInterviewForm('scheduled_at_time', event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Notes"
              size="small"
              multiline
              minRows={3}
              value={interviewForm.interview_notes}
              onChange={(event) => updateInterviewForm('interview_notes', event.target.value)}
            />
            {interviewError && (
              <Typography variant="body2" color="error">
                {interviewError}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeInterviewForm}>Cancel</Button>
          <Button onClick={submitInterviewForm} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={followUpFormOpen} onClose={closeFollowUpForm} fullWidth maxWidth="xs">
        <DialogTitle>{editingFollowUpId ? 'Edit Follow-up' : 'Add Follow-up'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
            <TextField
              label="Due date"
              type="date"
              size="small"
              value={followUpForm.due_date}
              onChange={(event) => updateFollowUpForm('due_date', event.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Notes"
              size="small"
              multiline
              minRows={3}
              value={followUpForm.notes}
              onChange={(event) => updateFollowUpForm('notes', event.target.value)}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={followUpForm.is_completed}
                  onChange={(event) => updateFollowUpForm('is_completed', event.target.checked)}
                />
              }
              label="Completed"
            />
            {followUpError && <Alert severity="error">{followUpError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeFollowUpForm}>Cancel</Button>
          <Button onClick={submitFollowUpForm} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(pendingDeleteFollowUp)}
        onClose={() => setPendingDeleteFollowUp(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Delete Follow-up?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This follow-up will be removed from the job.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDeleteFollowUp(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDeleteFollowUp}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default JobDetailDialog;

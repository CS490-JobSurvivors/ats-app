import { useState, KeyboardEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import {
  CareerPreferenceRecord,
  CareerPreferencePayload,
  saveCareerPreferences,
} from '../api/careerPreferences';

const WORK_MODE_OPTIONS = ['Remote', 'Hybrid', 'On-site'];

interface CareerPreferencesSectionProps {
  preferences: CareerPreferenceRecord | null;
  accessToken: string;
  onPreferencesChange: (updated: CareerPreferenceRecord) => void;
}

const emptyForm: CareerPreferencePayload = {
  target_roles: [],
  location_preference: '',
  work_mode: '',
  salary_minimum: null,
};

export default function CareerPreferencesSection({
  preferences,
  accessToken,
  onPreferencesChange,
}: CareerPreferencesSectionProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CareerPreferencePayload>(emptyForm);
  const [roleInput, setRoleInput] = useState('');
  const [saveError, setSaveError] = useState('');

  const openEdit = () => {
    setForm({
      target_roles: preferences?.target_roles ?? [],
      location_preference: preferences?.location_preference ?? '',
      work_mode: preferences?.work_mode ?? '',
      salary_minimum: preferences?.salary_minimum ?? null,
    });
    setRoleInput('');
    setSaveError('');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSaveError('');
  };

  const handleAddRole = () => {
    const trimmed = roleInput.trim();
    if (!trimmed) return;
    const existing = form.target_roles ?? [];
    if (existing.includes(trimmed)) return;
    setForm((f) => ({ ...f, target_roles: [...existing, trimmed] }));
    setRoleInput('');
  };

  const handleRoleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddRole();
    }
  };

  const handleRemoveRole = (role: string) => {
    setForm((f) => ({ ...f, target_roles: (f.target_roles ?? []).filter((r) => r !== role) }));
  };

  const handleSave = async () => {
    setSaveError('');
    try {
      const updated = await saveCareerPreferences(accessToken, {
        ...form,
        location_preference: form.location_preference || null,
        work_mode: form.work_mode || null,
      });
      onPreferencesChange(updated);
      setOpen(false);
    } catch {
      setSaveError('Unable to save career preferences. Please try again.');
    }
  };

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Typography variant="h6" fontWeight={600}>
              Career Preferences
            </Typography>
            <Button size="small" onClick={openEdit}>
              {preferences ? 'Edit' : '+ Add'}
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {!preferences ? (
            <Typography variant="body2" color="text.secondary">
              No career preferences added yet.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {preferences.target_roles && preferences.target_roles.length > 0 && (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Target Roles
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {preferences.target_roles.map((role) => (
                      <Chip key={role} label={role} size="small" />
                    ))}
                  </Box>
                </Box>
              )}
              {preferences.location_preference && (
                <Typography variant="body2">
                  <strong>Location:</strong> {preferences.location_preference}
                </Typography>
              )}
              {preferences.work_mode && (
                <Typography variant="body2">
                  <strong>Work Mode:</strong> {preferences.work_mode}
                </Typography>
              )}
              {preferences.salary_minimum != null && (
                <Typography variant="body2">
                  <strong>Minimum Salary:</strong> ${preferences.salary_minimum.toLocaleString()}
                </Typography>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>
          {preferences ? 'Edit Career Preferences' : 'Add Career Preferences'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {saveError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {saveError}
            </Alert>
          )}

          <Box>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              Target Roles
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label="Add a role"
                size="small"
                fullWidth
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={handleRoleKeyDown}
                inputProps={{ 'aria-label': 'role input' }}
              />
              <Button variant="outlined" size="small" onClick={handleAddRole}>
                Add
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {(form.target_roles ?? []).map((role) => (
                <Chip
                  key={role}
                  label={role}
                  size="small"
                  onDelete={() => handleRemoveRole(role)}
                />
              ))}
            </Box>
          </Box>

          <TextField
            label="Location Preference"
            fullWidth
            value={form.location_preference ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, location_preference: e.target.value }))}
          />

          <FormControl fullWidth>
            <InputLabel>Work Mode</InputLabel>
            <Select
              label="Work Mode"
              value={form.work_mode ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, work_mode: e.target.value }))}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {WORK_MODE_OPTIONS.map((mode) => (
                <MenuItem key={mode} value={mode}>
                  {mode}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Minimum Salary"
            fullWidth
            type="number"
            value={form.salary_minimum ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                salary_minimum: e.target.value === '' ? null : Number(e.target.value),
              }))
            }
            inputProps={{ min: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

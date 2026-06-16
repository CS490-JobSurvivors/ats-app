import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material';

export interface ProfileFields {
  bio: string;
  firstName: string;
  lastName: string;
  city: string;
  phone: string;
}

type ProfileFieldKey = keyof ProfileFields;

const initialProfile: ProfileFields = {
  bio: '',
  firstName: '',
  lastName: '',
  city: '',
  phone: '',
};

const profileFieldKeys: ProfileFieldKey[] = ['bio', 'firstName', 'lastName', 'city', 'phone'];

const fieldLabels: Record<ProfileFieldKey, string> = {
  bio: 'About',
  firstName: 'First name',
  lastName: 'Last name',
  city: 'City',
  phone: 'Phone #',
};

const fieldPlaceholders: Record<ProfileFieldKey, string> = {
  bio: 'Tell us about yourself',
  firstName: 'Enter your first name',
  lastName: 'Enter your last name',
  city: 'Enter your city',
  phone: 'Enter your phone number',
};

const phoneRegex = /^[0-9]+$/;

function ProfilePage() {
  const [profile, setProfile] = useState<ProfileFields>(initialProfile);
  const [fieldErrors, setFieldErrors] = useState<Record<ProfileFieldKey, string>>(
    profileFieldKeys.reduce(
      (acc, key) => ({ ...acc, [key]: '' }),
      {} as Record<ProfileFieldKey, string>
    )
  );
  const [isSaved, setIsSaved] = useState(false);

  const updateField = (field: ProfileFieldKey, value: string) => {
    let nextValue = value;
    let errorMessage = '';

    if (field === 'phone') {
      nextValue = value.replace(/\D/g, '');
      if (value !== nextValue) errorMessage = 'Phone may only contain numbers.';
    }

    setProfile((current) => ({ ...current, [field]: nextValue }));
    setFieldErrors((current) => ({ ...current, [field]: errorMessage }));
    setIsSaved(false);
  };

  const completedCount = profileFieldKeys.filter((f) => profile[f].trim().length > 0).length;
  const progressPercent = Math.round((completedCount / profileFieldKeys.length) * 100);
  const canSave =
    completedCount === profileFieldKeys.length &&
    phoneRegex.test(profile.phone.trim()) &&
    profileFieldKeys.every((f) => fieldErrors[f].length === 0);

  const saveProfile = () => {
    const nextErrors = profileFieldKeys.reduce(
      (acc, field) => {
        const value = profile[field].trim();
        if (!value) acc[field] = `${fieldLabels[field]} is required.`;
        else if (field === 'phone' && !phoneRegex.test(value))
          acc[field] = 'Phone may only contain numbers.';
        else acc[field] = '';
        return acc;
      },
      {} as Record<ProfileFieldKey, string>
    );
    setFieldErrors(nextErrors);
    if (!profileFieldKeys.some((f) => nextErrors[f])) setIsSaved(true);
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: 3, py: 5 }}>
      {/* Header */}
      <Typography variant="h4" fontWeight={700} mb={0.5}>
        Complete your profile
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Fill in your details to finish setting up your account.
      </Typography>

      {/* Progress card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Profile completion
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {progressPercent}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{
              height: 10,
              borderRadius: 999,
              backgroundColor: 'divider',
              '& .MuiLinearProgress-bar': { borderRadius: 999 },
            }}
          />
        </CardContent>
      </Card>

      {/* About card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={2}>
            About you
          </Typography>
          <TextField
            id="bio"
            label={fieldLabels.bio}
            placeholder={fieldPlaceholders.bio}
            value={profile.bio}
            onChange={(e) => updateField('bio', e.target.value)}
            error={!!fieldErrors.bio}
            helperText={fieldErrors.bio}
            multiline
            rows={4}
            fullWidth
          />
        </CardContent>
      </Card>

      {/* Personal details card */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Personal details
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              id="firstName"
              label={fieldLabels.firstName}
              placeholder={fieldPlaceholders.firstName}
              value={profile.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
              error={!!fieldErrors.firstName}
              helperText={fieldErrors.firstName}
              fullWidth
            />
            <TextField
              id="lastName"
              label={fieldLabels.lastName}
              placeholder={fieldPlaceholders.lastName}
              value={profile.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
              error={!!fieldErrors.lastName}
              helperText={fieldErrors.lastName}
              fullWidth
            />
            <TextField
              id="city"
              label={fieldLabels.city}
              placeholder={fieldPlaceholders.city}
              value={profile.city}
              onChange={(e) => updateField('city', e.target.value)}
              error={!!fieldErrors.city}
              helperText={fieldErrors.city}
              fullWidth
            />
            <TextField
              id="phone"
              label={fieldLabels.phone}
              placeholder={fieldPlaceholders.phone}
              value={profile.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              error={!!fieldErrors.phone}
              helperText={fieldErrors.phone}
              type="tel"
              fullWidth
            />
          </Box>
          <Button
            variant="contained"
            onClick={saveProfile}
            disabled={!canSave}
            fullWidth
            sx={{ mt: 3, py: 1.5 }}
          >
            {isSaved ? 'Saved' : 'Save profile'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

export default ProfilePage;

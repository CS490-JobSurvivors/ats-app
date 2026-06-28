import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material';
import { supabase } from '../utils/supabaseClient';
import { saveProfile, ProfileRecord } from '../api/profile';
import { useProfile } from '../contexts/ProfileContext';
import { listExperiences, ExperienceRecord } from '../api/experiences';
import { listSkills, SkillRecord } from '../api/skills';
import { getCareerPreferences, CareerPreferenceRecord } from '../api/careerPreferences';
import { listEducation, EducationRecord } from '../api/education';
import EducationSection from '../components/EducationSection';
import ExperienceSection from '../components/ExperienceSection';
import SkillsSection from '../components/SkillsSection';
import CareerPreferencesSection from '../components/CareerPreferencesSection';

export interface ProfileFields {
  bio: string;
  firstName: string;
  lastName: string;
  city: string;
  phone: string;
}

type ProfileFieldKey = keyof ProfileFields;

const emptyProfile: ProfileFields = {
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

const phoneRegex = /^[0-9]{7,15}$/;

const recordToFields = (r: ProfileRecord): ProfileFields => ({
  bio: r.summary,
  firstName: r.first_name,
  lastName: r.last_name,
  city: r.city,
  phone: r.phone_number,
});

// ---------------------------------------------------------------------------
// View mode — shown after a successful save
// ---------------------------------------------------------------------------

const ProfileView = ({
  profile,
  onEdit,
  experiences,
  skills,
  preferences,
  accessToken,
  onExperiencesChange,
  onSkillsChange,
  onPreferencesChange,
  educations,
  onEducationsChange,
}: {
  profile: ProfileFields;
  onEdit: () => void;
  experiences: ExperienceRecord[];
  skills: SkillRecord[];
  preferences: CareerPreferenceRecord | null;
  accessToken: string;
  onExperiencesChange: (updated: ExperienceRecord[]) => void;
  onSkillsChange: (updated: SkillRecord[]) => void;
  onPreferencesChange: (updated: CareerPreferenceRecord) => void;
  educations: EducationRecord[];
  onEducationsChange: (updated: EducationRecord[]) => void;
}) => (
  <Box sx={{ maxWidth: 900, mx: 'auto', px: 3, py: 5 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
      <Box>
        <Typography variant="h4" fontWeight={700} mb={0.5} sx={{ wordBreak: 'break-word' }}>
          {profile.firstName} {profile.lastName}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {profile.city}
        </Typography>
      </Box>
      <Button variant="outlined" onClick={onEdit}>
        Edit profile
      </Button>
    </Box>

    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={600} mb={1}>
          About
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body1">{profile.bio}</Typography>
      </CardContent>
    </Card>

    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={600} mb={1}>
          Contact
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Phone
            </Typography>
            <Typography variant="body1">{profile.phone}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              City
            </Typography>
            <Typography variant="body1">{profile.city}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>

    <ExperienceSection
      experiences={experiences}
      accessToken={accessToken}
      onExperiencesChange={onExperiencesChange}
    />
    <EducationSection
      educations={educations}
      accessToken={accessToken}
      onEducationsChange={onEducationsChange}
    />
    <SkillsSection skills={skills} accessToken={accessToken} onSkillsChange={onSkillsChange} />
    <CareerPreferencesSection
      preferences={preferences}
      accessToken={accessToken}
      onPreferencesChange={onPreferencesChange}
    />
  </Box>
);

// ---------------------------------------------------------------------------
// Profile page
// ---------------------------------------------------------------------------

function ProfilePage() {
  const { profile: cachedProfile, loading, setProfile: setCachedProfile } = useProfile();
  const [profile, setProfile] = useState<ProfileFields>(emptyProfile);
  const [fieldErrors, setFieldErrors] = useState<Record<ProfileFieldKey, string>>(
    profileFieldKeys.reduce(
      (acc, k) => ({ ...acc, [k]: '' }),
      {} as Record<ProfileFieldKey, string>
    )
  );
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [experiences, setExperiences] = useState<ExperienceRecord[]>([]);
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [preferences, setPreferences] = useState<CareerPreferenceRecord | null>(null);
  const [educations, setEducations] = useState<EducationRecord[]>([]);
  const [accessToken, setAccessToken] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
      setAccessToken(token);
      listExperiences(token)
        .then(setExperiences)
        .catch(() => {});
      listSkills(token)
        .then(setSkills)
        .catch(() => {});
      getCareerPreferences(token)
        .then(setPreferences)
        .catch(() => {});
      listEducation(token)
        .then(setEducations)
        .catch(() => {});
    });
  }, []);

  const handleEdit = () => {
    if (cachedProfile) setProfile(recordToFields(cachedProfile));
    setIsEditing(true);
  };

  const updateField = (field: ProfileFieldKey, value: string) => {
    let nextValue = value;
    let errorMessage = '';
    if (field === 'bio') {
      nextValue = value.slice(0, 500);
    } else if (field === 'phone') {
      nextValue = value.replace(/\D/g, '').slice(0, 15);
      if (value !== nextValue) errorMessage = 'Phone may only contain numbers (max 15 digits).';
    }
    setProfile((c) => ({ ...c, [field]: nextValue }));
    setFieldErrors((c) => ({ ...c, [field]: errorMessage }));
  };

  const completedCount = profileFieldKeys.filter((f) => profile[f].trim().length > 0).length;
  const progressPercent = Math.round((completedCount / profileFieldKeys.length) * 100);
  const handleSave = async () => {
    const nextErrors = profileFieldKeys.reduce(
      (acc, field) => {
        const value = profile[field].trim();
        if (!value) acc[field] = `${fieldLabels[field]} is required.`;
        else if (field === 'phone' && !phoneRegex.test(value))
          acc[field] = 'Phone must be between 7 and 15 digits.';
        else acc[field] = '';
        return acc;
      },
      {} as Record<ProfileFieldKey, string>
    );

    setFieldErrors(nextErrors);
    if (profileFieldKeys.some((f) => nextErrors[f])) return;

    setSaving(true);
    setSaveError('');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated.');

      const saved = await saveProfile(session.access_token, {
        first_name: profile.firstName.trim(),
        last_name: profile.lastName.trim(),
        city: profile.city.trim(),
        phone_number: profile.phone.trim(),
        summary: profile.bio.trim(),
      });

      setCachedProfile(saved);
      setIsEditing(false);
    } catch {
      setSaveError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  if (cachedProfile && !isEditing) {
    return (
      <ProfileView
        profile={recordToFields(cachedProfile)}
        onEdit={handleEdit}
        experiences={experiences}
        skills={skills}
        preferences={preferences}
        accessToken={accessToken}
        onExperiencesChange={setExperiences}
        onSkillsChange={setSkills}
        onPreferencesChange={setPreferences}
        educations={educations}
        onEducationsChange={setEducations}
      />
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: 3, py: 5 }}>
      <Typography variant="h4" fontWeight={700} mb={0.5}>
        Complete your profile
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        Fill in your details to finish setting up your account.
      </Typography>

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

      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {saveError}
        </Alert>
      )}

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
            multiline
            rows={4}
            fullWidth
            inputProps={{ maxLength: 500 }}
            helperText={`${profile.bio.length}/500`}
          />
          {fieldErrors.bio && (
            <Alert severity="error" sx={{ mt: 0.5 }}>
              {fieldErrors.bio}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Personal details
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <TextField
                id="firstName"
                label={fieldLabels.firstName}
                placeholder={fieldPlaceholders.firstName}
                value={profile.firstName}
                onChange={(e) => updateField('firstName', e.target.value)}
                error={!!fieldErrors.firstName}
                inputProps={{ maxLength: 35 }}
                fullWidth
              />
              {fieldErrors.firstName && (
                <Alert severity="error" sx={{ mt: 0.5 }}>
                  {fieldErrors.firstName}
                </Alert>
              )}
            </Box>
            <Box>
              <TextField
                id="lastName"
                label={fieldLabels.lastName}
                placeholder={fieldPlaceholders.lastName}
                value={profile.lastName}
                onChange={(e) => updateField('lastName', e.target.value)}
                error={!!fieldErrors.lastName}
                inputProps={{ maxLength: 35 }}
                fullWidth
              />
              {fieldErrors.lastName && (
                <Alert severity="error" sx={{ mt: 0.5 }}>
                  {fieldErrors.lastName}
                </Alert>
              )}
            </Box>
            <Box>
              <TextField
                id="city"
                label={fieldLabels.city}
                placeholder={fieldPlaceholders.city}
                value={profile.city}
                onChange={(e) => updateField('city', e.target.value)}
                error={!!fieldErrors.city}
                fullWidth
              />
              {fieldErrors.city && (
                <Alert severity="error" sx={{ mt: 0.5 }}>
                  {fieldErrors.city}
                </Alert>
              )}
            </Box>
            <Box>
              <TextField
                id="phone"
                label={fieldLabels.phone}
                placeholder={fieldPlaceholders.phone}
                value={profile.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                error={!!fieldErrors.phone}
                type="tel"
                fullWidth
              />
              {fieldErrors.phone && (
                <Alert severity="error" sx={{ mt: 0.5 }}>
                  {fieldErrors.phone}
                </Alert>
              )}
            </Box>
          </Box>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            fullWidth
            sx={{ mt: 3, py: 1.5 }}
          >
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
        </CardContent>
      </Card>

      <ExperienceSection
        experiences={experiences}
        accessToken={accessToken}
        onExperiencesChange={setExperiences}
      />
      <EducationSection
        educations={educations}
        accessToken={accessToken}
        onEducationsChange={setEducations}
      />
      <SkillsSection skills={skills} accessToken={accessToken} onSkillsChange={setSkills} />
      <CareerPreferencesSection
        preferences={preferences}
        accessToken={accessToken}
        onPreferencesChange={setPreferences}
      />
    </Box>
  );
}

export default ProfilePage;

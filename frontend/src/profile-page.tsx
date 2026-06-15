import React, { useState } from 'react';

export interface ProfileFields {
  bio: string;
  firstName: string;
  lastName: string;
  address: string;
  phone: string;
}

type ProfileFieldKey = keyof ProfileFields;

const initialProfile: ProfileFields = {
  bio: '',
  firstName: '',
  lastName: '',
  address: '',
  phone: '',
};

const profileFieldKeys: ProfileFieldKey[] = ['bio', 'firstName', 'lastName', 'address', 'phone'];

const fieldLabels: Record<ProfileFieldKey, string> = {
  bio: 'About',
  firstName: 'First name',
  lastName: 'Last name',
  address: 'Address',
  phone: 'Phone #',
};

const fieldPlaceholders: Record<ProfileFieldKey, string> = {
  bio: 'Tell us about yourself',
  firstName: 'Enter your first name',
  lastName: 'Enter your last name',
  address: 'Enter your address',
  phone: 'Enter your phone number',
};

const fieldTypes: Record<ProfileFieldKey, string> = {
  bio: 'text',
  firstName: 'text',
  lastName: 'text',
  address: 'text',
  phone: 'tel',
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
      if (value !== nextValue) {
        errorMessage = 'Phone may only contain numbers.';
      }
    }

    setProfile((current) => ({ ...current, [field]: nextValue }));
    setFieldErrors((current) => ({ ...current, [field]: errorMessage }));
    setIsSaved(false);
  };

  const completedCount = profileFieldKeys.filter(
    (field) => profile[field].trim().length > 0
  ).length;
  const progressPercent = Math.round((completedCount / profileFieldKeys.length) * 100);
  const canSave =
    completedCount === profileFieldKeys.length &&
    profile.phone.trim().length > 0 &&
    phoneRegex.test(profile.phone.trim()) &&
    profileFieldKeys.every((field) => fieldErrors[field].length === 0);

  const saveProfile = () => {
    const nextErrors = profileFieldKeys.reduce(
      (acc, field) => {
        const value = profile[field].trim();

        if (value.length === 0) {
          acc[field] = `${fieldLabels[field]} is required.`;
        } else if (field === 'phone' && !phoneRegex.test(value)) {
          acc[field] = 'Phone may only contain numbers.';
        } else {
          acc[field] = '';
        }

        return acc;
      },
      {} as Record<ProfileFieldKey, string>
    );

    setFieldErrors(nextErrors);

    const hasErrors = profileFieldKeys.some((field) => nextErrors[field].length > 0);
    if (!hasErrors) {
      setIsSaved(true);
    }
  };

  return (
    <main className="profile-page">
      <section className="profile-panel">
        <div className="profile-header">
          <h1>Complete your profile</h1>
          <p>Fill in your details to finish setting up your account.</p>
        </div>

        <div className="profile-progress">
          <div className="profile-progress-label">Profile completion: {progressPercent}%</div>
          <div className="profile-progress-bar" aria-hidden="true">
            <div className="profile-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="profile-fields">
          {profileFieldKeys.map((field) => (
            <div key={field} className="profile-field-row">
              <label htmlFor={field}>{fieldLabels[field]}</label>
              <div className="profile-field-input-row">
                {field === 'bio' ? (
                  <textarea
                    id={field}
                    name={field}
                    value={profile[field]}
                    onChange={(e) => updateField(field, e.target.value)}
                    placeholder={fieldPlaceholders[field]}
                    rows={4}
                  />
                ) : (
                  <input
                    id={field}
                    name={field}
                    type={fieldTypes[field]}
                    value={profile[field]}
                    onChange={(e) => updateField(field, e.target.value)}
                    placeholder={fieldPlaceholders[field]}
                  />
                )}
              </div>
              {fieldErrors[field] ? <div className="field-error">{fieldErrors[field]}</div> : null}
            </div>
          ))}
        </div>
        <button
          type="button"
          className="save-profile-button"
          onClick={saveProfile}
          disabled={!canSave}
        >
          {isSaved ? 'Saved' : 'Save profile'}
        </button>
      </section>
    </main>
  );
}

export default ProfilePage;

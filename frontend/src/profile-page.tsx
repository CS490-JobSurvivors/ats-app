import React, { useState } from 'react';

export interface ProfileFields {
  userId: string;
  bio: string;
  username: string;
  firstName: string;
  lastName: string;
  address: string;
  phone: string;
  email: string;
}

type ProfileFieldKey = keyof Omit<ProfileFields, 'userId'>;

const initialProfile: ProfileFields = {
  userId: '00000000-0000-0000-0000-000000000000',
  bio: '',
  username: '',
  firstName: '',
  lastName: '',
  address: '',
  phone: '',
  email: '',
};

const profileFieldKeys: ProfileFieldKey[] = [
  'bio',
  'username',
  'firstName',
  'lastName',
  'address',
  'phone',
  'email',
];

const fieldLabels: Record<ProfileFieldKey, string> = {
  bio: 'Bio',
  username: 'Username',
  firstName: 'First name',
  lastName: 'Last name',
  address: 'Address',
  phone: 'Phone #',
  email: 'Email',
};

const fieldPlaceholders: Record<ProfileFieldKey, string> = {
  bio: 'Write a short bio about yourself',
  username: 'Choose a unique username',
  firstName: 'Enter your first name',
  lastName: 'Enter your last name',
  address: 'Enter your address',
  phone: 'Enter your phone number',
  email: 'Enter your email address',
};

const fieldTypes: Record<ProfileFieldKey, string> = {
  bio: 'text',
  username: 'text',
  firstName: 'text',
  lastName: 'text',
  address: 'text',
  phone: 'tel',
  email: 'email',
};

const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phoneRegex = /^[0-9]+$/;

function ProfilePage() {
  const [profile, setProfile] = useState<ProfileFields>(initialProfile);
  const [savedFields, setSavedFields] = useState<Record<ProfileFieldKey, boolean>>(
    profileFieldKeys.reduce(
      (acc, key) => ({ ...acc, [key]: false }),
      {} as Record<ProfileFieldKey, boolean>
    )
  );
  const [fieldErrors, setFieldErrors] = useState<Record<ProfileFieldKey, string>>(
    profileFieldKeys.reduce(
      (acc, key) => ({ ...acc, [key]: '' }),
      {} as Record<ProfileFieldKey, string>
    )
  );

  const isValidEmail = (value: string) => emailRegex.test(value.trim());
  const isValidPhone = (value: string) => phoneRegex.test(value.trim());

  const updateField = (field: ProfileFieldKey, value: string) => {
    if (savedFields[field]) return;

    let sanitizedValue = value;
    let errorMessage = '';

    if (field === 'phone') {
      const digitsOnly = value.replace(/\D/g, '');
      sanitizedValue = digitsOnly;
      if (value !== digitsOnly) {
        errorMessage = 'Phone may only contain numbers.';
      }
    }

    if (field === 'email') {
      if (sanitizedValue.trim().length > 0 && !isValidEmail(sanitizedValue)) {
        errorMessage = 'Enter a valid email address.';
      }
    }

    setProfile((current) => ({ ...current, [field]: sanitizedValue }));
    setFieldErrors((current) => ({ ...current, [field]: errorMessage }));
  };

  const saveField = (field: ProfileFieldKey) => {
    const value = profile[field].trim();
    if (value.length === 0) {
      setFieldErrors((current) => ({
        ...current,
        [field]: `${fieldLabels[field]} is required.`,
      }));
      return;
    }

    if (field === 'email' && !isValidEmail(value)) {
      setFieldErrors((current) => ({
        ...current,
        email: 'Enter a valid email address.',
      }));
      return;
    }

    if (field === 'phone' && !isValidPhone(value)) {
      setFieldErrors((current) => ({
        ...current,
        phone: 'Phone may only contain numbers.',
      }));
      return;
    }

    setSavedFields((current) => ({ ...current, [field]: true }));
    setFieldErrors((current) => ({ ...current, [field]: '' }));
  };

  const completedCount = profileFieldKeys.filter((field) => savedFields[field]).length;
  const progressPercent = Math.round((completedCount / profileFieldKeys.length) * 100);

  return (
    <main className="profile-page">
      <section className="profile-card">
        <h1>Complete your profile</h1>

        <div className="profile-progress">
          <div className="profile-progress-label">Profile completion: {progressPercent}%</div>
          <div className="profile-progress-bar">
            <div className="profile-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="profile-summary-row">
          <div>
            <strong>User ID:</strong> {profile.userId}
          </div>
        </div>

        <div className="profile-fields">
          {profileFieldKeys.map((field) => (
            <div key={field} className="profile-field-row">
              <label htmlFor={field}>{fieldLabels[field]}</label>
              <div className="profile-field-input-row">
                {fieldTypes[field] === 'text' && field === 'bio' ? (
                  <textarea
                    id={field}
                    name={field}
                    value={profile[field]}
                    onChange={(e) => updateField(field, e.target.value)}
                    placeholder={fieldPlaceholders[field]}
                    disabled={savedFields[field]}
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
                    disabled={savedFields[field]}
                    pattern={field === 'email' ? emailRegex.source : undefined}
                    title={
                      field === 'email'
                        ? 'Enter a valid email address, e.g. user@example.com'
                        : undefined
                    }
                  />
                )}
                <button
                  type="button"
                  className="save-field-button"
                  onClick={() => saveField(field)}
                  disabled={savedFields[field] || profile[field].trim().length === 0}
                >
                  {savedFields[field] ? 'Saved' : 'Save'}
                </button>
              </div>
              {fieldErrors[field] ? <div className="field-error">{fieldErrors[field]}</div> : null}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default ProfilePage;

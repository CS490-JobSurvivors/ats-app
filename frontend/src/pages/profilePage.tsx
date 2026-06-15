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

function ProfilePage() {
  const [profile, setProfile] = useState<ProfileFields>(initialProfile);
  const [savedFields, setSavedFields] = useState<Record<ProfileFieldKey, boolean>>(
    profileFieldKeys.reduce(
      (acc, key) => ({ ...acc, [key]: false }),
      {} as Record<ProfileFieldKey, boolean>
    )
  );

  const updateField = (field: ProfileFieldKey, value: string) => {
    if (savedFields[field]) return;
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const saveField = (field: ProfileFieldKey) => {
    if (profile[field].trim().length === 0) return;
    setSavedFields((current) => ({ ...current, [field]: true }));
  };

  return (
    <main className="profile-page">
      <section className="profile-card">
        <h1>Complete your profile</h1>

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
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default ProfilePage;

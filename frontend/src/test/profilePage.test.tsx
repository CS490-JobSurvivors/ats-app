import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import ProfilePage from '../pages/profilePage';

const fillProfileForm = () => {
  fireEvent.change(screen.getByLabelText(/about/i), {
    target: { value: 'I am preparing my profile.' },
  });
  fireEvent.change(screen.getByLabelText(/first name/i), {
    target: { value: 'Alex' },
  });
  fireEvent.change(screen.getByLabelText(/last name/i), {
    target: { value: 'Morgan' },
  });
  fireEvent.change(screen.getByLabelText(/address/i), {
    target: { value: '123 Main Street' },
  });
  fireEvent.change(screen.getByLabelText(/phone/i), {
    target: { value: '5551234567' },
  });
};

describe('ProfilePage', () => {
  test('renders the profile fields without account identity fields', () => {
    render(<ProfilePage />);

    expect(screen.getByRole('heading', { name: /complete your profile/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/about/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/user id/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument();
  });

  test('updates the completion bar as fields are completed', () => {
    render(<ProfilePage />);

    expect(screen.getByText(/profile completion: 0%/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/about/i), {
      target: { value: 'I am preparing my profile.' },
    });
    expect(screen.getByText(/profile completion: 20%/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: 'Alex' },
    });
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: 'Morgan' },
    });
    fireEvent.change(screen.getByLabelText(/address/i), {
      target: { value: '123 Main Street' },
    });
    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { value: '5551234567' },
    });

    expect(screen.getByText(/profile completion: 100%/i)).toBeInTheDocument();
  });

  test('requires a fully valid profile before saving', () => {
    render(<ProfilePage />);

    const saveButton = screen.getByRole('button', { name: /save profile/i });
    expect(saveButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/phone/i), {
      target: { value: '555-123' },
    });

    expect(screen.getByLabelText(/phone/i)).toHaveValue('555123');
    expect(screen.getByText(/phone may only contain numbers/i)).toBeInTheDocument();
    expect(saveButton).toBeDisabled();

    fillProfileForm();

    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);
    expect(screen.getByRole('button', { name: /saved/i })).toBeInTheDocument();
  });
});

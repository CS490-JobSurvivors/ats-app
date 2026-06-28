// dashboardSort.test.tsx
// Tests for DashboardPage job-card sorting — verifies the sort field selector,
// the ascending/descending toggle, and deadline null-handling.

import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '../pages/dashboardPage';
import { supabase } from '../utils/supabaseClient';
import { listJobs } from '../api/jobs';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('../api/jobs', () => ({
  listJobs: jest.fn(),
  listJobActivity: jest.fn(),
  listJobInterviews: jest.fn(),
  listJobFollowUps: jest.fn(),
  createJob: jest.fn(),
  updateJob: jest.fn(),
  createJobInterview: jest.fn(),
  updateJobInterview: jest.fn(),
  createJobFollowUp: jest.fn(),
  updateJobFollowUp: jest.fn(),
  deleteJobFollowUp: jest.fn(),
}));

const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockListJobs = listJobs as jest.Mock;

// ---------------------------------------------------------------------------
// Fixtures & helpers
// ---------------------------------------------------------------------------

// Each field (company, created_at, updated_at, deadline) is intentionally given
// a distinct ordering so a single sort key produces an unambiguous order.
const JOB_TITLES = ['Alpha Role', 'Beta Role', 'Gamma Role'] as const;

const jobFixtures = [
  {
    job_id: 'job-1',
    company_name: 'Acme', // company asc -> first
    job_title: 'Alpha Role',
    job_description: 'Alpha description',
    application_link: null,
    job_location: 'Remote',
    deadline: '2026-07-10', // latest deadline
    job_stage: 'Applied',
    job_poster_id: 'user-1',
    updated_at: '2026-06-03T00:00:00Z', // most recent activity
    created_at: '2026-01-01T00:00:00Z', // oldest creation
  },
  {
    job_id: 'job-2',
    company_name: 'Zeta', // company asc -> last
    job_title: 'Beta Role',
    job_description: 'Beta description',
    application_link: null,
    job_location: 'Remote',
    deadline: '2026-07-05', // earliest deadline
    job_stage: 'Interview',
    job_poster_id: 'user-1',
    updated_at: '2026-06-01T00:00:00Z', // oldest activity
    created_at: '2026-03-01T00:00:00Z', // newest creation
  },
  {
    job_id: 'job-3',
    company_name: 'Mango', // company asc -> middle
    job_title: 'Gamma Role',
    job_description: 'Gamma description',
    application_link: null,
    job_location: 'Remote',
    deadline: null, // no deadline -> always sorts last
    job_stage: 'Interested',
    job_poster_id: 'user-1',
    updated_at: '2026-06-02T00:00:00Z', // middle activity
    created_at: '2026-02-01T00:00:00Z', // middle creation
  },
];

// Returns the rendered job-card titles in DOM order. Job titles render as h6
// headings, so we filter out the dashboard's other h6 headings (stat cards, etc).
const getRenderedOrder = () =>
  screen
    .getAllByRole('heading', { level: 6 })
    .map((heading) => heading.textContent)
    .filter((text): text is string => JOB_TITLES.includes(text as (typeof JOB_TITLES)[number]));

// Picks a sort field from the "Sort by" select.
const chooseSort = async (optionName: RegExp) => {
  await userEvent.click(screen.getByLabelText(/sort by/i));
  const listbox = await screen.findByRole('listbox');
  await userEvent.click(within(listbox).getByRole('option', { name: optionName }));
};

// Toggles the sort order. Tooltip title (and thus accessible name) reflects the
// current order: "Descending" by default, "Ascending" after one toggle.
const toggleOrder = async () => {
  await userEvent.click(screen.getByRole('button', { name: /descending|ascending/i }));
};

beforeEach(() => {
  mockGetSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } });
  mockListJobs.mockResolvedValue(jobFixtures);
});

afterEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Dashboard job sorting Tests
// ---------------------------------------------------------------------------

describe('DashboardPage sorting', () => {
  describe('rendering', () => {
    it('should render the sort controls with last activity and descending defaults', async () => {
      // Arrange / Act
      render(<DashboardPage />);
      await screen.findByText('Alpha Role');

      // Assert
      expect(screen.getByLabelText(/sort by/i)).toHaveTextContent(/last activity/i);
      expect(screen.getByRole('button', { name: /descending/i })).toBeInTheDocument();
    });

    it('should sort by last activity descending by default', async () => {
      // Arrange / Act
      render(<DashboardPage />);
      await screen.findByText('Alpha Role');

      // Assert — newest updated_at first
      expect(getRenderedOrder()).toEqual(['Alpha Role', 'Gamma Role', 'Beta Role']);
    });
  });

  describe('sort order toggle', () => {
    it('should reverse the order to ascending when the toggle is clicked', async () => {
      // Arrange
      render(<DashboardPage />);
      await screen.findByText('Alpha Role');

      // Act
      await toggleOrder();

      // Assert — oldest updated_at first
      expect(screen.getByRole('button', { name: /ascending/i })).toBeInTheDocument();
      expect(getRenderedOrder()).toEqual(['Beta Role', 'Gamma Role', 'Alpha Role']);
    });

    it('should return to descending when the toggle is clicked twice', async () => {
      // Arrange
      render(<DashboardPage />);
      await screen.findByText('Alpha Role');

      // Act
      await toggleOrder();
      await toggleOrder();

      // Assert
      expect(screen.getByRole('button', { name: /descending/i })).toBeInTheDocument();
      expect(getRenderedOrder()).toEqual(['Alpha Role', 'Gamma Role', 'Beta Role']);
    });

    it('should preserve the selected order when the sort field changes', async () => {
      // Arrange
      render(<DashboardPage />);
      await screen.findByText('Alpha Role');
      await toggleOrder(); // switch to ascending

      // Act
      await chooseSort(/company/i);

      // Assert — company name ascending, order toggle still ascending
      expect(screen.getByRole('button', { name: /ascending/i })).toBeInTheDocument();
      expect(getRenderedOrder()).toEqual(['Alpha Role', 'Gamma Role', 'Beta Role']);
    });
  });

  describe('sort field selection', () => {
    it('should sort by created date descending when selected', async () => {
      // Arrange
      render(<DashboardPage />);
      await screen.findByText('Alpha Role');

      // Act
      await chooseSort(/created date/i);

      // Assert — newest created_at first
      expect(getRenderedOrder()).toEqual(['Beta Role', 'Gamma Role', 'Alpha Role']);
    });

    it('should sort by created date ascending when toggled', async () => {
      // Arrange
      render(<DashboardPage />);
      await screen.findByText('Alpha Role');

      // Act
      await chooseSort(/created date/i);
      await toggleOrder();

      // Assert — oldest created_at first
      expect(getRenderedOrder()).toEqual(['Alpha Role', 'Gamma Role', 'Beta Role']);
    });

    it('should sort by company name descending when selected', async () => {
      // Arrange
      render(<DashboardPage />);
      await screen.findByText('Alpha Role');

      // Act
      await chooseSort(/company/i);

      // Assert — Zeta, Mango, Acme
      expect(getRenderedOrder()).toEqual(['Beta Role', 'Gamma Role', 'Alpha Role']);
    });

    it('should sort by company name ascending when toggled', async () => {
      // Arrange
      render(<DashboardPage />);
      await screen.findByText('Alpha Role');

      // Act
      await chooseSort(/company/i);
      await toggleOrder();

      // Assert — Acme, Mango, Zeta
      expect(getRenderedOrder()).toEqual(['Alpha Role', 'Gamma Role', 'Beta Role']);
    });
  });

  describe('deadline sorting edge cases', () => {
    it('should place jobs without a deadline last when sorting descending', async () => {
      // Arrange
      render(<DashboardPage />);
      await screen.findByText('Alpha Role');

      // Act
      await chooseSort(/deadline/i);

      // Assert — latest deadline first, null deadline last
      expect(getRenderedOrder()).toEqual(['Alpha Role', 'Beta Role', 'Gamma Role']);
    });

    it('should still place jobs without a deadline last when sorting ascending', async () => {
      // Arrange
      render(<DashboardPage />);
      await screen.findByText('Alpha Role');

      // Act
      await chooseSort(/deadline/i);
      await toggleOrder();

      // Assert — earliest deadline first, null deadline still last
      expect(getRenderedOrder()).toEqual(['Beta Role', 'Alpha Role', 'Gamma Role']);
    });
  });
});

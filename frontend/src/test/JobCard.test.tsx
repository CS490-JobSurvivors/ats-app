import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import JobCard from '../components/JobCard';

const mockProps = {
  title: 'Software Engineer',
  company: 'Acme Corp',
  stage: 'Applied',
  lastActivity: '6/25/2026',
  onEdit: jest.fn(),
  onClick: jest.fn(),
};

describe('JobCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders job title, company, stage, and last activity', () => {
    render(<JobCard {...mockProps} />);
    expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Applied')).toBeInTheDocument();
    expect(screen.getByText(/Last activity/)).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    render(<JobCard {...mockProps} />);
    fireEvent.click(screen.getByText('Software Engineer'));
    expect(mockProps.onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit when edit icon is clicked and does not trigger onClick', () => {
    render(<JobCard {...mockProps} />);
    fireEvent.click(screen.getByLabelText('Edit Software Engineer'));
    expect(mockProps.onEdit).toHaveBeenCalledTimes(1);
    expect(mockProps.onClick).not.toHaveBeenCalled();
  });

  it('renders correct stage chip for each canonical stage', () => {
    const stages = ['Interested', 'Applied', 'Interview', 'Offer', 'Rejected', 'Archived'];
    stages.forEach((stage) => {
      const { unmount } = render(<JobCard {...mockProps} stage={stage} />);
      expect(screen.getByText(stage)).toBeInTheDocument();
      unmount();
    });
  });

  it('renders fallback style for unknown stage', () => {
    render(<JobCard {...mockProps} stage="Unknown" />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});

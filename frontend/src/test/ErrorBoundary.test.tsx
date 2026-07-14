import React, { act } from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary';

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error('Test error');
  return <div>Normal content</div>;
};

const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

afterAll(() => {
  consoleSpy.mockRestore();
});

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('renders fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
  });

  it('shows a try again button in the fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('resets error state when try again is clicked', () => {
    let setThrows: (v: boolean) => void = () => {};

    const Wrapper = () => {
      const [throws, setT] = React.useState(true);
      setThrows = setT;
      return (
        <ErrorBoundary>
          <ThrowError shouldThrow={throws} />
        </ErrorBoundary>
      );
    };

    render(<Wrapper />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    act(() => setThrows(false));
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('does not show fallback UI when no error has occurred', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });
});

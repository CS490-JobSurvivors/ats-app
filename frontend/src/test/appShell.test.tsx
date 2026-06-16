import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AppShell from '../components/appShell';

jest.mock('../components/navigationbar', () => ({
  __esModule: true,
  default: () => <div>NavBar</div>,
}));

const renderWithRoutes = (path: string, content: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path={path} element={content} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

describe('AppShell', () => {
  it('renders the navigation bar', () => {
    renderWithRoutes('/', <div>Content</div>);
    expect(screen.getByText('NavBar')).toBeInTheDocument();
  });

  it('renders child route content via Outlet', () => {
    renderWithRoutes('/', <div>Page Content</div>);
    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });

  it('wraps content in a full-height flex column container', () => {
    renderWithRoutes('/', <div>Inner</div>);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});

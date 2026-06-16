import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import AppShell from './components/appShell';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPage from './pages/dashboardPage';
import LoginPage from './pages/loginPage';
import ErrorPage from './pages/errorPage';
import SignupPage from './pages/signupPage';
import ProfilePage from './pages/profilePage';
import SettingsPage from './pages/settingsPage';
import { ProfileProvider } from './contexts/ProfileContext';
import theme from './theme';
import './App.css';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ProfileProvider>
        <Router>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<ErrorPage />} />
            </Route>
          </Routes>
        </Router>
      </ProfileProvider>
    </ThemeProvider>
  );
}

export default App;

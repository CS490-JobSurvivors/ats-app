import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/dashboardPage';
import LoginPage from './pages/loginPage';
import ErrorPage from './pages/errorPage';
import SignupPage from './pages/signupPage';
import ProfilePage from './pages/profilePage';
import SettingsPage from './pages/settingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';
import AppShell from './components/appShell';

function App() {
  return (
    <Router>
      <AppShell />
      <Routes>
        <Route path="*" element={<ErrorPage />} />
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
              <div className="App">
                <ProfilePage />
              </div>
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
      </Routes>
    </Router>
  );
}

export default App;

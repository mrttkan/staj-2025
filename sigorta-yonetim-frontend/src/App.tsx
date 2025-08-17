import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Dashboard from './components/Dashboard';
import './App.css';
import './components/CommonButtonStyles.css';

function AppContent() {
  const { isAuthenticated, isLoading, user, token } = useAuth();

  if (isLoading) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Sigorta Yönetim Platformu</h1>
          <p>Yükleniyor...</p>
        </header>
      </div>
    );
  }

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={
          isAuthenticated ? (
            <Dashboard user={user} token={token} />
          ) : (
            <Navigate to="/login" replace />
          )
        } />
        <Route path="/login" element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Login />
          )
        } />
        <Route path="/register" element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <Register />
          )
        } />
        <Route path="/forgot-password" element={
          isAuthenticated ? (
            <Navigate to="/" replace />
          ) : (
            <ForgotPassword />
          )
        } />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
    <div className="App">
        <AppContent />
            </div>
    </AuthProvider>
  );
}

export default App;

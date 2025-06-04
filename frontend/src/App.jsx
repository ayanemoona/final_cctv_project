// src/App.jsx
import React, { useState } from 'react';
import { LoginPage } from './pages/LoginPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { CaseTrackingPage } from './pages/CaseTrackingPage.jsx';
import { useAuth } from './hooks/useAuth.js';
import { LoadingSpinner } from './components/common/LoadingSpinner.jsx';

// 스타일 파일들 import
import './styles/globals.css';
import './styles/utilities.css';
import './styles/colors.css';
import './styles/typography.css';
import './styles/components.css';
import './styles/tracking.css';

function App() {
  const { user, loading, isAuthenticated, login, logout } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedCase, setSelectedCase] = useState(null);

  const handleSelectCase = (case_) => {
    setSelectedCase(case_);
    setCurrentView('tracking');
  };

  const handleBackToDashboard = () => {
    setSelectedCase(null);
    setCurrentView('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="시스템을 준비하고 있습니다..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }

  if (currentView === 'tracking' && selectedCase) {
    return (
      <CaseTrackingPage 
        case_={selectedCase}
        user={user}
        onBack={handleBackToDashboard}
      />
    );
  }

  return (
    <DashboardPage 
      user={user}
      onLogout={logout}
      onSelectCase={handleSelectCase}
    />
  );
}

export default App;
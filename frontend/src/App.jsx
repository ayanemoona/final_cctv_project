// src/App.jsx - React Router 적용 버전
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// 보호된 라우트 컴포넌트
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" message="시스템을 준비하고 있습니다..." />
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// 케이스 추적 페이지 래퍼
const CaseTrackingWrapper = () => {
  const { user, logout } = useAuth();
  
  return (
    <ProtectedRoute>
      <CaseTrackingPage 
        user={user}
        onLogout={logout}
      />
    </ProtectedRoute>
  );
};

// 대시보드 페이지 래퍼
const DashboardWrapper = () => {
  const { user, logout } = useAuth();
  
  return (
    <ProtectedRoute>
      <DashboardPage 
        user={user}
        onLogout={logout}
      />
    </ProtectedRoute>
  );
};

// 로그인 페이지 래퍼
const LoginWrapper = () => {
  const { login, isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }
  
  return <LoginPage onLogin={login} />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* 로그인 페이지 */}
        <Route path="/login" element={<LoginWrapper />} />
        
        {/* 대시보드 (메인 페이지) */}
        <Route path="/dashboard" element={<DashboardWrapper />} />
        
        {/* 케이스 추적 페이지 */}
        <Route path="/case/:caseId" element={<CaseTrackingWrapper />} />
        
        {/* 분석 결과 페이지 (케이스 추적과 동일) */}
        <Route path="/case/:caseId/analysis/:analysisId" element={<CaseTrackingWrapper />} />
        
        {/* 기본 라우트 - 대시보드로 리다이렉트 */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        
        {/* 404 페이지 */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
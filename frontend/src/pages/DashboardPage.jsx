// src/pages/DashboardPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Header } from '../components/common/Header.jsx';
import { CaseList } from '../components/cases/CaseList.jsx';
import { CaseSearchBar } from '../components/cases/CaseSearchBar.jsx';
import { CreateCaseModal } from '../components/cases/CreateCaseModal.jsx';
import { LoadingSpinner } from '../components/common/LoadingSpinner.jsx';
import { ErrorMessage } from '../components/common/ErrorMessage.jsx';
import { useCases } from '../hooks/useCases.js';
import { useAuth } from '../hooks/useAuth.js';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { cases, loading, error, createCase, fetchCases } = useCases();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCases = cases.filter(case_ =>
    case_.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    case_.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    case_.case_number?.includes(searchQuery)
  );

  const handleCreateCase = async (caseData) => {
    try {
      await createCase(caseData);
      setShowCreateModal(false);
    } catch (err) {
      console.error('사건 생성 실패:', err);
    }
  };

  // ✅ 케이스 선택 시 라우터로 이동
  const handleSelectCase = (case_) => {
    navigate(`/case/${case_.id}`);
  };

  const headerActions = [
    {
      label: '사건 등록',
      icon: <Plus size={16} />,
      onClick: () => setShowCreateModal(true),
      className: 'btn btn-primary'
    }
  ];

  if (loading) {
    return (
      <div className="dashboard-loading">
        <LoadingSpinner size="large" message="사건 목록을 불러오고 있습니다..." />
      </div>
    );
  }


 return (
    <div className="dashboard-page">
      <Header 
        title="🎯 사건 관리 시스템"
        user={user}
        onLogout={logout}
        actions={headerActions}
      />

      <div className="dashboard-container">
        <CaseSearchBar 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={() => fetchCases()}
        />

        <ErrorMessage 
          message={error}
          onRetry={() => fetchCases()}
        />

        <CaseList 
          cases={filteredCases}
          onSelectCase={handleSelectCase}
        />
      </div>

      {showCreateModal && (
        <CreateCaseModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateCase}
        />
      )}
    </div>
  );
};
// src/pages/DashboardPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Header } from "../components/common/Header.jsx";
import { CaseList } from "../components/cases/CaseList.jsx";
import { CaseSearchBar } from "../components/cases/CaseSearchBar.jsx";
import { CreateCaseModal } from "../components/cases/CreateCaseModal.jsx";
import { LoadingSpinner } from "../components/common/LoadingSpinner.jsx";
import { ErrorMessage } from "../components/common/ErrorMessage.jsx";
import { useCases } from "../hooks/useCases.js";
import { useAuth } from "../hooks/useAuth.js";
import { casesService } from "../services/casesService.js";

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { cases, loading, error, createCase, fetchCases } = useCases();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCases = cases.filter(
    (case_) =>
      case_.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      case_.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      case_.case_number?.includes(searchQuery)
  );

  const handleCreateCase = async (caseData) => {
    try {
      await createCase(caseData);
      setShowCreateModal(false);
    } catch (err) {
      console.error("사건 생성 실패:", err);
    }
  };

  // ✅ 케이스 선택 시 라우터로 이동
  const handleSelectCase = (case_) => {
    navigate(`/case/${case_.id}`);
  };

  const headerActions = [
    {
      label: "사건 등록",
      icon: <Plus size={16} />,
      onClick: () => setShowCreateModal(true),
      className: "btn btn-primary",
    },
  ];

  if (loading) {
    return (
      <div className="dashboard-loading">
        <LoadingSpinner
          size="large"
          message="사건 목록을 불러오고 있습니다..."
        />
      </div>
    );
  }
  // ✅ 사건 삭제 핸들러 추가
  const handleDeleteCase = async (caseId, caseTitle) => {
    const confirmMessage = `사건 "${caseTitle}"을(를) 정말 삭제하시겠습니까?

⚠️ 주의사항:
• 모든 CCTV 마커가 삭제됩니다
• 업로드된 이미지들이 삭제됩니다  
• 이 작업은 되돌릴 수 없습니다

정말 삭제하시겠습니까?`;

    if (window.confirm(confirmMessage)) {
      try {
        console.log(`🗑️ 사건 삭제 시작: ${caseId} - ${caseTitle}`);

        const result = await casesService.deleteCase(caseId);

        console.log("✅ 삭제 성공:", result);

        // 사건 목록 새로고침
        await fetchCases();

        // 성공 메시지 표시
        alert(`✅ ${result.message || "사건이 성공적으로 삭제되었습니다."}`);
      } catch (error) {
        console.error("❌ 삭제 실패:", error);
        alert(`❌ 삭제 실패: ${error.message}`);
      }
    }
  };

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

        <ErrorMessage message={error} onRetry={() => fetchCases()} />

        <CaseList cases={filteredCases} onSelectCase={handleSelectCase} onDeleteCase={handleDeleteCase}/>
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

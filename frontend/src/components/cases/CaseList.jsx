// src/components/cases/CaseList.jsx
// src/components/cases/CaseList.jsx - 삭제 기능 추가

import React from 'react';
import { CaseCard } from './CaseCard.jsx';

export const CaseList = ({ cases, onSelectCase, onDeleteCase }) => {
  if (!cases || cases.length === 0) {
    return (
      <div className="cases-empty">
        <h3 className="cases-empty-title">등록된 사건이 없습니다</h3>
        <p className="cases-empty-subtitle">새 사건을 등록해보세요</p>
      </div>
    );
  }

  return (
    <div className="cases-container">
      <h2 className="cases-list-title">
        등록된 사건 ({cases.length}건)
      </h2>
      
      <div className="cases-grid">
        {cases.map((case_) => (
          <CaseCard
            key={case_.id}
            case_={case_}
            onSelect={onSelectCase}
            onDelete={onDeleteCase} // ✅ 삭제 함수 전달
          />
        ))}
      </div>
    </div>
  );
};
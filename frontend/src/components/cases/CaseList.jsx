// src/components/cases/CaseList.jsx
import React from 'react';
import { CaseCard } from './CaseCard.jsx';

export const CaseList = ({ cases, onSelectCase }) => {
  if (cases.length === 0) {
    return (
      <div className="cases-empty">
        <div className="cases-empty-title">등록된 사건이 없습니다</div>
        <p className="cases-empty-subtitle">새 사건을 등록해주세요.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="cases-list-title">
        등록된 사건들 ({cases.length}건)
      </h2>
      
      <div className="cases-grid">
        {cases.map(case_ => (
          <CaseCard
            key={case_.id}
            case_={case_}
            onSelect={onSelectCase}
          />
        ))}
      </div>
    </div>
  );
};
// src/components/cases/CaseCard.jsx
import React from 'react';
import { MapPin, Clock, User, Trash2 } from 'lucide-react'; // ✅ Trash2 추가
import { formatDate } from '../../utils/formatters.js';
import { CASE_STATUS_LABELS } from '../../utils/constants.js';

export const CaseCard = ({ case_, onSelect, onDelete }) => { // ✅ onDelete prop 추가
  
  // 🚨 삭제 버튼 클릭 시 이벤트 전파 방지
  const handleDeleteClick = (e) => {
    e.stopPropagation(); // 카드 클릭 이벤트 방지
    onDelete(case_.id, case_.title);
  };

  return (
    <div onClick={() => onSelect(case_)} className="case-card">
      <div className="case-card-header">
        <h3 className="case-card-title">
          {case_.title}
        </h3>
        <span className={`case-status-badge ${
          case_.status === 'active' ? 'status-active' : 'status-inactive'
        }`}>
          {CASE_STATUS_LABELS[case_.status] || case_.status}
        </span>
      </div>
      
      <div className="case-details">
        <div className="case-detail-row">
          <MapPin size={14} className="case-detail-icon" />
          <span className="case-detail-text">{case_.location}</span>
        </div>
        <div className="case-detail-row">
          <Clock size={14} className="case-detail-icon" />
          <span className="case-detail-text">{formatDate(case_.incident_date)}</span>
        </div>
        <div className="case-detail-row">
          <User size={14} className="case-detail-icon" />
          <span className="case-detail-text">{case_.created_by_name}</span>
        </div>
      </div>
      
      <div className="case-card-footer">
        <div className="case-stats">
          <span className="case-stat-suspects">
            👤 용의자 {case_.suspect_count || 0}명
          </span>
          <span className="case-stat-markers">
            📍 마커 {case_.marker_count || 0}개
          </span>
        </div>
        
        {/* ✅ 사건 액션 영역 (번호 + 삭제 버튼) */}
        <div className="case-actions">
          <span className="case-number">
            #{case_.case_number || case_.id}
          </span>
          
          {/* ✅ 삭제 버튼 추가 */}
          {onDelete && (
            <button 
              onClick={handleDeleteClick}
              className="case-delete-btn"
              title={`"${case_.title}" 사건 삭제`}
              aria-label="사건 삭제"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
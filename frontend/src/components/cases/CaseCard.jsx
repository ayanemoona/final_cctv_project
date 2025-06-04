// src/components/cases/CaseCard.jsx
import React from 'react';
import { MapPin, Clock, User } from 'lucide-react';
import { formatDate } from '../../utils/formatters.js';
import { CASE_STATUS_LABELS } from '../../utils/constants.js';

export const CaseCard = ({ case_, onSelect }) => {
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
        <span className="case-number">
          #{case_.case_number || case_.id}
        </span>
      </div>
    </div>
  );
};
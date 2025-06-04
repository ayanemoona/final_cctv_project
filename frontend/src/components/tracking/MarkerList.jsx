// src/components/tracking/MarkerList.jsx - 하드코딩 제거 버전
import React from 'react';
import { formatTime, formatConfidence } from '../../utils/formatters.js';

export const MarkerList = ({ 
  case_, 
  markers, 
  selectedMarkerId, 
  onSelectMarker, 
  onShowUploadModal, 
  onShowManualModal 
}) => {
  return (
    <div className="sidebar">
      {/* 사건 정보 */}
      <div className="case-info-panel">
        <div className="case-title">
          {case_.title}
        </div>
        <div className="case-meta">
          <div>사건번호: {case_.case_number || case_.id}</div>
          <div>발생일시: {new Date(case_.incident_date).toLocaleString('ko-KR')}</div>
          <div>담당자: {case_.created_by_name}</div>
        </div>
        
        {/* 용의자 정보 - 실제 데이터가 있을 때만 표시 */}
        {case_.suspect_image || case_.suspect_description ? (
          <div className="suspect-card">
            {case_.suspect_image ? (
              <div className="suspect-photo">
                <img src={case_.suspect_image} alt="용의자 사진" />
              </div>
            ) : (
              <div className="suspect-photo-placeholder">
                용의자 사진 없음
              </div>
            )}
            {case_.suspect_description && (
              <div className="suspect-description">
                {case_.suspect_description}
              </div>
            )}
          </div>
        ) : (
          <div className="suspect-card">
            <div className="suspect-photo-placeholder">
              용의자 정보 없음
            </div>
            <div className="suspect-description">
              사건 등록 시 용의자 사진을 업로드하면<br/>
              여기에 표시됩니다.
            </div>
          </div>
        )}
      </div>

      {/* 액션 버튼 */}
      <div className="action-buttons">
        <button
          onClick={onShowUploadModal}
          className="action-btn action-btn-cctv"
        >
          📹 CCTV 추가
        </button>
        <button
          onClick={onShowManualModal}
          className="action-btn action-btn-manual"
        >
          📍 수동 추가
        </button>
      </div>

      {/* 마커 리스트 */}
      <div className="markers-container">
        <div className="markers-header">
          이동 경로 (시간순) ({markers.length}개)
        </div>
        
        {markers.map(marker => (
          <div
            key={marker.id}
            onClick={() => onSelectMarker(marker.id)}
            className={`marker-item ${selectedMarkerId === marker.id ? 'selected' : ''}`}
          >
            <div className="marker-time">
              {formatTime(marker.detected_at) || marker.timestamp}
            </div>
            <div className="marker-location">
              {marker.location_name}
            </div>
            <div className="marker-comment">
              {marker.police_comment}
            </div>
            <div className="marker-status">
              <span className={`status-badge ${
                marker.is_confirmed && !marker.is_excluded
                  ? 'status-confirmed' 
                  : 'status-excluded'
              }`}>
                {marker.is_confirmed && !marker.is_excluded ? '확인됨' : '제외됨'}
              </span>
              <span className="confidence-score">
                {formatConfidence(marker.confidence_score)}
              </span>
            </div>
          </div>
        ))}
        
        {markers.length === 0 && (
          <div className="markers-empty">
            <div className="markers-empty-title">등록된 마커가 없습니다</div>
            <div className="markers-empty-subtitle">CCTV를 업로드하거나 수동으로 마커를 추가해주세요.</div>
          </div>
        )}
      </div>
    </div>
  );
};
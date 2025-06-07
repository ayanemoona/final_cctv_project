// frontend/src/components/tracking/AnalysisResultsModal.jsx - ESLint 경고 해결
import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';

export const AnalysisResultsModal = ({ isOpen, onClose, analysisResults, onConfirmSuspect }) => {
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  if (!isOpen || !analysisResults?.detection_candidates) {
    return null;
  }

  const { detection_candidates, timeline_data } = analysisResults;

  const handleConfirm = async () => {
    if (!selectedCandidate) {
      alert('용의자 후보를 선택해주세요.');
      return;
    }

    try {
      await onConfirmSuspect(selectedCandidate, timeline_data);
      onClose();
    } catch (error) {
      console.error('용의자 확정 실패:', error);
      alert('용의자 확정에 실패했습니다.');
    }
  };

  

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🎯 AI 분석 결과">
      <div className="analysis-results-modal">
        {/* 분석 요약 */}
        <div className="analysis-summary">
          <h3>📊 분석 완료</h3>
          <div className="summary-stats">
            <div className="stat-item">
              <span className="label">발견된 용의자 후보:</span>
              <span className="value">{detection_candidates.length}명</span>
            </div>
            <div className="stat-item">
              <span className="label">분석 시간:</span>
              <span className="value">{Math.round(analysisResults.processing_time || 0)}초</span>
            </div>
            <div className="stat-item">
              <span className="label">탐지 시점:</span>
              <span className="value">{timeline_data?.length || 0}개 지점</span>
            </div>
          </div>
        </div>

        {/* 용의자 후보 선택 */}
        <div className="suspects-selection">
          <h4>👤 용의자 후보를 선택하세요</h4>
          <div className="candidates-grid">
            {detection_candidates.map((candidate, index) => (
              <div 
                key={candidate.detection_id}
                className={`candidate-card ${selectedCandidate?.detection_id === candidate.detection_id ? 'selected' : ''}`}
                onClick={() => setSelectedCandidate(candidate)}
              >
                {/* 크롭 이미지 */}
                <div className="candidate-image">
                  {candidate.cropped_image_base64 ? (
                    <img 
                      src={`data:image/png;base64,${candidate.cropped_image_base64}`}
                      alt={`용의자 후보 ${index + 1}`}
                      className="suspect-crop"
                    />
                  ) : (
                    <div className="no-image">이미지 없음</div>
                  )}
                </div>

                {/* 매칭 정보 */}
                <div className="candidate-info">
                  <div className="similarity-score">
                    <span className="percentage">{candidate.similarity_percentage}</span>
                    <div className="confidence-bar">
                      <div 
                        className="confidence-fill"
                        style={{ width: candidate.similarity_percentage }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="detection-details">
                    <div className="timestamp">📍 {candidate.timestamp}</div>
                    <div className="confidence">{candidate.confidence_level} 신뢰도</div>
                    {candidate.total_appearances > 1 && (
                      <div className="appearances">👁️ {candidate.total_appearances}회 출현</div>
                    )}
                  </div>
                </div>

                {/* 선택 표시 */}
                {selectedCandidate?.detection_id === candidate.detection_id && (
                  <div className="selected-indicator">✅ 선택됨</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 타임라인 미리보기 */}
        {timeline_data && timeline_data.length > 0 && (
          <div className="timeline-preview">
            <h4>📅 발견 타임라인</h4>
            <div className="timeline-items">
              {timeline_data.slice(0, 5).map((item, index) => (
                <div key={index} className="timeline-item">
                  <span className="time">{item.timestamp_str}</span>
                  <span className="similarity">{(item.similarity * 100).toFixed(1)}%</span>
                </div>
              ))}
              {timeline_data.length > 5 && (
                <div className="timeline-more">
                  +{timeline_data.length - 5}개 더...
                </div>
              )}
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="modal-actions">
          <button 
            className="btn btn-secondary"
            onClick={onClose}
          >
            취소
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!selectedCandidate}
          >
            🎯 이게 용의자다! (마커 생성)
          </button>
        </div>
      </div>

      <style jsx>{`
        .analysis-results-modal {
          max-width: 800px;
          max-height: 80vh;
          overflow-y: auto;
        }

        .analysis-summary {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }

        .summary-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem;
          background: white;
          border-radius: 4px;
        }

        .candidates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
          margin: 1rem 0;
        }

        .candidate-card {
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .candidate-card:hover {
          border-color: #007bff;
          box-shadow: 0 2px 8px rgba(0,123,255,0.1);
        }

        .candidate-card.selected {
          border-color: #28a745;
          background-color: #f8fff9;
          box-shadow: 0 2px 12px rgba(40,167,69,0.2);
        }

        .candidate-image {
          width: 100%;
          height: 200px;
          background: #f8f9fa;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .suspect-crop {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .no-image {
          color: #6c757d;
          font-style: italic;
        }

        .similarity-score {
          text-align: center;
          margin-bottom: 1rem;
        }

        .percentage {
          font-size: 1.5rem;
          font-weight: bold;
          color: #28a745;
        }

        .confidence-bar {
          width: 100%;
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
          margin-top: 0.5rem;
        }

        .confidence-fill {
          height: 100%;
          background: linear-gradient(90deg, #ffc107, #28a745);
          transition: width 0.3s ease;
        }

        .detection-details {
          font-size: 0.9rem;
          color: #6c757d;
        }

        .selected-indicator {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #28a745;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
        }

        .timeline-preview {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 8px;
          margin: 1.5rem 0;
        }

        .timeline-items {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .timeline-item {
          background: white;
          padding: 0.5rem;
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 80px;
        }

        .timeline-more {
          color: #6c757d;
          font-style: italic;
          align-self: center;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
          padding-top: 1rem;
          border-top: 1px solid #e9ecef;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
      `}</style>
    </Modal>
  );
};
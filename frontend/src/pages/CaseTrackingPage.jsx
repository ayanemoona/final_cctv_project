// src/pages/CaseTrackingPage.jsx
import React, { useState, useEffect } from 'react';
import { Header } from '../components/common/Header.jsx';
import { MapView } from '../components/tracking/MapView.jsx';
import { MarkerList } from '../components/tracking/MarkerList.jsx';
import { CCTVUploadModal } from '../components/tracking/CCTVUploadModal.jsx';
import { ManualMarkerModal } from '../components/tracking/ManualMarkerModal.jsx';
import { trackingService } from '../services/trackingService.js';

export const CaseTrackingPage = ({ case_, user, onBack }) => {
  const [markers, setMarkers] = useState([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [progress, setProgress] = useState({ show: false, text: '', progress: 0 });

  // 마커 데이터 로드
  useEffect(() => {
    const loadMarkers = async () => {
      try {
        const markersData = await trackingService.getMarkers(case_.id);
        console.log('🔍 서버에서 받은 마커 데이터:', markersData);
        setMarkers(markersData);
        if (markersData.length > 0) {
          setSelectedMarkerId(markersData[0].id);
        }
      } catch (err) {
        console.error('마커 로드 실패:', err);
      }
    };

    loadMarkers();
  }, [case_.id]);

  const handleCCTVUpload = async () => {
    setShowUploadModal(false);
    setProgress({ show: true, text: 'CCTV 영상 업로드 중...', progress: 0 });
    
    // 진행 상태 시뮬레이션
    const steps = [
      { text: 'CCTV 영상 업로드 중...', progress: 25, duration: 1000 },
      { text: 'AI 모델 분석 중...', progress: 50, duration: 3000 },
      { text: '용의자 후보 추출 중...', progress: 75, duration: 2000 },
      { text: '분석 완료', progress: 100, duration: 500 }
    ];
    
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, steps[i].duration));
      setProgress({ show: true, text: steps[i].text, progress: steps[i].progress });
    }
    
    setTimeout(() => {
      setProgress({ show: false, text: '', progress: 0 });
      alert('분석이 완료되었습니다. 용의자 후보를 확인해주세요.');
    }, 1000);
  };

  const handleManualAdd = async (markerData) => {
    try {
      const newMarker = await trackingService.addMarker(case_.id, markerData);
      setMarkers(prev => [...prev, newMarker]);
      setShowManualModal(false);
    } catch (err) {
      console.error('마커 추가 실패:', err);
      alert('마커 추가에 실패했습니다.');
    }
  };

  const headerActions = [
    {
      label: '보고서 생성',
      onClick: () => alert('보고서 생성 기능 준비 중'),
      className: 'btn btn-primary'
    }
  ];

  return (
    <div className="tracking-page">
      <Header 
        title="🎯 AI리니어 사건 분석 시스템"
        user={user}
        onLogout={() => {}}
        actions={[
          {
            label: '← 사건 목록',
            onClick: onBack,
            className: 'btn btn-secondary'
          },
          ...headerActions
        ]}
      />

      <div className="tracking-content">
        <MarkerList
          case_={case_}
          markers={markers}
          selectedMarkerId={selectedMarkerId}
          onSelectMarker={setSelectedMarkerId}
          onShowUploadModal={() => setShowUploadModal(true)}
          onShowManualModal={() => setShowManualModal(true)}
        />
        
        <MapView
          markers={markers}
          selectedMarkerId={selectedMarkerId}
          progress={progress}
        />
      </div>

      {showUploadModal && (
        <CCTVUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleCCTVUpload}
        />
      )}

      {showManualModal && (
        <ManualMarkerModal
          isOpen={showManualModal}
          onClose={() => setShowManualModal(false)}
          onAdd={handleManualAdd}
        />
      )}
    </div>
  );
};
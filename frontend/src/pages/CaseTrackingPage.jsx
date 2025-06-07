// src/pages/CaseTrackingPage.jsx - 의존성 경고 해결
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "../components/common/Header.jsx";
import { MapView } from "../components/tracking/MapView.jsx";
import { MarkerList } from "../components/tracking/MarkerList.jsx";
import { CCTVUploadModal } from "../components/tracking/CCTVUploadModal.jsx";
import { ManualMarkerModal } from "../components/tracking/ManualMarkerModal.jsx";
import { AnalysisResultsModal } from "../components/tracking/AnalysisResultsModal.jsx";
import { LoadingSpinner } from "../components/common/LoadingSpinner.jsx";
import { trackingService } from "../services/trackingService.js";
import { useAuth } from "../hooks/useAuth.js";
import { useCases } from "../hooks/useCases.js";

export const CaseTrackingPage = () => {
  const { caseId, analysisId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { cases } = useCases();

  const [currentCase, setCurrentCase] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showAnalysisResults, setShowAnalysisResults] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [progress, setProgress] = useState({
    show: false,
    text: "",
    progress: 0,
  });

  // ✅ 분석 결과 로드 함수 (useCallback으로 메모이제이션)
  const loadAnalysisResults = useCallback(
    async (currentAnalysisId) => {
      if (!currentCase) return;

      try {
        setProgress({ show: true, text: "분석 결과 조회 중...", progress: 50 });

        const results = await trackingService.getAnalysisResults(
          currentCase.id,
          currentAnalysisId
        );

        if (results.success && results.detection_candidates) {
          console.log("✅ 분석 결과 로드 성공:", results);

          setAnalysisResults(results);
          setShowAnalysisResults(true);
          setProgress({ show: false, text: "", progress: 0 });

          console.log(
            `🎉 분석 완료! ${results.detection_candidates.length}개의 용의자 후보를 발견했습니다.`
          );
        }
      } catch (error) {
        console.error("❌ 분석 결과 로드 실패:", error);
        setProgress({ show: false, text: "", progress: 0 });
        alert("분석 결과를 불러오는데 실패했습니다.");
      }
    },
    [currentCase]
  );

  // ✅ 마커 데이터 로드 함수 (useCallback으로 메모이제이션)
  const loadMarkers = useCallback(async () => {
    if (!currentCase) return;

    try {
      const markersData = await trackingService.getMarkers(currentCase.id);
      console.log("🔍 서버에서 받은 마커 데이터:", markersData);
      setMarkers(markersData);
      if (markersData.length > 0) {
        setSelectedMarkerId(markersData[0].id);
      }
    } catch (err) {
      console.error("마커 로드 실패:", err);
    }
  }, [currentCase]);

  // ✅ URL 파라미터로부터 케이스 정보 가져오기
  useEffect(() => {
    if (caseId && cases.length > 0) {
      const case_ = cases.find((c) => c.id === caseId);
      if (case_) {
        setCurrentCase(case_);
      } else {
        navigate("/dashboard");
      }
    }
  }, [caseId, cases, navigate]);

  // ✅ 분석 ID가 있으면 자동으로 결과 조회 (의존성 배열 수정)
  useEffect(() => {
    if (analysisId && currentCase) {
      console.log(`🎯 분석 결과 자동 조회: ${analysisId}`);
      loadAnalysisResults(analysisId);
    }
  }, [analysisId, currentCase, loadAnalysisResults]);

  // ✅ 마커 데이터 로드 (의존성 배열 수정)
  useEffect(() => {
    loadMarkers();
  }, [loadMarkers]);

  // useEffect로 analysisResults 변화 감지
  useEffect(() => {
    console.log("🔍 analysisResults 변경됨:", analysisResults);
    console.log("🔍 showAnalysisResults 상태:", showAnalysisResults);

    if (analysisResults && analysisResults.detection_candidates) {
      console.log("🎯 결과 모달 표시 조건 충족됨");
    }
  }, [analysisResults, showAnalysisResults]);

  // ✅ CCTV 업로드 처리 함수
  const handleCCTVUpload = async (analysisData) => {
    try {
      setShowUploadModal(false);
      console.log("🎬 CCTV 분석 결과 수신:", analysisData);

      // ✅ 분석이 이미 완료된 경우
      if (analysisData.isCompleted && analysisData.analysisResults) {
        console.log("✅ 분석 완료됨! 결과 모달 표시");

        setAnalysisResults(analysisData.analysisResults);
        setShowAnalysisResults(true);
        setProgress({ show: false, text: "", progress: 0 });
        return;
      }

      // ✅ 분석이 시작된 경우 (기존 로직)
      if (analysisData.analysis_id) {
        setProgress({ show: true, text: "CCTV 영상 분석 중...", progress: 0 });

        await trackingService.monitorAnalysis(
          currentCase.id,
          analysisData.analysis_id,
          // 진행률 콜백
          (progressData) => {
            setProgress({
              show: true,
              text: `AI 분석 진행 중... ${progressData.progress}%`,
              progress: progressData.progress,
            });
          },
          // 완료 콜백
          (results) => {
            console.log("✅ 분석 완료:", results);
            setProgress({ show: false, text: "", progress: 0 });

            if (results.detection_candidates) {
              setAnalysisResults(results);
              setShowAnalysisResults(true);
            } else {
              alert("분석이 완료되었지만 용의자 후보를 찾지 못했습니다.");
            }
          },
          // 에러 콜백
          (error) => {
            console.error("❌ 분석 실패:", error);
            setProgress({ show: false, text: "", progress: 0 });
            alert("분석 중 오류가 발생했습니다.");
          }
        );
      } else {
        console.error("❌ analysis_id가 없습니다:", analysisData);
        alert("분석 ID가 없어 진행할 수 없습니다.");
      }
    } catch (error) {
      console.error("❌ CCTV 분석 실패:", error);
      setProgress({ show: false, text: "", progress: 0 });
      alert("CCTV 분석을 시작할 수 없습니다.");
    }
  };
  // ✅ 용의자 확정 → 마커 생성 함수
  // ✅ handleConfirmSuspect 함수 수정 (CCTV 정보 활용)
const handleConfirmSuspect = async (selectedCandidate) => {
  try {
    console.log('🎯 용의자 확정:', selectedCandidate);
    
    // ✅ analysisResults에서 CCTV 정보 가져오기
    let cctvInfo = analysisResults?.cctv_info || {};
    console.log('📋 CCTV 정보 확인:', cctvInfo);

    // ✅ 2차: localStorage에서 CCTV 정보 가져오기 (새로 추가)
    if (!cctvInfo.location_name || !cctvInfo.incident_time) {
      // 분석 ID로 정보 찾기
      const analysisId = analysisResults?.analysis_id;
      if (analysisId) {
        const storedAnalysisInfo = localStorage.getItem(`analysis_${analysisId}`);
        if (storedAnalysisInfo) {
          const parsedInfo = JSON.parse(storedAnalysisInfo);
          cctvInfo = {
            location_name: parsedInfo.location_name,
            incident_time: parsedInfo.incident_time,
            officer_name: parsedInfo.officer_name || '',
            case_number: parsedInfo.caseId || currentCase.id
          };
          console.log('💾 localStorage에서 복원된 CCTV 정보:', cctvInfo);
        }
      }
      
      // 3차: 케이스 ID로 정보 찾기
      if (!cctvInfo.location_name) {
        const storedCctvInfo = localStorage.getItem(`cctv_upload_${currentCase.id}`);
        if (storedCctvInfo) {
          const parsedInfo = JSON.parse(storedCctvInfo);
          cctvInfo = {
            location_name: parsedInfo.location_name,
            incident_time: parsedInfo.incident_time,
            officer_name: '',
            case_number: currentCase.id
          };
          console.log('💾 케이스 ID로 복원된 CCTV 정보:', cctvInfo);
        }
      }
    }
    
    // ✅ 최종 검증
    if (!cctvInfo.location_name) {
      console.warn('⚠️ CCTV 위치 정보 없음 - 기본값 사용');
      cctvInfo.location_name = '분석 완료 지점';
    }
    
    if (!cctvInfo.incident_time) {
      console.warn('⚠️ CCTV 시간 정보 없음 - 현재 시간 사용');
      cctvInfo.incident_time = new Date().toISOString();
    }
    
    console.log('✅ 최종 사용할 CCTV 정보:', cctvInfo);
    
    // ✅ CCTV 업로드시 입력한 위치와 시간으로 마커 1개만 생성
    const markerData = {
      location_name: cctvInfo.location_name || '탐지 지점',
      detected_at: cctvInfo.incident_time || new Date().toISOString(),
      police_comment: `AI 분석 결과 - 유사도: ${selectedCandidate.similarity_percentage} (${selectedCandidate.confidence_level} 신뢰도)`,
      confidence_score: parseFloat(selectedCandidate.similarity_percentage.replace('%', '')) / 100,
      is_confirmed: true,
      is_excluded: false,
      analysis_id: analysisResults.analysis_id || null,
      ai_generated: true,
      // ✅ 선택된 용의자의 추가 정보
      suspect_info: JSON.stringify({
        detection_id: selectedCandidate.detection_id,
        similarity_percentage: selectedCandidate.similarity_percentage,
        confidence_level: selectedCandidate.confidence_level,
        total_appearances: selectedCandidate.total_appearances || 1,
        timestamp: selectedCandidate.timestamp
      })
    };
    
    console.log('📍 마커 생성 중 (CCTV 입력 위치):', markerData);
    
    const newMarker = await trackingService.addMarker(currentCase.id, markerData);
    
    console.log('✅ 마커 생성 완료:', newMarker);

    // ✅ localStorage 정리 (선택사항)
    const analysisId = analysisResults?.analysis_id;
    if (analysisId) {
      localStorage.removeItem(`analysis_${analysisId}`);
      localStorage.removeItem(`cctv_upload_${currentCase.id}`);
      console.log('🗑️ localStorage 정리 완료');
    }
    
    // 마커 목록 새로고침
    await loadMarkers();
    
    // 생성된 마커 선택
    if (newMarker && newMarker.id) {
      setSelectedMarkerId(newMarker.id);
    }
    
    alert(`✅ 용의자 확정 완료!\n\n📍 위치: ${markerData.location_name}\n⏰ 시간: ${new Date(markerData.detected_at).toLocaleString('ko-KR')}\n🎯 유사도: ${selectedCandidate.similarity_percentage}\n📊 신뢰도: ${selectedCandidate.confidence_level}`);
    
  } catch (error) {
    console.error('❌ 용의자 확정 실패:', error);
    alert('용의자 확정 중 오류가 발생했습니다.');
    throw error;
  }
};

  const handleManualAdd = async (markerData) => {
    try {
      const newMarker = await trackingService.addMarker(
        currentCase.id,
        markerData
      );
      setMarkers((prev) => [...prev, newMarker]);
      setShowManualModal(false);
    } catch (err) {
      console.error("마커 추가 실패:", err);
      alert("마커 추가에 실패했습니다.");
    }
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  const headerActions = [
    {
      label: "보고서 생성",
      onClick: () => alert("보고서 생성 기능 준비 중"),
      className: "btn btn-primary",
    },
  ];

  // 케이스 로딩 중
  if (!currentCase) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner
          size="large"
          message="사건 정보를 불러오고 있습니다..."
        />
      </div>
    );
  }
  // ✅ 제외 마커 생성 함수 추가
const handleCreateExcludedMarker = async (excludeData) => {
  try {
    console.log('🚫 제외 마커 생성:', excludeData);
    
    const markerData = {
      location_name: excludeData.location_name,
      detected_at: excludeData.incident_time,
      police_comment: `분석 거부 - ${excludeData.reason}`,
      confidence_score: 0,
      is_confirmed: false,
      is_excluded: true,  // ✅ 제외 마커 (빨간색)
      analysis_id: excludeData.analysis_id,
      ai_generated: true
    };
    
    const newMarker = await trackingService.addMarker(currentCase.id, markerData);
    
    console.log('✅ 제외 마커 생성 완료:', newMarker);
    
    // 마커 목록 새로고침
    await loadMarkers();
    
    if (newMarker && newMarker.id) {
      setSelectedMarkerId(newMarker.id);
    }
    
    alert('❌ 분석을 거부했습니다.\n해당 지점이 빨간색 제외 마커로 표시되었습니다.');
    
  } catch (error) {
    console.error('❌ 제외 마커 생성 실패:', error);
    alert('제외 마커 생성 중 오류가 발생했습니다.');
    throw error;
  }
};

  return (
    <div className="tracking-page">
      <Header
        title="🎯 AI리니어 사건 분석 시스템"
        user={user}
        onLogout={logout}
        actions={[
          {
            label: "← 사건 목록",
            onClick: handleBackToDashboard,
            className: "btn btn-secondary",
          },
          ...headerActions,
        ]}
      />

      <div className="tracking-content">
        <MarkerList
          case_={currentCase}
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
          onMarkerSelect={setSelectedMarkerId}
        />
      </div>

      {showUploadModal && (
        <CCTVUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUpload={handleCCTVUpload}
          caseId={currentCase.id}
        />
      )}

      {showManualModal && (
        <ManualMarkerModal
          isOpen={showManualModal}
          onClose={() => setShowManualModal(false)}
          onAdd={handleManualAdd}
        />
      )}

      {showAnalysisResults && (
        <AnalysisResultsModal
          isOpen={showAnalysisResults}
          onClose={() => setShowAnalysisResults(false)}
          analysisResults={analysisResults}
          onConfirmSuspect={handleConfirmSuspect}
          onCreateExcludedMarker={handleCreateExcludedMarker}
          caseInfo={currentCase}
        />
      )}
    </div>
  );
};

// frontend/src/components/tracking/CCTVUploadModal.jsx - 완전한 AI 연동 버전
import React, { useState, useRef, useEffect } from "react";
import { Upload, Video, MapPin, Zap, AlertCircle } from "lucide-react";
import { Modal } from "../common/Modal.jsx";
import { LoadingSpinner } from "../common/LoadingSpinner.jsx";
import { trackingService } from "../../services/trackingService.js";
import "../../styles/autocomplete.css"; // ✅ 기존 CSS 파일 사용

export const CCTVUploadModal = ({ isOpen, onClose, onUpload, caseId }) => {
  const [formData, setFormData] = useState({
    location_name: "",
    cctv_video: null,
    suspect_description: "",
    incident_time: "",
  });

  // 🤖 AI 분석 관련 상태
  const [analysisState, setAnalysisState] = useState({
    isAnalyzing: false,
    analysisId: null,
    progress: 0,
    status: "idle",
    statusMessage: "",
    results: null,
    error: null,
  });

  // 기존 상태들
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const isProcessingRef = useRef(false);
  const dropdownRef = useRef(null);

  // 카카오맵 장소 검색
  const searchPlaces = (keyword) => {
    if (!window.kakao || !window.kakao.maps || !keyword.trim()) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    if (isProcessingRef.current) {
      console.log("🔍 이미 검색 중이므로 요청 무시:", keyword);
      return;
    }

    isProcessingRef.current = true;
    setIsSearching(true);
    const ps = new window.kakao.maps.services.Places();

    ps.keywordSearch(keyword, (data, status) => {
      setIsSearching(false);
      isProcessingRef.current = false;

      if (status === window.kakao.maps.services.Status.OK) {
        const results = data.slice(0, 5).map((place) => ({
          id: place.id,
          place_name: place.place_name,
          road_address_name: place.road_address_name || place.address_name,
          category_name: place.category_group_name || place.category_name,
        }));

        setSearchResults(results);
        setShowSuggestions(true);
        console.log("🔍 CCTV 위치 검색 결과:", results.length, "개");
      } else {
        setSearchResults([]);
        setShowSuggestions(false);
      }
    });
  };

  const handleLocationChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, location_name: value }));

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    isProcessingRef.current = false;

    if (value.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchPlaces(value);
      }, 500);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  };

  // 자동완성 드롭다운 클릭 핸들러 개선 (e.preventDefault, e.stopPropagation)
  const handleSuggestionClick = (suggestion, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    const selectedAddress = suggestion.road_address_name || suggestion.place_name;
    setFormData((prev) => ({ ...prev, location_name: selectedAddress }));
    setShowSuggestions(false);
    setSearchResults([]);
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 100);
  };

  const validateVideoFile = (file) => {
    const maxSize = 500 * 1024 * 1024; // 500MB
    const allowedTypes = [
      "video/mp4",
      "video/avi",
      "video/mov",
      "video/wmv",
      "video/mkv",
    ];

    if (file.size > maxSize) {
      alert("파일 크기는 500MB 이하여야 합니다.");
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      alert("지원되는 비디오 형식: MP4, AVI, MOV, WMV, MKV");
      return false;
    }

    return true;
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "location_name") {
      handleLocationChange(e);
      return;
    }

    if (files && files[0]) {
      const file = files[0];

      if (name === "cctv_video") {
        if (validateVideoFile(file)) {
          setFormData((prev) => ({ ...prev, [name]: file }));
          console.log("📹 CCTV 비디오 선택됨:", file.name);
        } else {
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // 🤖 AI 분석 프로그레스 콜백들
  const handleAnalysisProgress = (progressData) => {
    setAnalysisState((prev) => ({
      ...prev,
      progress: progressData.progress,
      status: progressData.status,
      statusMessage: trackingService.getAnalysisStatusMessage(
        progressData.status,
        progressData.progress
      ),
    }));

    console.log(
      `🔄 분석 진행: ${progressData.progress}% - ${progressData.status}`
    );
  };

  const handleAnalysisComplete = (results) => {
    console.log("🎉 AI 분석 완료:", results);

    // ✅ 분석 상태 업데이트
    setAnalysisState((prev) => ({
      ...prev,
      isAnalyzing: false,
      progress: 100,
      status: "completed",
      statusMessage: `✅ 분석 완료! ${
        results.detection_candidates?.length || 0
      }명의 용의자 후보 발견`,
      results: results,
    }));

    // ✅ 분석 결과가 있으면 바로 결과 모달 표시
    if (
      results.detection_candidates &&
      results.detection_candidates.length > 0
    ) {
      // 부모 컴포넌트에 분석 결과 전달 (분석 완료됨을 알림)
      onUpload({
        success: true,
        isCompleted: true, // ✅ 완료 플래그 추가
        analysisResults: results, // ✅ 결과 데이터 전달
        detection_candidates: results.detection_candidates,
        total_detections: results.total_detections || 0,
        timeline_data: results.timeline_data || [],
        processing_time: results.processing_time || 0,
      });

      // ✅ 2초 후 모달 닫기
      setTimeout(() => {
        resetAllState();
        onClose();
      }, 2000);
    } else {
      // 용의자를 찾지 못한 경우
      alert("분석이 완료되었지만 용의자 후보를 찾지 못했습니다.");
      resetAllState();
      onClose();
    }
  };

  const handleAnalysisError = (error) => {
    setAnalysisState((prev) => ({
      ...prev,
      isAnalyzing: false,
      status: "error",
      statusMessage: `❌ 분석 실패: ${error.message}`,
      error: error.message,
    }));

    console.error("❌ AI 분석 에러:", error);
    alert(`분석 실패: ${error.message}`);
    resetAllState();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("🔍 caseId 확인:", caseId);

    if (loading || analysisState.isAnalyzing) {
      console.log("🚫 이미 처리 중이므로 요청 무시");
      return;
    }

    if (!formData.cctv_video) {
      alert("CCTV 영상을 선택해주세요.");
      return;
    }

    if (!formData.location_name.trim()) {
      alert("CCTV 위치를 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      console.log("🤖 AI 분석 시작 요청...");

      // ✅ CCTV 업로드 정보를 localStorage에 저장 (새로 추가)
    const cctvUploadInfo = {
      location_name: formData.location_name,
      incident_time: formData.incident_time,
      suspect_description: formData.suspect_description,
      timestamp: new Date().toISOString(), // 업로드 시간
      caseId: caseId
    };
    
    localStorage.setItem(`cctv_upload_${caseId}`, JSON.stringify(cctvUploadInfo));
    console.log("💾 CCTV 업로드 정보 저장됨:", cctvUploadInfo);

      // 🤖 AI 분석 시작
      const analysisResult = await trackingService.uploadAndAnalyzeCCTV(
        caseId,
        {
          location_name: formData.location_name,
          incident_time: formData.incident_time,
          suspect_description: formData.suspect_description,
          cctv_video: formData.cctv_video,
        }
      );

      if (analysisResult.success) {
        const analysisId = analysisResult.analysis_id;

        // ✅ 분석 ID와 함께 CCTV 정보도 저장 (새로 추가)
      const analysisInfo = {
        ...cctvUploadInfo,
        analysis_id: analysisId
      };
      localStorage.setItem(`analysis_${analysisId}`, JSON.stringify(analysisInfo));
      console.log("💾 분석 정보 저장됨:", analysisInfo);

        setAnalysisState((prev) => ({
          ...prev,
          isAnalyzing: true,
          analysisId: analysisId,
          progress: 0,
          status: "started",
          statusMessage: "🤖 AI 분석 시작됨...",
          error: null,
        }));

        console.log(`✅ AI 분석 시작됨: ${analysisId}`);

        // 🔄 실시간 모니터링 시작
        trackingService.monitorAnalysis(
          caseId,
          analysisId,
          handleAnalysisProgress,
          handleAnalysisComplete,
          handleAnalysisError
        );
      } else {
        throw new Error(analysisResult.error || "AI 분석 시작 실패");
      }
    } catch (err) {
      console.error("❌ CCTV 업로드 실패:", err);
      alert(`CCTV 업로드 실패: ${err.message}`);

      setAnalysisState((prev) => ({
        ...prev,
        isAnalyzing: false,
        status: "error",
        statusMessage: `❌ ${err.message}`,
        error: err.message,
      }));
    } finally {
      setLoading(false);
    }
  };

  // 모달 닫힘/분석 완료/에러 시 상태 완전 초기화
  const resetAllState = () => {
    setFormData({
      location_name: "",
      cctv_video: null,
      suspect_description: "",
      incident_time: "",
    });
    setAnalysisState({
      isAnalyzing: false,
      analysisId: null,
      progress: 0,
      status: "idle",
      statusMessage: "",
      results: null,
      error: null,
    });
    setSearchResults([]);
    setShowSuggestions(false);
    setIsSearching(false);
    isProcessingRef.current = false;
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    if (analysisState.isAnalyzing) return;
    resetAllState();
    onClose();
  };

  // Effect 훅들
  useEffect(() => {
    if (!isOpen) {
      setSearchResults([]);
      setShowSuggestions(false);
      setIsSearching(false);
      isProcessingRef.current = false;

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isClickInsideInput = inputRef.current && inputRef.current.contains(event.target);
      const isClickInsideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
      if (!isClickInsideInput && !isClickInsideDropdown) {
        setShowSuggestions(false);
      }
    };
    if (showSuggestions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSuggestions]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="🤖 AI CCTV 영상 분석"
      size="large"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 🤖 AI 분석 상태 표시 */}
        {(analysisState.isAnalyzing ||
          analysisState.status === "completed" ||
          analysisState.status === "error") && (
          <div
            className={`p-4 rounded-lg border-2 ${
              analysisState.status === "completed"
                ? "bg-green-50 border-green-200"
                : analysisState.status === "error"
                ? "bg-red-50 border-red-200"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                {analysisState.status === "completed" ? (
                  <Zap className="w-5 h-5 text-green-600" />
                ) : analysisState.status === "error" ? (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                ) : (
                  <Zap className="w-5 h-5 text-blue-600" />
                )}
                <span
                  className={`font-medium ${
                    analysisState.status === "completed"
                      ? "text-green-700"
                      : analysisState.status === "error"
                      ? "text-red-700"
                      : "text-blue-700"
                  }`}
                >
                  {analysisState.statusMessage}
                </span>
              </div>
              <span
                className={`text-sm font-mono ${
                  analysisState.status === "completed"
                    ? "text-green-600"
                    : analysisState.status === "error"
                    ? "text-red-600"
                    : "text-blue-600"
                }`}
              >
                {analysisState.progress}%
              </span>
            </div>

            {/* 진행률 바 */}
            {analysisState.isAnalyzing && (
              <div className="w-full bg-blue-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${analysisState.progress}%` }}
                ></div>
              </div>
            )}

            {/* 완료 결과 표시 */}
            {analysisState.status === "completed" && analysisState.results && (
              <div className="mt-3 text-sm text-green-700">
                <p>
                  🎯 생성된 마커:{" "}
                  <strong>{analysisState.results.markers_created}개</strong>
                </p>
                <p>
                  📊 탐지된 용의자:{" "}
                  <strong>
                    {analysisState.results.detection_results?.total_suspects ||
                      0}
                    명
                  </strong>
                </p>
              </div>
            )}
          </div>
        )}

        {/* CCTV 위치 - autocomplete.css 사용 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="inline w-4 h-4 mr-1" />
            CCTV 설치 위치 *
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              name="location_name"
              value={formData.location_name}
              onChange={handleChange}
              placeholder="CCTV 위치 입력 (예: 종각역 2번 출구)"
              className="location-input" // ✅ autocomplete.css 클래스 사용
              required
              autoComplete="off"
              disabled={analysisState.isAnalyzing}
            />

            {/* 검색 중 표시 - autocomplete.css */}
            {isSearching && (
              <div className="search-loading">
                <div className="search-spinner"></div>
              </div>
            )}

            {/* 자동완성 드롭다운 - autocomplete.css */}
            {showSuggestions && searchResults.length > 0 && (
              <div ref={dropdownRef} className="autocomplete-dropdown">
                {searchResults.map((suggestion, index) => (
                  <div
                    key={`${suggestion.id || index}-${suggestion.place_name}`}
                    onClick={(e) => handleSuggestionClick(suggestion, e)}
                    className="autocomplete-item"
                    style={{ pointerEvents: isProcessingRef.current ? "none" : "auto" }}
                  >
                    <div className="autocomplete-place-name">📍 {suggestion.place_name}</div>
                    <div className="autocomplete-address">🏠 {suggestion.road_address_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="autocomplete-hint">
            {" "}
            {/* autocomplete.css 클래스 */}
            💡 CCTV가 설치된 위치를 정확히 입력해주세요
          </div>
        </div>

        {/* 사건 발생 시간 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            사건 발생 시간 *
          </label>
          <input
            type="datetime-local"
            name="incident_time"
            value={formData.incident_time}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={analysisState.isAnalyzing}
          />
        </div>

        {/* CCTV 영상 업로드 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Video className="inline w-4 h-4 mr-1" />
            CCTV 영상 파일 *
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
            <Video className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <input
              ref={fileInputRef}
              type="file"
              name="cctv_video"
              onChange={handleChange}
              accept="video/mp4,video/avi,video/mov,video/wmv,video/mkv"
              className="hidden"
              id="cctv-video"
              disabled={analysisState.isAnalyzing}
            />
            <label
              htmlFor="cctv-video"
              className={`cursor-pointer text-sm text-gray-600 hover:text-blue-600 transition-colors ${
                analysisState.isAnalyzing
                  ? "pointer-events-none opacity-50"
                  : ""
              }`}
            >
              🎬 영상 파일 선택 (최대 500MB)
            </label>
            <p className="text-xs text-gray-500 mt-2">
              지원 형식: MP4, AVI, MOV, WMV, MKV
            </p>
            {formData.cctv_video && (
              <div className="text-sm text-green-600 mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                <p>
                  <strong>선택된 파일:</strong> {formData.cctv_video.name}
                </p>
                <p>
                  <strong>파일 크기:</strong>{" "}
                  {formatFileSize(formData.cctv_video.size)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 용의자 특징 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            용의자 특징 (선택사항)
          </label>
          <textarea
            name="suspect_description"
            value={formData.suspect_description}
            onChange={handleChange}
            placeholder="용의자의 복장, 신체적 특징 등을 기록해주세요 (AI 분석 정확도 향상)"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={analysisState.isAnalyzing}
          />
          <div className="text-xs text-gray-500 mt-1">
            💡 상세한 특징을 입력할수록 AI 분석 정확도가 높아집니다
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            disabled={loading || analysisState.isAnalyzing}
          >
            {analysisState.isAnalyzing ? "분석 중..." : "취소"}
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all"
            disabled={
              loading ||
              analysisState.isAnalyzing ||
              !formData.cctv_video ||
              !formData.location_name.trim()
            }
          >
            {loading || analysisState.isAnalyzing ? (
              <>
                <LoadingSpinner size="small" message="" />
                <span>AI 분석 중...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>🤖 AI 분석 시작</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CCTVUploadModal;

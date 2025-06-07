// frontend/src/services/trackingService.js - AI 연동 강화
import { api } from './api.js';

export const trackingService = {
  // 사건의 마커 목록 조회
  async getMarkers(caseId) {
    try {
      const response = await api.get(`/cases/${caseId}/markers/`);
      return response.data;
    } catch (error) {
      console.error('마커 조회 실패:', error);
      throw new Error('마커 정보를 불러오는데 실패했습니다.');
    }
  },

  // 수동 마커 추가
  async addMarker(caseId, markerData) {
    try {
      const formData = new FormData();
      
      formData.append('location_name', markerData.location_name || '');
      formData.append('detected_at', markerData.detected_at || '');
      formData.append('police_comment', markerData.police_comment || '');
      formData.append('confidence_score', markerData.confidence_score || 1.0);
      formData.append('is_confirmed', markerData.is_confirmed !== undefined ? markerData.is_confirmed : true);
      formData.append('is_excluded', markerData.is_excluded !== undefined ? markerData.is_excluded : false);
      
      if (markerData.suspect_image && markerData.suspect_image instanceof File) {
        formData.append('suspect_image', markerData.suspect_image);
      }

      const response = await api.post(`/cases/${caseId}/markers/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('마커 추가 실패:', error);
      throw new Error('마커 추가에 실패했습니다.');
    }
  },

  // 🤖 CCTV 영상 업로드 및 AI 분석 시작
  async uploadAndAnalyzeCCTV(caseId, cctvData) {
    try {
      console.log('🎬 CCTV AI 분석 시작:', cctvData);
      
      const formData = new FormData();
      
      // 필수 데이터 추가
      formData.append('location_name', cctvData.location_name || '');
      formData.append('incident_time', cctvData.incident_time || '');
      formData.append('suspect_description', cctvData.suspect_description || '');
      
      // 영상 파일 추가
      if (cctvData.cctv_video && cctvData.cctv_video instanceof File) {
        formData.append('cctv_video', cctvData.cctv_video);
        console.log('📹 영상 파일 추가:', cctvData.cctv_video.name);
      } else {
        throw new Error('CCTV 영상 파일이 필요합니다.');
      }

      // FormData 내용 로깅
      console.log('📦 전송할 FormData:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: [파일] ${value.name} (${(value.size / 1024 / 1024).toFixed(2)}MB)`);
        } else {
          console.log(`  ${key}: "${value}"`);
        }
      }

      const response = await api.post(`/cases/${caseId}/cctv/analyze/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 1분 타임아웃 (분석 시작용)
      });
      
      console.log('✅ CCTV 분석 시작 성공:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ CCTV 분석 시작 실패:', error);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.error) {
          throw new Error(errorData.error);
        }
        if (errorData.message) {
          throw new Error(errorData.message);
        }
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.');
      }
      
      throw new Error('CCTV 영상 분석 시작에 실패했습니다.');
    }
  },

  // 🤖 AI 분석 진행상황 조회
  async getAnalysisProgress(caseId, analysisId) {
    try {
      const response = await api.get(`/cases/${caseId}/analysis/${analysisId}/status/`);
      
      console.log('📊 분석 진행상황:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ 분석 진행상황 조회 실패:', error);
      throw new Error('분석 진행상황을 확인할 수 없습니다.');
    }
  },

  // 🤖 AI 분석 결과 조회 및 마커 자동 생성
  async getAnalysisResults(caseId, analysisId) {
    try {
      const response = await api.get(`/cases/${caseId}/analysis/${analysisId}/results/`);
      
      console.log('📋 분석 결과 조회:', response.data);
      
      if (!response.data.success) {
        if (response.data.status === 'incomplete') {
          return {
            success: false,
            status: 'incomplete',
            message: response.data.message,
            progress: response.data.progress || 0
          };
        }
        throw new Error(response.data.error || '분석 결과 조회 실패');
      }
      
      return response.data;
      
    } catch (error) {
      console.error('❌ 분석 결과 조회 실패:', error);
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      
      throw new Error('분석 결과를 불러오는데 실패했습니다.');
    }
  },

  // 🤖 AI 서비스 상태 확인
  async checkAIStatus() {
    try {
      const response = await api.get('/cases/ai/health/');
      
      console.log('🤖 AI 서비스 상태:', response.data);
      return response.data;
      
    } catch (error) {
      console.error('❌ AI 서비스 상태 확인 실패:', error);
      return {
        ai_services: { status: 'unhealthy', error: error.message },
        django_integration: 'active'
      };
    }
  },

  // 🔄 실시간 분석 모니터링 (폴링)
  async monitorAnalysis(caseId, analysisId, onProgress, onComplete, onError) {
    console.log(`🔄 분석 모니터링 시작: ${analysisId}`);
    
    const checkInterval = 3000; // 3초마다 체크
    const maxAttempts = 100; // 최대 5분 (3초 × 100회)
    let attempts = 0;
    
    const checkProgress = async () => {
      try {
        attempts++;
        
        // 진행상황 조회
        const progressResult = await this.getAnalysisProgress(caseId, analysisId);
        
        if (progressResult.success) {
          const progress = progressResult.progress || 0;
          const status = progressResult.status || 'unknown';
          
          console.log(`📊 분석 진행률: ${progress}% (상태: ${status})`);
          
          // 진행률 콜백 호출
          onProgress({
            progress,
            status,
            suspects_found: progressResult.suspects_found || 0,
            crop_images_available: progressResult.crop_images_available || 0
          });
          
          // 완료 체크
          if (status === 'completed' || progress >= 100) {
            console.log('✅ 분석 완료! 결과 조회 중...');
            
            // 결과 조회
            const results = await this.getAnalysisResults(caseId, analysisId);
            
            if (results.success) {
              console.log(`🎉 분석 완료: ${results.markers_created}개 마커 생성`);
              onComplete(results);
            } else {
              if (results.status === 'incomplete') {
                // 아직 완료되지 않음 - 계속 모니터링
                if (attempts < maxAttempts) {
                  setTimeout(checkProgress, checkInterval);
                } else {
                  onError(new Error('분석 시간이 너무 오래 걸립니다.'));
                }
              } else {
                onError(new Error(results.message || '분석 결과 조회 실패'));
              }
            }
            return;
          }
          
          // 실패 상태 체크
          if (status === 'failed' || status === 'error') {
            onError(new Error('AI 분석이 실패했습니다.'));
            return;
          }
          
          // 계속 모니터링
          if (attempts < maxAttempts) {
            setTimeout(checkProgress, checkInterval);
          } else {
            onError(new Error('분석 시간이 초과되었습니다.'));
          }
          
        } else {
          onError(new Error(progressResult.error || '진행상황 조회 실패'));
        }
        
      } catch (error) {
        console.error('❌ 분석 모니터링 에러:', error);
        onError(error);
      }
    };
    
    // 첫 번째 체크 시작
    setTimeout(checkProgress, 1000); // 1초 후 시작
  },

  // 마커 수정
  async updateMarker(caseId, markerId, markerData) {
    try {
      const response = await api.put(`/cases/${caseId}/markers/${markerId}/`, markerData);
      return response.data;
    } catch (error) {
      console.error('마커 수정 실패:', error);
      throw new Error('마커 수정에 실패했습니다.');
    }
  },

  // 마커 삭제
  async deleteMarker(caseId, markerId) {
    try {
      await api.delete(`/cases/${caseId}/markers/${markerId}/`);
      return true;
    } catch (error) {
      console.error('마커 삭제 실패:', error);
      throw new Error('마커 삭제에 실패했습니다.');
    }
  },

  // 🎯 분석 상태별 UI 메시지 생성
  getAnalysisStatusMessage(status, progress = 0) {
    const messages = {
      'unknown': '분석 상태 확인 중...',
      'preparing': '분석 준비 중...',
      'processing': `AI 분석 진행 중... (${progress}%)`,
      'smart_frame_extraction': '🎬 스마트 프레임 추출 중...',
      'batch_person_extraction': '👤 용의자 후보 추출 중...',
      'batch_suspect_matching': '🎯 용의자 매칭 중...',
      'result_compilation': '📊 결과 정리 중...',
      'completed': '✅ 분석 완료!',
      'failed': '❌ 분석 실패',
      'error': '❌ 오류 발생'
    };
    
    return messages[status] || `분석 중... (${progress}%)`;
  },

  // 🎨 신뢰도별 마커 색상 결정
  getMarkerColor(confidenceScore, isExcluded = false, isConfirmed = true) {
    if (isExcluded) {
      return '#ef4444'; // 빨간색 - 제외된 마커
    }
    
    if (!isConfirmed) {
      return '#f59e0b'; // 주황색 - 미확정 마커
    }
    
    // 신뢰도별 색상
    if (confidenceScore >= 0.9) {
      return '#10b981'; // 초록색 - 높은 신뢰도
    } else if (confidenceScore >= 0.7) {
      return '#3b82f6'; // 파란색 - 중간 신뢰도
    } else if (confidenceScore >= 0.5) {
      return '#8b5cf6'; // 보라색 - 낮은 신뢰도
    } else {
      return '#6b7280'; // 회색 - 매우 낮은 신뢰도
    }
  },

  // 📊 분석 통계 계산
  calculateAnalysisStats(markers) {
    if (!markers || markers.length === 0) {
      return {
        totalMarkers: 0,
        aiGenerated: 0,
        manualAdded: 0,
        confirmed: 0,
        excluded: 0,
        avgConfidence: 0,
        highConfidence: 0
      };
    }
    
    const aiGenerated = markers.filter(m => m.ai_generated).length;
    const manualAdded = markers.filter(m => !m.ai_generated).length;
    const confirmed = markers.filter(m => m.is_confirmed).length;
    const excluded = markers.filter(m => m.is_excluded).length;
    
    const confidenceScores = markers
      .filter(m => m.confidence_score > 0)
      .map(m => m.confidence_score);
    
    const avgConfidence = confidenceScores.length > 0 
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length 
      : 0;
    
    const highConfidence = markers.filter(m => m.confidence_score >= 0.8).length;
    
    return {
      totalMarkers: markers.length,
      aiGenerated,
      manualAdded,
      confirmed,
      excluded,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      highConfidence
    };
  }
};
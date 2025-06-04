// src/services/casesService.js - FormData 방식으로 수정
import { api } from './api.js';

export const casesService = {
  // 사건 목록 조회
  async getCases() {
    try {
      const response = await api.get('/cases/');
      return response.data;
    } catch (error) {
      console.error('사건 목록 조회 실패:', error);
      throw new Error('사건 목록을 불러오는데 실패했습니다.');
    }
  },

  // ✅ 사건 생성 - 용의자 정보 포함
  async createCase(caseData) {
    try {
      const formData = new FormData();
      
      // ✅ 필수 필드들을 FormData에 추가
      formData.append('case_number', caseData.case_number || '');
      formData.append('title', caseData.title || '');
      formData.append('description', caseData.description || '');
      formData.append('incident_date', caseData.incident_date || '');
      formData.append('location', caseData.location || '');
      formData.append('status', caseData.status || 'active');
      
      // ✅ 용의자 정보 추가
      if (caseData.suspect_description) {
        formData.append('suspect_description', caseData.suspect_description);
      } else if (caseData.suspect_image) {
        // 사진이 있으면 기본 설명 추가
        formData.append('suspect_description', '업로드된 사진 참조');
      }
      
      // ✅ 선택적 필드들 (null이 아닌 경우만 추가)
      if (caseData.latitude !== null && caseData.latitude !== undefined) {
        formData.append('latitude', caseData.latitude);
      }
      if (caseData.longitude !== null && caseData.longitude !== undefined) {
        formData.append('longitude', caseData.longitude);
      }
      
      // ✅ 파일이 있는 경우 추가
      if (caseData.suspect_image && caseData.suspect_image instanceof File) {
        formData.append('suspect_image', caseData.suspect_image);
        console.log('✅ 용의자 사진 FormData에 추가:', caseData.suspect_image.name);
      }

      // ✅ FormData 내용 로깅 (디버깅용)
      console.log('FormData 내용:');
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: [파일] ${value.name} (${(value.size / 1024).toFixed(1)}KB)`);
        } else {
          console.log(`${key}: "${value}"`);
        }
      }

      const response = await api.post('/cases/', formData, {
        headers: {
          // ✅ Content-Type을 multipart/form-data로 설정 (FormData 사용 시 자동 설정됨)
          // 'Content-Type': 'multipart/form-data' // axios가 자동으로 설정
        },
      });
      
      console.log('사건 생성 성공:', response.data);
      return response.data;
    } catch (error) {
      console.error('사건 생성 실패:', error);
      
      // ✅ 더 상세한 에러 처리
      if (error.response?.data) {
        const errorData = error.response.data;
        console.error('서버 에러 데이터:', errorData);
        
        // Django REST framework 에러 형식 처리
        if (errorData.detail) {
          throw new Error(errorData.detail);
        }
        
        // Django Form 에러 처리
        if (errorData.error) {
          throw new Error(errorData.error);
        }
        
        // 필드별 에러 메시지 처리
        if (typeof errorData === 'object') {
          const firstError = Object.keys(errorData)[0];
          if (firstError && Array.isArray(errorData[firstError])) {
            throw new Error(`${firstError}: ${errorData[firstError][0]}`);
          }
          if (firstError && typeof errorData[firstError] === 'string') {
            throw new Error(`${firstError}: ${errorData[firstError]}`);
          }
        }
        
        if (typeof errorData === 'string') {
          throw new Error(errorData);
        }
      }
      
      // ✅ HTTP 상태 코드별 처리
      if (error.response?.status === 400) {
        throw new Error('입력한 데이터에 오류가 있습니다. 모든 필수 필드를 확인해주세요.');
      }
      
      if (error.response?.status === 401) {
        throw new Error('로그인이 필요합니다.');
      }
      
      if (error.response?.status === 403) {
        throw new Error('사건 등록 권한이 없습니다.');
      }
      
      if (error.response?.status >= 500) {
        throw new Error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
      
      throw new Error('사건 등록 중 오류가 발생했습니다.');
    }
  },

  // 사건 상세 조회
  async getCase(caseId) {
    try {
      const response = await api.get(`/cases/${caseId}/`);
      return response.data;
    } catch (error) {
      console.error('사건 조회 실패:', error);
      throw new Error('사건 정보를 불러오는데 실패했습니다.');
    }
  },

  // 사건 수정
  async updateCase(caseId, caseData) {
    try {
      // ✅ 수정도 FormData 방식으로 통일
      const formData = new FormData();
      
      formData.append('case_number', caseData.case_number || '');
      formData.append('title', caseData.title || '');
      formData.append('description', caseData.description || '');
      formData.append('incident_date', caseData.incident_date || '');
      formData.append('location', caseData.location || '');
      formData.append('status', caseData.status || 'active');
      
      if (caseData.latitude !== null && caseData.latitude !== undefined) {
        formData.append('latitude', caseData.latitude);
      }
      if (caseData.longitude !== null && caseData.longitude !== undefined) {
        formData.append('longitude', caseData.longitude);
      }
      
      if (caseData.suspect_image && caseData.suspect_image instanceof File) {
        formData.append('suspect_image', caseData.suspect_image);
      }

      const response = await api.put(`/cases/${caseId}/`, formData);
      
      return response.data;
    } catch (error) {
      console.error('사건 수정 실패:', error);
      throw new Error('사건 수정에 실패했습니다.');
    }
  },

  // 사건 삭제
  async deleteCase(caseId) {
    try {
      await api.delete(`/cases/${caseId}/`);
      return true;
    } catch (error) {
      console.error('사건 삭제 실패:', error);
      throw new Error('사건 삭제에 실패했습니다.');
    }
  }
};
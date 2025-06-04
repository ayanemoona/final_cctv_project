// src/services/api.js
import axios from 'axios';

// API 기본 설정
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Axios 인스턴스 생성
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10초 타임아웃
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터 - 인증 토큰 자동 추가
api.interceptors.request.use(
  (config) => {
    // localStorage에서 토큰 가져오기 (있는 경우)
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('API 요청:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('요청 에러:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 - 에러 처리
api.interceptors.response.use(
  (response) => {
    console.log('API 응답:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('응답 에러:', error);
    
    // 인증 에러 처리
    if (error.response?.status === 401) {
      // 토큰 제거 및 로그인 페이지로 리다이렉트
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // 네트워크 에러
    if (!error.response) {
      console.error('네트워크 에러 - 서버에 연결할 수 없습니다');
    }
    
    return Promise.reject(error);
  }
);

// API 헬퍼 함수들
export const apiHelpers = {
  // GET 요청
  get: (url, config = {}) => api.get(url, config),
  
  // POST 요청
  post: (url, data = {}, config = {}) => api.post(url, data, config),
  
  // PUT 요청
  put: (url, data = {}, config = {}) => api.put(url, data, config),
  
  // PATCH 요청
  patch: (url, data = {}, config = {}) => api.patch(url, data, config),
  
  // DELETE 요청
  delete: (url, config = {}) => api.delete(url, config),
  
  // 파일 업로드
  uploadFile: (url, formData, onUploadProgress) => {
    return api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  },
  
  // 파일 다운로드
  downloadFile: (url, filename) => {
    return api.get(url, {
      responseType: 'blob',
    }).then((response) => {
      const blob = new Blob([response.data]);
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);
    });
  }
};

// 기본 export
export default api;
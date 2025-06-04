// src/services/authService.js - 정상 인증 구현
import { api } from './api.js';

export const authService = {
  // 로그인
  async login(credentials) {
    try {
      console.log('로그인 시도:', credentials.username);
      
      const response = await api.post('/auth/login/', {
        username: credentials.username,
        password: credentials.password,
      });
      
      const { token, user, message } = response.data;
      
      console.log('로그인 성공:', message);
      
      // 토큰과 사용자 정보 저장
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return { token, user };
    } catch (error) {
      console.error('로그인 실패:', error);
      
      if (error.response?.status === 401) {
        throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
      
      if (error.response?.status === 400) {
        throw new Error(error.response.data.error || '입력 정보를 확인해주세요.');
      }
      
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      
      throw new Error('로그인 중 오류가 발생했습니다. 서버 연결을 확인해주세요.');
    }
  },

  // 로그아웃
  async logout() {
    try {
      // 서버에 로그아웃 요청
      await api.post('/auth/logout/');
      console.log('서버 로그아웃 완료');
    } catch (error) {
      console.error('서버 로그아웃 에러:', error);
      // 서버 에러가 나도 로컬 정리는 진행
    } finally {
      // 로컬 스토리지 정리
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      console.log('로컬 로그아웃 완료');
    }
  },

  // 토큰 검증
  async validateToken() {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('토큰 없음');
        return false;
      }
      
      const response = await api.get('/auth/verify/');
      
      if (response.data.valid) {
        console.log('토큰 유효함');
        // 사용자 정보 업데이트
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return true;
      } else {
        console.log('토큰 무효함');
        return false;
      }
    } catch (error) {
      console.error('토큰 검증 실패:', error);
      
      // 토큰이 유효하지 않으면 제거
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      return false;
    }
  },

  // 현재 사용자 정보 가져오기
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('사용자 정보 파싱 에러:', error);
      return null;
    }
  },

  // 인증 토큰 가져오기
  getToken() {
    return localStorage.getItem('authToken');
  },

  // 인증 상태 확인
  isAuthenticated() {
    const token = this.getToken();
    const user = this.getCurrentUser();
    return !!(token && user);
  }
};
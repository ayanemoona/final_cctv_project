// src/hooks/useAuth.js
import { useState, useEffect } from 'react';
import { authService } from '../services/authService.js';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 로컬 스토리지에서 인증 정보 복원
  useEffect(() => {
    const savedAuth = localStorage.getItem('police_auth');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        setUser(authData.user);
        setToken(authData.token);
        authService.apiService?.setAuthToken(authData.token);
      } catch (err) {
        console.error('저장된 인증 정보 복원 실패:', err);
        localStorage.removeItem('police_auth');
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.login(credentials);
      
      const authData = {
        user: response.user,
        token: response.token
      };
      
      setUser(response.user);
      setToken(response.token);
      
      // 로컬 스토리지에 저장
      localStorage.setItem('police_auth', JSON.stringify(authData));
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error('로그아웃 에러:', err);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('police_auth');
    }
  };

  const isAuthenticated = Boolean(user && token);

  return {
    user,
    token,
    loading,
    error,
    isAuthenticated,
    login,
    logout
  };
};
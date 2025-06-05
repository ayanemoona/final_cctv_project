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
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setToken(savedToken);
        
      } catch (err) {
        console.error('저장된 인증 정보 복원 실패:', err);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.login(credentials);
      
      setUser(response.user);
      setToken(response.token);
      

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
// src/hooks/useLocalStorage.js
import { useState } from 'react';

export const useLocalStorage = (key, initialValue) => {
  // 로컬 스토리지에서 값 읽기
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`로컬 스토리지 읽기 실패 (${key}):`, error);
      return initialValue;
    }
  });

  // 값 설정 함수
  const setValue = (value) => {
    try {
      // 함수가 전달된 경우 현재 값으로 호출
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      setStoredValue(valueToStore);
      
      // 로컬 스토리지에 저장
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`로컬 스토리지 저장 실패 (${key}):`, error);
    }
  };

  // 값 제거 함수
  const removeValue = () => {
    try {
      setStoredValue(initialValue);
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`로컬 스토리지 제거 실패 (${key}):`, error);
    }
  };

  return [storedValue, setValue, removeValue];
};
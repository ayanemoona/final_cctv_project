// src/hooks/useCases.js
import { useState, useEffect } from 'react';
import { casesService } from '../services/casesService.js';

export const useCases = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 사건 목록 조회
  const fetchCases = async () => {
    setLoading(true);
    setError('');
    
    try {
      const casesData = await casesService.getCases();
      setCases(Array.isArray(casesData) ? casesData : []);
    } catch (err) {
      console.error('사건 목록 조회 에러:', err);
      setError(err.message || '사건 목록을 불러오는데 실패했습니다.');
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  // 사건 생성
  const createCase = async (caseData) => {
    try {
      setError('');
      
      // 필수 필드 검증
      if (!caseData.title?.trim()) {
        throw new Error('사건명을 입력해주세요.');
      }
      
      if (!caseData.location?.trim()) {
        throw new Error('발생장소를 입력해주세요.');
      }
      
      if (!caseData.incident_date) {
        throw new Error('발생일시를 선택해주세요.');
      }
      
      if (!caseData.description?.trim()) {
        throw new Error('사건 개요를 입력해주세요.');
      }

      const newCase = await casesService.createCase(caseData);
      
      // 새 사건을 목록에 추가
      setCases(prevCases => [newCase, ...prevCases]);
      
      return newCase;
    } catch (err) {
      console.error('사건 생성 에러:', err);
      const errorMessage = err.message || '사건 등록에 실패했습니다.';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // 사건 수정
  const updateCase = async (caseId, caseData) => {
    try {
      setError('');
      const updatedCase = await casesService.updateCase(caseId, caseData);
      
      // 목록에서 해당 사건 업데이트
      setCases(prevCases => 
        prevCases.map(case_ => 
          case_.id === caseId ? updatedCase : case_
        )
      );
      
      return updatedCase;
    } catch (err) {
      console.error('사건 수정 에러:', err);
      const errorMessage = err.message || '사건 수정에 실패했습니다.';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // 사건 삭제
  const deleteCase = async (caseId) => {
    try {
      setError('');
      await casesService.deleteCase(caseId);
      
      // 목록에서 해당 사건 제거
      setCases(prevCases => 
        prevCases.filter(case_ => case_.id !== caseId)
      );
      
      return true;
    } catch (err) {
      console.error('사건 삭제 에러:', err);
      const errorMessage = err.message || '사건 삭제에 실패했습니다.';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // 컴포넌트 마운트 시 사건 목록 로드
  useEffect(() => {
    fetchCases();
  }, []);

  return {
    cases,
    loading,
    error,
    fetchCases,
    createCase,
    updateCase,
    deleteCase,
    clearError: () => setError('')
  };
};
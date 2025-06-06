// src/components/tracking/ManualMarkerModal.jsx - 외부 클릭 감지 수정
import React, { useState, useRef, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { Modal } from '../common/Modal.jsx';
import { LoadingSpinner } from '../common/LoadingSpinner.jsx';
import '../../styles/autocomplete.css';

export const ManualMarkerModal = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    location_name: '',
    detected_at: '',
    police_comment: '',
    suspect_image: null
  });
  const [loading, setLoading] = useState(false);
  
  // 자동완성 관련 상태
  const [searchResults, setSearchResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null); // ✅ 드롭다운 ref 추가
  
  // ✅ 중복 실행 방지를 위한 ref
  const isProcessingRef = useRef(false);

  // 카카오맵 장소 검색
  const searchPlaces = (keyword) => {
    if (!window.kakao || !window.kakao.maps || !keyword.trim()) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }

    if (isProcessingRef.current) {
      console.log('🔍 이미 검색 중이므로 요청 무시:', keyword);
      return;
    }

    isProcessingRef.current = true;
    setIsSearching(true);
    const ps = new window.kakao.maps.services.Places();
    
    ps.keywordSearch(keyword, (data, status) => {
      setIsSearching(false);
      isProcessingRef.current = false;
      
      if (status === window.kakao.maps.services.Status.OK) {
        const results = data.slice(0, 5).map(place => ({
          id: place.id,
          place_name: place.place_name,
          road_address_name: place.road_address_name || place.address_name,
          category_name: place.category_group_name || place.category_name
        }));
        
        setSearchResults(results);
        setShowSuggestions(true);
        console.log('🔍 장소 검색 결과:', results.length, '개');
      } else {
        setSearchResults([]);
        setShowSuggestions(false);
        console.log('🔍 장소 검색 결과 없음');
      }
    });
  };

  const handleLocationChange = (e) => {
    const value = e.target.value;
    console.log('📝 위치 입력 변경:', value);
    
    setFormData(prev => ({
      ...prev,
      location_name: value
    }));

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

  // ✅ 수정된 검색 결과 클릭 처리 함수
  const handleSuggestionClick = (suggestion) => {
    console.log('🖱️ 검색 결과 클릭:', suggestion);
    
    if (isProcessingRef.current) {
      console.log('📍 이미 처리 중이므로 클릭 무시');
      return;
    }

    isProcessingRef.current = true;
    
    const selectedAddress = suggestion.road_address_name || suggestion.place_name;
    
    console.log('📍 선택된 주소:', selectedAddress);
    
    setFormData(prev => ({
      ...prev,
      location_name: selectedAddress
    }));
    
    setShowSuggestions(false);
    setSearchResults([]);
    
    console.log('📍 장소 선택 완료:', selectedAddress);
    
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 100);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    console.log('📝 폼 필드 변경:', name, value || files?.[0]?.name);
    
    if (name === 'location_name') {
      handleLocationChange(e);
      return;
    }
    
    if (files) {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('📝 폼 제출 시도, 현재 formData:', formData);
    
    if (loading) {
      console.log('📝 이미 제출 중이므로 요청 무시');
      return;
    }
    
    setLoading(true);
    
    try {
      const markerData = {
        ...formData,
        confidence_score: 1.0,
        is_confirmed: true,
        is_excluded: false
      };
      
      console.log('📝 마커 추가 시작:', markerData);
      
      await onAdd(markerData);
      
      const resetData = {
        location_name: '',
        detected_at: '',
        police_comment: '',
        suspect_image: null
      };
      
      setFormData(resetData);
      setSearchResults([]);
      setShowSuggestions(false);
      
      console.log('✅ 마커 추가 완료 및 폼 초기화');
      
    } catch (err) {
      console.error('❌ 마커 추가 실패:', err);
      alert('마커 추가에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setSearchResults([]);
      setShowSuggestions(false);
      setIsSearching(false);
      isProcessingRef.current = false;
      
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      
      console.log('🚪 모달 닫힘 - 상태 초기화');
    }
  }, [isOpen]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // ✅ 수정된 외부 클릭 감지 - input과 드롭다운 둘 다 포함
  useEffect(() => {
    const handleClickOutside = (event) => {
      const isClickInsideInput = inputRef.current && inputRef.current.contains(event.target);
      const isClickInsideDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
      
      // input도 드롭다운도 아닌 곳을 클릭했을 때만 닫기
      if (!isClickInsideInput && !isClickInsideDropdown) {
        setShowSuggestions(false);
        console.log('🖱️ 외부 클릭으로 드롭다운 숨김');
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📍 수동 마커 추가">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            위치
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              name="location_name"
              value={formData.location_name}
              onChange={handleChange}
              placeholder="주소 또는 장소명 입력 (예: 종각역)"
              className="location-input"
              required
              autoComplete="off"
            />
            
            {/* 검색 중 표시 */}
            {isSearching && (
              <div className="search-loading">
                <div className="search-spinner"></div>
              </div>
            )}
            
            {/* ✅ 자동완성 드롭다운 - ref 추가 */}
            {showSuggestions && searchResults.length > 0 && (
              <div 
                ref={dropdownRef} 
                className="autocomplete-dropdown"
              >
                {searchResults.map((suggestion, index) => (
                  <div
                    key={`${suggestion.id || index}-${suggestion.place_name}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🖱️ 드롭다운 항목 클릭:', suggestion.place_name);
                      handleSuggestionClick(suggestion);
                    }}
                    className="autocomplete-item"
                    style={{ 
                      pointerEvents: isProcessingRef.current ? 'none' : 'auto',
                      cursor: isProcessingRef.current ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <div className="autocomplete-place-name">
                      📍 {suggestion.place_name}
                    </div>
                    <div className="autocomplete-address">
                      🏠 {suggestion.road_address_name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="autocomplete-hint">
            💡 장소명을 입력하면 자동완성 목록이 나타납니다 (한 번만 클릭하세요)
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            발견 시간
          </label>
          <input
            type="datetime-local"
            name="detected_at"
            value={formData.detected_at}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            용의자 사진
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <input
              type="file"
              name="suspect_image"
              onChange={handleChange}
              accept="image/*"
              className="hidden"
              id="suspect-image"
            />
            <label
              htmlFor="suspect-image"
              className="cursor-pointer text-sm text-gray-600 hover:text-blue-600"
            >
              📷 사진 업로드
            </label>
            {formData.suspect_image && (
              <p className="text-sm text-green-600 mt-2">
                선택된 파일: {formData.suspect_image.name}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            경찰 사견
          </label>
          <textarea
            name="police_comment"
            value={formData.police_comment}
            onChange={handleChange}
            placeholder="용의자 발견 상황, 특이사항 등"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={loading}
          >
            취소
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            disabled={loading}
          >
            {loading ? (
              <LoadingSpinner size="small" message="" />
            ) : (
              <span>마커 추가</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ManualMarkerModal;
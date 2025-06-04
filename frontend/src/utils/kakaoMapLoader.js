// src/utils/kakaoLoader.js
let isLoaded = false;
let isLoading = false;
let loadPromise = null;

export const loadKakaoMaps = () => {
  // 이미 로드된 경우
  if (isLoaded && window.kakao && window.kakao.maps) {
    return Promise.resolve();
  }

  // 로딩 중인 경우 같은 Promise 반환
  if (isLoading && loadPromise) {
    return loadPromise;
  }

  // API 키 확인
  const apiKey = import.meta.env.VITE_KAKAO_MAP_API_KEY;
  if (!apiKey) {
    console.error('❌ VITE_KAKAO_MAP_API_KEY가 설정되지 않았습니다.');
    return Promise.reject(new Error('카카오맵 API 키가 없습니다.'));
  }

  isLoading = true;

  loadPromise = new Promise((resolve, reject) => {
    // 이미 스크립트가 존재하는지 확인
    const existingScript = document.querySelector('script[src*="dapi.kakao.com"]');
    if (existingScript) {
      existingScript.remove();
    }

    // 새 스크립트 생성
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services,clusterer,drawing&autoload=false`;
    script.async = true;

    script.onload = () => {
      if (window.kakao && window.kakao.maps) {
        // autoload=false이므로 수동으로 로드
        window.kakao.maps.load(() => {
          isLoaded = true;
          isLoading = false;
          console.log('✅ 카카오맵 SDK 로딩 완료');
          resolve();
        });
      } else {
        isLoading = false;
        reject(new Error('카카오맵 SDK 로딩 실패'));
      }
    };

    script.onerror = () => {
      isLoading = false;
      reject(new Error('카카오맵 스크립트 로딩 실패'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
};

// 주소 → 좌표 변환 유틸리티
export const getCoordinatesFromAddress = (address) => {
  return new Promise((resolve, reject) => {
    if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
      reject(new Error('카카오맵 서비스가 로드되지 않았습니다.'));
      return;
    }

    const geocoder = new window.kakao.maps.services.Geocoder();
    
    geocoder.addressSearch(address, (result, status) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const coords = {
          lat: parseFloat(result[0].y),
          lng: parseFloat(result[0].x)
        };
        resolve(coords);
      } else {
        reject(new Error(`주소 변환 실패: ${address}`));
      }
    });
  });
};
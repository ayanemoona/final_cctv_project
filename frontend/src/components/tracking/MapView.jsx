// src/components/tracking/MapView.jsx - 단일 선택 + 화살표 제거 버전
import React, { useEffect, useRef, useState } from "react";
import "../../styles/kakaoMap.css";

export const MapView = ({ markers, selectedMarkerId, progress, onMarkerSelect }) => {
  const mapRef = useRef(null); // HTML div 참조
  const mapObjRef = useRef(null); // 카카오 지도 객체 참조
  const kakaoMarkers = useRef([]); // 지도 마커들
  const overlays = useRef([]); // 커스텀 오버레이들
  const polyline = useRef(null); // 경로 선
  const [mapReady, setMapReady] = useState(false);
  const [showPath, setShowPath] = useState(true); // 경로 표시 상태

  console.log("🎬 MapView 렌더링:", {
    markers: markers?.length || 0,
    selectedMarkerId,
    mapReady,
    hasProgress: !!progress?.show,
  });

  // 카카오맵 SDK 로딩 및 초기화
  useEffect(() => {
    console.log("🚀 MapView 컴포넌트 마운트됨");
    
    // ✅ Vite 환경변수 사용
    const KAKAO_MAP_API_KEY = import.meta.env.VITE_KAKAO_MAP_API_KEY || 'YOUR_KAKAO_MAP_API_KEY';
    console.log("🔑 API 키:", KAKAO_MAP_API_KEY ? '설정됨' : '미설정');

    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_API_KEY}&autoload=false&libraries=services`;

    console.log("📜 스크립트 URL:", script.src);

    script.onload = () => {
      console.log("✅ 카카오맵 스크립트 로드 완료");
      console.log("🌐 window.kakao 존재:", !!window.kakao);
      console.log(
        "🗺️ window.kakao.maps 존재:",
        !!(window.kakao && window.kakao.maps)
      );

      if (window.kakao) {
        window.kakao.maps.load(() => {
          console.log("🎯 kakao.maps.load 콜백 실행됨");
          console.log("🔍 mapRef.current 존재:", !!mapRef.current);

          if (mapRef.current) {
            const options = {
              center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 서울시청
              level: 3,
            };

            console.log("🗺️ 지도 옵션:", options);

            try {
              const map = new window.kakao.maps.Map(mapRef.current, options);
              mapObjRef.current = map;
              setMapReady(true);
              console.log("✅ 카카오맵 객체 생성 완료");
              console.log("📍 지도 중심:", map.getCenter().toString());
            } catch (error) {
              console.error("❌ 지도 객체 생성 실패:", error);
            }
          } else {
            console.error("❌ mapRef.current가 null입니다");
          }
        });
      } else {
        console.error("❌ window.kakao가 존재하지 않습니다");
      }
    };

    script.onerror = (error) => {
      console.error("❌ 카카오맵 스크립트 로딩 실패:", error);
      console.error("🔍 스크립트 URL:", script.src);
      setMapReady(false);
    };

    console.log("📜 스크립트를 head에 추가");
    document.head.appendChild(script);

    // 컴포넌트 언마운트 시 스크립트 정리
    return () => {
      console.log("🧹 컴포넌트 언마운트 - 스크립트 정리");
      const existingScript = document.querySelector(
        `script[src*="dapi.kakao.com"]`
      );
      if (existingScript) {
        existingScript.remove();
        console.log("🗑️ 기존 스크립트 제거됨");
      }
    };
  }, []);

  // 기존 마커들 제거 함수
  const clearMarkers = () => {
    // 기본 마커들 제거
    kakaoMarkers.current.forEach((marker) => marker.setMap(null));
    kakaoMarkers.current = [];

    // 커스텀 오버레이들 제거
    overlays.current.forEach((overlay) => overlay.setMap(null));
    overlays.current = [];

    // 경로선 제거
    if (polyline.current) {
      polyline.current.setMap(null);
      polyline.current = null;
    }
  };

  // ✅ 화살표 없이 경로선만 그리기
  const drawPath = (sortedPositions) => {
    if (sortedPositions.length < 2) return;

    // 경로선 생성
    polyline.current = new window.kakao.maps.Polyline({
      path: sortedPositions,
      strokeWeight: 4,
      strokeColor: "#3B82F6",
      strokeOpacity: 0.8,
      strokeStyle: "solid",
    });

    if (showPath) {
      polyline.current.setMap(mapObjRef.current);
    }

    console.log(`🔗 경로선 그리기 완료: ${sortedPositions.length}개 지점 (화살표 없음)`);
  };

  // 경로 토글 함수
  const togglePath = () => {
    if (polyline.current) {
      if (showPath) {
        polyline.current.setMap(null);
      } else {
        polyline.current.setMap(mapObjRef.current);
      }
      setShowPath(!showPath);
    }
  };

  // ✅ 선택된 마커만 노란 테두리 표시하도록 오버레이 업데이트
  const updateMarkerOverlays = () => {
    overlays.current.forEach((overlay, index) => {
      const marker = markers[index];
      if (!marker) return;

      const markerClass = marker.is_confirmed && !marker.is_excluded ? "confirmed" : "excluded";
      const selectedClass = selectedMarkerId === marker.id ? "selected" : "";

      const content = `
        <div class="marker-overlay ${markerClass} ${selectedClass}">
          ${index + 1}
        </div>
      `;

      overlay.setContent(content);
    });
  };

  // ✅ 수정된 useEffect - 단일 선택 + 화살표 제거
  useEffect(() => {
    if (!mapReady || !window.kakao || !mapObjRef.current) return;

    // 기존 마커들 제거
    clearMarkers();

    // 마커가 없으면 서울시청 중심으로 설정
    if (markers.length === 0) {
      const center = new window.kakao.maps.LatLng(37.5665, 126.9780);
      mapObjRef.current.setCenter(center);
      mapObjRef.current.setLevel(3);
      console.log("📍 마커가 없음 - 서울시청 중심으로 설정");
      return;
    }

    const bounds = new window.kakao.maps.LatLngBounds();
    const sortedPositions = [];

    // 마커를 1차 시간순, 2차 순서순으로 정렬
    const sortedMarkers = [...markers].sort((a, b) => {
      const dateA = new Date(a.detected_at);
      const dateB = new Date(b.detected_at);

      // 1차: 시간순 정렬
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }

      // 2차: 같은 시간이면 sequence_order 순
      return (a.sequence_order || 0) - (b.sequence_order || 0);
    });

    console.log(
      "🔢 시간+순서 정렬된 마커:",
      sortedMarkers.map((m, idx) => ({
        순서: idx + 1,
        location: m.location_name,
        datetime: new Date(m.detected_at).toLocaleString("ko-KR"),
        sequence_order: m.sequence_order || 0
      }))
    );

    // 마커 생성 함수
    const createMarkerOnMap = (marker, sortedIndex, lat, lng) => {
      const position = new window.kakao.maps.LatLng(lat, lng);

      // 기본 마커 생성
      const kakaoMarker = new window.kakao.maps.Marker({
        map: mapObjRef.current,
        position: position,
      });

      // ✅ 마커 번호 오버레이 (선택 상태에 따라 스타일 변경)
      const markerClass = marker.is_confirmed && !marker.is_excluded ? "confirmed" : "excluded";
      const selectedClass = selectedMarkerId === marker.id ? "selected" : "";

      console.log(`🎯 마커 ${sortedIndex + 1} 상태:`, {
        id: marker.id,
        location: marker.location_name,
        datetime: new Date(marker.detected_at).toLocaleString("ko-KR"),
        is_confirmed: marker.is_confirmed,
        is_excluded: marker.is_excluded,
        isSelected: selectedMarkerId === marker.id,
        class: markerClass,
      });

      const content = `
        <div class="marker-overlay ${markerClass} ${selectedClass}">
          ${sortedIndex + 1}
        </div>
      `;

      const overlay = new window.kakao.maps.CustomOverlay({
        content: content,
        position: position,
        yAnchor: 1.3,
      });
      overlay.setMap(mapObjRef.current);

      // ✅ 마커 클릭 시 단일 선택 처리
      window.kakao.maps.event.addListener(kakaoMarker, "click", () => {
        console.log(`🖱️ 마커 ${sortedIndex + 1} 클릭됨 (ID: ${marker.id})`);
        
        // 부모 컴포넌트에 선택된 마커 ID 전달
        if (onMarkerSelect) {
          // 이미 선택된 마커를 다시 클릭하면 선택 해제
          const newSelectedId = selectedMarkerId === marker.id ? null : marker.id;
          onMarkerSelect(newSelectedId);
          console.log(`🎯 마커 선택 변경: ${newSelectedId ? `마커 ${sortedIndex + 1} 선택` : '선택 해제'}`);
        }
      });

      // 인포윈도우
      const infoWindow = new window.kakao.maps.InfoWindow({
        content: `
          <div class="marker-info">
            <div class="marker-info-title">
              📍 ${sortedIndex + 1}번: ${marker.location_name || "위치 정보 없음"}
            </div>
            <div class="marker-info-time">
              🕐 ${
                marker.detected_at
                  ? new Date(marker.detected_at).toLocaleString("ko-KR")
                  : "시간 정보 없음"
              }
            </div>
            <div class="marker-info-confidence">
              🎯 신뢰도: ${Math.round((marker.confidence_score || 0) * 100)}%
            </div>
            ${
              marker.police_comment
                ? `
              <div class="marker-info-comment">
                💬 ${marker.police_comment}
              </div>
            `
                : ""
            }
          </div>
        `,
      });

      // 마커 호버 시 인포윈도우 표시
      window.kakao.maps.event.addListener(kakaoMarker, "mouseover", () => {
        infoWindow.open(mapObjRef.current, kakaoMarker);
      });

      window.kakao.maps.event.addListener(kakaoMarker, "mouseout", () => {
        infoWindow.close();
      });

      kakaoMarkers.current.push(kakaoMarker);
      overlays.current.push(overlay);
      bounds.extend(position);
      sortedPositions.push(position);
    };

    // ✅ 순서 보장된 마커 처리 함수
    const processMarkersInOrder = async () => {
      const processedMarkers = [];
      
      for (let i = 0; i < sortedMarkers.length; i++) {
        const marker = sortedMarkers[i];
        const sortedIndex = i;
        
        try {
          let lat, lng;
          
          if (marker.latitude && marker.longitude) {
            // 저장된 좌표 사용
            lat = marker.latitude;
            lng = marker.longitude;
            console.log(
              `📍 마커 ${sortedIndex + 1}: 저장된 좌표 사용 (${lat}, ${lng})`
            );
          } else {
            // ✅ 주소를 Promise로 변환하여 순서 보장
            const coords = await new Promise((resolve) => {
              const geocoder = new window.kakao.maps.services.Geocoder();
              
              geocoder.addressSearch(marker.location_name, (result, status) => {
                if (status === window.kakao.maps.services.Status.OK) {
                  resolve({
                    lat: parseFloat(result[0].y),
                    lng: parseFloat(result[0].x)
                  });
                } else {
                  // 주소 변환 실패 시 기본 좌표
                  resolve({
                    lat: 37.5665 + (Math.random() - 0.5) * 0.02,
                    lng: 126.9780 + (Math.random() - 0.5) * 0.02
                  });
                }
              });
            });
            
            lat = coords.lat;
            lng = coords.lng;
            console.log(
              `📍 마커 ${sortedIndex + 1}: 주소 변환 (${marker.location_name}) → (${lat}, ${lng})`
            );
          }
          
          // ✅ 순서대로 마커 생성
          createMarkerOnMap(marker, sortedIndex, lat, lng);
          processedMarkers.push({ marker, lat, lng, index: sortedIndex });
          
        } catch (error) {
          console.error(`❌ 마커 ${sortedIndex + 1} 처리 실패:`, error);
        }
      }
      
      return processedMarkers;
    };

    // ✅ 순서대로 처리 실행
    processMarkersInOrder().then((processedMarkers) => {
      console.log(`✅ 마커 순서대로 처리 완료: ${processedMarkers.length}개`);
      
      // ✅ 화살표 없이 경로선만 그리기
      setTimeout(() => {
        if (sortedPositions.length > 1) {
          drawPath(sortedPositions);
        }

        // 지도 영역 조정 (모든 마커가 보이도록)
        if (sortedMarkers.length > 0 && bounds) {
          mapObjRef.current.setBounds(bounds);
        }

        console.log(`📍 순서 보장된 마커 ${sortedMarkers.length}개 표시 완료 (화살표 제거됨)`);
      }, 300);
    });

  }, [mapReady, markers, showPath]);

  // ✅ selectedMarkerId 변경 시 오버레이 업데이트
  useEffect(() => {
    if (mapReady && overlays.current.length > 0) {
      updateMarkerOverlays();
      console.log(`🎯 마커 선택 상태 업데이트: ${selectedMarkerId || '선택 없음'}`);
    }
  }, [selectedMarkerId]);

  return (
    <div className="map-area">
      {/* 지도 컨테이너 */}
      <div ref={mapRef} className="kakao-map" />

      {/* ✅ 경로 컨트롤 패널 */}
      <div className="path-controls">
        <button 
          className={`path-toggle-btn ${showPath ? 'active' : ''}`}
          onClick={togglePath}
          title="경로선 표시/숨기기"
        >
          {showPath ? '🔗 경로 숨기기' : '📍 경로 보기'}
        </button>
        <div className="path-info">
          총 {markers?.length || 0}개 마커
        </div>
      </div>

      {/* 지도 컨트롤 버튼 */}
      <div className="map-controls">
        <button
          className="map-control-btn"
          title="전체 경로 보기"
          onClick={() => {
            if (markers.length > 0 && mapObjRef.current) {
              const bounds = new window.kakao.maps.LatLngBounds();
              kakaoMarkers.current.forEach((marker) => {
                bounds.extend(marker.getPosition());
              });
              mapObjRef.current.setBounds(bounds);
            }
          }}
        >
          🎯
        </button>
        <button
          className="map-control-btn"
          title="경로선 토글"
          onClick={togglePath}
        >
          📍
        </button>
        <button
          className="map-control-btn"
          title="지도 유형 변경"
          onClick={() => {
            if (mapObjRef.current) {
              const mapType = mapObjRef.current.getMapTypeId();
              if (mapType === window.kakao.maps.MapTypeId.ROADMAP) {
                mapObjRef.current.setMapTypeId(
                  window.kakao.maps.MapTypeId.SKYVIEW
                );
              } else {
                mapObjRef.current.setMapTypeId(
                  window.kakao.maps.MapTypeId.ROADMAP
                );
              }
            }
          }}
        >
          🗺️
        </button>
      </div>

      {/* 로딩 상태 */}
      {!mapReady && (
        <div className="map-loading">
          <div className="map-loading-spinner">🗺️</div>
          <div>카카오맵 로딩 중...</div>
        </div>
      )}

      {/* 진행 상황 표시 */}
      {progress?.show && (
        <div className="progress-overlay">
          <div className="progress-text">{progress.text}</div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress.progress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};
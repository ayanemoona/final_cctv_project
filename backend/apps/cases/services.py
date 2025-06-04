# backend/apps/cases/services.py - AI 연동 서비스

import requests
import httpx
import asyncio
import json
import logging
from django.conf import settings
from typing import Dict, Any, Optional, List
from datetime import datetime
import base64
import io

logger = logging.getLogger(__name__)

# AI 서비스 URL 설정
AI_SERVICES = {
    'GATEWAY_URL': getattr(settings, 'AI_GATEWAY_URL', 'http://localhost:8010'),
    'YOLO_URL': getattr(settings, 'YOLO_SERVICE_URL', 'http://localhost:8001'),
    'CLOTHING_URL': getattr(settings, 'CLOTHING_SERVICE_URL', 'http://localhost:8002'),
    'VIDEO_URL': getattr(settings, 'VIDEO_SERVICE_URL', 'http://localhost:8004'),
}

class AIServiceError(Exception):
    """AI 서비스 에러"""
    pass

class AIService:
    """AI 서비스 통합 클래스"""
    
    def __init__(self):
        self.gateway_url = AI_SERVICES['GATEWAY_URL']
        self.session = requests.Session()
        self.session.timeout = 60
        
    def register_suspect(self, suspect_id: str, suspect_image_file: bytes, 
                        suspect_description: str = "") -> Dict[str, Any]:
        """용의자 등록"""
        try:
            url = f"{self.gateway_url}/police/register_suspect"
            
            files = {'clothing_image': ('suspect.jpg', suspect_image_file, 'image/jpeg')}
            data = {
                'suspect_id': suspect_id,
                'suspect_name': '용의자',
                'case_number': '',
                'officer_name': '시스템'
            }
            
            response = self.session.post(url, files=files, data=data, timeout=120)
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"✅ 용의자 AI 등록 성공: {suspect_id}")
                return {
                    'success': True,
                    'data': result
                }
            else:
                error_msg = f"AI 서비스 오류 ({response.status_code})"
                logger.error(f"❌ 용의자 AI 등록 실패: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg
                }
                
        except Exception as e:
            logger.error(f"❌ 용의자 등록 예외: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_cctv_video(self, case_id: str, video_file, location_name: str,
                          incident_time: str = "", suspect_description: str = "") -> Dict[str, Any]:
        """CCTV 영상 분석"""
        try:
            url = f"{self.gateway_url}/police/analyze_cctv"
            
            # 파일 데이터 읽기
            if hasattr(video_file, 'read'):
                video_data = video_file.read()
                video_file.seek(0)  # 포인터 리셋
            else:
                video_data = video_file
            
            files = {'video_file': ('cctv_video.mp4', video_data, 'video/mp4')}
            data = {
                'location': location_name,
                'date': incident_time or datetime.now().isoformat(),
                'officer_name': '시스템',
                'case_number': case_id,
                'fps_interval': 3.0,
                'stop_on_detect': True
            }
            
            response = self.session.post(url, files=files, data=data, timeout=300)
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"✅ CCTV AI 분석 시작: {result.get('case_id')}")
                return {
                    'success': True,
                    'analysis_id': result.get('analysis_id'),
                    'case_id': result.get('case_id'),
                    'data': result
                }
            else:
                error_msg = f"AI 분석 시작 실패 ({response.status_code})"
                logger.error(f"❌ CCTV 분석 실패: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg
                }
                
        except Exception as e:
            logger.error(f"❌ CCTV 분석 예외: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_analysis_status(self, analysis_id: str) -> Dict[str, Any]:
        """분석 진행상황 조회"""
        try:
            # AI Gateway의 케이스 상태 조회
            url = f"{self.gateway_url}/police/case_status/{analysis_id}"
            
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                
                analysis_status = result.get('analysis_status', {})
                
                return {
                    'success': True,
                    'status': analysis_status.get('status', 'unknown'),
                    'progress': analysis_status.get('progress', 0),
                    'suspects_found': analysis_status.get('suspects_found', 0),
                    'crop_images_available': analysis_status.get('crop_images_available', 0),
                    'ai_response': result
                }
            else:
                return {
                    'success': False,
                    'error': f"상태 조회 실패 ({response.status_code})"
                }
                
        except Exception as e:
            logger.error(f"❌ 분석 상태 조회 예외: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_analysis_results(self, analysis_id: str) -> Dict[str, Any]:
        """분석 완료 결과 조회"""
        try:
            url = f"{self.gateway_url}/police/case_report/{analysis_id}"
            
            response = self.session.get(url, timeout=60)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get('status') == 'incomplete':
                    return {
                        'success': False,
                        'status': 'incomplete',
                        'message': result.get('message', '분석이 아직 완료되지 않았습니다'),
                        'progress': result.get('current_progress', 0)
                    }
                
                logger.info(f"✅ AI 분석 결과 조회 성공: {analysis_id}")
                return {
                    'success': True,
                    'data': result
                }
            else:
                return {
                    'success': False,
                    'error': f"결과 조회 실패 ({response.status_code})"
                }
                
        except Exception as e:
            logger.error(f"❌ 분석 결과 조회 예외: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def check_health(self) -> Dict[str, Any]:
        """AI 서비스 상태 확인"""
        try:
            url = f"{self.gateway_url}/health"
            
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                logger.info("✅ AI 서비스 상태 확인 성공")
                return {
                    'status': 'healthy',
                    'gateway': result,
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {
                    'status': 'unhealthy',
                    'error': f"응답 코드: {response.status_code}",
                    'timestamp': datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"❌ AI 서비스 상태 확인 실패: {e}")
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def parse_ai_results_to_markers(self, ai_results: Dict[str, Any], 
                                   case_id: str, suspect_id: str = None) -> List[Dict[str, Any]]:
        """AI 결과를 Django 마커 형식으로 변환"""
        try:
            markers_data = []
            
            # AI 결과에서 크롭 이미지 추출
            evidence_package = ai_results.get('data', {}).get('evidence_package', {})
            crop_images = evidence_package.get('cropped_suspect_images', [])
            
            for idx, crop_img in enumerate(crop_images):
                # Base64 이미지 URL 생성
                crop_image_url = f"data:image/png;base64,{crop_img.get('cropped_image', '')}"
                
                markers_data.append({
                    'location_name': f"AI 탐지 위치 {idx + 1}",
                    'detected_at': crop_img.get('timestamp', datetime.now().isoformat()),
                    'confidence_score': crop_img.get('similarity', 0.8),
                    'crop_image_url': crop_image_url,
                    'police_comment': f"AI가 {crop_img.get('similarity', 0) * 100:.1f}% 확률로 탐지",
                    'is_confirmed': True,
                    'is_excluded': False,
                    'sequence_order': idx + 1
                })
            
            logger.info(f"✅ AI 결과 변환 완료: {len(markers_data)}개 마커")
            return markers_data
            
        except Exception as e:
            logger.error(f"❌ AI 결과 변환 실패: {e}")
            return []

# 전역 AI 서비스 인스턴스
ai_service = AIService()

# 동기 래퍼 함수들 (Django 뷰에서 사용)
def register_suspect_sync(suspect_id: str, suspect_image_file: bytes, 
                         suspect_description: str = "") -> Dict[str, Any]:
    """용의자 등록 (동기)"""
    return ai_service.register_suspect(suspect_id, suspect_image_file, suspect_description)

def analyze_cctv_sync(case_id: str, video_file, location_name: str,
                     incident_time: str = "", suspect_description: str = "") -> Dict[str, Any]:
    """CCTV 영상 분석 (동기)"""
    return ai_service.analyze_cctv_video(case_id, video_file, location_name, incident_time, suspect_description)

def get_analysis_status_sync(analysis_id: str) -> Dict[str, Any]:
    """분석 진행상황 조회 (동기)"""
    return ai_service.get_analysis_status(analysis_id)

def get_analysis_results_sync(analysis_id: str) -> Dict[str, Any]:
    """분석 결과 조회 (동기)"""
    return ai_service.get_analysis_results(analysis_id)

def check_ai_health_sync() -> Dict[str, Any]:
    """AI 서비스 상태 확인 (동기)"""
    return ai_service.check_health()
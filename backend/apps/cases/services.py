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
from supabase import create_client
import os

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

class ImageStorageService:
    """Supabase 기반 이미지 저장 서비스 - 버킷 생성 로직 제거"""
    
    def __init__(self):
        self.supabase_url = os.getenv('SUPABASE_URL')
        
        # ✅ SERVICE_ROLE 키 우선 사용 (명확한 우선순위)
        service_key = os.getenv('SUPABASE_SERVICE_KEY')
        anon_key = os.getenv('SUPABASE_ANON_KEY')
        
        if service_key:
            self.supabase_key = service_key
            logger.info("🔑 SERVICE_ROLE 키 선택됨")
        elif anon_key:
            self.supabase_key = anon_key
            logger.info("🔑 ANON 키 선택됨 (SERVICE_KEY 없음)")
        else:
            self.supabase_key = None
            logger.error("❌ Supabase 키가 없습니다")
        
        if not self.supabase_url or not self.supabase_key:
            logger.warning("⚠️ Supabase 환경변수가 설정되지 않음.")
            self.supabase = None
        else:
            try:
                self.supabase = create_client(self.supabase_url, self.supabase_key)
                
                # 사용 중인 키 타입 확인 (더 정확한 체크)
                if service_key and self.supabase_key == service_key:
                    logger.info("✅ Supabase Service Role 키로 초기화 성공")
                else:
                    logger.info("✅ Supabase Anon 키로 초기화 성공")
                
                self._check_bucket_exists()
                
            except Exception as e:
                logger.error(f"❌ Supabase 초기화 실패: {e}")
                self.supabase = None
    
    def _check_bucket_exists(self):
        """버킷 존재 확인 (생성하지 않음)"""
        try:
            if not self.supabase:
                return False
            
            buckets = self.supabase.storage.list_buckets()
            
            if buckets:
                bucket_names = [bucket.name for bucket in buckets]
                if 'marker-images' in bucket_names:
                    logger.info("✅ marker-images 버킷 존재 확인됨")
                    return True
                else:
                    logger.warning("⚠️ marker-images 버킷이 없습니다. Supabase 대시보드에서 수동으로 생성해주세요.")
                    logger.warning(f"📋 현재 버킷 목록: {bucket_names}")
                    return False
            else:
                logger.warning("⚠️ 버킷 목록 조회 실패 - Supabase 대시보드에서 marker-images 버킷을 생성해주세요.")
                return False
                
        except Exception as e:
            logger.error(f"❌ 버킷 존재 확인 실패: {e}")
            logger.warning("⚠️ Supabase 대시보드에서 marker-images 버킷을 수동으로 생성해주세요.")
            return False
    
    def upload_marker_image(self, case_id, marker_id, image_file):
        """마커 이미지 업로드 - file_options 수정"""
        try:
            if not self.supabase:
                raise Exception("Supabase 클라이언트가 초기화되지 않음")
            
            # 파일 경로 생성
            file_path = f"cases/{case_id}/markers/{marker_id}.jpg"
            
            # 파일 읽기 개선
            if hasattr(image_file, 'read'):
                if hasattr(image_file, 'seek'):
                    image_file.seek(0)
                file_data = image_file.read()
            elif isinstance(image_file, (bytes, bytearray)):
                file_data = image_file
            else:
                file_data = bytes(image_file)
            
            if not isinstance(file_data, (bytes, bytearray)):
                raise Exception(f"잘못된 파일 데이터 타입: {type(file_data)}")
            
            logger.info(f"📤 Supabase 업로드 시작: {file_path}")
            logger.info(f"📊 파일 크기: {len(file_data)} bytes")
            
            # ✅ file_options 수정 (boolean 값 제거)
            try:
                # 방법 1: file_options 없이 업로드
                result = self.supabase.storage.from_('marker-images').upload(
                    path=file_path,
                    file=file_data
                )
                
                logger.info(f"📋 업로드 결과: {result}")
                
            except Exception as upload_error:
                logger.error(f"❌ 방법 1 실패, 방법 2 시도: {upload_error}")
                
                # 방법 2: 문자열만 포함한 file_options
                try:
                    result = self.supabase.storage.from_('marker-images').upload(
                        path=file_path,
                        file=file_data,
                        file_options={
                            "content-type": "image/jpeg"
                            # upsert 제거 (boolean이므로 문제 발생)
                        }
                    )
                    logger.info(f"📋 방법 2 성공: {result}")
                    
                except Exception as second_error:
                    logger.error(f"❌ 방법 2도 실패, 방법 3 시도: {second_error}")
                    
                    # 방법 3: 완전히 다른 방식
                    result = self.supabase.storage.from_('marker-images').upload(
                        file_path, file_data
                    )
                    logger.info(f"📋 방법 3 결과: {result}")
            
            # 결과 확인
            if isinstance(result, dict):
                if result.get('error'):
                    raise Exception(f"Supabase 업로드 에러: {result['error']}")
            elif hasattr(result, 'error') and result.error:
                raise Exception(f"Supabase 업로드 에러: {result.error}")
            
            # 공개 URL 생성
            try:
                public_url_result = self.supabase.storage.from_('marker-images').get_public_url(file_path)
                
                if isinstance(public_url_result, dict):
                    public_url = public_url_result.get('publicUrl') or public_url_result.get('url')
                else:
                    public_url = str(public_url_result)
                
                if not public_url:
                    raise Exception("공개 URL 생성 실패")
                
                logger.info(f"✅ Supabase 업로드 성공: {public_url}")
                return public_url
                
            except Exception as url_error:
                logger.error(f"❌ 공개 URL 생성 실패: {url_error}")
                raise Exception(f"공개 URL 생성 실패: {url_error}")
            
        except Exception as e:
            logger.error(f"❌ Supabase 업로드 실패: {e}")
            
            # 로컬 폴백
            logger.info("📂 로컬 저장으로 폴백 시도...")
            try:
                return self._save_to_local_fallback(case_id, marker_id, image_file)
            except Exception as fallback_error:
                logger.error(f"❌ 로컬 폴백도 실패: {fallback_error}")
                raise Exception(f"Supabase 실패: {e}, 로컬 저장도 실패: {fallback_error}")
    
    def _save_to_local_fallback(self, case_id, marker_id, image_file):
        """로컬 저장 폴백"""
        try:
            from django.conf import settings
            
            # 미디어 폴더 경로 설정
            if hasattr(settings, 'BASE_DIR'):
                media_dir = os.path.join(settings.BASE_DIR, 'shared_storage', 'media', 'markers')
            else:
                media_dir = os.path.join(os.getcwd(), 'shared_storage', 'media', 'markers')
            
            os.makedirs(media_dir, exist_ok=True)
            
            # 파일 저장
            if hasattr(image_file, 'read'):
                image_file.seek(0)
                file_data = image_file.read()
            else:
                file_data = image_file
            
            file_path = os.path.join(media_dir, f"{case_id}_{marker_id}.jpg")
            with open(file_path, 'wb') as f:
                f.write(file_data)
            
            # 상대 URL 반환
            relative_url = f"/media/markers/{case_id}_{marker_id}.jpg"
            logger.info(f"✅ 로컬 폴백 저장 성공: {relative_url}")
            return relative_url
            
        except Exception as e:
            logger.error(f"❌ 로컬 폴백 저장 실패: {e}")
            raise e
    
    def upload_suspect_image(self, case_id, suspect_id, image_file):
        """용의자 이미지 업로드 - 동일한 로직 적용"""
        try:
            if not self.supabase:
                raise Exception("Supabase 클라이언트가 초기화되지 않음")
            
            file_path = f"cases/{case_id}/suspects/{suspect_id}.jpg"
            
            if hasattr(image_file, 'read'):
                image_file.seek(0)
                file_data = image_file.read()
            else:
                file_data = image_file
            
            logger.info(f"📤 용의자 이미지 업로드: {file_path}")
            
            result = self.supabase.storage.from_('marker-images').upload(
                path=file_path,
                file=file_data,
                file_options={
                    "content-type": "image/jpeg",
                    "upsert": True
                }
            )
            
            if hasattr(result, 'error') and result.error:
                raise Exception(f"업로드 에러: {result.error}")
            
            public_url = self.supabase.storage.from_('marker-images').get_public_url(file_path)
            logger.info(f"✅ 용의자 이미지 업로드 성공: {public_url}")
            
            return public_url
            
        except Exception as e:
            logger.error(f"❌ 용의자 이미지 업로드 실패: {e}")
            
            # 로컬 폴백
            try:
                return self._save_suspect_to_local(case_id, suspect_id, image_file)
            except Exception as fallback_error:
                raise Exception(f"Supabase 업로드 실패: {e}. 로컬 저장도 실패: {fallback_error}")
    
    def _save_suspect_to_local(self, case_id, suspect_id, image_file):
        """용의자 이미지 로컬 저장"""
        try:
            from django.conf import settings
            
            media_dir = os.path.join(settings.BASE_DIR, 'shared_storage', 'media', 'suspects')
            os.makedirs(media_dir, exist_ok=True)
            
            if hasattr(image_file, 'read'):
                image_file.seek(0)
                file_data = image_file.read()
            else:
                file_data = image_file
            
            file_path = os.path.join(media_dir, f"{case_id}_{suspect_id}.jpg")
            with open(file_path, 'wb') as f:
                f.write(file_data)
            
            relative_url = f"/media/suspects/{case_id}_{suspect_id}.jpg"
            logger.info(f"✅ 용의자 로컬 저장 성공: {relative_url}")
            return relative_url
            
        except Exception as e:
            logger.error(f"❌ 용의자 로컬 저장 실패: {e}")
            raise e
    
    def check_connection(self):
        """Supabase 연결 상태 확인 - 개선된 버전"""
        try:
            if not self.supabase:
                return {
                    'connected': False,
                    'error': 'Supabase 클라이언트 초기화되지 않음',
                    'suggestion': '환경변수 SUPABASE_URL, SUPABASE_ANON_KEY 확인 필요'
                }
            
            # 버킷 목록 조회로 연결 확인
            buckets = self.supabase.storage.list_buckets()
            bucket_names = [bucket.name for bucket in buckets] if buckets else []
            
            return {
                'connected': True,
                'buckets_total': len(bucket_names),
                'bucket_names': bucket_names,
                'marker_images_exists': 'marker-images' in bucket_names,
                'url': self.supabase_url
            }
            
        except Exception as e:
            return {
                'connected': False,
                'error': str(e),
                'suggestion': 'Supabase 서비스 상태 및 네트워크 연결 확인 필요'
            }
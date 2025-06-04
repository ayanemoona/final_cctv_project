# backend/apps/cases/ai_integration.py (새 파일)
import requests
import logging
from django.conf import settings
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class AIServiceIntegrator:
    def __init__(self):
        self.gateway_url = settings.AI_SERVICES['GATEWAY_URL']
        
    def register_suspect(self, suspect_id: str, suspect_name: str, 
                        case_number: str, officer_name: str, 
                        clothing_image) -> Dict[str, Any]:
        """용의자 등록"""
        try:
            url = f"{self.gateway_url}/police/register_suspect"
            
            files = {'clothing_image': clothing_image}
            data = {
                'suspect_id': suspect_id,
                'suspect_name': suspect_name,
                'case_number': case_number,
                'officer_name': officer_name
            }
            
            response = requests.post(url, files=files, data=data, timeout=60)
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'data': response.json()
                }
            else:
                return {
                    'success': False,
                    'error': f"AI 서비스 오류: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"용의자 등록 실패: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def analyze_cctv_video(self, video_file, location: str, date: str,
                          officer_name: str, case_number: str,
                          fps_interval: float = 3.0,
                          stop_on_detect: bool = True) -> Dict[str, Any]:
        """CCTV 영상 분석"""
        try:
            url = f"{self.gateway_url}/police/analyze_cctv"
            
            files = {'video_file': video_file}
            data = {
                'location': location,
                'date': date,
                'officer_name': officer_name,
                'case_number': case_number,
                'fps_interval': fps_interval,
                'stop_on_detect': stop_on_detect
            }
            
            response = requests.post(url, files=files, data=data, timeout=300)
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'data': response.json()
                }
            else:
                return {
                    'success': False,
                    'error': f"AI 서비스 오류: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"CCTV 분석 실패: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_case_status(self, case_id: str) -> Dict[str, Any]:
        """케이스 상태 조회"""
        try:
            url = f"{self.gateway_url}/police/case_status/{case_id}"
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'data': response.json()
                }
            else:
                return {
                    'success': False,
                    'error': f"상태 조회 실패: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"케이스 상태 조회 실패: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_case_report(self, case_id: str) -> Dict[str, Any]:
        """케이스 보고서 조회"""
        try:
            url = f"{self.gateway_url}/police/case_report/{case_id}"
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'data': response.json()
                }
            else:
                return {
                    'success': False,
                    'error': f"보고서 조회 실패: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"케이스 보고서 조회 실패: {e}")
            return {
                'success': False,
                'error': str(e)
            }
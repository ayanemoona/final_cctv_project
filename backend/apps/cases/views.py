# backend/apps/cases/views.py - DRF APIView로 수정

import json
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from apps.authentication.authentication import SimpleTokenAuthentication
from .models import Case, Suspect, CCTVMarker
import logging
from datetime import datetime
import uuid
import os

logger = logging.getLogger(__name__)

class CasesAPIView(APIView):
    """사건 API - DRF APIView 사용으로 인증 정상화"""
    
    authentication_classes = [SimpleTokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """사건 목록 조회"""
        try:
            cases = Case.objects.all().order_by('-created_at')
            
            # 검색 기능
            search = request.GET.get('search', '')
            if search:
                cases = cases.filter(
                    title__icontains=search
                ) | cases.filter(
                    location__icontains=search
                ) | cases.filter(
                    case_number__icontains=search
                )
            
            cases_data = []
            for case in cases:
                cases_data.append({
                    'id': str(case.id),
                    'case_number': case.case_number,
                    'title': case.title,
                    'location': case.location,
                    'incident_date': case.incident_date.isoformat() if case.incident_date else None,
                    'description': case.description,
                    'status': case.status,
                    'created_by_name': f"{case.created_by.last_name}{case.created_by.first_name}" if case.created_by else "관리자",
                    'suspect_count': case.suspects.count() if hasattr(case, 'suspects') else 0,
                    'marker_count': case.cctv_markers.count() if hasattr(case, 'cctv_markers') else 0,
                    'created_at': case.created_at.isoformat() if case.created_at else None,
                })
            
            logger.info(f"사건 목록 조회 성공: {len(cases_data)}건, 사용자: {request.user.username}")
            return Response(cases_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"사건 목록 조회 에러: {e}")
            return Response({'error': f'서버 오류: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """사건 생성 - 정상 인증 사용"""
        try:
            logger.info("🔍 새 사건 생성 시작 (정상 인증)")
            
            # 🔍 인증 확인 (DRF에서 자동으로 처리됨)
            logger.info(f"👤 인증된 사용자: {request.user.username}")
            logger.info(f"✅ 인증 상태: {request.user.is_authenticated}")
            
            # FormData에서 데이터 추출
            case_number = request.data.get('case_number', '')
            title = request.data.get('title', '').strip() if request.data.get('title') else ''
            location = request.data.get('location', '').strip() if request.data.get('location') else ''
            incident_date = request.data.get('incident_date', '')
            description = request.data.get('description', '').strip() if request.data.get('description') else ''
            status_field = request.data.get('status', 'active')
            suspect_description = request.data.get('suspect_description', '').strip() if request.data.get('suspect_description') else ''
            
            logger.info(f"📝 받은 데이터: {title}, {location}, {suspect_description}")
            
            # 필수 필드 검증
            if not title or not location or not description:
                return Response({'error': '필수 필드를 모두 입력해주세요'}, status=status.HTTP_400_BAD_REQUEST)
            
            # 사건번호 자동 생성 (없으면)
            if not case_number:
                now = datetime.now()
                case_number = f"{now.year}-{now.month:02d}{now.day:02d}-{str(uuid.uuid4())[:8]}"
            
            # 날짜 처리
            incident_date_parsed = None
            if incident_date:
                from django.utils.dateparse import parse_datetime
                from django.utils import timezone
                
                try:
                    incident_date_parsed = parse_datetime(incident_date)
                    if incident_date_parsed and incident_date_parsed.tzinfo is None:
                        incident_date_parsed = timezone.make_aware(incident_date_parsed)
                except Exception as date_error:
                    logger.warning(f"날짜 파싱 실패: {date_error}")
                    incident_date_parsed = timezone.now()  # 현재 시간으로 설정
            else:
                # 날짜가 없으면 현재 시간
                from django.utils import timezone
                incident_date_parsed = timezone.now()
            
            # ✅ 사건 생성 (인증된 사용자 사용)
            case = Case.objects.create(
                case_number=case_number,
                title=title,
                location=location,
                incident_date=incident_date_parsed,
                description=description,
                status=status_field,
                created_by=request.user  # ✅ DRF에서 자동 인증된 사용자
            )
            
            logger.info(f"✅ 사건 생성 성공: {case.id} - {case.title}")
            
            # 📝 용의자 정보가 있으면 DB에만 저장
            suspect_created = False
            if suspect_description:
                try:
                    suspect = Suspect.objects.create(
                        case=case,
                        name="용의자",
                        clothing_description=suspect_description,
                        ai_person_id=f"case_{case.id}_suspect_1",
                        reference_image_url=''  # 임시로 빈 문자열
                    )
                    
                    # 📷 용의자 사진이 있으면 파일 저장
                    suspect_image = request.FILES.get('suspect_image')
                    if suspect_image:
                        try:
                            from django.conf import settings
                            
                            # 미디어 폴더 경로 설정
                            if hasattr(settings, 'BASE_DIR'):
                                media_dir = os.path.join(settings.BASE_DIR, 'media', 'suspects')
                            else:
                                media_dir = os.path.join(os.getcwd(), 'media', 'suspects')
                            
                            os.makedirs(media_dir, exist_ok=True)
                            
                            # 파일 저장
                            file_path = os.path.join(media_dir, f"{suspect.ai_person_id}.jpg")
                            with open(file_path, 'wb') as f:
                                for chunk in suspect_image.chunks():
                                    f.write(chunk)
                            
                            suspect.reference_image_url = f"/media/suspects/{suspect.ai_person_id}.jpg"
                            suspect.save()
                            
                            logger.info(f"📷 용의자 사진 저장됨: {file_path}")
                        except Exception as file_error:
                            logger.error(f"📷 파일 저장 실패: {file_error}")
                    
                    logger.info(f"✅ 용의자 정보 저장됨: {suspect.clothing_description}")
                    suspect_created = True
                    
                except Exception as suspect_error:
                    logger.error(f"❌ 용의자 생성 실패: {suspect_error}")
                    # 용의자 생성 실패해도 사건은 생성된 상태로 진행
            
            # 응답 데이터 구성
            first_suspect = case.suspects.first() if suspect_created else None
            response_data = {
                'id': str(case.id),
                'case_number': case.case_number,
                'title': case.title,
                'location': case.location,
                'incident_date': case.incident_date.isoformat() if case.incident_date else None,
                'description': case.description,
                'status': case.status,
                'created_by_name': f"{case.created_by.last_name}{case.created_by.first_name}",
                'suspect_count': case.suspects.count(),
                'marker_count': case.cctv_markers.count(),
                'created_at': case.created_at.isoformat(),
                'suspect_image_url': first_suspect.reference_image_url if first_suspect else None,
                'suspect_description': first_suspect.clothing_description if first_suspect else None,
            }
            
            logger.info(f"✅ 사건 생성 완료: {case.title}")
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"❌ 사건 생성 에러: {e}")
            import traceback
            traceback.print_exc()
            return Response({'error': f'서버 오류: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# 뷰 함수 래핑
cases_api = CasesAPIView.as_view()

# 나머지 함수들은 그대로 유지
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def case_detail(request, case_id):
    """사건 상세 조회"""
    try:
        case = get_object_or_404(Case, id=case_id)
        first_suspect = case.suspects.first()
        
        response_data = {
            'id': str(case.id),
            'case_number': case.case_number,
            'title': case.title,
            'location': case.location,
            'incident_date': case.incident_date.isoformat() if case.incident_date else None,
            'description': case.description,
            'status': case.status,
            'created_by_name': f"{case.created_by.last_name}{case.created_by.first_name}" if case.created_by else "관리자",
            'created_at': case.created_at.isoformat(),
            'suspect_image': first_suspect.reference_image_url if first_suspect else None,
            'suspect_description': first_suspect.clothing_description if first_suspect else None,
            'ai_person_id': first_suspect.ai_person_id if first_suspect else None,
        }
        
        return JsonResponse(response_data, json_dumps_params={'ensure_ascii': False})
        
    except Exception as e:
        logger.error(f"사건 상세 조회 에러: {e}")
        return JsonResponse({'error': f'서버 오류: {str(e)}'}, status=500)

@csrf_exempt  
def case_markers(request, case_id):
    """사건의 마커 목록 조회 및 추가"""
    
    if request.method == 'GET':
        # 마커 목록 조회
        try:
            case = get_object_or_404(Case, id=case_id)
            markers = case.cctv_markers.all().order_by('detected_at')
            
            markers_data = []
            for marker in markers:
                markers_data.append({
                    'id': str(marker.id),
                    'location_name': marker.location_name,
                    'detected_at': marker.detected_at.isoformat() if marker.detected_at else None,
                    'confidence_score': float(marker.confidence_score) if marker.confidence_score else 0,
                    'confidence_percentage': f"{marker.confidence_score * 100:.1f}%",
                    'is_confirmed': marker.is_confirmed,
                    'is_excluded': marker.is_excluded,
                    'police_comment': marker.police_comment or '',
                    'latitude': marker.latitude if marker.latitude else None,
                    'longitude': marker.longitude if marker.longitude else None,
                    'sequence_order': marker.sequence_order if hasattr(marker, 'sequence_order') else 0,
                    'crop_image_url': marker.crop_image_url,
                    'analysis_id': marker.analysis_id,
                    'ai_generated': bool(marker.analysis_id)
                })
            
            logger.info(f"사건 {case_id}의 마커 개수: {len(markers_data)}")
            return JsonResponse(markers_data, safe=False, json_dumps_params={'ensure_ascii': False})
            
        except Case.DoesNotExist:
            return JsonResponse({'error': '사건을 찾을 수 없습니다'}, status=404)
        except Exception as e:
            logger.error(f"마커 목록 조회 에러: {e}")
            return JsonResponse({'error': f'서버 오류: {str(e)}'}, status=500)
    
    else:
        return JsonResponse({'error': '지원하지 않는 메서드입니다'}, status=405)

# 🤖 AI 관련 엔드포인트들 (미구현)
@csrf_exempt
def analyze_cctv_video(request, case_id):
    """CCTV 영상 업로드 및 AI 분석 (미구현)"""
    return JsonResponse({'error': 'AI 분석 기능은 아직 구현되지 않았습니다'}, status=501)

@csrf_exempt
def get_analysis_status(request, case_id, analysis_id):
    """AI 분석 진행 상황 조회 (미구현)"""
    return JsonResponse({'error': 'AI 분석 상태 조회 기능은 아직 구현되지 않았습니다'}, status=501)

@csrf_exempt
def get_analysis_results(request, case_id, analysis_id):
    """AI 분석 완료 결과 조회 (미구현)"""
    return JsonResponse({'error': 'AI 분석 결과 조회 기능은 아직 구현되지 않았습니다'}, status=501)

@csrf_exempt
def ai_health_check(request):
    """AI 서비스 상태 확인 (미구현)"""
    return JsonResponse({
        'ai_services': {'status': 'not_implemented'},
        'django_integration': 'active',
        'timestamp': datetime.now().isoformat(),
        'message': 'AI 서비스는 아직 구현되지 않았습니다'
    }, json_dumps_params={'ensure_ascii': False})
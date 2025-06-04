# backend/apps/cases/views.py - AI 연동 강화 버전

import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.shortcuts import get_object_or_404
from django.utils.decorators import method_decorator
from django.views import View
from .models import Case, Suspect, CCTVMarker
from .services import (
    ai_service, 
    register_suspect_sync, 
    analyze_cctv_sync, 
    get_analysis_status_sync, 
    get_analysis_results_sync,
    check_ai_health_sync
)
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# ✅ 클래스 기반 뷰로 변경하여 CSRF 문제 해결
@method_decorator(csrf_exempt, name='dispatch')
class CasesAPIView(View):
    """사건 API - GET: 목록 조회, POST: 사건 생성 (AI 연동 포함)"""
    
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
            
            return JsonResponse(cases_data, safe=False, json_dumps_params={'ensure_ascii': False})
            
        except Exception as e:
            logger.error(f"사건 목록 조회 에러: {e}")
            return JsonResponse({'error': f'서버 오류: {str(e)}'}, status=500)
    
    def post(self, request):
        """사건 생성 - AI 연동 포함"""
        try:
            logger.info("🔍 새 사건 생성 시작 (AI 연동)")
            
            # FormData에서 데이터 추출
            case_number = request.POST.get('case_number', '')
            title = request.POST.get('title', '').strip()
            location = request.POST.get('location', '').strip()
            incident_date = request.POST.get('incident_date', '')
            description = request.POST.get('description', '').strip()
            status = request.POST.get('status', 'active')
            suspect_description = request.POST.get('suspect_description', '').strip()
            
            logger.info(f"📝 받은 데이터: {title}, {location}, {suspect_description}")
            
            # 현재 사용자 가져오기
            from django.contrib.auth import get_user_model
            User = get_user_model()
            admin_user = User.objects.filter(is_superuser=True).first()
            
            if not admin_user:
                return JsonResponse({'error': '관리자 계정이 필요합니다'}, status=400)
            
            # 필수 필드 검증
            if not title or not location or not description:
                return JsonResponse({'error': '필수 필드를 모두 입력해주세요'}, status=400)
            
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
                    return JsonResponse({'error': '올바른 날짜 형식을 입력해주세요'}, status=400)
            
            # 사건 생성
            case = Case.objects.create(
                case_number=case_number,
                title=title,
                location=location,
                incident_date=incident_date_parsed,
                description=description,
                status=status,
                created_by=admin_user
            )
            
            logger.info(f"✅ 사건 생성 성공: {case.id} - {case.title}")
            
            # 🤖 AI 연동: 용의자 정보 처리
            suspect_ai_result = None
            if suspect_description:
                try:
                    # 용의자 생성
                    suspect = Suspect.objects.create(
                        case=case,
                        name="용의자",
                        clothing_description=suspect_description,
                        ai_person_id=f"case_{case.id}_suspect_1",
                        reference_image_url=''  # 임시로 빈 문자열
                    )
                    
                    # 🤖 용의자 사진이 있으면 AI에 등록
                    suspect_image = request.FILES.get('suspect_image')
                    if suspect_image:
                        logger.info("🤖 용의자를 AI 시스템에 등록 중...")
                        
                        # AI에 용의자 등록 (동기 호출)
                        suspect_ai_result = register_suspect_sync(
                            suspect_id=suspect.ai_person_id,
                            suspect_image_file=suspect_image.read(),
                            suspect_description=suspect_description
                        )
                        
                        if suspect_ai_result.get('success'):
                            logger.info("✅ 용의자 AI 등록 성공")
                            # 성공 시 이미지 URL 업데이트 (실제 구현에서는 파일 저장 로직 추가)
                            suspect.reference_image_url = f"/media/suspects/{suspect.ai_person_id}.jpg"
                            suspect.save()
                        else:
                            logger.error(f"❌ 용의자 AI 등록 실패: {suspect_ai_result.get('error')}")
                    
                    logger.info(f"✅ 용의자 정보 저장됨: {suspect.clothing_description}")
                    
                except Exception as suspect_error:
                    logger.error(f"❌ 용의자 생성/AI 등록 실패: {suspect_error}")
            
            # 응답 데이터
            first_suspect = case.suspects.first()
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
                # 🤖 AI 연동 결과
                'ai_integration': {
                    'suspect_registered': suspect_ai_result.get('success', False) if suspect_ai_result else False,
                    'ai_error': suspect_ai_result.get('error') if suspect_ai_result and not suspect_ai_result.get('success') else None
                },
                'suspect_image_url': first_suspect.reference_image_url if first_suspect else None,
                'suspect_description': first_suspect.clothing_description if first_suspect else None,
            }
            
            logger.info(f"✅ 사건 생성 및 AI 연동 완료: {case.title}")
            return JsonResponse(response_data, status=201, json_dumps_params={'ensure_ascii': False})
            
        except Exception as e:
            logger.error(f"❌ 사건 생성 에러: {e}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'error': f'서버 오류: {str(e)}'}, status=500)

# 뷰 함수 래핑
cases_api = CasesAPIView.as_view()

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

# 🤖 새로운 CCTV 분석 엔드포인트 추가
@csrf_exempt
def analyze_cctv_video(request, case_id):
    """CCTV 영상 업로드 및 AI 분석"""
    if request.method != 'POST':
        return JsonResponse({'error': '지원하지 않는 메서드입니다'}, status=405)
    
    try:
        case = get_object_or_404(Case, id=case_id)
        logger.info(f"🎬 CCTV 분석 요청: 사건 {case.case_number}")
        
        # FormData에서 데이터 추출
        location_name = request.POST.get('location_name', '').strip()
        incident_time = request.POST.get('incident_time', '')
        suspect_description = request.POST.get('suspect_description', '')
        cctv_video = request.FILES.get('cctv_video')
        
        if not cctv_video:
            return JsonResponse({'error': 'CCTV 영상 파일이 필요합니다'}, status=400)
        
        if not location_name:
            return JsonResponse({'error': 'CCTV 위치를 입력해주세요'}, status=400)
        
        # 🤖 AI 분석 시작
        logger.info("🤖 AI 분석 시작...")
        analysis_result = analyze_cctv_sync(
            case_id=str(case.id),
            video_file=cctv_video,
            location_name=location_name,
            incident_time=incident_time,
            suspect_description=suspect_description
        )
        
        if analysis_result.get('success'):
            analysis_id = analysis_result.get('analysis_id')
            logger.info(f"✅ CCTV AI 분석 시작됨: {analysis_id}")
            
            return JsonResponse({
                'success': True,
                'analysis_id': analysis_id,
                'status': 'analysis_started',
                'case_id': str(case.id),
                'message': 'CCTV 영상 분석이 시작되었습니다',
                'monitoring': {
                    'status_url': f'/api/cases/{case_id}/analysis/{analysis_id}/status/',
                    'results_url': f'/api/cases/{case_id}/analysis/{analysis_id}/results/'
                }
            }, json_dumps_params={'ensure_ascii': False})
        else:
            error_msg = analysis_result.get('error', 'AI 분석 시작 실패')
            logger.error(f"❌ CCTV AI 분석 실패: {error_msg}")
            return JsonResponse({
                'success': False,
                'error': error_msg,
                'message': 'CCTV 영상 분석 시작에 실패했습니다'
            }, status=500)
        
    except Case.DoesNotExist:
        return JsonResponse({'error': '사건을 찾을 수 없습니다'}, status=404)
    except Exception as e:
        logger.error(f"❌ CCTV 분석 요청 실패: {e}")
        return JsonResponse({'error': f'서버 오류: {str(e)}'}, status=500)

@csrf_exempt
def get_analysis_status(request, case_id, analysis_id):
    """AI 분석 진행 상황 조회"""
    try:
        case = get_object_or_404(Case, id=case_id)
        logger.info(f"📊 분석 상태 조회: {analysis_id}")
        
        # 🤖 AI에서 분석 상태 조회
        status_result = get_analysis_status_sync(analysis_id)
        
        if status_result.get('success'):
            return JsonResponse({
                'success': True,
                'analysis_id': analysis_id,
                'case_id': str(case.id),
                'status': status_result.get('status', 'unknown'),
                'progress': status_result.get('progress', 0),
                'suspects_found': status_result.get('suspects_found', 0),
                'crop_images_available': status_result.get('crop_images_available', 0),
                'ai_response': status_result.get('ai_response', {})
            }, json_dumps_params={'ensure_ascii': False})
        else:
            return JsonResponse({
                'success': False,
                'error': status_result.get('error', '상태 조회 실패')
            }, status=500)
            
    except Case.DoesNotExist:
        return JsonResponse({'error': '사건을 찾을 수 없습니다'}, status=404)
    except Exception as e:
        logger.error(f"❌ 분석 상태 조회 실패: {e}")
        return JsonResponse({'error': f'서버 오류: {str(e)}'}, status=500)

@csrf_exempt
def get_analysis_results(request, case_id, analysis_id):
    """AI 분석 완료 결과 조회 및 마커 자동 생성"""
    try:
        case = get_object_or_404(Case, id=case_id)
        logger.info(f"📋 분석 결과 조회: {analysis_id}")
        
        # 🤖 AI에서 분석 결과 조회
        results = get_analysis_results_sync(analysis_id)
        
        if not results.get('success'):
            if results.get('status') == 'incomplete':
                return JsonResponse({
                    'success': False,
                    'status': 'incomplete',
                    'message': results.get('message', '분석이 아직 완료되지 않았습니다'),
                    'progress': results.get('progress', 0)
                })
            else:
                return JsonResponse({
                    'success': False,
                    'error': results.get('error', '결과 조회 실패')
                }, status=500)
        
        # 🤖 AI 결과를 Django 마커로 변환
        logger.info("🔄 AI 결과를 마커로 변환 중...")
        first_suspect = case.suspects.first()
        
        markers_data = ai_service.parse_ai_results_to_markers(
            ai_results=results,
            case_id=str(case.id),
            suspect_id=first_suspect.ai_person_id if first_suspect else None
        )
        
        # 🏗️ 마커들을 데이터베이스에 저장
        created_markers = []
        current_user = case.created_by
        
        for marker_info in markers_data:
            try:
                # 날짜 파싱
                detected_at_parsed = None
                if marker_info.get('detected_at'):
                    from django.utils.dateparse import parse_datetime
                    from django.utils import timezone
                    detected_at_parsed = parse_datetime(marker_info['detected_at'])
                    if detected_at_parsed and detected_at_parsed.tzinfo is None:
                        detected_at_parsed = timezone.make_aware(detected_at_parsed)
                
                # 마커 생성
                marker = CCTVMarker.objects.create(
                    case=case,
                    suspect=first_suspect,
                    location_name=marker_info.get('location_name', 'AI 탐지 위치'),
                    latitude=None,  # 추후 주소 변환으로 채움
                    longitude=None,
                    detected_at=detected_at_parsed,
                    confidence_score=marker_info.get('confidence_score', 0.0),
                    crop_image_url=marker_info.get('crop_image_url', ''),
                    police_comment=marker_info.get('police_comment', ''),
                    is_confirmed=marker_info.get('is_confirmed', True),
                    is_excluded=marker_info.get('is_excluded', False),
                    sequence_order=marker_info.get('sequence_order', 0),
                    analysis_id=analysis_id,
                    created_by=current_user
                )
                
                created_markers.append({
                    'id': str(marker.id),
                    'location_name': marker.location_name,
                    'detected_at': marker.detected_at.isoformat() if marker.detected_at else None,
                    'confidence_score': marker.confidence_score,
                    'confidence_percentage': f"{marker.confidence_score * 100:.1f}%",
                    'is_confirmed': marker.is_confirmed,
                    'is_excluded': marker.is_excluded,
                    'police_comment': marker.police_comment,
                    'sequence_order': marker.sequence_order,
                    'crop_image_url': marker.crop_image_url
                })
                
            except Exception as marker_error:
                logger.error(f"❌ 마커 생성 실패: {marker_error}")
                continue
        
        logger.info(f"✅ AI 분석 완료 - {len(created_markers)}개 마커 생성됨")
        
        return JsonResponse({
            'success': True,
            'status': 'completed',
            'analysis_id': analysis_id,
            'case_id': str(case.id),
            'markers_created': len(created_markers),
            'markers': created_markers,
            'detection_results': results.get('detection_results', {}),
            'investigation_summary': results.get('investigation_summary', {}),
            'message': f'AI 분석이 완료되어 {len(created_markers)}개의 마커가 생성되었습니다'
        }, json_dumps_params={'ensure_ascii': False})
        
    except Case.DoesNotExist:
        return JsonResponse({'error': '사건을 찾을 수 없습니다'}, status=404)
    except Exception as e:
        logger.error(f"❌ 분석 결과 처리 실패: {e}")
        import traceback
        traceback.print_exc()
        return JsonResponse({'error': f'서버 오류: {str(e)}'}, status=500)

@csrf_exempt  
def case_markers(request, case_id):
    """사건의 마커 목록 조회 및 추가 (기존 로직 유지)"""
    
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
                    'ai_generated': bool(marker.analysis_id)  # AI로 생성된 마커인지 표시
                })
            
            logger.info(f"사건 {case_id}의 마커 개수: {len(markers_data)}")
            return JsonResponse(markers_data, safe=False, json_dumps_params={'ensure_ascii': False})
            
        except Case.DoesNotExist:
            return JsonResponse({'error': '사건을 찾을 수 없습니다'}, status=404)
        except Exception as e:
            logger.error(f"마커 목록 조회 에러: {e}")
            return JsonResponse({'error': f'서버 오류: {str(e)}'}, status=500)
    
    elif request.method == 'POST':
        # 수동 마커 추가 (기존 로직 유지)
        try:
            case = get_object_or_404(Case, id=case_id)
            
            location_name = request.POST.get('location_name', '').strip()
            detected_at = request.POST.get('detected_at', '')
            police_comment = request.POST.get('police_comment', '').strip()
            confidence_score = float(request.POST.get('confidence_score', 1.0))
            is_confirmed = request.POST.get('is_confirmed', 'true').lower() == 'true'
            is_excluded = request.POST.get('is_excluded', 'false').lower() == 'true'
            
            if not location_name:
                return JsonResponse({'error': '위치를 입력해주세요'}, status=400)
            
            if not detected_at:
                return JsonResponse({'error': '발견 시간을 입력해주세요'}, status=400)
            
            # 날짜 파싱
            from django.utils.dateparse import parse_datetime
            from django.utils import timezone
            
            detected_at_parsed = parse_datetime(detected_at)
            if not detected_at_parsed:
                return JsonResponse({'error': '올바른 날짜 형식을 입력해주세요'}, status=400)
            
            if detected_at_parsed.tzinfo is None:
                detected_at_parsed = timezone.make_aware(detected_at_parsed)
            
            # 현재 사용자
            from django.contrib.auth import get_user_model
            User = get_user_model()
            admin_user = User.objects.filter(is_superuser=True).first()
            
            # 순서 번호 자동 설정
            last_marker = case.cctv_markers.order_by('-sequence_order').first()
            next_sequence = (last_marker.sequence_order + 1) if last_marker else 1
            
            # 마커 생성
            marker = CCTVMarker.objects.create(
                case=case,
                suspect=case.suspects.first(),  # 첫 번째 용의자와 연결
                location_name=location_name,
                latitude=None,
                longitude=None,
                detected_at=detected_at_parsed,
                confidence_score=confidence_score,
                police_comment=police_comment,
                is_confirmed=is_confirmed,
                is_excluded=is_excluded,
                sequence_order=next_sequence,
                created_by=admin_user,
                crop_image_url='',
                analysis_id=''  # 수동 추가는 빈 문자열
            )
            
            # 용의자 사진 처리
            suspect_image = request.FILES.get('suspect_image')
            if suspect_image:
                # 실제 파일 저장 로직 구현 필요
                pass
            
            logger.info(f"✅ 수동 마커 생성 성공: {marker.id} - {marker.location_name}")
            
            response_data = {
                'id': str(marker.id),
                'location_name': marker.location_name,
                'detected_at': marker.detected_at.isoformat(),
                'confidence_score': marker.confidence_score,
                'confidence_percentage': f"{marker.confidence_score * 100:.1f}%",
                'is_confirmed': marker.is_confirmed,
                'is_excluded': marker.is_excluded,
                'police_comment': marker.police_comment,
                'latitude': marker.latitude,
                'longitude': marker.longitude,
                'sequence_order': marker.sequence_order,
                'ai_generated': False
            }
            
            return JsonResponse(response_data, status=201, json_dumps_params={'ensure_ascii': False})
            
        except Case.DoesNotExist:
            return JsonResponse({'error': '사건을 찾을 수 없습니다'}, status=404)
        except Exception as e:
            logger.error(f"❌ 수동 마커 추가 에러: {e}")
            return JsonResponse({'error': f'서버 오류: {str(e)}'}, status=500)
    
    else:
        return JsonResponse({'error': '지원하지 않는 메서드입니다'}, status=405)

# 🤖 AI 서비스 상태 확인 엔드포인트
@csrf_exempt
def ai_health_check(request):
    """AI 서비스 상태 확인"""
    try:
        health_result = check_ai_health_sync()
        
        return JsonResponse({
            'ai_services': health_result,
            'django_integration': 'active',
            'timestamp': datetime.now().isoformat()
        }, json_dumps_params={'ensure_ascii': False})
        
    except Exception as e:
        logger.error(f"❌ AI 상태 확인 실패: {e}")
        return JsonResponse({
            'error': f'AI 서비스 상태 확인 실패: {str(e)}',
            'django_integration': 'active',
            'ai_services': {'status': 'error'}
        }, status=500)
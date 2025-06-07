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
import requests
from django.conf import settings

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


class CaseMarkersAPIView(APIView):
    """사건 마커 API - DRF APIView로 인증 정상화"""
    
    authentication_classes = [SimpleTokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, case_id):
        """마커 목록 조회"""
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
            return Response(markers_data, status=status.HTTP_200_OK)
            
        except Case.DoesNotExist:
            return Response({'error': '사건을 찾을 수 없습니다'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"마커 목록 조회 에러: {e}")
            return Response({'error': f'서버 오류: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request, case_id):
        """마커 추가"""
        try:
            logger.info(f"🔍 마커 추가 시작 - 사건 ID: {case_id}")
            logger.info(f"👤 인증된 사용자: {request.user.username}")
            
            # 사건 존재 확인
            case = get_object_or_404(Case, id=case_id)
            
            # FormData에서 데이터 추출
            location_name = request.data.get('location_name', '').strip()
            detected_at = request.data.get('detected_at', '')
            police_comment = request.data.get('police_comment', '').strip()
            confidence_score = float(request.data.get('confidence_score', 1.0))
            is_confirmed = request.data.get('is_confirmed', 'true').lower() == 'true'
            is_excluded = request.data.get('is_excluded', 'false').lower() == 'true'
            
            logger.info(f"📝 받은 데이터: {location_name}, {detected_at}, {police_comment}")
            
            # 필수 필드 검증
            if not location_name:
                return Response({'error': '위치명을 입력해주세요'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not detected_at:
                return Response({'error': '발견 시간을 입력해주세요'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not police_comment:
                return Response({'error': '경찰 사견을 입력해주세요'}, status=status.HTTP_400_BAD_REQUEST)
            
            # 날짜 처리
            from django.utils.dateparse import parse_datetime
            from django.utils import timezone
            
            try:
                detected_at_parsed = parse_datetime(detected_at)
                if detected_at_parsed and detected_at_parsed.tzinfo is None:
                    detected_at_parsed = timezone.make_aware(detected_at_parsed)
            except Exception as date_error:
                logger.warning(f"날짜 파싱 실패: {date_error}")
                return Response({'error': '올바른 날짜 형식을 입력해주세요'}, status=status.HTTP_400_BAD_REQUEST)
            
            # 마커 생성
            marker = CCTVMarker.objects.create(
                case=case,
                location_name=location_name,
                detected_at=detected_at_parsed,
                police_comment=police_comment,
                confidence_score=confidence_score,
                is_confirmed=is_confirmed,
                is_excluded=is_excluded,
                created_by=request.user,  # 인증된 사용자
                sequence_order=case.cctv_markers.count() + 1  # 순서 자동 설정
            )
            
            # 용의자 사진 처리 (있는 경우)
            suspect_image = request.FILES.get('suspect_image')
            if suspect_image:
                try:
                    from django.conf import settings
                    
                    # 미디어 폴더 경로 설정
                    if hasattr(settings, 'BASE_DIR'):
                        media_dir = os.path.join(settings.BASE_DIR, 'media', 'markers')
                    else:
                        media_dir = os.path.join(os.getcwd(), 'media', 'markers')
                    
                    os.makedirs(media_dir, exist_ok=True)
                    
                    # 파일 저장
                    file_path = os.path.join(media_dir, f"marker_{marker.id}.jpg")
                    with open(file_path, 'wb') as f:
                        for chunk in suspect_image.chunks():
                            f.write(chunk)
                    
                    marker.crop_image_url = f"/media/markers/marker_{marker.id}.jpg"
                    marker.save()
                    
                    logger.info(f"📷 마커 이미지 저장됨: {file_path}")
                except Exception as file_error:
                    logger.error(f"📷 파일 저장 실패: {file_error}")
            
            logger.info(f"✅ 마커 생성 성공: {marker.id} - {marker.location_name}")
            
            # 응답 데이터 구성
            response_data = {
                'id': str(marker.id),
                'location_name': marker.location_name,
                'detected_at': marker.detected_at.isoformat() if marker.detected_at else None,
                'confidence_score': float(marker.confidence_score),
                'confidence_percentage': f"{marker.confidence_score * 100:.1f}%",
                'is_confirmed': marker.is_confirmed,
                'is_excluded': marker.is_excluded,
                'police_comment': marker.police_comment or '',
                'latitude': marker.latitude,
                'longitude': marker.longitude,
                'sequence_order': marker.sequence_order,
                'crop_image_url': marker.crop_image_url,
                'analysis_id': marker.analysis_id,
                'ai_generated': bool(marker.analysis_id),
                'created_at': marker.created_at.isoformat()
            }
            
            logger.info(f"✅ 마커 추가 완료: {marker.location_name}")
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Case.DoesNotExist:
            return Response({'error': '사건을 찾을 수 없습니다'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"❌ 마커 추가 에러: {e}")
            import traceback
            traceback.print_exc()
            return Response({'error': f'서버 오류: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# 뷰 함수 래핑
cases_api = CasesAPIView.as_view()
case_markers = CaseMarkersAPIView.as_view()

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

class CaseDeleteAPIView(APIView):
    """사건 삭제 전용 API"""
    
    authentication_classes = [SimpleTokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, case_id):
        """사건 삭제 - 연관된 마커들과 파일들도 함께 삭제"""
        try:
            logger.info(f"🗑️ 사건 삭제 시작 - ID: {case_id}")
            logger.info(f"👤 인증된 사용자: {request.user.username}")
            
            # 사건 존재 확인 및 권한 체크
            try:
                case = Case.objects.get(id=case_id, created_by=request.user)
            except Case.DoesNotExist:
                return Response({
                    'error': '해당 사건을 찾을 수 없거나 삭제 권한이 없습니다.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            case_title = case.title
            case_number = case.case_number
            
            # 연관된 데이터 개수 확인
            markers_count = case.cctv_markers.count()
            suspects_count = case.suspects.count()
            
            logger.info(f"📊 삭제 대상: 마커 {markers_count}개, 용의자 {suspects_count}명")
            
            # 1. 연관된 파일들 삭제
            deleted_files = []
            
            # 용의자 사진 파일들 삭제
            for suspect in case.suspects.all():
                if suspect.reference_image_url:
                    try:
                        file_path = suspect.reference_image_url.lstrip('/')
                        full_path = os.path.join(settings.BASE_DIR, file_path)
                        if os.path.exists(full_path):
                            os.remove(full_path)
                            deleted_files.append(file_path)
                            logger.info(f"📷 용의자 사진 삭제: {file_path}")
                    except Exception as file_error:
                        logger.warning(f"📷 파일 삭제 실패: {file_error}")
            
            # 마커 크롭 이미지들 삭제
            for marker in case.cctv_markers.all():
                if marker.crop_image_url:
                    try:
                        file_path = marker.crop_image_url.lstrip('/')
                        full_path = os.path.join(settings.BASE_DIR, file_path)
                        if os.path.exists(full_path):
                            os.remove(full_path)
                            deleted_files.append(file_path)
                            logger.info(f"📷 마커 이미지 삭제: {file_path}")
                    except Exception as file_error:
                        logger.warning(f"📷 파일 삭제 실패: {file_error}")
            
            # 2. DB에서 연관 데이터 삭제 (CASCADE로 자동 삭제되지만 명시적으로)
            CCTVMarker.objects.filter(case=case).delete()
            case.suspects.all().delete()
            
            # 3. 사건 삭제
            case.delete()
            
            logger.info(f"✅ 사건 삭제 완료: {case_title} (#{case_number})")
            logger.info(f"📁 삭제된 파일: {len(deleted_files)}개")
            
            return Response({
                'success': True,
                'message': f'사건 "{case_title}"이(가) 성공적으로 삭제되었습니다.',
                'deleted_data': {
                    'case_id': str(case_id),
                    'case_title': case_title,
                    'case_number': case_number,
                    'markers_deleted': markers_count,
                    'suspects_deleted': suspects_count,
                    'files_deleted': len(deleted_files)
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ 사건 삭제 실패: {e}")
            import traceback
            logger.error(f"스택 트레이스: {traceback.format_exc()}")
            return Response({
                'success': False,
                'error': f'사건 삭제 중 오류가 발생했습니다: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# 뷰 래핑
delete_case = CaseDeleteAPIView.as_view()

# 🤖 AI 관련 엔드포인트들 
class CCTVAnalysisAPIView(APIView):
    """CCTV 영상 분석 API - DRF APIView로 통일"""
    
    authentication_classes = [SimpleTokenAuthentication]
    permission_classes = [IsAuthenticated]
    
    def post(self, request, case_id):
        """CCTV 영상 업로드 및 AI 분석 (사건별 용의자 매칭)"""
        try:
            logger.info(f"🎯 CCTV 분석 시작 - 사건: {case_id}")
            logger.info(f"👤 인증된 사용자: {request.user.username}")
            
            # 1. 사건 및 용의자 정보 확인
            try:
                case = Case.objects.get(id=case_id, created_by=request.user)
            except Case.DoesNotExist:
                return Response({
                    'error': '해당 사건을 찾을 수 없거나 접근 권한이 없습니다.'
                }, status=status.HTTP_404_NOT_FOUND)
            
            first_suspect = case.suspects.first()
            
            if not first_suspect or not first_suspect.reference_image_url:
                return Response({
                    'error': '이 사건에 등록된 용의자 사진이 없습니다. 먼저 사건에 용의자 사진을 등록해주세요.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 2. 업로드된 데이터 받기
            location_name = request.data.get('location_name')
            incident_time = request.data.get('incident_time')
            suspect_description = request.data.get('suspect_description', '')
            cctv_video = request.FILES.get('cctv_video')
            
            if not cctv_video:
                return Response({
                    'error': 'CCTV 영상 파일이 필요합니다'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            logger.info(f"📁 파일 수신: {cctv_video.name}, 크기: {cctv_video.size/1024/1024:.2f}MB")
            logger.info(f"👤 대상 용의자: {first_suspect.ai_person_id}")
            
            # 3. 해당 사건의 용의자를 Clothing Service에 임시 등록
            suspect_image_path = first_suspect.reference_image_url.lstrip('/')
            full_image_path = os.path.join(settings.BASE_DIR, suspect_image_path)
            
            if not os.path.exists(full_image_path):
                return Response({
                    'error': f'용의자 사진 파일을 찾을 수 없습니다: {suspect_image_path}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 4. Clothing Service에 이 사건의 용의자만 등록
            try:
                with open(full_image_path, 'rb') as f:
                    image_data = f.read()
                
                files = {'file': (f'{first_suspect.ai_person_id}.jpg', image_data, 'image/jpeg')}
                data = {'person_id': first_suspect.ai_person_id}
                
                response = requests.post(
                    'http://clothing-service:8002/register_person',
                    files=files,
                    data=data,
                    timeout=30
                )
                
                if response.status_code != 200:
                    logger.error(f"용의자 등록 실패: {response.status_code} - {response.text}")
                    return Response({
                        'error': f'용의자 등록 실패: {response.status_code}'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
                logger.info(f"✅ 용의자 등록 완료: {first_suspect.ai_person_id}")
                
            except Exception as reg_error:
                logger.error(f"용의자 등록 오류: {reg_error}")
                return Response({
                    'error': f'용의자 등록 오류: {reg_error}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # 5. AI Gateway로 CCTV 분석 요청
            gateway_url = os.getenv('AI_GATEWAY_URL', 'http://api-gateway:8000')
            
            files = {'video_file': (cctv_video.name, cctv_video.read(), cctv_video.content_type)}
            data = {
                'location': location_name,
                'date': incident_time,
                'officer_name': request.user.username,
                'case_number': str(case_id),
                'stop_on_detect': True
            }
            
            logger.info(f"📤 AI 요청 데이터: {data}")
            
            response = requests.post(
                f"{gateway_url}/police/analyze_cctv",
                files=files,
                data=data,
                timeout=60
            )
            
            logger.info(f"📨 AI 응답: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"✅ AI 분석 성공: {result}")
                return Response({
                    'success': True,
                    'analysis_id': result.get('analysis_id'),
                    'case_id': result.get('case_id', str(case_id)),
                    'suspect_id': first_suspect.ai_person_id,
                    'message': f'사건 {case.case_number}의 용의자와 매칭 분석이 시작되었습니다'
                }, status=status.HTTP_200_OK)
            else:
                logger.error(f"❌ AI 서비스 오류: {response.status_code} - {response.text}")
                return Response({
                    'success': False,
                    'error': f'AI 서비스 오류: {response.status_code}',
                    'details': response.text
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"❌ CCTV 분석 실패: {e}")
            import traceback
            logger.error(f"스택 트레이스: {traceback.format_exc()}")
            return Response({
                'success': False, 
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# 기존 함수 제거하고 뷰 래핑 추가
analyze_cctv_video = CCTVAnalysisAPIView.as_view()

@csrf_exempt
def get_analysis_status(request, case_id, analysis_id):
    """AI 분석 진행상황 조회 - 수정된 버전"""
    try:
        video_service_url = os.getenv('VIDEO_SERVICE_URL', 'http://video-service:8004')  
        
        # ✅ Video Service 직접 호출 (Django Shell에서 성공한 방식과 동일)
        response = requests.get(
            f"{video_service_url}/analysis_status/{analysis_id}",
            timeout=300 # 30초 → 10초로 단축 (Shell에서 1초도 안 걸림)
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # ✅ Video Service의 실제 응답 형식 그대로 사용
            return JsonResponse({
                'success': True,
                'analysis_id': result.get('analysis_id', analysis_id),
                'status': result.get('status', 'processing'),
                'progress': result.get('progress', 0),
                'current_phase': result.get('current_phase', ''),
                'method': result.get('method', ''),
                'suspects_found': result.get('suspects_found', 0),
                'crop_images_available': result.get('crop_images_available', 0),
                'processing_time': result.get('processing_time', 0),
                'optimization_stats': result.get('optimization_stats', {}),
                'high_confidence_mode': result.get('high_confidence_mode', False),
                'phase_description': result.get('phase_description', '')
            })
        else:
            logger.error(f"Video Service 상태 조회 실패: {response.status_code} - {response.text}")
            return JsonResponse({
                'success': False,
                'error': f'상태 조회 실패: {response.status_code}',
                'details': response.text
            }, status=response.status_code)
            
    except requests.exceptions.Timeout:
        logger.error(f"Video Service 타임아웃: analysis_id={analysis_id}")
        return JsonResponse({
            'success': False,
            'error': 'Video Service 응답 타임아웃',
            'message': '분석 서비스가 응답하지 않습니다. 잠시 후 다시 시도해주세요.'
        }, status=408)
    except requests.exceptions.ConnectionError:
        logger.error(f"Video Service 연결 실패: analysis_id={analysis_id}")
        return JsonResponse({
            'success': False,
            'error': 'Video Service 연결 실패',
            'message': '분석 서비스에 연결할 수 없습니다.'
        }, status=503)
    except Exception as e:
        logger.error(f"분석 상태 조회 실패: analysis_id={analysis_id}, error={e}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@csrf_exempt
def get_analysis_results(request, case_id, analysis_id):
    """AI 분석 완료 결과 조회 + CCTV 정보 포함"""
    try:
        video_service_url = os.getenv('VIDEO_SERVICE_URL', 'http://video-service:8004')
        
        # ✅ 1. 사건 정보 먼저 조회 (CCTV 정보 포함)
        try:
            case = Case.objects.get(id=case_id)
        except Case.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': '사건을 찾을 수 없습니다'
            }, status=404)
        
        # ✅ 2. Video Service에서 분석 결과 조회
        response = requests.get(
            f"{video_service_url}/analysis_result/{analysis_id}",
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # 분석이 완료되었는지 확인
            if result.get('status') != 'completed':
                return JsonResponse({
                    'success': False,
                    'status': 'incomplete',
                    'message': result.get('message', '분석 진행 중'),
                    'progress': result.get('progress', 0)
                })
            
            # 크롭 이미지들 추출
            crop_images = result.get('suspect_crop_images', [])
            timeline_data = result.get('suspects_timeline', [])
            
            # 🎯 경찰이 선택할 수 있는 형태로 변환
            detection_candidates = []
            for i, crop_img in enumerate(crop_images):
                detection_candidates.append({
                    'detection_id': f"detection_{i+1}",
                    'suspect_id': crop_img.get('suspect_id', f'suspect_{i+1}'),
                    'similarity': crop_img.get('similarity', 0),
                    'similarity_percentage': f"{crop_img.get('similarity', 0) * 100:.1f}%",
                    'cropped_image_base64': crop_img.get('cropped_image', ''),
                    'timestamp': crop_img.get('timestamp', ''),
                    'bbox': crop_img.get('bbox', {}),
                    'person_id': crop_img.get('person_id', ''),
                    'total_appearances': crop_img.get('total_appearances', 1),
                    'crop_quality': crop_img.get('crop_quality', 0),
                    'confidence_level': 'HIGH' if crop_img.get('similarity', 0) > 0.8 else 'MEDIUM'
                })
            
            # ✅ 3. 원본 CCTV 분석 요청 정보 추가 (Video Service에서 받은 정보 활용)
            original_request = result.get('original_request', {})
            
            return JsonResponse({
                'success': True,
                'status': 'completed',
                'analysis_id': result.get('analysis_id', analysis_id),
                'detection_candidates': detection_candidates,
                'total_detections': len(detection_candidates),
                'timeline_data': timeline_data,
                'processing_time': result.get('processing_time_seconds', 0),
                
                # ✅ 원본 CCTV 정보 포함
                'cctv_info': {
                    'location_name': original_request.get('location', '알 수 없는 위치'),
                    'incident_time': original_request.get('date', ''),
                    'officer_name': original_request.get('officer_name', ''),
                    'case_number': original_request.get('case_number', str(case_id)),
                    'analysis_method': result.get('method', 'standard')
                },
                
                # ✅ 사건 정보 추가
                'case_info': {
                    'id': str(case.id),
                    'case_number': case.case_number,
                    'title': case.title,
                    'location': case.location
                },
                
                'analysis_summary': result.get('summary', {}),
                'performance_stats': result.get('performance_stats', {}),
                'message': f'{len(detection_candidates)}개의 용의자 후보가 발견되었습니다'
            })
            
        elif response.status_code == 400:
            return JsonResponse({
                'success': False,
                'status': 'incomplete',
                'message': '분석이 아직 완료되지 않았습니다'
            })
        else:
            logger.error(f"Video Service 결과 조회 실패: {response.status_code} - {response.text}")
            return JsonResponse({
                'success': False,
                'error': f'결과 조회 실패: {response.status_code}',
                'details': response.text
            }, status=response.status_code)
            
    except Exception as e:
        logger.error(f"분석 결과 조회 실패: analysis_id={analysis_id}, error={e}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@csrf_exempt
def get_analysis_results(request, case_id, analysis_id):
    """AI 분석 완료 결과 조회 + 마커 생성"""
    try:
        video_service_url = os.getenv('VIDEO_SERVICE_URL', 'http://video-service:8004')
        
        # AI Gateway의 case_report 엔드포인트 호출
        response = requests.get(
            f"{video_service_url}/analysis_result/{analysis_id}",
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # 분석이 완료되었는지 확인
            if result.get('status') == 'incomplete':
                return JsonResponse({
                    'success': False,
                    'status': 'incomplete',
                    'message': result.get('message', '분석 진행 중'),
                    'progress': result.get('current_progress', 0)
                })
            
            # 크롭 이미지들 추출
            crop_images = result.get('suspect_crop_images', [])  # ✅ 올바른 키
            timeline_data = result.get('suspects_timeline', [])
            
            # 🎯 경찰이 선택할 수 있는 형태로 변환
            detection_candidates = []
            for i, crop_img in enumerate(crop_images):
                detection_candidates.append({
                    'detection_id': f"detection_{i+1}",
                    'suspect_id': crop_img.get('suspect_id', f'suspect_{i+1}'),
                    'similarity': crop_img.get('similarity', 0),
                    'similarity_percentage': f"{crop_img.get('similarity', 0) * 100:.1f}%",
                    'cropped_image_base64': crop_img.get('cropped_image', ''),
                    'timestamp': crop_img.get('timestamp', ''),
                    'confidence_level': 'high' if crop_img.get('similarity', 0) > 0.8 else 'medium'
                })
            
            return JsonResponse({
                'success': True,
                'status': 'completed',
                'detection_candidates': detection_candidates,
                'total_detections': len(detection_candidates),
                'timeline_data': timeline_data,
                'analysis_summary': result.get('investigation_summary', {}),
                'message': f'{len(detection_candidates)}개의 용의자 후보가 발견되었습니다'
            })
            
        elif response.status_code == 400:
            # 아직 분석 중
            return JsonResponse({
                'success': False,
                'status': 'incomplete',
                'message': '분석이 아직 완료되지 않았습니다'
            })
        else:
            return JsonResponse({
                'success': False,
                'error': f'결과 조회 실패: {response.status_code}'
            }, status=500)
            
    except Exception as e:
        logger.error(f"분석 결과 조회 실패: {e}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
    
@csrf_exempt
def ai_health_check(request):
    """AI 서비스 상태 확인"""
    try:
        gateway_url = os.getenv('AI_GATEWAY_URL', 'http://api-gateway:8000')
        
        response = requests.get(f"{gateway_url}/health", timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            
            return JsonResponse({
                'ai_services': {
                    'status': 'healthy',
                    'gateway_connected': True,
                    'details': result
                },
                'django_integration': 'active',
                'timestamp': datetime.now().isoformat()
            })
        else:
            return JsonResponse({
                'ai_services': {
                    'status': 'unhealthy', 
                    'gateway_connected': False,
                    'error': f'HTTP {response.status_code}'
                },
                'django_integration': 'active',
                'timestamp': datetime.now().isoformat()
            })
            
    except Exception as e:
        return JsonResponse({
            'ai_services': {
                'status': 'unreachable',
                'gateway_connected': False, 
                'error': str(e)
            },
            'django_integration': 'active',
            'timestamp': datetime.now().isoformat()
        })
    
@csrf_exempt
def test_cctv_connection(request, case_id):
    """CCTV 연결 테스트"""
    return JsonResponse({
        'success': True,
        'message': f'CCTV 엔드포인트 연결 성공! case_id: {case_id}',
        'method': request.method,
        'case_id': case_id
    })


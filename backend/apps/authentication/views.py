# backend/apps/authentication/views.py - Token import 수정

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import authenticate
import uuid  # 임시 토큰 생성용
from .models import PoliceUser

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """로그인 API"""
    username = request.data.get('username')
    password = request.data.get('password')
    
    print(f"로그인 시도: {username}")
    
    if not username or not password:
        return Response(
            {'error': '아이디와 비밀번호를 입력해주세요.'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 사용자 인증
    user = authenticate(username=username, password=password)
    if not user:
        print(f"인증 실패: {username}")
        return Response(
            {'error': '아이디 또는 비밀번호가 올바르지 않습니다.'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    print(f"인증 성공: {username}")
    
    # 임시 토큰 생성 (실제 프로덕션에서는 JWT나 DRF Token 사용)
    token = f"token-{user.id}-{str(uuid.uuid4())[:8]}"
    
    # 사용자 정보
    user_data = {
        'id': user.id,
        'username': user.username,
        'first_name': getattr(user, 'first_name', '') or '사용자',
        'last_name': getattr(user, 'last_name', '') or '',
        'rank': getattr(user, 'rank', '경사'),
        'department': getattr(user, 'department', '강력계'),
        'badge_number': getattr(user, 'badge_number', f'P{user.id:06d}')
    }
    
    return Response({
        'token': token,
        'user': user_data,
        'message': '로그인이 완료되었습니다.'
    })

@api_view(['POST'])
def logout(request):
    """로그아웃 API"""
    return Response({'message': '로그아웃이 완료되었습니다.'})

@api_view(['GET'])
def verify_token(request):
    """토큰 검증 API"""
    # 임시로 항상 성공 처리 (개발용)
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    
    if auth_header.startswith('Bearer '):
        # 토큰이 있으면 성공으로 처리
        user_data = {
            'id': 1,
            'username': 'admin',
            'first_name': '관리자',
            'last_name': '시스템',
            'rank': '경정',
            'department': '수사과',
            'badge_number': 'P000001'
        }
        
        return Response({
            'valid': True,
            'user': user_data
        })
    else:
        return Response(
            {'valid': False, 'error': '유효하지 않은 토큰입니다.'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
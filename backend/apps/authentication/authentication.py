# apps/authentication/authentication.py 파일을 생성하고 다음 내용 입력:

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import authentication, exceptions

User = get_user_model()

class JWTAuthentication(authentication.BaseAuthentication):
    """JWT 인증 클래스"""
    
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        
        if not auth_header:
            return None
            
        try:
            # Bearer 토큰 파싱
            auth_type, token = auth_header.split()
            if auth_type.lower() != 'bearer':
                return None
                
        except ValueError:
            return None
        
        try:
            # JWT 토큰 디코딩
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            username = payload.get('username')
            
            if not user_id or not username:
                raise exceptions.AuthenticationFailed('유효하지 않은 토큰입니다.')
            
            # 고정 사용자 체크
            if username == 'user123' and user_id == 1:
                # 임시 사용자 객체 생성 (실제 DB에 없어도 됨)
                class TempUser:
                    def __init__(self):
                        self.id = 1
                        self.username = 'user123'
                        self.badge_number = 'POLICE001'
                        self.rank = '경위'
                        self.department = '수사과'
                        self.first_name = '홍'
                        self.last_name = '길동'
                        self.is_authenticated = True
                        self.is_active = True
                    
                    @property
                    def display_name(self):
                        return f"{self.rank} {self.last_name}{self.first_name}"
                
                return (TempUser(), token)
            
            # 실제 사용자 조회
            try:
                user = User.objects.get(id=user_id, username=username)
                if not user.is_active:
                    raise exceptions.AuthenticationFailed('비활성화된 사용자입니다.')
                return (user, token)
            except User.DoesNotExist:
                raise exceptions.AuthenticationFailed('사용자를 찾을 수 없습니다.')
                
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('토큰이 만료되었습니다.')
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed('유효하지 않은 토큰입니다.')
    
    def authenticate_header(self, request):
        return 'Bearer'
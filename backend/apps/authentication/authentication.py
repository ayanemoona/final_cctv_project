# backend/apps/authentication/authentication.py - 간단한 토큰 인증

from rest_framework import authentication, exceptions
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class SimpleTokenAuthentication(authentication.BaseAuthentication):
    """
    간단한 토큰 기반 인증
    프론트엔드에서 보내는 간단한 토큰 형식 처리
    """
    
    def authenticate(self, request):
        """토큰 인증 처리"""
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        
        if not auth_header:
            logger.debug("❌ Authorization 헤더 없음")
            return None
        
        try:
            # Bearer 토큰 형식 확인
            auth_parts = auth_header.split()
            
            if len(auth_parts) != 2 or auth_parts[0].lower() != 'bearer':
                logger.debug(f"❌ 잘못된 토큰 형식: {auth_header}")
                return None
            
            token = auth_parts[1]
            logger.debug(f"🔍 받은 토큰: {token[:30]}...")
            
            # 토큰 검증
            user = self.get_user_from_token(token)
            
            if user:
                logger.info(f"✅ 인증 성공: {user.username}")
                return (user, token)
            else:
                logger.debug("❌ 토큰에서 사용자 찾기 실패")
                return None
                
        except Exception as e:
            logger.error(f"❌ 토큰 인증 에러: {e}")
            return None
    
    def get_user_from_token(self, token):
        """토큰에서 사용자 찾기"""
        try:
            # Django의 views.py에서 생성한 토큰 형식: token-{user_id}-{random}
            if token.startswith('token-'):
                parts = token.split('-')
                if len(parts) >= 3:
                    try:
                        user_id = int(parts[1])
                        user = User.objects.get(id=user_id)
                        
                        if user.is_active:
                            logger.debug(f"✅ 토큰에서 사용자 찾음: {user.username}")
                            return user
                        else:
                            logger.debug(f"❌ 비활성 사용자: {user.username}")
                            return None
                            
                    except (ValueError, User.DoesNotExist):
                        logger.debug(f"❌ 사용자 ID {parts[1]} 찾기 실패")
                        pass
            
            # 토큰 형식이 다르거나 사용자를 찾을 수 없으면 admin으로 폴백 (개발용)
            logger.debug("⚠️ 토큰 파싱 실패, admin 사용자로 폴백")
            admin_user = User.objects.filter(username='admin', is_active=True).first()
            
            if admin_user:
                logger.debug("✅ admin 사용자로 인증")
                return admin_user
            else:
                logger.debug("❌ admin 사용자도 없음")
                return None
                
        except Exception as e:
            logger.error(f"❌ 사용자 조회 에러: {e}")
            return None
    
    def authenticate_header(self, request):
        """인증 실패 시 WWW-Authenticate 헤더"""
        return 'Bearer'
# apps/authentication/models.py 파일을 생성하고 다음 내용 입력:

from django.contrib.auth.models import AbstractUser
from django.db import models

class PoliceUser(AbstractUser):
    """경찰 사용자 모델"""
    
    # 기본 필드들은 AbstractUser에서 상속
    # username, password, email, first_name, last_name, is_active, date_joined 등
    
    # 경찰 전용 필드들 추가
    badge_number = models.CharField(
        max_length=20, 
        unique=True,
        verbose_name="배지 번호",
        help_text="경찰 배지 번호"
    )
    
    department = models.CharField(
        max_length=100,
        verbose_name="소속 부서",
        help_text="예: 수사과, 형사과"
    )
    
    rank = models.CharField(
        max_length=50,
        verbose_name="계급",
        help_text="예: 경위, 경감, 경정"
    )
    
    phone = models.CharField(
        max_length=20, 
        blank=True,
        verbose_name="연락처"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="가입일")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일")
    
    class Meta:
        verbose_name = "경찰 사용자"
        verbose_name_plural = "경찰 사용자들"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.rank} {self.last_name}{self.first_name} ({self.badge_number})"
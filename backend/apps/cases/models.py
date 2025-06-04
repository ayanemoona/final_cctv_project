# apps/cases/models.py 파일을 생성하고 다음 내용 입력:

from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class Case(models.Model):
    """사건 모델"""
    
    STATUS_CHOICES = [
        ('active', '수사중'),
        ('closed', '종료'),
        ('suspended', '보류'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_number = models.CharField(
        max_length=50, 
        unique=True,
        verbose_name="사건번호"
    )
    title = models.CharField(max_length=200, verbose_name="사건명")
    description = models.TextField(verbose_name="사건개요")
    
    incident_date = models.DateTimeField(verbose_name="사건발생일시")
    location = models.CharField(max_length=200, verbose_name="사건발생장소")
    latitude = models.FloatField(null=True, blank=True, verbose_name="위도")
    longitude = models.FloatField(null=True, blank=True, verbose_name="경도")
    
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='active',
        verbose_name="수사상태"
    )
    
    created_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='created_cases',
        verbose_name="등록자"
    )
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="등록일")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="수정일")
    
    class Meta:
        verbose_name = "사건"
        verbose_name_plural = "사건들"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.case_number} - {self.title}"


class Suspect(models.Model):
    """용의자 모델"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(
        Case, 
        on_delete=models.CASCADE, 
        related_name='suspects',
        verbose_name="사건"
    )
    
    name = models.CharField(max_length=100, default='미상', verbose_name="이름/별칭")
    age_estimate = models.CharField(max_length=20, blank=True, verbose_name="추정 나이")
    height_estimate = models.CharField(max_length=20, blank=True, verbose_name="추정 신장")
    clothing_description = models.TextField(verbose_name="복장 특징")
    
    reference_image_url = models.URLField(verbose_name="기준 사진 URL")
    ai_person_id = models.CharField(max_length=50, verbose_name="AI 모델 ID")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="등록일")
    
    class Meta:
        verbose_name = "용의자"
        verbose_name_plural = "용의자들"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.case.case_number} - {self.name}"


class CCTVMarker(models.Model):
    """CCTV 마커 모델"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(
        Case, 
        on_delete=models.CASCADE, 
        related_name='cctv_markers',
        verbose_name="사건"
    )
    suspect = models.ForeignKey(
        Suspect, 
        on_delete=models.CASCADE, 
        related_name='cctv_markers',
        null=True,
        blank=True,
        verbose_name="용의자"
    )
    
    location_name = models.CharField(max_length=200, verbose_name="위치명")
    latitude = models.FloatField(null=True, blank=True, verbose_name="위도")
    longitude = models.FloatField(null=True, blank=True, verbose_name="경도")
    
    detected_at = models.DateTimeField(verbose_name="탐지시간")
    confidence_score = models.FloatField(default=1.0, verbose_name="신뢰도")
    
    crop_image_url = models.URLField(null=True, blank=True, verbose_name="크롭 이미지 URL")
    police_comment = models.TextField(blank=True, verbose_name="경찰 의견")
    
    is_confirmed = models.BooleanField(default=True, verbose_name="확정 여부")
    is_excluded = models.BooleanField(default=False, verbose_name="경로 제외")
    
    # ✅ 순서 필드 추가
    sequence_order = models.PositiveIntegerField(default=0, verbose_name="경로 순서")
    
    analysis_id = models.CharField(max_length=100, blank=True, verbose_name="분석 ID")
    
    created_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        null=True,
        blank=True,
        verbose_name="등록자"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="등록일")
    
    class Meta:
        verbose_name = "CCTV 마커"
        verbose_name_plural = "CCTV 마커들"
        # ✅ 정렬 순서 변경: 1차 시간순, 2차 순서순
        ordering = ['detected_at', 'sequence_order']
    
    def __str__(self):
        return f"{self.case.case_number} - {self.location_name} ({self.sequence_order})"
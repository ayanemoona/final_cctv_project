# apps/common/models.py 파일을 생성하고 다음 내용 입력:

from django.db import models

class QuickInput(models.Model):
    """빠른 입력을 위한 자동완성 데이터"""
    
    FIELD_CHOICES = [
        ('location', '위치'),
        ('location_name', 'CCTV 위치명'),
        ('title', '사건명'),
        ('description', '사건개요'),
        ('case_number', '사건번호'),
        ('department', '부서'),
        ('rank', '계급'),
    ]
    
    field_name = models.CharField(
        max_length=50,
        choices=FIELD_CHOICES,
        verbose_name="필드명"
    )
    value = models.CharField(max_length=200, verbose_name="값")
    usage_count = models.IntegerField(default=1, verbose_name="사용 횟수")
    last_used = models.DateTimeField(auto_now=True, verbose_name="마지막 사용일")
    
    class Meta:
        verbose_name = "빠른 입력"
        verbose_name_plural = "빠른 입력 데이터"
        unique_together = ['field_name', 'value']
        ordering = ['-usage_count', '-last_used']
    
    def __str__(self):
        return f"{self.get_field_name_display()}: {self.value}"
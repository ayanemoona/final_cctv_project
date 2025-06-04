# apps/common/admin.py 파일을 생성하고 다음 내용 입력:

from django.contrib import admin
from .models import QuickInput

@admin.register(QuickInput)
class QuickInputAdmin(admin.ModelAdmin):
    """빠른 입력 관리자 설정"""
    
    list_display = ('field_name', 'value', 'usage_count', 'last_used')
    list_filter = ('field_name', 'last_used')
    search_fields = ('value',)
    readonly_fields = ('last_used',)
    
    fieldsets = (
        ('입력 정보', {
            'fields': ('field_name', 'value')
        }),
        ('사용 통계', {
            'fields': ('usage_count', 'last_used')
        }),
    )
# apps/authentication/admin.py 파일을 생성하고 다음 내용 입력:

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import PoliceUser

@admin.register(PoliceUser)
class PoliceUserAdmin(UserAdmin):
    """경찰 사용자 관리자 설정"""
    
    # 목록 페이지에서 표시할 필드
    list_display = ('username', 'badge_number', 'rank', 'department', 'is_active', 'date_joined')
    list_filter = ('rank', 'department', 'is_active', 'is_staff')
    search_fields = ('username', 'badge_number', 'first_name', 'last_name', 'department')
    
    # 상세 페이지 필드 설정
    fieldsets = UserAdmin.fieldsets + (
        ('경찰 정보', {
            'fields': ('badge_number', 'department', 'rank', 'phone')
        }),
        ('시간 정보', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    # 추가 페이지 필드 설정
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('경찰 정보', {
            'fields': ('badge_number', 'department', 'rank', 'phone')
        }),
    )
    
    # 읽기 전용 필드
    readonly_fields = ('created_at', 'updated_at')
    
    # 정렬
    ordering = ('-date_joined',)
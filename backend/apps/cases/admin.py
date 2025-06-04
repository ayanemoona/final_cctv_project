# apps/cases/admin.py 파일을 생성하고 다음 내용 입력:

from django.contrib import admin
from .models import Case, Suspect, CCTVMarker

@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    """사건 관리자 설정"""
    
    list_display = ('case_number', 'title', 'status', 'location', 'incident_date', 'created_by')
    list_filter = ('status', 'incident_date', 'created_at')
    search_fields = ('case_number', 'title', 'location', 'description')
    readonly_fields = ('id', 'created_at', 'updated_at')
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('case_number', 'title', 'description', 'status')
        }),
        ('사건 상세', {
            'fields': ('incident_date', 'location', 'latitude', 'longitude')
        }),
        ('시스템 정보', {
            'fields': ('id', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # 새로 생성하는 경우
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(Suspect)
class SuspectAdmin(admin.ModelAdmin):
    """용의자 관리자 설정"""
    
    list_display = ('name', 'case', 'age_estimate', 'height_estimate', 'created_at')
    list_filter = ('case__status', 'created_at')
    search_fields = ('name', 'case__case_number', 'clothing_description')
    readonly_fields = ('id', 'created_at')
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('case', 'name', 'age_estimate', 'height_estimate')
        }),
        ('외모 정보', {
            'fields': ('clothing_description', 'reference_image_url')
        }),
        ('AI 정보', {
            'fields': ('ai_person_id',)
        }),
        ('시스템 정보', {
            'fields': ('id', 'created_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(CCTVMarker)
class CCTVMarkerAdmin(admin.ModelAdmin):
    """CCTV 마커 관리자 설정"""
    
    list_display = ('location_name', 'case', 'suspect', 'detected_at', 'confidence_score', 'is_confirmed', 'is_excluded')
    list_filter = ('is_confirmed', 'is_excluded', 'detected_at', 'case__status')
    search_fields = ('location_name', 'case__case_number', 'suspect__name')
    readonly_fields = ('id', 'created_at')
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('case', 'suspect', 'location_name')
        }),
        ('위치 정보', {
            'fields': ('latitude', 'longitude', 'detected_at')
        }),
        ('AI 분석 정보', {
            'fields': ('confidence_score', 'crop_image_url', 'analysis_id')
        }),
        ('경찰 검토', {
            'fields': ('police_comment', 'is_confirmed', 'is_excluded')
        }),
        ('시스템 정보', {
            'fields': ('id', 'created_by', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # 새로 생성하는 경우
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


# backend/apps/cases/urls.py - AI 연동 URL 추가

from django.urls import path
from . import views

app_name = 'cases'

urlpatterns = [
    # 기존 사건 관련 API
    path('', views.cases_api, name='cases_api'),  # GET, POST /api/cases/
    path('<uuid:case_id>/', views.case_detail, name='case_detail'),  # GET /api/cases/1/
    path('<uuid:case_id>/markers/', views.case_markers, name='case_markers'),  # GET, POST /api/cases/1/markers/
    
    # 🤖 AI 연동 새로운 엔드포인트들
    path('<uuid:case_id>/cctv/analyze/', views.analyze_cctv_video, name='analyze_cctv'),  # POST /api/cases/1/cctv/analyze/
    path('<uuid:case_id>/analysis/<str:analysis_id>/status/', views.get_analysis_status, name='analysis_status'),  # GET /api/cases/1/analysis/abc123/status/
    path('<uuid:case_id>/analysis/<str:analysis_id>/results/', views.get_analysis_results, name='analysis_results'),  # GET /api/cases/1/analysis/abc123/results/
    
    # 🤖 AI 서비스 상태 확인
    path('ai/health/', views.ai_health_check, name='ai_health'),  # GET /api/cases/ai/health/
]
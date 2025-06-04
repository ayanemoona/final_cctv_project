"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

def home_view(request):
    """기본 홈페이지 뷰"""
    return JsonResponse({
        "service": "경찰청 CCTV 분석 시스템",
        "version": "1.0.0",
        "status": "running",
        "message": "Django 백엔드가 정상적으로 실행 중입니다",
        "endpoints": {
            "admin": "/admin/",
            "api_auth": "/api/auth/",
            "api_cases": "/api/cases/",
        }
    })

urlpatterns = [
    # 홈페이지
    path('', home_view, name='home'),
    
    # 관리자
    path('admin/', admin.site.urls),
    
    # API 엔드포인트 (활성화)
    path('api/auth/', include('apps.authentication.urls')),
    path('api/cases/', include('apps.cases.urls')),
]
@csrf_exempt
def health_check(request):
    """헬스체크 엔드포인트"""
    return JsonResponse({
        'status': 'healthy',
        'service': 'django_backend',
        'database': 'connected'
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/cases/', include('apps.cases.urls')),
    path('health/', health_check, name='health_check'),  # 추가
]

# 개발 환경에서 미디어 파일 서빙
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
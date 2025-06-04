# AI 서비스 설정 추가
import os

# AI 서비스 URL 설정
AI_GATEWAY_URL = os.getenv('AI_GATEWAY_URL', 'http://api-gateway:8000')
YOLO_SERVICE_URL = os.getenv('YOLO_SERVICE_URL', 'http://localhost:8001')
CLOTHING_SERVICE_URL = os.getenv('CLOTHING_SERVICE_URL', 'http://localhost:8002')
VIDEO_SERVICE_URL = os.getenv('VIDEO_SERVICE_URL', 'http://localhost:8004')

# 파일 업로드 크기 제한 증가 (영상 파일용)
FILE_UPLOAD_MAX_MEMORY_SIZE = 500 * 1024 * 1024  # 500MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 500 * 1024 * 1024  # 500MB
FILE_UPLOAD_HANDLERS = [
    'django.core.files.uploadhandler.MemoryFileUploadHandler',
    'django.core.files.uploadhandler.TemporaryFileUploadHandler',
]

# 미디어 파일 설정
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# 정적 파일 설정
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# 로깅 설정 (AI 연동 디버깅용)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': 'debug.log',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'apps.cases': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
        },
    },
}

# CORS 설정 (AI 서비스 통신용)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # React 프론트엔드
    "http://localhost:8010",  # AI Gateway
]

CORS_ALLOW_ALL_ORIGINS = True  # 개발용 (프로덕션에서는 False)

# 헬스체크 엔드포인트 추가
HEALTH_CHECK = {
    'AI_SERVICES': {
        'gateway': AI_GATEWAY_URL,
        'yolo': YOLO_SERVICE_URL,
        'clothing': CLOTHING_SERVICE_URL,
        'video': VIDEO_SERVICE_URL,
    }
}
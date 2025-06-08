#!/bin/bash
# backend/docker-entrypoint-prod.sh

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Django 프로덕션 서버 시작 중...${NC}"

# 1. 데이터베이스 연결 대기
echo -e "${YELLOW}📡 데이터베이스 연결 대기 중...${NC}"
while ! nc -z db 5432; do
  echo "PostgreSQL 대기 중..."
  sleep 2
done
echo -e "${GREEN}✅ 데이터베이스 연결 성공!${NC}"

# 2. 마이그레이션 실행
echo -e "${YELLOW}🔧 데이터베이스 마이그레이션 실행 중...${NC}"
python manage.py migrate --noinput --settings=config.settings.production

# 3. 정적 파일 수집
echo -e "${YELLOW}📦 정적 파일 수집 중...${NC}"
python manage.py collectstatic --noinput --settings=config.settings.production

# 4. 헬스체크
echo -e "${YELLOW}🏥 Django 헬스체크 실행 중...${NC}"
python manage.py check --settings=config.settings.production

# 5. AI 서비스 연결 확인
echo -e "${YELLOW}🤖 AI 서비스 연결 확인 중...${NC}"
python -c "
import os
import requests
import time

services = {
    'API Gateway': os.getenv('AI_GATEWAY_URL', 'http://api-gateway:8000'),
    'YOLO Service': os.getenv('YOLO_SERVICE_URL', 'http://yolo-service:8001'),
    'Clothing Service': os.getenv('CLOTHING_SERVICE_URL', 'http://clothing-service:8002'),
    'Video Service': os.getenv('VIDEO_SERVICE_URL', 'http://video-service:8004')
}

for name, url in services.items():
    try:
        response = requests.get(f'{url}/health', timeout=5)
        if response.status_code == 200:
            print(f'✅ {name}: 정상')
        else:
            print(f'⚠️  {name}: 응답 코드 {response.status_code}')
    except Exception as e:
        print(f'❌ {name}: 연결 실패 - {str(e)}')
"

# 6. Supabase 연결 확인
echo -e "${YELLOW}☁️  Supabase 연결 확인 중...${NC}"
python -c "
import os
from supabase import create_client

try:
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if supabase_url and supabase_key:
        supabase = create_client(supabase_url, supabase_key)
        # 간단한 연결 테스트
        result = supabase.table('cases').select('*').limit(1).execute()
        print('✅ Supabase: 연결 성공')
    else:
        print('⚠️  Supabase: 환경변수 누락')
except Exception as e:
    print(f'❌ Supabase: 연결 실패 - {str(e)}')
"

# 7. 로그 디렉토리 권한 설정
mkdir -p /var/log/django
chmod 755 /var/log/django

echo -e "${GREEN}🎉 Django 프로덕션 서버 준비 완료!${NC}"
echo -e "${GREEN}⚡ Gunicorn 서버 시작...${NC}"

# 전달받은 명령어 실행
exec "$@"
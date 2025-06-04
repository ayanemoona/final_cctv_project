#!/bin/bash
set -e

echo "🔄 데이터베이스 연결 대기 중..."
until pg_isready -h db -p 5432 -U postgres; do
  echo "PostgreSQL이 시작되기를 기다리는 중..."
  sleep 2
done

echo "📊 데이터베이스 마이그레이션 실행..."
python manage.py migrate --noinput

echo "👤 슈퍼유저 확인..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('admin', 'admin@police.gov', 'admin123!')
    print('✅ 슈퍼유저 생성 완료')
else:
    print('✅ 슈퍼유저 이미 존재')
"

echo "🤖 AI 서비스 연결 테스트..."
python manage.py shell -c "
from apps.cases.services import check_ai_health_sync
try:
    result = check_ai_health_sync()
    print('✅ AI 서비스 연결 확인:', result)
except Exception as e:
    print('⚠️ AI 서비스 연결 실패:', e)
"

echo "🚀 Django 서버 시작..."
exec "$@"
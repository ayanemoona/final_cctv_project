#!/bin/bash
# deploy/deploy.sh - DigitalOcean 배포 스크립트

set -e  # 에러 발생시 스크립트 중단

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로깅 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 설정 변수
PROJECT_NAME="police-cctv-system"
DOMAIN="your-domain.com"
EMAIL="your-email@example.com"

# 1. 시스템 업데이트
log_info "시스템 패키지 업데이트 중..."
sudo apt update && sudo apt upgrade -y

# 2. Docker 설치
if ! command -v docker &> /dev/null; then
    log_info "Docker 설치 중..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    log_success "Docker 설치 완료"
else
    log_info "Docker가 이미 설치되어 있습니다."
fi

# 3. Docker Compose 설치
if ! command -v docker-compose &> /dev/null; then
    log_info "Docker Compose 설치 중..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    log_success "Docker Compose 설치 완료"
else
    log_info "Docker Compose가 이미 설치되어 있습니다."
fi

# 4. Git 설치 및 프로젝트 클론
if ! command -v git &> /dev/null; then
    log_info "Git 설치 중..."
    sudo apt install -y git
fi

# 5. 프로젝트 디렉토리 생성
log_info "프로젝트 디렉토리 설정 중..."
cd /opt
sudo mkdir -p $PROJECT_NAME
sudo chown $USER:$USER $PROJECT_NAME
cd $PROJECT_NAME

# 6. 환경변수 파일 생성
log_info "환경변수 파일 생성 중..."
if [ ! -f .env.production ]; then
    log_warning ".env.production 파일을 생성해주세요!"
    log_info "템플릿 파일을 생성합니다..."
    
    cat > .env.production << EOL
# Django 보안 설정
DJANGO_SECRET_KEY=$(openssl rand -base64 32)
ALLOWED_HOSTS=$DOMAIN,www.$DOMAIN

# 데이터베이스
POSTGRES_PASSWORD=$(openssl rand -base64 16)

# Supabase (기존 값 사용)
SUPABASE_URL=https://zixknqpwfmffunwcdiix.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-key

# 카카오맵 API
KAKAO_MAP_API_KEY=your-kakao-api-key

# 프론트엔드
FRONTEND_API_URL=https://$DOMAIN/api
EOL
    
    log_warning "⚠️  .env.production 파일을 편집해서 실제 값으로 변경하세요!"
fi

# 7. SSL 인증서 설치 (Let's Encrypt)
log_info "SSL 인증서 설정 중..."
sudo apt install -y certbot

# 8. 방화벽 설정
log_info "방화벽 설정 중..."
sudo ufw allow 22     # SSH
sudo ufw allow 80     # HTTP
sudo ufw allow 443    # HTTPS
sudo ufw --force enable

# 9. SSL 디렉토리 생성
log_info "SSL 디렉토리 생성 중..."
sudo mkdir -p nginx/ssl
sudo chmod 755 nginx/ssl

# 10. Nginx 설정 파일 업데이트
log_info "Nginx 설정 파일에서 도메인 업데이트 중..."
if [ -f nginx/nginx.conf ]; then
    sed -i "s/your-domain.com/$DOMAIN/g" nginx/nginx.conf
    log_success "Nginx 설정 업데이트 완료"
fi

# 11. Docker 이미지 빌드
log_info "Docker 이미지 빌드 중..."
docker-compose -f docker-compose.prod.yml build

# 12. 데이터베이스 초기화
log_info "데이터베이스 초기화 중..."
docker-compose -f docker-compose.prod.yml up -d db
sleep 30  # DB 시작 대기

# Django 마이그레이션
log_info "Django 마이그레이션 실행 중..."
docker-compose -f docker-compose.prod.yml run --rm backend python manage.py migrate --settings=config.settings.production

# 관리자 계정 생성 (선택사항)
log_info "Django 슈퍼유저 생성 (선택사항)..."
echo "관리자 계정을 생성하시겠습니까? (y/n)"
read -r create_superuser
if [[ $create_superuser =~ ^[Yy]$ ]]; then
    docker-compose -f docker-compose.prod.yml run --rm backend python manage.py createsuperuser --settings=config.settings.production
fi

# 13. SSL 인증서 발급
log_info "SSL 인증서 발급 중..."
if [ "$DOMAIN" != "your-domain.com" ]; then
    # 임시 HTTP 서버로 인증서 발급
    docker-compose -f docker-compose.prod.yml up -d frontend
    
    # Let's Encrypt 인증서 발급
    sudo certbot certonly --webroot -w nginx/ssl -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive
    
    # 인증서 파일 복사
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem nginx/ssl/
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem nginx/ssl/
    sudo chown -R $USER:$USER nginx/ssl/
    
    log_success "SSL 인증서 발급 완료"
else
    log_warning "도메인이 설정되지 않았습니다. SSL 인증서를 수동으로 설정하세요."
fi

# 14. 전체 서비스 시작
log_info "모든 서비스 시작 중..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# 15. 서비스 상태 확인
log_info "서비스 상태 확인 중..."
sleep 30
docker-compose -f docker-compose.prod.yml ps

# 16. 헬스체크
log_info "헬스체크 실행 중..."
check_service() {
    local service_name=$1
    local url=$2
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s $url > /dev/null; then
            log_success "$service_name 서비스가 정상 작동 중입니다."
            return 0
        fi
        log_info "$service_name 서비스 시작 대기 중... ($attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    log_error "$service_name 서비스 시작 실패!"
    return 1
}

# 각 서비스 헬스체크
if [ "$DOMAIN" != "your-domain.com" ]; then
    check_service "프론트엔드" "https://$DOMAIN"
    check_service "백엔드 API" "https://$DOMAIN/api/"
else
    check_service "프론트엔드" "http://localhost:80"
    check_service "백엔드 API" "http://localhost:80/api/"
fi

# 17. 자동 갱신 설정 (SSL)
log_info "SSL 인증서 자동 갱신 설정 중..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet && cd /opt/$PROJECT_NAME && docker-compose -f docker-compose.prod.yml restart nginx") | crontab -

# 18. 시스템 서비스 등록 (선택사항)
log_info "시스템 서비스 등록 중..."
sudo tee /etc/systemd/system/$PROJECT_NAME.service > /dev/null <<EOL
[Unit]
Description=$PROJECT_NAME
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/$PROJECT_NAME
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOL

sudo systemctl enable $PROJECT_NAME.service

# 19. 완료 메시지
log_success "🎉 배포가 완료되었습니다!"
echo ""
echo "===== 배포 정보 ====="
echo "프로젝트: $PROJECT_NAME"
echo "도메인: $DOMAIN"
echo "설치 위치: /opt/$PROJECT_NAME"
echo ""
echo "===== 접속 정보 ====="
if [ "$DOMAIN" != "your-domain.com" ]; then
    echo "웹사이트: https://$DOMAIN"
    echo "관리자: https://$DOMAIN/admin/"
    echo "API: https://$DOMAIN/api/"
else
    echo "웹사이트: http://$(curl -s ifconfig.me)"
    echo "관리자: http://$(curl -s ifconfig.me)/admin/"
    echo "API: http://$(curl -s ifconfig.me)/api/"
fi
echo ""
echo "===== 관리 명령어 ====="
echo "서비스 상태: sudo systemctl status $PROJECT_NAME"
echo "서비스 시작: sudo systemctl start $PROJECT_NAME"
echo "서비스 중지: sudo systemctl stop $PROJECT_NAME"
echo "로그 확인: cd /opt/$PROJECT_NAME && docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "===== 주의사항 ====="
echo "1. .env.production 파일의 실제 값들을 설정하세요"
echo "2. 도메인 DNS A 레코드를 이 서버 IP로 설정하세요"
echo "3. 첫 배포 후 관리자 계정을 생성하세요"
echo "4. 정기적으로 백업을 수행하세요"
echo ""

# 20. 백업 스크립트 생성
log_info "백업 스크립트 생성 중..."
cat > backup.sh << 'EOL'
#!/bin/bash
# 자동 백업 스크립트

BACKUP_DIR="/opt/backups"
PROJECT_DIR="/opt/police-cctv-system"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 데이터베이스 백업
docker-compose -f $PROJECT_DIR/docker-compose.prod.yml exec -T db pg_dump -U police_user police_cctv_db > $BACKUP_DIR/db_backup_$DATE.sql

# 미디어 파일 백업
tar -czf $BACKUP_DIR/media_backup_$DATE.tar.gz -C $PROJECT_DIR shared_storage/

# 오래된 백업 삭제 (7일 이상)
find $BACKUP_DIR -type f -mtime +7 -delete

echo "백업 완료: $DATE"
EOL

chmod +x backup.sh

# 주간 백업 크론탭 설정
(crontab -l 2>/dev/null; echo "0 2 * * 0 /opt/$PROJECT_NAME/backup.sh") | crontab -

log_success "배포 스크립트 실행 완료! 🚀"
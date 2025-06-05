# frontend/Dockerfile - 완전 해결 버전

FROM node:18-slim

# 작업 디렉토리 설정
WORKDIR /app

# 필수 시스템 도구 설치
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# package.json 복사
COPY package.json ./

# 💥 핵심: package-lock.json 무시하고 완전 새로 설치
# RUN rm -f package-lock.json

# 환경 변수 설정 (네이티브 바이너리 강제 재빌드)
ENV npm_config_target_platform=linux
ENV npm_config_target_arch=x64
ENV npm_config_cache=/tmp/.npm
ENV npm_config_build_from_source=true

# npm 캐시 완전 정리
RUN npm cache clean --force

# 의존성 완전 재설치 (optional 의존성 포함)
RUN npm install --verbose --no-package-lock

# 소스 코드 복사
COPY . .

# 포트 노출
EXPOSE 3000

# 개발 서버 실행
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
#!/bin/bash

ENVIRONMENT=${1:-development}

echo "==================================="
echo "${ENVIRONMENT} 環境設定生成"
echo "==================================="

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to project root
cd "$(dirname "$0")/../.."

# Create environment directory
mkdir -p "environments/${ENVIRONMENT}"

# Generate secure random passwords
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
JWT_SECRET=$(openssl rand -base64 64 | tr -d "=+/" | cut -c1-50)

# Create environment-specific .env file
cat > "environments/${ENVIRONMENT}/.env" << EOF
# Environment
NODE_ENV=${ENVIRONMENT}

# Database Configuration
POSTGRES_USER=admin
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=websys_db_${ENVIRONMENT}

# Backend Configuration
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
PORT=8000

# Frontend Configuration
VITE_API_BASE_URL=http://localhost:8000

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Database URL (constructed from above)
DATABASE_URL=postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@postgres:5432/\${POSTGRES_DB}
EOF

echo -e "${GREEN}✅ ${ENVIRONMENT} 環境の設定ファイルを生成しました${NC}"
echo -e "${BLUE}📁 場所: environments/${ENVIRONMENT}/.env${NC}"
echo ""
echo -e "${BLUE}📋 生成された設定:${NC}"
echo "  - データベースパスワード: セキュアなランダム文字列"
echo "  - JWTシークレット: セキュアなランダム文字列"
echo "  - 環境名: ${ENVIRONMENT}"
echo ""
echo "⚠️  重要: 環境設定ファイルは絶対にコミットしないでください"
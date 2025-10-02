# デプロイ・運用ガイド

## 概要

このドキュメントは、WebSys開発プラットフォームの各環境への適切なデプロイ手順、運用方法、監視戦略を定義します。

## 環境構成

### 環境一覧

| 環境 | 目的 | URL | データベース | 自動デプロイ |
|------|------|-----|-------------|-------------|
| **development** | 開発・検証 | http://localhost:3000 | PostgreSQL (local) | ❌ |
| **staging** | 本番前検証 | https://staging.websys.company.com | PostgreSQL (staging) | ✅ |
| **production** | 本番運用 | https://websys.company.com | PostgreSQL (production) | 🔄 (手動承認) |

### 環境別設定

#### Development
```bash
# ローカル開発環境
NODE_ENV=development
DATABASE_URL=postgresql://admin:password@postgres:5432/websys_db_dev
JWT_SECRET=dev-secret-key
PORT=8000
VITE_API_BASE_URL=http://localhost:8000
```

#### Staging
```bash
# ステージング環境
NODE_ENV=staging
DATABASE_URL=postgresql://admin:staging_password@staging-db:5432/websys_db_staging
JWT_SECRET=staging-secure-secret-key
PORT=8000
VITE_API_BASE_URL=https://api-staging.websys.company.com
```

#### Production
```bash
# 本番環境
NODE_ENV=production
DATABASE_URL=postgresql://admin:production_password@prod-db:5432/websys_db_prod
JWT_SECRET=production-super-secure-secret-key
PORT=8000
VITE_API_BASE_URL=https://api.websys.company.com
```

## ローカル開発環境

### セットアップ
```bash
# 1. 環境構築
./infrastructure/scripts/setup-dev.sh

# 2. 環境確認
curl http://localhost:8000/health
curl http://localhost:3000

# 3. データベース確認
cd infrastructure/docker/development
docker-compose exec postgres psql -U admin -d websys_db
```

### 日常運用
```bash
# 環境起動
./infrastructure/scripts/setup-dev.sh

# 環境停止
cd infrastructure/docker/development
docker-compose down

# ログ確認
docker-compose logs -f [frontend|backend|postgres]

# データベースリセット
docker-compose down -v
./infrastructure/scripts/setup-dev.sh
```

## ステージング環境

### インフラ構成
```yaml
# infrastructure/docker/staging/docker-compose.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend

  frontend:
    build:
      context: ../../../workspace/frontend
      dockerfile: ../../infrastructure/docker/staging/frontend/Dockerfile
    environment:
      NODE_ENV: staging
      VITE_API_BASE_URL: https://api-staging.websys.company.com

  backend:
    build:
      context: ../../../workspace/backend
      dockerfile: ../../infrastructure/docker/staging/backend/Dockerfile
    environment:
      NODE_ENV: staging
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data_staging:/var/lib/postgresql/data
```

### デプロイ手順
```bash
# 1. 環境設定生成
./infrastructure/scripts/generate-env.sh staging

# 2. ステージング環境構築
cd infrastructure/docker/staging
docker-compose --env-file ../../environments/staging/.env up -d --build

# 3. データベースマイグレーション
docker-compose exec backend npx prisma migrate deploy

# 4. 初期データ投入（初回のみ）
docker-compose exec backend npx prisma db seed

# 5. ヘルスチェック
curl https://api-staging.websys.company.com/health
curl https://staging.websys.company.com
```

### SSL/TLS設定
```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name staging.websys.company.com;

    ssl_certificate /etc/nginx/ssl/staging.crt;
    ssl_certificate_key /etc/nginx/ssl/staging.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 本番環境

### インフラ構成

#### 推奨アーキテクチャ
```
Internet
    ↓
[Load Balancer / CDN]
    ↓
[Reverse Proxy (Nginx)]
    ↓
┌─────────────┬─────────────┐
│  Frontend   │   Backend   │
│ (Multiple)  │ (Multiple)  │
└─────────────┴─────────────┘
    ↓
[Database Cluster]
[Redis Cache]
[Monitoring Stack]
```

#### Dockerコンテナ構成
```yaml
# infrastructure/docker/production/docker-compose.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - ./logs:/var/log/nginx
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ../../../workspace/frontend
      dockerfile: ../../infrastructure/docker/production/frontend/Dockerfile
    restart: unless-stopped
    environment:
      NODE_ENV: production
      VITE_API_BASE_URL: https://api.websys.company.com
    deploy:
      replicas: 2

  backend:
    build:
      context: ../../../workspace/backend
      dockerfile: ../../infrastructure/docker/production/backend/Dockerfile
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
      REDIS_URL: ${REDIS_URL}
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 3
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data
      - ./backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 30s
      timeout: 5s
      retries: 5

  redis:
    image: redis:alpine
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data_prod:/data

  prometheus:
    image: prom/prometheus
    restart: unless-stopped
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana
    restart: unless-stopped
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3001:3000"

volumes:
  postgres_data_prod:
  redis_data_prod:
  prometheus_data:
  grafana_data:
```

### 本番デプロイ手順

#### Blue-Green デプロイ
```bash
# 1. 新バージョン準備（Green環境）
cd infrastructure/docker/production
docker-compose -f docker-compose.green.yml up -d --build

# 2. ヘルスチェック
./scripts/health-check.sh green

# 3. データベースマイグレーション（必要に応じて）
docker-compose -f docker-compose.green.yml exec backend npx prisma migrate deploy

# 4. トラフィック切り替え
./scripts/switch-traffic.sh green

# 5. 旧環境停止（Blue環境）
docker-compose -f docker-compose.blue.yml down

# 6. 環境ラベル更新
mv docker-compose.green.yml docker-compose.blue.yml
```

#### ローリングアップデート
```bash
# 1. バックエンドサービス更新
docker-compose up -d --no-deps --scale backend=6 backend

# 2. 古いコンテナ停止
docker-compose up -d --no-deps --scale backend=3 backend

# 3. フロントエンド更新
docker-compose up -d --no-deps frontend
```

### 本番運用

#### バックアップ戦略
```bash
# データベースバックアップ（日次）
#!/bin/bash
# scripts/backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="websys_backup_${DATE}.sql"

docker-compose exec postgres pg_dump \
  -U ${POSTGRES_USER} \
  -d ${POSTGRES_DB} \
  --format=custom \
  --no-owner \
  --no-privileges \
  > /backups/${BACKUP_FILE}

# S3アップロード（オプション）
aws s3 cp /backups/${BACKUP_FILE} s3://websys-backups/database/

# 古いバックアップ削除（30日以上）
find /backups -name "websys_backup_*.sql" -mtime +30 -delete
```

#### ログローテーション
```bash
# logrotate設定
# /etc/logrotate.d/websys
/var/log/websys/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

## 監視・アラート

### Prometheus設定
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'websys-backend'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'

  - job_name: 'websys-frontend'
    static_configs:
      - targets: ['frontend:3000']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:80']
```

### Grafanaダッシュボード

#### システムメトリクス
- CPU使用率
- メモリ使用率
- ディスク使用率
- ネットワークトラフィック

#### アプリケーションメトリクス
- リクエスト数/秒
- レスポンス時間
- エラー率
- アクティブユーザー数

#### データベースメトリクス
- 接続数
- クエリ実行時間
- デッドロック数
- データベースサイズ

### アラート設定
```yaml
# alerting/rules.yml
groups:
  - name: websys.rules
    rules:
      - alert: HighCPUUsage
        expr: cpu_usage_percent > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"

      - alert: DatabaseConnectionError
        expr: postgres_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection lost"

      - alert: HighErrorRate
        expr: http_request_error_rate > 0.05
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
```

## セキュリティ

### SSL/TLS設定
```nginx
# セキュリティヘッダー
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";
```

### ファイアウォール設定
```bash
# UFW設定例
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### アクセス制御
```yaml
# Docker Compose セキュリティ設定
services:
  postgres:
    # 非rootユーザーで実行
    user: postgres
    # 読み取り専用ファイルシステム
    read_only: true
    # 特権なし
    privileged: false
    # セキュリティオプション
    security_opt:
      - no-new-privileges:true
```

## パフォーマンス最適化

### CDN設定
```javascript
// 静的アセットのCDN配信
module.exports = {
  build: {
    assetsPublicPath: 'https://cdn.websys.company.com/',
    productionSourceMap: false,
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            name: 'vendor',
            test: /node_modules/,
            chunks: 'all'
          }
        }
      }
    }
  }
}
```

### データベース最適化
```sql
-- インデックス作成
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_users_username ON users(username);
CREATE INDEX CONCURRENTLY idx_users_active ON users(is_active) WHERE is_active = true;

-- パーティショニング（大規模データ用）
CREATE TABLE user_logs_2024 PARTITION OF user_logs
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### キャッシュ戦略
```typescript
// Redis キャッシュ実装
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export const cacheUser = async (userId: number, userData: User) => {
  await redis.setex(`user:${userId}`, 3600, JSON.stringify(userData))
}

export const getCachedUser = async (userId: number): Promise<User | null> => {
  const cached = await redis.get(`user:${userId}`)
  return cached ? JSON.parse(cached) : null
}
```

## 災害復旧

### バックアップからの復旧
```bash
# 1. サービス停止
docker-compose down

# 2. データベース復旧
docker-compose up -d postgres
docker-compose exec postgres psql -U admin -c "DROP DATABASE IF EXISTS websys_db_prod;"
docker-compose exec postgres psql -U admin -c "CREATE DATABASE websys_db_prod;"
docker-compose exec postgres pg_restore -U admin -d websys_db_prod /backups/latest_backup.sql

# 3. サービス再開
docker-compose up -d

# 4. ヘルスチェック
./scripts/health-check.sh
```

### 高可用性構成
```yaml
# 本番環境での冗長化
services:
  postgres-primary:
    image: postgres:15-alpine
    environment:
      POSTGRES_REPLICATION_MODE: master
      POSTGRES_REPLICATION_USER: replicator
      POSTGRES_REPLICATION_PASSWORD: replicator_password

  postgres-replica:
    image: postgres:15-alpine
    environment:
      POSTGRES_REPLICATION_MODE: slave
      POSTGRES_MASTER_HOST: postgres-primary
      POSTGRES_REPLICATION_USER: replicator
      POSTGRES_REPLICATION_PASSWORD: replicator_password
```

## コンプライアンス

### ログ管理
```bash
# アクセスログ保持
# - アクセスログ: 1年間保持
# - エラーログ: 2年間保持
# - 監査ログ: 5年間保持

# ログフォーマット統一
{
  "timestamp": "2024-01-19T10:30:00Z",
  "level": "info",
  "user_id": 123,
  "action": "user_login",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "result": "success"
}
```

### データ保護
- 個人情報の暗号化
- アクセスログの記録
- データ保持期間の管理
- GDPR準拠のデータ削除機能
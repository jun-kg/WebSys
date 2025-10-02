# トラブルシューティング・メンテナンスガイド

## 概要

このドキュメントは、WebSys開発プラットフォームで発生する可能性のある問題の診断方法、解決策、予防的メンテナンス手順を提供します。

## 環境診断

### 基本ヘルスチェック

#### システム全体の状態確認
```bash
# サービス状態確認
cd infrastructure/docker/development
docker-compose ps

# 期待される出力:
# NAME                COMMAND                  SERVICE             STATUS              PORTS
# websys_backend_dev  "sh -c 'npm install…"   backend             Up 10 minutes       0.0.0.0:8000->8000/tcp
# websys_frontend_dev "sh -c 'npm install…"   frontend            Up 10 minutes       0.0.0.0:3000->3000/tcp
# websys_postgres_dev "docker-entrypoint.s…"   postgres            Up 10 minutes       0.0.0.0:5432->5432/tcp
```

#### 個別サービス確認
```bash
# フロントエンド確認
curl -I http://localhost:3000
# 期待: HTTP/1.1 200 OK

# バックエンドAPI確認
curl -s http://localhost:8000/health | jq
# 期待: {"status": "OK", "message": "Server is running"}

# データベース確認
docker-compose exec postgres pg_isready -U admin
# 期待: postgres:5432 - accepting connections
```

#### リソース使用状況
```bash
# Docker リソース使用量
docker stats --no-stream

# システムリソース
htop
df -h
free -h
```

## よくある問題と解決策

### 1. 環境起動の問題

#### 問題: ポートが既に使用されている
```
Error: bind: address already in use
```

**診断**
```bash
# ポート使用状況確認
lsof -i :3000
lsof -i :8000
lsof -i :5432

# プロセス確認
netstat -tulpn | grep :3000
```

**解決策**
```bash
# 使用中プロセスを停止
sudo kill -9 <PID>

# または、別のポートを使用
# docker-compose.yml で ports を変更
ports:
  - "3001:3000"  # 3001番ポートにマッピング
```

#### 問題: Dockerデーモンが起動していない
```
Cannot connect to the Docker daemon
```

**診断**
```bash
docker info
# エラーが出る場合はDockerが起動していない
```

**解決策**
```bash
# Docker起動
sudo systemctl start docker

# 自動起動設定
sudo systemctl enable docker

# 権限エラーの場合
sudo usermod -aG docker $USER
# 再ログインが必要
```

#### 問題: workspace ディレクトリが存在しない
```
Error: workspace/frontend not found
```

**解決策**
```bash
# ワークスペース初期化
./infrastructure/scripts/init-workspace.sh

# または手動で修復
cp -r templates/frontend-vue workspace/frontend
cp -r templates/backend-express workspace/backend
```

### 2. フロントエンド関連の問題

#### 問題: npm install が失敗する
```
npm ERR! network timeout
```

**診断**
```bash
# コンテナ内でログ確認
docker-compose logs frontend

# ネットワーク確認
docker-compose exec frontend ping google.com
```

**解決策**
```bash
# node_modules削除して再インストール
docker-compose exec frontend rm -rf node_modules
docker-compose restart frontend

# または、キャッシュクリア
docker-compose exec frontend npm cache clean --force
docker-compose restart frontend
```

#### 問題: Vite dev server が起動しない
```
Error: EADDRINUSE: address already in use :::3000
```

**解決策**
```bash
# Vite設定確認
# vite.config.ts
server: {
  host: '0.0.0.0',
  port: 3000
}

# コンテナ再起動
docker-compose restart frontend
```

#### 問題: API呼び出しでCORSエラー
```
Access to fetch blocked by CORS policy
```

**診断**
```bash
# バックエンドのCORS設定確認
docker-compose exec backend cat src/index.ts | grep cors
```

**解決策**
```typescript
// backend/src/index.ts
import cors from 'cors'

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://your-domain.com'
    : 'http://localhost:3000',
  credentials: true
}))
```

### 3. バックエンド関連の問題

#### 問題: Prisma接続エラー
```
PrismaClientInitializationError: Can't reach database server
```

**診断**
```bash
# データベース接続確認
docker-compose exec backend npx prisma db pull

# 環境変数確認
docker-compose exec backend env | grep DATABASE_URL
```

**解決策**
```bash
# データベース再起動
docker-compose restart postgres

# Prismaクライアント再生成
docker-compose exec backend npx prisma generate

# マイグレーション状態確認
docker-compose exec backend npx prisma migrate status
```

#### 問題: JWT認証エラー
```
JsonWebTokenError: invalid signature
```

**診断**
```bash
# JWT_SECRET確認
docker-compose exec backend env | grep JWT_SECRET

# トークンデコード（デバッグ用）
node -e "console.log(require('jsonwebtoken').decode('YOUR_TOKEN_HERE'))"
```

**解決策**
```bash
# 新しいJWT_SECRET生成
./infrastructure/scripts/generate-env.sh development

# サーバー再起動
docker-compose restart backend
```

#### 問題: TypeScript コンパイルエラー
```
error TS2304: Cannot find name 'Express'
```

**診断**
```bash
# TypeScript設定確認
docker-compose exec backend cat tsconfig.json

# 型定義確認
docker-compose exec backend ls node_modules/@types/
```

**解決策**
```bash
# 型定義再インストール
docker-compose exec backend npm install @types/express @types/node

# TypeScript キャッシュクリア
docker-compose exec backend npx tsc --build --clean
docker-compose restart backend
```

### 4. データベース関連の問題

#### 問題: PostgreSQLに接続できない
```
psql: error: connection to server failed
```

**診断**
```bash
# PostgreSQL状態確認
docker-compose exec postgres pg_isready -U admin

# ログ確認
docker-compose logs postgres

# ネットワーク確認
docker network ls
docker network inspect websys_network_dev
```

**解決策**
```bash
# PostgreSQL再起動
docker-compose restart postgres

# データベース初期化（データ消失注意）
docker-compose down -v
docker-compose up -d postgres

# 接続テスト
docker-compose exec postgres psql -U admin -d websys_db -c "SELECT 1;"
```

#### 問題: マイグレーションエラー
```
Migration failed: relation already exists
```

**診断**
```bash
# マイグレーション状態確認
docker-compose exec backend npx prisma migrate status

# データベーススキーマ確認
docker-compose exec postgres psql -U admin -d websys_db -c "\dt"
```

**解決策**
```bash
# マイグレーション履歴リセット（開発環境のみ）
docker-compose exec backend npx prisma migrate reset

# または、手動で修正
docker-compose exec backend npx prisma migrate resolve --applied <migration_name>
```

#### 問題: データベース容量不足
```
ERROR: could not extend file: No space left on device
```

**診断**
```bash
# ディスク使用量確認
df -h
docker system df

# PostgreSQL データサイズ確認
docker-compose exec postgres psql -U admin -d websys_db -c "
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

**解決策**
```bash
# 不要なDockerオブジェクト削除
docker system prune -a

# ログファイル削除
docker-compose exec postgres find /var/log -name "*.log" -type f -delete

# データベースクリーンアップ
docker-compose exec postgres psql -U admin -d websys_db -c "VACUUM FULL;"
```

### 5. ネットワーク関連の問題

#### 問題: サービス間通信エラー
```
Error: connect ECONNREFUSED backend:8000
```

**診断**
```bash
# Docker ネットワーク確認
docker network ls
docker network inspect websys_network_dev

# サービス名解決確認
docker-compose exec frontend nslookup backend
docker-compose exec backend nslookup postgres
```

**解決策**
```bash
# ネットワーク再作成
docker-compose down
docker-compose up -d

# または、明示的にネットワーク作成
docker network create websys_network_dev
```

#### 問題: SSL/TLS証明書エラー（本番環境）
```
SSL certificate problem: certificate verify failed
```

**診断**
```bash
# 証明書確認
openssl x509 -in /path/to/cert.pem -text -noout

# 証明書チェーン確認
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

**解決策**
```bash
# Let's Encrypt証明書更新
certbot renew

# 手動更新
certbot certonly --nginx -d your-domain.com
```

## パフォーマンス問題

### 1. 応答速度の低下

#### 診断手順
```bash
# API応答時間測定
curl -w "@curl-format.txt" -s -o /dev/null http://localhost:8000/api/users

# curl-format.txt:
#      time_namelookup:  %{time_namelookup}\n
#         time_connect:  %{time_connect}\n
#      time_appconnect:  %{time_appconnect}\n
#     time_pretransfer:  %{time_pretransfer}\n
#        time_redirect:  %{time_redirect}\n
#   time_starttransfer:  %{time_starttransfer}\n
#                     ----------\n
#         time_total:  %{time_total}\n

# データベースクエリ分析
docker-compose exec postgres psql -U admin -d websys_db -c "
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"
```

#### 最適化手順
```bash
# 1. データベースインデックス作成
docker-compose exec postgres psql -U admin -d websys_db -c "
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
"

# 2. アプリケーションレベルキャッシュ
# backend/src/services/cache.ts
import NodeCache from 'node-cache'
const cache = new NodeCache({ stdTTL: 600 })

# 3. データベース統計更新
docker-compose exec postgres psql -U admin -d websys_db -c "ANALYZE;"
```

### 2. メモリ使用量増加

#### 診断
```bash
# Node.js メモリプロファイル
docker-compose exec backend node --inspect=0.0.0.0:9229 dist/index.js

# PostgreSQL メモリ使用量
docker-compose exec postgres psql -U admin -d websys_db -c "
SELECT
    setting as max_connections,
    unit
FROM pg_settings
WHERE name = 'max_connections';
"
```

#### 対策
```javascript
// メモリリーク検出
// backend/src/utils/memory-monitor.ts
setInterval(() => {
  const usage = process.memoryUsage()
  console.log('Memory usage:', {
    rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB'
  })
}, 30000)
```

## 定期メンテナンス

### 日次メンテナンス

#### ログローテーション
```bash
#!/bin/bash
# scripts/daily-maintenance.sh

# Docker ログクリア
docker-compose logs --since 24h > /logs/docker-$(date +%Y%m%d).log
docker-compose logs --no-log-prefix -t > /dev/null

# アプリケーションログアーカイブ
tar -czf /logs/app-logs-$(date +%Y%m%d).tar.gz /var/log/websys/
find /var/log/websys/ -name "*.log" -mtime +1 -delete
```

#### データベースメンテナンス
```bash
# バキューム処理
docker-compose exec postgres psql -U admin -d websys_db -c "VACUUM ANALYZE;"

# 統計情報更新
docker-compose exec postgres psql -U admin -d websys_db -c "
UPDATE pg_stat_user_tables SET n_tup_ins=0, n_tup_upd=0, n_tup_del=0;
"
```

### 週次メンテナンス

#### システムアップデート
```bash
#!/bin/bash
# scripts/weekly-maintenance.sh

# セキュリティアップデート
apt update && apt upgrade -y

# Docker イメージ更新
docker-compose pull
docker-compose up -d

# 不要ファイル削除
docker system prune -f
docker volume prune -f
```

#### バックアップ検証
```bash
# バックアップ復元テスト
cp /backups/latest_backup.sql /tmp/test_restore.sql
docker-compose exec postgres createdb -U admin test_restore_db
docker-compose exec postgres pg_restore -U admin -d test_restore_db /tmp/test_restore.sql
docker-compose exec postgres dropdb -U admin test_restore_db
```

### 月次メンテナンス

#### セキュリティ監査
```bash
# Docker イメージ脆弱性スキャン
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image websys_backend_dev:latest

# 依存関係監査
docker-compose exec frontend npm audit
docker-compose exec backend npm audit
```

#### パフォーマンス分析
```sql
-- 長時間実行クエリ分析
SELECT
    query,
    calls,
    total_time,
    mean_time,
    stddev_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC;

-- インデックス使用状況
SELECT
    t.tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes i
JOIN pg_stat_user_tables t ON i.relid = t.relid
WHERE idx_tup_read > 0
ORDER BY idx_tup_read DESC;
```

## 緊急時対応

### 1. サービス完全停止

#### 対応手順
```bash
# 1. 状況確認
docker-compose ps
curl -I http://localhost:8000/health

# 2. 緊急再起動
docker-compose down
docker-compose up -d

# 3. ログ確認
docker-compose logs --tail 100

# 4. ヘルスチェック
./infrastructure/scripts/health-check.sh
```

### 2. データベース障害

#### 対応手順
```bash
# 1. データベース状態確認
docker-compose exec postgres pg_isready -U admin

# 2. バックアップから復旧
docker-compose down
docker volume rm websys_postgres_data_dev
docker-compose up -d postgres

# 3. 最新バックアップ復元
docker-compose exec postgres pg_restore -U admin -d websys_db /backups/latest_backup.sql

# 4. アプリケーション再起動
docker-compose up -d
```

### 3. セキュリティインシデント

#### 対応手順
```bash
# 1. 即座にサービス停止
docker-compose down

# 2. ログ保全
cp -r /var/log/websys/ /security-incident/logs-$(date +%Y%m%d_%H%M%S)/
docker-compose logs > /security-incident/docker-logs-$(date +%Y%m%d_%H%M%S).log

# 3. ネットワーク遮断
iptables -A INPUT -j DROP
iptables -A OUTPUT -j DROP

# 4. 管理者への通知
echo "Security incident detected at $(date)" | mail -s "URGENT: Security Alert" admin@company.com
```

## 監視・アラート設定

### Prometheus アラートルール
```yaml
# monitoring/alert-rules.yml
groups:
  - name: websys.rules
    rules:
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.instance }} is down"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"

      - alert: DatabaseConnectionError
        expr: postgres_up == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "Cannot connect to PostgreSQL"
```

### ログ監視
```bash
# journalctl でシステムログ監視
journalctl -f -u docker.service

# アプリケーションログ監視
tail -f /var/log/websys/application.log | grep -i error

# リアルタイムエラー検出
docker-compose logs -f | grep -i "error\|exception\|fatal"
```

## 復旧チェックリスト

### サービス復旧後の確認項目

- [ ] 全サービスが起動している
- [ ] ヘルスチェックエンドポイントが正常応答
- [ ] データベース接続が正常
- [ ] フロントエンドがロード可能
- [ ] ユーザーログインが可能
- [ ] 主要機能が動作
- [ ] ログにエラーが出ていない
- [ ] 監視システムが正常
- [ ] バックアップが動作
- [ ] セキュリティ設定が有効

### 文書化必須項目

- 障害発生時刻
- 障害内容と影響範囲
- 対応手順と実施時刻
- 復旧時刻
- 根本原因
- 再発防止策
- 学んだ教訓
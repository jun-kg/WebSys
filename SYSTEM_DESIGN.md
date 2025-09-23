# ログ監視システム設計書

## 1. システム概要

### 1.1 目的
社内システムの統合ログ監視基盤として、リアルタイムでのログ収集・分析・アラート通知を実現する。

### 1.2 主要機能
- **リアルタイムログ監視**: WebSocketによる即時ログ配信・自動リロード
- **アラート管理**: 閾値ベースの自動アラート生成・外部通知連携・ルールテスト機能
- **外部通知連携**: Slack/Email/Teams通知サポート・設定画面・テスト機能
- **ログエクスポート**: JSON/CSV形式での一括出力・フィルタリング対応
- **統計分析**: ログレベル別・カテゴリ別の統計表示・リアルタイム更新
- **アクセス制御**: JWT認証によるセキュアなアクセス管理・自動トークン永続化
- **ユーザー管理**: ユーザーCRUD・ロール管理・アクティブ状態管理
- **モバイル対応**: レスポンシブデザイン・タッチ操作最適化

## 2. アーキテクチャ

### 2.1 技術スタック
```
Frontend:
- Vue.js 3 (Composition API)
- Element Plus (UIフレームワーク)
- Socket.io Client (WebSocket通信)
- TypeScript
- Pinia (状態管理)
- Vue Router (SPA ルーティング)
- 統一APIクライアント (axios代替)

Backend:
- Express.js
- Socket.io (WebSocketサーバー)
- Prisma ORM
- PostgreSQL
- JWT認証
- 外部通知サービス (Slack/Email/Teams)

Infrastructure:
- Docker Compose
- Node.js 18+
```

### 2.2 システム構成図
```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Vue.js)                  │
│  ┌─────────────┐ ┌─────────────┐ ┌────────────────┐ │
│  │LogMonitoring│ │ AlertRules  │ │NotificationSet │ │
│  └─────────────┘ └─────────────┘ └────────────────┘ │
│         ↓                ↓                ↓         │
│  ┌──────────────────────────────────────────────┐  │
│  │          WebSocket & HTTP Client             │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────┬───────────────┬──────────────────┘
                  │   WebSocket    │  HTTP/REST
                  ↓               ↓
┌─────────────────────────────────────────────────────┐
│                  Backend (Express)                   │
│  ┌──────────────────────────────────────────────┐  │
│  │         WebSocketService (Socket.io)         │  │
│  └──────────────────────────────────────────────┘  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│  │ LogService  │ │AlertRuleEng │ │NotifyService│  │
│  └─────────────┘ └─────────────┘ └─────────────┘  │
│         ↓                ↓                ↓        │
│  ┌──────────────────────────────────────────────┐  │
│  │            Prisma ORM Layer                  │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────┘
                      ↓               ↓
┌─────────────────────────────┐ ┌─────────────────────┐
│      PostgreSQL Database    │ │   外部通知サービス    │
│  ┌──────┐ ┌───────────┐    │ │  ┌─────┐ ┌───────┐ │
│  │ User │ │ AlertRule │    │ │  │Slack│ │ Email │ │
│  │ Log  │ │LogStatistics│   │ │  │Teams│ │       │ │
│  └──────┘ └───────────┘    │ │  └─────┘ └───────┘ │
└─────────────────────────────┘ └─────────────────────┘
```

## 3. データベース設計

### 3.1 主要テーブル

#### User (ユーザー)
```prisma
model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  password  String
  name      String
  email     String   @unique
  role      Role     @default(USER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  logs      Log[]
}
```

#### Log (ログエントリ)
```prisma
model Log {
  id              BigInt    @id @default(autoincrement())
  timestamp       DateTime  @db.Timestamptz(6)
  level           Int       // 10:TRACE, 20:DEBUG, 30:INFO, 40:WARN, 50:ERROR, 60:FATAL
  category        String    // AUTH, API, DB, SEC, SYS, USER, PERF, ERR
  message         String
  traceId         String?
  sessionId       String?
  userId          Int?
  user            User?     @relation(fields: [userId], references: [id])
  source          String    // frontend, backend, database, infrastructure
  hostname        String?
  service         String?
  details         Json?
  errorInfo       Json?
  performanceInfo Json?
  tags            String[]
  environment     String?   // development, staging, production
}
```

#### AlertRule (アラートルール)
```prisma
model AlertRule {
  id                   Int      @id @default(autoincrement())
  name                 String
  description          String?
  level                Int?     // ログレベル
  category             String?  // カテゴリ
  source               String?  // ソース
  messagePattern       String?  // メッセージパターン
  thresholdCount       Int      // 閾値カウント
  thresholdPeriod      Int      // 閾値期間（秒）
  notificationChannels Json     // 通知チャンネル設定
  isEnabled            Boolean  @default(true)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

#### LogStatistics (ログ統計)
```prisma
model LogStatistics {
  id       BigInt   @id @default(autoincrement())
  date     DateTime @db.Date
  hour     Int
  level    Int
  category String
  source   String
  count    Int      @default(0)

  @@unique([date, hour, level, category, source])
  @@index([date, hour])
}
```

## 4. API設計

### 4.1 認証API

| エンドポイント | メソッド | 説明 | 認証要否 |
|---|---|---|---|
| `/api/auth/login` | POST | ログイン | 不要 |
| `/api/auth/register` | POST | ユーザー登録 | 不要 |
| `/api/auth/refresh` | POST | トークン更新 | 必要 |
| `/api/auth/logout` | POST | ログアウト | 必要 |

### 4.2 ログAPI

| エンドポイント | メソッド | 説明 | 認証要否 |
|---|---|---|---|
| `/api/logs` | POST | ログ収集 | 不要 |
| `/api/logs/search` | GET | ログ検索 | 必要 |
| `/api/logs/realtime` | GET | リアルタイム統計 | 必要 |
| `/api/logs/statistics` | GET | 統計データ取得 | 必要 |
| `/api/logs/export` | GET | ログエクスポート | 必要 |
| `/api/logs/:id` | GET | ログ詳細 | 必要 |

### 4.3 アラートルールAPI

| エンドポイント | メソッド | 説明 | 認証要否 |
|---|---|---|---|
| `/api/alert-rules` | GET | ルール一覧 | 必要 |
| `/api/alert-rules` | POST | ルール作成 | 管理者 |
| `/api/alert-rules/:id` | GET | ルール詳細 | 必要 |
| `/api/alert-rules/:id` | PUT | ルール更新 | 管理者 |
| `/api/alert-rules/:id` | DELETE | ルール削除 | 管理者 |
| `/api/alert-rules/:id/toggle` | PATCH | 有効/無効切替 | 管理者 |
| `/api/alert-rules/:id/test` | POST | ルールテスト | 管理者 |

### 4.4 通知API

| エンドポイント | メソッド | 説明 | 認証要否 |
|---|---|---|---|
| `/api/notifications/config` | GET | 通知設定取得 | 必要 |
| `/api/notifications/test` | POST | テスト通知送信 | 必要 |
| `/api/notifications/send` | POST | カスタム通知送信 | 必要 |

### 4.5 ユーザー管理API

| エンドポイント | メソッド | 説明 | 認証要否 |
|---|---|---|---|
| `/api/users` | GET | ユーザー一覧 | 管理者 |
| `/api/users` | POST | ユーザー作成 | 管理者 |
| `/api/users/:id` | GET | ユーザー詳細 | 必要 |
| `/api/users/:id` | PUT | ユーザー更新 | 管理者 |
| `/api/users/:id` | DELETE | ユーザー削除 | 管理者 |
| `/api/users/:id/toggle` | PATCH | アクティブ状態切替 | 管理者 |

### 4.6 WebSocket イベント

#### サーバー → クライアント
| イベント名 | 説明 | ペイロード |
|---|---|---|
| `new-log` | 新規ログ通知 | LogEntry |
| `alert` | アラート通知 | AlertNotification |
| `stats-update` | 統計更新 | Statistics |
| `connection-stats` | 接続統計 | ConnectionStats |

#### クライアント → サーバー
| イベント名 | 説明 | ペイロード |
|---|---|---|
| `auth` | 認証 | { token: string } |
| `subscribe` | イベント購読 | { events: string[] } |
| `unsubscribe` | 購読解除 | { events: string[] } |
| `heartbeat` | ハートビート | { timestamp: number } |

## 5. 実装済み機能

### 5.1 コア機能
- ✅ JWT認証システム
- ✅ ログ収集・保存
- ✅ ログ検索・フィルタリング
- ✅ リアルタイム統計
- ✅ ログレベル別カラーリング
- ✅ ページネーション

### 5.2 WebSocket機能
- ✅ JWT認証付きWebSocket接続
- ✅ リアルタイムログ配信
- ✅ アラート通知
- ✅ 接続統計管理
- ✅ ハートビート機能
- ✅ 自動再接続

### 5.3 アラート機能
- ✅ アラートルールCRUD
- ✅ 閾値ベース評価エンジン
- ✅ リアルタイム評価
- ✅ ルールテスト機能
- ✅ 有効/無効切り替え
- ✅ WebSocket通知連携
- ✅ 外部通知連携

### 5.4 エクスポート機能
- ✅ JSON形式エクスポート
- ✅ CSV形式エクスポート
- ✅ フィルタリング対応
- ✅ 認証付きダウンロード

### 5.5 外部通知機能
- ✅ Slack Webhook通知（カラー・絵文字対応）
- ✅ Email通知（HTML形式・SMTP対応）
- ✅ Teams通知（MessageCard形式）
- ✅ 通知設定画面
- ✅ テスト通知機能
- ✅ カスタム通知送信
- ✅ 環境変数設定ガイド

### 5.6 UI/UX機能
- ✅ ダッシュボード
- ✅ リアルタイムログビュー
- ✅ アラートルール管理画面
- ✅ 通知設定画面
- ✅ ユーザー管理画面
- ✅ ログ詳細モーダル
- ✅ 統計カード表示
- ✅ レスポンシブデザイン (モバイル対応)
- ✅ ダークモード対応準備
- ✅ アクセシビリティ対応

### 5.7 開発・運用機能
- ✅ 統一APIクライアント (api.ts)
- ✅ 認証状態永続化 (localStorage)
- ✅ 自動エラーハンドリング
- ✅ 型安全なAPI通信
- ✅ 開発環境ホットリロード
- ✅ データベースシード機能
- ✅ APIテスト画面

## 6. セキュリティ

### 6.1 認証・認可
- JWT Bearer Token認証
- ロールベースアクセス制御 (RBAC)
- トークン有効期限: 7日間
- リフレッシュトークン対応

### 6.2 データ保護
- パスワードハッシュ化 (bcrypt)
- HTTPS通信推奨
- CORS設定による通信制御
- SQLインジェクション対策 (Prisma ORM)

### 6.3 ログ保存期間
- FATAL/ERROR: 1年
- WARN: 6ヶ月
- INFO: 3ヶ月
- DEBUG/TRACE: 1ヶ月

## 7. パフォーマンス最適化

### 7.1 データベース
- インデックス最適化
- 統計テーブルによる集計高速化
- 定期的なクリーンアップ処理

### 7.2 リアルタイム通信
- WebSocketプーリング
- メッセージバッチング
- 接続数管理

### 7.3 フロントエンド
- Vue.js遅延ローディング
- コンポーネントキャッシュ
- 仮想スクロール対応

## 8. 運用・保守

### 8.1 モニタリング
- ヘルスチェックエンドポイント
- WebSocket接続統計
- エラーログ自動収集

### 8.2 バックアップ
- データベース定期バックアップ推奨
- ログアーカイブ機能

### 8.3 拡張性
- マイクロサービス対応設計
- 水平スケーリング可能
- 外部通知サービス連携完了

## 9. 今後の実装予定

### 高優先度
- [x] 外部通知連携 (Slack, Email, Teams)
- [x] 統一APIクライアント実装
- [x] 認証状態永続化改善
- [x] モバイル対応強化
- [ ] 正規表現ベース高度検索
- [ ] 異常検知AI機能
- [ ] 細分化アクセス制御

### 中優先度
- [ ] 高度なダッシュボード (グラフ・チャート)
- [ ] ログ集約・相関分析
- [ ] システム設定画面
- [ ] パフォーマンス最適化
- [ ] ダークモード完全実装
- [ ] 多言語対応 (i18n)

### 低優先度
- [ ] ログフォーマット変換
- [ ] マルチテナント対応
- [ ] API監視ダッシュボード
- [ ] ログデータ暗号化
- [ ] 監査ログ機能

### 完了済み機能
- [x] JWT認証システム基盤
- [x] WebSocketリアルタイム通信
- [x] アラートルール管理システム
- [x] 外部通知システム (Slack/Email/Teams)
- [x] ログエクスポート機能
- [x] ユーザー管理システム
- [x] レスポンシブUI対応
- [x] 統一APIクライアント
- [x] 認証エラーハンドリング強化

## 10. 開発環境

### 10.1 必要環境
```bash
Node.js: 18.x以上
PostgreSQL: 14.x以上
Docker: 20.x以上
Docker Compose: 2.x以上
```

### 10.2 セットアップ
```bash
# 環境構築
./setup.sh

# 開発サーバー起動
cd workspace/frontend && npm run dev
cd workspace/backend && npm run dev

# データベースマイグレーション
cd workspace/backend
npx prisma migrate dev
npx prisma db seed
```

### 10.3 ポート設定
- Frontend: 3000 (開発時は3000-3003の範囲で自動選択)
- Backend: 8000
- PostgreSQL: 5432
- Prisma Studio: 5566

### 10.4 外部通知設定

#### Slack設定
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_CHANNEL=#alerts
SLACK_USERNAME=Log Monitor
SLACK_ICON=:warning:
```

#### Email設定
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@company.com
EMAIL_TO=admin@company.com,ops@company.com
```

#### Teams設定
```bash
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...
```

---

**最終更新日**: 2025年9月21日
**バージョン**: 1.2.0

### バージョン履歴
- **v1.2.0** (2025年9月21日): 統一APIクライアント実装、モバイル対応強化、ユーザー管理機能追加、認証永続化改善
- **v1.1.0** (2025年1月21日): 外部通知連携、WebSocket機能、アラート管理システム実装
- **v1.0.0** (初期バージョン): 基本ログ監視機能実装
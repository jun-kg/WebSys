# 機能仕様書 - ログ監視システム

**バージョン**: v1.2.0
**作成日**: 2025年9月21日
**システム名**: 統合ログ監視プラットフォーム

---

## 📋 目次

1. [システム概要](#システム概要)
2. [機能要件](#機能要件)
3. [非機能要件](#非機能要件)
4. [ユーザーロール](#ユーザーロール)
5. [画面仕様](#画面仕様)
6. [API仕様](#api仕様)
7. [データ仕様](#データ仕様)
8. [外部連携仕様](#外部連携仕様)

---

## システム概要

### システム目的
企業向けログ監視・分析プラットフォームとして、リアルタイムでのログ収集・分析・アラート通知を実現し、システム運用の効率化と迅速な問題対応を支援する。

### 主要な価値提案
- **リアルタイム監視**: WebSocketベースの即座なログ配信とライブ更新
- **プロアクティブアラート**: 閾値ベースの自動アラート生成・通知
- **多チャンネル通知**: Slack・Email・Teams連携による柔軟な通知体制
- **企業レベルセキュリティ**: JWT認証・RBAC対応・データ保護
- **モバイル対応**: レスポンシブデザインによる全デバイス対応

### システム構成
- **フロントエンド**: Vue.js 3 + Element Plus + TypeScript
- **バックエンド**: Node.js + Express + TypeScript + Prisma ORM
- **データベース**: PostgreSQL
- **リアルタイム通信**: WebSocket (Socket.IO)
- **認証**: JWT Bearer Token

---

## 機能要件

### F-1. 認証・ユーザー管理機能

#### F-1.1 JWT認証システム
- **目的**: セキュアなユーザー認証とセッション管理
- **機能概要**:
  - Bearer Token認証（7日間有効期限）
  - 自動トークン永続化（ページリロード対応）
  - ログアウト機能（セキュアなセッション終了）
  - 認証失敗時の適切なエラーハンドリング

#### F-1.2 ユーザー管理
- **目的**: システム利用者の管理と権限制御
- **機能概要**:
  - CRUD操作（作成・参照・更新・削除）
  - ロールベースアクセス制御（ADMIN/USER/GUEST）
  - アクティブ状態管理（有効/無効切り替え）
  - ユーザー情報管理（名前・部署・連絡先・メール）
  - パスワード管理（bcrypt暗号化）

#### F-1.3 アクセス制御
- **目的**: 権限に基づく機能制限とセキュリティ確保
- **機能概要**:
  - 画面レベル認証（Vue Router Guards）
  - API認証（Bearer Token必須）
  - 権限別機能制限（管理者限定機能）
  - 未認証時の適切なリダイレクト

### F-2. ログ管理・監視機能

#### F-2.1 ログ収集・保存
- **目的**: 構造化されたログデータの効率的な収集・保存
- **機能概要**:
  - 構造化ログ（JSON形式での詳細情報）
  - 多段階ログレベル（TRACE/DEBUG/INFO/WARN/ERROR/FATAL）
  - カテゴリ分類（AUTH/API/DB/SEC/SYS/USER/PERF/ERR）
  - メタデータ管理（traceId・sessionId・タイムスタンプ）
  - パフォーマンス情報（実行時間・リソース使用量）

#### F-2.2 リアルタイム監視
- **目的**: ログの即座な表示と監視体制の構築
- **機能概要**:
  - WebSocket配信（即座のログ表示）
  - 自動スクロール（最新ログの自動表示）
  - カラーコーディング（レベル別視覚化）
  - フィルタリング（レベル・カテゴリ・期間指定）
  - ライブ統計（リアルタイム集計表示）

#### F-2.3 ログ検索・分析
- **目的**: 過去ログの効率的な検索・分析
- **機能概要**:
  - 高度検索（複数条件での絞り込み）
  - 期間指定（日時範囲での検索）
  - ページネーション（大量データの効率表示）
  - 詳細表示（モーダルでの詳細情報）
  - エクスポート機能（JSON・CSV形式）

#### F-2.4 統計・ダッシュボード
- **目的**: ログデータの可視化と傾向分析
- **機能概要**:
  - リアルタイム統計（ログ数・エラー率）
  - 統計カード（視覚的な数値表示）
  - カテゴリ別集計（分野別統計）
  - アクティビティ履歴（最近の操作表示）

### F-3. アラート・通知システム

#### F-3.1 アラートルール管理
- **目的**: カスタマイズ可能なアラート条件の設定・管理
- **機能概要**:
  - CRUD操作（ルールの作成・編集・削除）
  - 閾値設定（カウント・期間による判定）
  - 条件設定（レベル・カテゴリ・メッセージパターン）
  - 有効/無効切り替え（柔軟な運用制御）
  - テスト機能（ルール動作確認）

#### F-3.2 リアルタイム評価エンジン
- **目的**: ログ受信時の即座なアラート判定
- **機能概要**:
  - 即座評価（ログ受信時の自動判定）
  - 並列処理（複数ルール同時評価）
  - パフォーマンス最適化（効率的なアルゴリズム）
  - アラート履歴（発生記録の保持）

#### F-3.3 外部通知連携
- **目的**: 多様な通知チャンネルによる迅速な情報伝達
- **機能概要**:
  - Slack通知（カラー・絵文字対応）
  - Email通知（HTML形式・SMTP対応）
  - Teams通知（MessageCard形式）
  - 通知設定画面（環境変数管理UI）
  - テスト送信（設定確認機能）
  - カスタム通知送信（手動通知機能）

### F-4. UI/UX・フロントエンド機能

#### F-4.1 レスポンシブデザイン
- **目的**: 全デバイスでの最適な操作体験の提供
- **機能概要**:
  - モバイル対応（スマートフォン・タブレット）
  - タッチ最適化（タップ・スワイプ操作）
  - 画面サイズ適応（自動レイアウト調整）
  - メニュー最適化（ハンバーガーメニュー）

#### F-4.2 現代的UI/UX
- **目的**: 直感的で効率的なユーザーインターフェース
- **機能概要**:
  - Element Plus（統一されたデザインシステム）
  - アクセシビリティ（ARIA属性・キーボード操作）
  - ローディング状態（スケルトン・スピナー）
  - 通知トースト（操作フィードバック）

#### F-4.3 インタラクティブ機能
- **目的**: リアルタイム性とユーザビリティの向上
- **機能概要**:
  - リアルタイム更新（WebSocket自動更新）
  - モーダル詳細（ログ・設定の詳細表示）
  - フォーム検証（入力値の自動検証）
  - 検索フィルター（即座の結果反映）

---

## 非機能要件

### NF-1. パフォーマンス要件
- **レスポンス時間**: API応答時間 < 500ms（通常時）
- **WebSocket遅延**: ログ配信遅延 < 100ms
- **同時接続数**: 100ユーザー同時接続対応
- **データ量**: 1日あたり100万ログエントリ処理対応

### NF-2. セキュリティ要件
- **認証**: JWT Bearer Token（7日間有効期限）
- **パスワード**: bcrypt暗号化（ソルトラウンド: 10）
- **通信**: HTTPS推奨・CORS設定
- **データ保護**: SQLインジェクション対策（Prisma ORM）

### NF-3. 可用性要件
- **稼働率**: 99.5%以上
- **復旧時間**: 障害発生時30分以内の復旧
- **データバックアップ**: 日次自動バックアップ

### NF-4. 拡張性要件
- **水平スケーリング**: コンテナ化対応（Docker）
- **データベース**: PostgreSQL クラスタリング対応
- **ログ容量**: 自動ローテーション・アーカイブ機能

---

## ユーザーロール

### ADMIN（管理者）
- **権限**: 全機能アクセス可能
- **主要機能**:
  - ユーザー管理（CRUD操作）
  - システム設定変更
  - アラートルール管理
  - 通知設定管理
  - ログデータエクスポート

### USER（一般ユーザー）
- **権限**: 監視機能のみアクセス可能
- **主要機能**:
  - ログ監視・検索
  - ダッシュボード閲覧
  - アラート状況確認

### GUEST（ゲスト）
- **権限**: 参照のみ
- **主要機能**:
  - ダッシュボード閲覧
  - ログ監視（読み取り専用）

---

## 画面仕様

### S-1. ログイン画面
- **目的**: ユーザー認証とシステムアクセス
- **構成要素**:
  - ユーザー名入力フィールド
  - パスワード入力フィールド（表示切り替え機能付き）
  - ログインボタン
  - バリデーション（必須項目・パスワード長）
- **レスポンシブ対応**: モバイル最適化済み

### S-2. ダッシュボード画面
- **目的**: システム状況の一覧表示
- **構成要素**:
  - 統計カード（4種類）: 総ユーザー数・アクティブユーザー・今日の訪問数・処理済みタスク
  - 最近のアクティビティテーブル
  - クイックアクションボタン
  - システム状態表示（API・DB・リソース使用率）
- **レスポンシブ対応**: Grid システム（:xs="12" :sm="12" :md="6" :lg="6"）

### S-3. ログ監視画面
- **目的**: リアルタイムログ表示と検索
- **構成要素**:
  - 統計カード（ログ種別ごと）
  - フィルターパネル（レベル・カテゴリ・期間）
  - リアルタイムログテーブル
  - ページネーション
  - 詳細モーダル
- **レスポンシブ対応**: 全コンポーネント対応

### S-4. アラートルール管理画面
- **目的**: アラート条件の設定・管理
- **構成要素**:
  - 統計カード（ルール統計）
  - ルール一覧テーブル
  - 作成・編集モーダル
  - 削除確認ダイアログ
  - テスト機能
- **レスポンシブ対応**: Grid システム対応

### S-5. ユーザー管理画面
- **目的**: ユーザーアカウントの管理
- **構成要素**:
  - 検索フィルター（ユーザー名・部署）
  - ユーザー一覧テーブル
  - 作成・編集モーダル
  - 削除確認ダイアログ
  - 状態切り替えスイッチ
- **レスポンシブ対応**: 基本対応済み

### S-6. 通知設定画面
- **目的**: 外部通知チャンネルの設定・管理
- **構成要素**:
  - 通知チャンネル状態カード（Slack・Email・Teams）
  - テスト送信機能
  - カスタム通知送信フォーム
  - 環境変数設定ガイド
- **レスポンシブ対応**: 完全対応（:xs="24" :sm="12" :md="8"）

### S-7. API接続テスト画面
- **目的**: システム動作確認とデバッグ
- **構成要素**:
  - 認証テストフォーム
  - ユーザー一覧取得テスト
  - 新規ユーザー作成テスト
  - 結果表示エリア
- **レスポンシブ対応**: 基本対応済み

---

## API仕様

### A-1. 認証API

#### POST /api/auth/login
- **目的**: ユーザー認証
- **リクエスト**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **レスポンス**:
  ```json
  {
    "token": "string",
    "user": {
      "id": "number",
      "username": "string",
      "name": "string",
      "role": "string"
    }
  }
  ```

#### POST /api/auth/logout
- **目的**: ログアウト
- **認証**: Bearer Token
- **レスポンス**: `{ "message": "string" }`

#### GET /api/auth/me
- **目的**: 現在のユーザー情報取得
- **認証**: Bearer Token
- **レスポンス**: User オブジェクト

### A-2. ユーザー管理API

#### GET /api/users
- **目的**: ユーザー一覧取得
- **認証**: Bearer Token
- **クエリパラメータ**:
  - `page`: ページ番号
  - `pageSize`: 1ページあたりの件数
  - `username`: ユーザー名での絞り込み
  - `department`: 部署での絞り込み

#### POST /api/users
- **目的**: ユーザー作成
- **認証**: Bearer Token（ADMIN権限）
- **リクエスト**: User作成データ

#### PUT /api/users/:id
- **目的**: ユーザー更新
- **認証**: Bearer Token（ADMIN権限）
- **リクエスト**: User更新データ

#### DELETE /api/users/:id
- **目的**: ユーザー削除
- **認証**: Bearer Token（ADMIN権限）

### A-3. ログ管理API

#### GET /api/logs
- **目的**: ログ一覧取得
- **認証**: Bearer Token
- **クエリパラメータ**:
  - `page`: ページ番号
  - `pageSize`: 1ページあたりの件数
  - `level`: ログレベル
  - `category`: カテゴリ
  - `startDate`: 開始日時
  - `endDate`: 終了日時
  - `message`: メッセージ検索

#### POST /api/logs
- **目的**: ログ作成
- **認証**: Bearer Token
- **リクエスト**: Log作成データ

#### GET /api/logs/stats
- **目的**: ログ統計取得
- **認証**: Bearer Token
- **レスポンス**: 統計データ

#### GET /api/logs/export
- **目的**: ログエクスポート
- **認証**: Bearer Token
- **クエリパラメータ**: フィルター条件
- **レスポンス**: JSON/CSV データ

### A-4. アラートルール管理API

#### GET /api/alert-rules
- **目的**: アラートルール一覧取得
- **認証**: Bearer Token

#### POST /api/alert-rules
- **目的**: アラートルール作成
- **認証**: Bearer Token（ADMIN権限）

#### PUT /api/alert-rules/:id
- **目的**: アラートルール更新
- **認証**: Bearer Token（ADMIN権限）

#### DELETE /api/alert-rules/:id
- **目的**: アラートルール削除
- **認証**: Bearer Token（ADMIN権限）

#### POST /api/alert-rules/:id/test
- **目的**: アラートルールテスト
- **認証**: Bearer Token（ADMIN権限）

### A-5. 通知管理API

#### GET /api/notifications/config
- **目的**: 通知設定取得
- **認証**: Bearer Token

#### POST /api/notifications/test
- **目的**: 通知テスト送信
- **認証**: Bearer Token（ADMIN権限）
- **リクエスト**:
  ```json
  {
    "channel": "slack|email|teams"
  }
  ```

#### POST /api/notifications/send
- **目的**: カスタム通知送信
- **認証**: Bearer Token（ADMIN権限）
- **リクエスト**:
  ```json
  {
    "title": "string",
    "message": "string",
    "level": "info|warning|error|critical",
    "channels": ["slack", "email", "teams"]
  }
  ```

---

## データ仕様

### D-1. ユーザーテーブル (User)
```sql
CREATE TABLE "User" (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'USER',
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### D-2. ログテーブル (Log)
```sql
CREATE TABLE "Log" (
  id SERIAL PRIMARY KEY,
  level VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  traceId VARCHAR(255),
  sessionId VARCHAR(255),
  userId INTEGER REFERENCES "User"(id),
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### D-3. アラートルールテーブル (AlertRule)
```sql
CREATE TABLE "AlertRule" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL,
  thresholdCount INTEGER NOT NULL,
  timeWindow INTEGER NOT NULL,
  isActive BOOLEAN NOT NULL DEFAULT true,
  createdBy INTEGER REFERENCES "User"(id),
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### D-4. アラート履歴テーブル (Alert)
```sql
CREATE TABLE "Alert" (
  id SERIAL PRIMARY KEY,
  ruleId INTEGER REFERENCES "AlertRule"(id),
  ruleName VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  level VARCHAR(50) NOT NULL,
  metadata JSONB,
  notificationSent BOOLEAN NOT NULL DEFAULT false,
  resolvedAt TIMESTAMP,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 外部連携仕様

### E-1. Slack連携
- **Webhook URL**: 環境変数 `SLACK_WEBHOOK_URL`
- **メッセージ形式**: JSON形式（色・絵文字対応）
- **設定項目**:
  - `SLACK_CHANNEL`: 投稿先チャンネル
  - `SLACK_USERNAME`: ボット名
  - `SLACK_ICON`: アイコン絵文字

### E-2. Email連携
- **プロトコル**: SMTP
- **設定項目**:
  - `SMTP_HOST`: SMTPサーバーホスト
  - `SMTP_PORT`: SMTPポート（デフォルト: 587）
  - `SMTP_SECURE`: SSL/TLS使用フラグ
  - `SMTP_USER`: SMTPユーザー名
  - `SMTP_PASS`: SMTPパスワード
  - `EMAIL_FROM`: 送信者アドレス
  - `EMAIL_TO`: 宛先アドレス（カンマ区切り）

### E-3. Teams連携
- **Webhook URL**: 環境変数 `TEAMS_WEBHOOK_URL`
- **メッセージ形式**: MessageCard形式
- **機能**: リッチテキスト・アクションボタン対応

---

**ドキュメント更新日**: 2025年9月21日
**次回レビュー予定**: 2025年10月21日
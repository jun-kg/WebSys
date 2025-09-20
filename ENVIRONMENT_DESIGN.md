# 社内システム開発環境 設計書

## 1. システム概要

Docker環境を使用した社内システムの開発環境構成。フロントエンド、バックエンド、データベースの3層アーキテクチャで構成。

## 2. 技術スタック

### フロントエンド
- **フレームワーク**: Vue.js 3
- **UIライブラリ**: Element Plus
- **ビルドツール**: Vite
- **言語**: TypeScript
- **HTTPクライアント**: Axios
- **ポート**: 3000

### バックエンド
- **フレームワーク**: Node.js + Express
- **言語**: TypeScript
- **ORM**: Prisma
- **認証**: JWT
- **ポート**: 8000

### データベース
- **RDBMS**: PostgreSQL 15
- **ポート**: 5432

### インフラ
- **コンテナ**: Docker & Docker Compose
- **開発環境**: Hot Reload対応

## 3. ディレクトリ構造

```
websys/
├── docker-compose.yml          # Docker Compose設定
├── .env.example               # 環境変数サンプル
├── frontend/                  # フロントエンドアプリケーション
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── src/
│   │   ├── main.ts
│   │   ├── App.vue
│   │   ├── components/      # 共通コンポーネント
│   │   ├── views/           # ページコンポーネント
│   │   ├── router/          # ルーティング設定
│   │   ├── stores/          # 状態管理 (Pinia)
│   │   ├── api/             # API通信層
│   │   └── assets/          # 静的資源
│   └── public/
├── backend/                   # バックエンドAPI
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma    # データベーススキーマ
│   ├── src/
│   │   ├── index.ts         # エントリーポイント
│   │   ├── routes/          # APIルート
│   │   ├── controllers/     # コントローラー
│   │   ├── services/        # ビジネスロジック
│   │   ├── middleware/      # ミドルウェア
│   │   └── utils/           # ユーティリティ
│   └── .env
└── postgres/                  # PostgreSQL設定
    └── init.sql              # 初期化SQL

```

## 4. ネットワーク構成

```
Docker Network: websys_network

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│  PostgreSQL │
│  Port:3000  │     │  Port:8000  │     │  Port:5432  │
└─────────────┘     └─────────────┘     └─────────────┘
```

## 5. 環境変数

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:8000
```

### Backend (.env)
```
NODE_ENV=development
PORT=8000
DATABASE_URL=postgresql://admin:password@postgres:5432/websys_db
JWT_SECRET=your-secret-key
```

### PostgreSQL
```
POSTGRES_USER=admin
POSTGRES_PASSWORD=password
POSTGRES_DB=websys_db
```

## 6. 主要機能

### フロントエンド機能
- ユーザー認証画面（ログイン/ログアウト）
- ダッシュボード
- データ一覧表示（Element Plus Table）
- フォーム入力（Element Plus Form）
- 通知機能（Element Plus Notification）

### バックエンド機能
- RESTful API
- 認証・認可
- データベースCRUD操作
- エラーハンドリング
- ロギング

## 7. 開発コマンド

```bash
# 環境起動
docker-compose up -d

# 環境停止
docker-compose down

# ログ確認
docker-compose logs -f [service_name]

# データベース接続
docker-compose exec postgres psql -U admin -d websys_db

# フロントエンド開発サーバー
docker-compose exec frontend npm run dev

# バックエンド開発サーバー
docker-compose exec backend npm run dev
```

## 8. セキュリティ考慮事項

- 環境変数による機密情報管理
- CORS設定
- JWT認証
- SQLインジェクション対策（Prisma ORM使用）
- XSS対策（Vue.jsのテンプレートエスケーピング）

## 9. 開発フロー

1. `docker-compose up -d` で環境起動
2. フロントエンド: http://localhost:3000
3. バックエンドAPI: http://localhost:8000
4. ホットリロード対応で開発
5. コード変更は自動反映
# 🏗️ WebSys開発プラットフォーム

Vue.js 3 + Element Plus + Express + PostgreSQLによるモダンな社内システム開発プラットフォームです。

## ✨ 特徴

- **🚀 ワンコマンドセットアップ**: 複雑な環境構築を自動化
- **🔄 ホットリロード**: フロントエンド・バックエンド両対応
- **🏗️ スケーラブル設計**: 複数環境・プロジェクト対応
- **🔒 セキュリティ**: セキュアなデフォルト設定
- **📚 豊富なドキュメント**: 開発からデプロイまで

## 🚀 クイックスタート

```bash
# 1. 開発環境セットアップ（初回のみ）
./infrastructure/scripts/setup-dev.sh

# 2. アクセス確認
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# Login: admin / password
```

## 📁 プロジェクト構造

```
websys-dev-platform/              # 🏗️ 開発プラットフォーム
├── 📋 templates/                 # 再利用可能テンプレート
│   ├── frontend-vue/            # Vue.js + Element Plus
│   └── backend-express/         # Express + Prisma
├── ⚙️  infrastructure/           # インフラ設定
│   ├── docker/                  # 環境別Docker設定
│   │   ├── development/         # 開発環境
│   │   ├── staging/             # ステージング環境
│   │   └── production/          # 本番環境
│   └── scripts/                 # 運用スクリプト
├── 🌱 environments/             # 環境別設定
├── 👨‍💻 workspace/                # 開発ワークスペース
└── 📚 docs/                     # ドキュメント
```

## 🛠️ 技術スタック

### フロントエンド
- **Vue.js 3** + **TypeScript**: モダンなWebフレームワーク
- **Element Plus**: 豊富なUIコンポーネント
- **Vite**: 高速ビルドツール
- **Pinia**: 状態管理

### バックエンド
- **Express** + **TypeScript**: 高性能APIサーバー
- **Prisma ORM**: タイプセーフなデータベース操作
- **JWT認証**: セキュアな認証システム

### インフラ
- **Docker + Docker Compose**: コンテナ化
- **PostgreSQL 15**: 高性能データベース
- **環境別設定**: 開発/ステージング/本番対応

## 🔄 開発フロー

### 日常の開発作業

```bash
# workspace内でコーディング
cd workspace/frontend    # フロントエンド開発
cd workspace/backend     # バックエンド開発

# ファイル変更 → 自動リロード ✨
```

### Git管理

```bash
# プラットフォーム設定の管理（このリポジトリ）
git add infrastructure/ templates/ docs/
git commit -m "プラットフォーム機能追加"

# アプリケーションコードの管理（workspace内）
cd workspace
git add .
git commit -m "機能実装"
git push origin main
```

## 🌍 環境管理

### 開発環境

```bash
# 起動
./infrastructure/scripts/setup-dev.sh

# 停止
cd infrastructure/docker/development
docker-compose down

# リセット
./infrastructure/scripts/reset-dev.sh
```

### 本番環境準備

```bash
# 本番環境設定生成
./infrastructure/scripts/generate-env.sh production

# 本番環境構築
cd infrastructure/docker/production
docker-compose up -d
```

## 📊 使用シーン

### 🆕 新規プロジェクト
1. `./infrastructure/scripts/setup-dev.sh` で環境構築
2. `workspace/` で開発開始
3. 独自Gitリポジトリで管理

### 👥 チーム開発
- プラットフォーム設定は共通管理
- 各開発者が `workspace/` で独自開発
- 環境設定の統一で属人化防止

### 🔧 既存プロジェクト移行
1. `workspace/` を既存コードに置き換え
2. `./infrastructure/scripts/setup-dev.sh` で環境起動
3. 段階的にプラットフォーム機能を活用

## 🎯 設計思想

### 1. **関心の分離**
- **templates/**: 再利用可能なコードベース
- **infrastructure/**: 環境・運用設定
- **workspace/**: 実際のアプリケーション開発

### 2. **スケーラビリティ**
- 複数環境への展開
- 複数プロジェクトの並行開発
- チーム規模の拡張

### 3. **保守性**
- 明確なディレクトリ構造
- 豊富なドキュメント
- 自動化されたスクリプト

## 📚 ドキュメント

- [📖 セットアップガイド](docs/setup/README.md)
- [💻 開発ガイド](docs/development/README.md)
- [🚀 デプロイガイド](docs/deployment/README.md)

## 🤝 コントリビューション

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 ライセンス

Private - 社内利用のみ

---

**🎉 Happy Coding!** このプラットフォームで効率的な開発をお楽しみください。
## 🛡️ 品質保証 - 自動チェックシステム

### データ取得エラー防止システム

過去30件のBUG分析に基づき、3層防御体制を構築：

**第1層: エディタチェック（ESLint）**
- コーディング時にリアルタイム検出
- Prismaモデル名の誤用を即座に警告

**第2層: 起動前チェック（package.json統合）**
```bash
cd workspace/backend
npm run dev  # 自動でPrismaモデル名チェック → 起動

cd workspace/frontend  
npm run dev  # 自動で環境設定チェック → 起動
```

**第3層: コミット前チェック（Git hook）**
```bash
git commit -m "message"  # 自動でPrismaチェック → コミット
# エラーがあればコミット中止
```

### 手動チェック

**全チェック実行:**
```bash
./scripts/pre-start-check.sh
```

**個別チェック:**
```bash
./scripts/check-prisma-usage.sh    # Prismaモデル名
./scripts/check-environment.sh     # 環境設定
```

### 期待効果

| 指標 | 従来 | 改善後 | 削減率 |
|------|------|--------|--------|
| データ取得エラー | 40% | **5%以下** | **92%削減** |
| デバッグ時間 | 30分 | **3分** | **90%削減** |
| チェック忘れ | 50% | **0%** | **100%削減** |

**詳細:** [docs/08_報告/41_データ取得エラー頻発対策案.md](docs/08_報告/41_データ取得エラー頻発対策案.md)


# Enterprise Commons リリース管理

このファイルは、共通ライブラリの安定版リリース情報を管理します。

---

## 📋 リリースステータス

| ステータス | 説明 | 企業プロジェクトでの使用 |
|-----------|------|------------------------|
| **🟢 STABLE** | 安定版リリース | ✅ 推奨 |
| **🟡 RC (Release Candidate)** | リリース候補 | ⚠️ テスト環境で検証推奨 |
| **🔴 DEVELOPMENT** | 開発中 | ❌ 本番環境使用禁止 |

---

## 🚀 最新リリース

### バージョン: **DEVELOPMENT**
**ステータス**: 🔴 DEVELOPMENT（開発中）

**リリース日**: -

**説明**:
現在、企業向けプロジェクト展開システムの開発中です。
次回の安定版リリースをお待ちください。

**含まれる機能**:
- core/extensions/custom 3層アーキテクチャ
- 企業プロジェクト作成スクリプト (create-project.sh)
- テンプレート生成スクリプト (build-templates.sh)
- 自動更新スクリプト (update-core.sh)
- ログ監視システム（マイクロフロントエンド分割済み）
- 権限管理システム（RBAC）

**既知の問題**:
- なし

**次回リリース予定**:
- v1.0.0-stable: 初回安定版リリース（予定: 2025-10-20）

---

## 📚 リリース履歴

### v1.0.0-stable (予定)
**予定日**: 2025-10-20
**ステータス**: 🟡 準備中

**計画内容**:
- [ ] 全機能の統合テスト完了
- [ ] ドキュメント最終確認
- [ ] サンプルプロジェクト動作確認
- [ ] セキュリティ監査
- [ ] パフォーマンステスト

---

## 🔄 リリースプロセス

### 1. 開発中 (DEVELOPMENT)
```
🔴 DEVELOPMENT
└─ 機能開発・バグ修正
```

### 2. リリース候補 (RC)
```
🟡 RC
├─ 機能凍結
├─ 統合テスト
├─ ドキュメント確認
└─ セキュリティ監査
```

### 3. 安定版リリース (STABLE)
```
🟢 STABLE
├─ Git tag作成 (v1.0.0)
├─ CHANGELOG.md更新
├─ テンプレート生成
└─ 企業プロジェクトへ配布可能
```

---

## 📦 バージョニング規則

Enterprise Commonsは **Semantic Versioning 2.0.0** に従います。

```
v{MAJOR}.{MINOR}.{PATCH}-{STATUS}

例:
- v1.0.0-stable     # 初回安定版
- v1.1.0-rc.1       # v1.1.0のリリース候補1
- v1.1.0-stable     # v1.1.0安定版
- v2.0.0-stable     # メジャーアップデート
```

### バージョン番号の意味

| 番号 | 変更内容 | 例 |
|------|---------|-----|
| **MAJOR** | 破壊的変更（後方互換性なし） | 1.x.x → 2.0.0 |
| **MINOR** | 新機能追加（後方互換性あり） | 1.0.x → 1.1.0 |
| **PATCH** | バグ修正（後方互換性あり） | 1.0.0 → 1.0.1 |

### ステータス

- **-stable**: 安定版（本番環境推奨）
- **-rc.N**: リリース候補（テスト環境推奨）
- **-beta.N**: ベータ版（開発環境のみ）
- **-alpha.N**: アルファ版（内部開発のみ）

---

## 🔍 リリース確認方法

### 方法1: RELEASE.mdを確認

```bash
cat /path/to/enterprise-commons/RELEASE.md
```

### 方法2: Gitタグを確認

```bash
cd /path/to/enterprise-commons
git tag | grep stable
```

### 方法3: VERSIONファイルを確認

```bash
cat templates/backend-express/src/core/VERSION
```

---

## 🛡️ 企業プロジェクトでの使用ガイドライン

### ✅ 推奨

- **🟢 STABLE** バージョンのみ本番環境で使用
- リリースノートを必ず確認
- テスト環境で事前検証

### ⚠️ 注意

- **🟡 RC** バージョンはテスト環境でのみ使用
- 既知の問題を確認
- フィードバックを開発チームに報告

### ❌ 禁止

- **🔴 DEVELOPMENT** を本番環境で使用
- タグなしのコミットを直接使用
- 未リリース機能に依存

---

## 📞 サポート

### 質問・問題報告

- **GitHub Issues**: https://github.com/jun-kg/Enterprise Commons/issues
- **ドキュメント**: `/docs`
- **緊急連絡**: （記載予定）

### アップグレード支援

新しい安定版リリース時は、以下の手順で更新してください：

```bash
# 1. リリース情報確認
cat /path/to/enterprise-commons/RELEASE.md

# 2. 最新安定版を取得
cd /path/to/enterprise-commons
git pull origin main
git checkout v1.0.0-stable  # 安定版タグ

# 3. テンプレート生成
./scripts/build-templates.sh

# 4. 企業プロジェクトに適用
cd /path/to/company-project
/path/to/enterprise-commons/scripts/update-core.sh
```

---

**最終更新**: 2025-10-18
**管理者**: Enterprise Commons開発チーム

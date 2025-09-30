# 開発ガイド

## 概要

このドキュメントは、WebSys開発プラットフォームでの効率的な開発手法、コーディング規約、ベストプラクティスを定義します。

## 開発環境セットアップ

### 前提条件
- Docker 20.10+
- Docker Compose 2.0+
- Git 2.30+
- Node.js 18+ (ローカル開発用、オプション)

### 初回セットアップ
```bash
# 1. リポジトリクローン
git clone <repository-url>
cd websys-dev-platform

# 2. 開発環境起動
./infrastructure/scripts/setup-dev.sh

# 3. アクセス確認
open http://localhost:3000  # Frontend
open http://localhost:8000  # Backend API
```

### 開発環境の確認
```bash
# サービス状態確認
cd infrastructure/docker/development
docker-compose ps

# ログ確認
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f postgres

# ヘルスチェック
curl http://localhost:8000/health
curl http://localhost:3000
```

## 開発ワークフロー

### 日常の開発フロー

1. **環境起動**
   ```bash
   ./infrastructure/scripts/setup-dev.sh
   ```

2. **ブランチ作成**
   ```bash
   cd workspace
   git checkout -b feature/new-feature
   ```

3. **開発作業**
   ```bash
   # フロントエンド開発
   cd workspace/frontend
   # ファイル編集 → 自動リロード

   # バックエンド開発
   cd workspace/backend
   # ファイル編集 → 自動再起動
   ```

4. **データベース操作**
   ```bash
   # マイグレーション作成
   cd infrastructure/docker/development
   docker-compose exec backend npx prisma migrate dev --name add-new-table

   # Prisma Studio起動
   docker-compose exec backend npx prisma studio
   ```

5. **コミット・プッシュ**
   ```bash
   cd workspace
   git add .
   git commit -m "feat: implement new feature"
   git push origin feature/new-feature
   ```

### ブランチ戦略

```
main (production)
├── develop (integration)
│   ├── feature/user-management
│   ├── feature/dashboard-improvements
│   └── feature/api-optimization
├── hotfix/critical-bug
└── release/v1.1.0
```

#### ブランチ命名規則
- **feature/**: 新機能開発 (`feature/user-authentication`)
- **bugfix/**: バグ修正 (`bugfix/login-error`)
- **hotfix/**: 緊急修正 (`hotfix/security-patch`)
- **release/**: リリース準備 (`release/v1.0.0`)

## コーディング規約

### TypeScript/JavaScript

#### 命名規則
```typescript
// 変数・関数: camelCase
const userName = 'john'
const getUserData = () => {}

// 定数: UPPER_SNAKE_CASE
const API_BASE_URL = 'http://localhost:8000'

// クラス・インターface: PascalCase
class UserService {}
interface UserData {}

// ファイル名: kebab-case
user-management.vue
api-client.ts
```

#### 型定義
```typescript
// 明示的な型定義を推奨
interface User {
  id: number
  username: string
  email: string
  role: 'ADMIN' | 'USER' | 'GUEST'
}

// 関数の型定義
const fetchUser = async (id: number): Promise<User> => {
  // implementation
}

// Props定義 (Vue.js)
interface Props {
  user: User
  isEditable?: boolean
}
```

#### Import順序
```typescript
// 1. Node.js標準ライブラリ
import fs from 'fs'

// 2. 外部ライブラリ
import express from 'express'
import { PrismaClient } from '@prisma/client'

// 3. 相対インポート
import { UserService } from './services/user'
import type { User } from './types/user'
```

### Vue.js規約

#### コンポーネント構造
```vue
<template>
  <!-- HTML template -->
</template>

<script setup lang="ts">
// Composition API
// Imports
// Props
// Reactive data
// Computed
// Methods
// Lifecycle hooks
</script>

<style scoped>
/* Component-specific styles */
</style>
```

#### Props定義
```typescript
interface Props {
  user: User
  isEditable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isEditable: false
})
```

#### Events定義
```typescript
interface Emits {
  (e: 'update:user', user: User): void
  (e: 'delete', id: number): void
}

const emit = defineEmits<Emits>()
```

### Express.js規約

#### API設計
```typescript
// RESTful API設計
GET    /api/users          // ユーザー一覧取得
POST   /api/users          // ユーザー作成
GET    /api/users/:id      // ユーザー詳細取得
PUT    /api/users/:id      // ユーザー更新
DELETE /api/users/:id      // ユーザー削除
```

#### エラーハンドリング
```typescript
// 統一されたエラーレスポンス
interface ErrorResponse {
  message: string
  errors?: ValidationError[]
  stack?: string
}

// エラーミドルウェア
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const response: ErrorResponse = {
    message: err.message
  }

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack
  }

  res.status(500).json(response)
})
```

#### バリデーション
```typescript
import { body, validationResult } from 'express-validator'

// バリデーションルール
export const createUserValidation = [
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('ユーザー名は3-20文字で入力してください'),
  body('email')
    .isEmail()
    .withMessage('有効なメールアドレスを入力してください'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('パスワードは6文字以上で入力してください')
]

// バリデーション処理
export const handleValidation = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}
```

## データベース規約

### Prisma Schema
```prisma
// モデル定義
model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  email     String   @unique
  password  String
  name      String
  role      UserRole @default(USER)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users") // テーブル名をスネークケース
}

// Enum定義
enum UserRole {
  ADMIN
  USER
  GUEST
}
```

### マイグレーション
```bash
# マイグレーション作成
npx prisma migrate dev --name add_user_table

# マイグレーション適用
npx prisma migrate deploy

# スキーマリセット（開発環境のみ）
npx prisma migrate reset
```

## テスト戦略

### フロントエンド テスト
```typescript
// Unit Test (Vitest)
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import UserCard from '@/components/UserCard.vue'

describe('UserCard', () => {
  it('displays user information correctly', () => {
    const user = { id: 1, name: 'John Doe', email: 'john@example.com' }
    const wrapper = mount(UserCard, { props: { user } })

    expect(wrapper.text()).toContain('John Doe')
    expect(wrapper.text()).toContain('john@example.com')
  })
})

// E2E Test (Playwright)
import { test, expect } from '@playwright/test'

test('user login flow', async ({ page }) => {
  await page.goto('http://localhost:3000/login')
  await page.fill('[data-testid="username"]', 'admin')
  await page.fill('[data-testid="password"]', 'password')
  await page.click('[data-testid="login-button"]')
  await expect(page).toHaveURL('/dashboard')
})
```

### バックエンド テスト
```typescript
// Unit Test (Jest)
import { UserService } from '../services/user'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const userService = new UserService(prisma)

describe('UserService', () => {
  it('creates user successfully', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    }

    const user = await userService.createUser(userData)
    expect(user.username).toBe('testuser')
    expect(user.email).toBe('test@example.com')
  })
})

// Integration Test
import request from 'supertest'
import app from '../app'

describe('POST /api/users', () => {
  it('creates user with valid data', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        name: 'New User'
      })
      .expect(201)

    expect(response.body.username).toBe('newuser')
  })
})
```

## パフォーマンス最適化

### フロントエンド最適化

#### コード分割
```typescript
// ルートレベルコード分割
const Dashboard = () => import('@/views/Dashboard.vue')
const Users = () => import('@/views/Users.vue')

const routes = [
  { path: '/dashboard', component: Dashboard },
  { path: '/users', component: Users }
]
```

#### 状態管理最適化
```typescript
// Pinia Store
export const useUserStore = defineStore('user', () => {
  const users = ref<User[]>([])
  const loading = ref(false)

  // Computed (自動キャッシュ)
  const activeUsers = computed(() =>
    users.value.filter(user => user.isActive)
  )

  // Actions
  const fetchUsers = async () => {
    if (loading.value) return // 重複リクエスト防止

    loading.value = true
    try {
      const response = await api.get('/users')
      users.value = response.data
    } finally {
      loading.value = false
    }
  }

  return { users, loading, activeUsers, fetchUsers }
})
```

### バックエンド最適化

#### データベースクエリ最適化
```typescript
// 効率的なクエリ
const getUsersWithPosts = await prisma.user.findMany({
  select: {
    id: true,
    username: true,
    email: true,
    _count: {
      select: { posts: true }
    }
  },
  where: {
    isActive: true
  },
  orderBy: {
    createdAt: 'desc'
  },
  take: 20,
  skip: offset
})

// N+1問題の回避
const usersWithPosts = await prisma.user.findMany({
  include: {
    posts: {
      take: 5,
      orderBy: { createdAt: 'desc' }
    }
  }
})
```

#### キャッシュ戦略
```typescript
// メモリキャッシュ
const cache = new Map<string, any>()

const getCachedUser = async (id: number): Promise<User> => {
  const cacheKey = `user:${id}`

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)
  }

  const user = await prisma.user.findUnique({ where: { id } })
  cache.set(cacheKey, user)

  return user
}
```

## セキュリティベストプラクティス

### 認証・認可
```typescript
// JWT実装
const generateToken = (user: User): string => {
  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )
}

// 認証ミドルウェア
const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ message: '認証が必要です' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ message: '無効なトークンです' })
  }
}
```

### データバリデーション
```typescript
// 入力サニタイゼーション
import validator from 'validator'

const sanitizeInput = (input: string): string => {
  return validator.escape(validator.trim(input))
}

// SQL Injection防止（Prisma）
const getUserById = async (id: number) => {
  // Prismaは自動的にパラメータをエスケープ
  return await prisma.user.findUnique({
    where: { id } // 安全
  })
}
```

## デプロイ準備

### 環境変数管理
```bash
# development
NODE_ENV=development
DATABASE_URL=postgresql://admin:password@postgres:5432/websys_db_dev
JWT_SECRET=dev-secret-key

# production
NODE_ENV=production
DATABASE_URL=postgresql://admin:secure-password@db.example.com:5432/websys_db_prod
JWT_SECRET=production-secure-secret-key
```

### ビルド最適化
```typescript
// vite.config.ts (production)
export default defineConfig({
  build: {
    minify: 'terser',
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
})
```

## 継続的インテグレーション

### GitHub Actions例
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd workspace/frontend && npm ci
          cd workspace/backend && npm ci

      - name: Run tests
        run: |
          cd workspace/frontend && npm run test
          cd workspace/backend && npm run test

      - name: Build
        run: |
          cd workspace/frontend && npm run build
          cd workspace/backend && npm run build
```
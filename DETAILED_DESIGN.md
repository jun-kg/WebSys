# 詳細設計書 - ログ監視システム

**バージョン**: v1.2.0
**作成日**: 2025年9月21日
**システム名**: 統合ログ監視プラットフォーム

---

## 📋 目次

1. [アーキテクチャ設計](#アーキテクチャ設計)
2. [データベース設計](#データベース設計)
3. [API設計](#api設計)
4. [フロントエンド設計](#フロントエンド設計)
5. [認証・セキュリティ設計](#認証セキュリティ設計)
6. [WebSocket設計](#websocket設計)
7. [通知システム設計](#通知システム設計)
8. [デプロイメント設計](#デプロイメント設計)

---

## アーキテクチャ設計

### システムアーキテクチャ概要

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│  (Vue.js 3)     │◄──►│  (Express.js)   │◄──►│  (PostgreSQL)   │
│  Port: 3000     │    │  Port: 8000     │    │  Port: 5432     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│   WebSocket     │◄─────────────┘
                        │   (Socket.IO)   │
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │  External APIs  │
                        │ (Slack/Email/   │
                        │    Teams)       │
                        └─────────────────┘
```

### 技術スタック詳細

#### フロントエンド
- **フレームワーク**: Vue.js 3.4+ (Composition API)
- **UI ライブラリ**: Element Plus 2.4+
- **言語**: TypeScript 5.0+
- **ビルドツール**: Vite 5.0+
- **状態管理**: Pinia
- **ルーティング**: Vue Router 4
- **HTTP クライアント**: Axios
- **WebSocket クライアント**: Socket.IO Client

#### バックエンド
- **ランタイム**: Node.js 18+
- **フレームワーク**: Express.js 4.18+
- **言語**: TypeScript 5.0+
- **ORM**: Prisma 5.0+
- **認証**: jsonwebtoken
- **WebSocket**: Socket.IO
- **バリデーション**: zod
- **パスワード暗号化**: bcrypt

#### インフラストラクチャ
- **データベース**: PostgreSQL 15+
- **コンテナ**: Docker & Docker Compose
- **プロセス管理**: tsx (開発時)

---

## データベース設計

### ERD (Entity Relationship Diagram)

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    User     │         │     Log     │         │ AlertRule   │
├─────────────┤    ┌────┤─────────────┤         ├─────────────┤
│ id (PK)     │    │    │ id (PK)     │    ┌────┤ id (PK)     │
│ username    │    │    │ level       │    │    │ name        │
│ name        │    │    │ category    │    │    │ description │
│ email       │    │    │ message     │    │    │ conditions  │
│ password    │    │    │ metadata    │    │    │ threshold   │
│ department  │    │    │ traceId     │    │    │ timeWindow  │
│ role        │    │    │ sessionId   │    │    │ isActive    │
│ isActive    │    │    │ userId (FK) │◄───┘    │ createdBy   │
│ createdAt   │    │    │ timestamp   │         │ createdAt   │
│ updatedAt   │    │    │ createdAt   │         │ updatedAt   │
└─────────────┘    │    └─────────────┘         └─────────────┘
       │           │                                    │
       └───────────┘                                    │
                                                        │
                            ┌─────────────┐             │
                            │    Alert    │             │
                            ├─────────────┤             │
                            │ id (PK)     │             │
                            │ ruleId (FK) │◄────────────┘
                            │ ruleName    │
                            │ message     │
                            │ level       │
                            │ metadata    │
                            │ notified    │
                            │ resolvedAt  │
                            │ createdAt   │
                            └─────────────┘
```

### テーブル詳細設計

#### User テーブル
```sql
CREATE TABLE "User" (
  id              SERIAL PRIMARY KEY,
  username        VARCHAR(255) UNIQUE NOT NULL,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password        VARCHAR(255) NOT NULL,  -- bcrypt hashed
  department      VARCHAR(255),
  role            VARCHAR(50) NOT NULL DEFAULT 'USER', -- ADMIN, USER, GUEST
  isActive        BOOLEAN NOT NULL DEFAULT true,
  createdAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_user_username ON "User"(username);
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_user_role ON "User"(role);
CREATE INDEX idx_user_isActive ON "User"(isActive);
```

#### Log テーブル
```sql
CREATE TABLE "Log" (
  id              SERIAL PRIMARY KEY,
  level           VARCHAR(50) NOT NULL,    -- TRACE, DEBUG, INFO, WARN, ERROR, FATAL
  category        VARCHAR(50) NOT NULL,    -- AUTH, API, DB, SEC, SYS, USER, PERF, ERR
  message         TEXT NOT NULL,
  metadata        JSONB,                   -- 追加情報 (JSON形式)
  traceId         VARCHAR(255),            -- 分散トレーシング用ID
  sessionId       VARCHAR(255),            -- セッションID
  userId          INTEGER REFERENCES "User"(id),
  timestamp       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_log_level ON "Log"(level);
CREATE INDEX idx_log_category ON "Log"(category);
CREATE INDEX idx_log_timestamp ON "Log"(timestamp);
CREATE INDEX idx_log_userId ON "Log"(userId);
CREATE INDEX idx_log_traceId ON "Log"(traceId);
CREATE INDEX idx_log_composite ON "Log"(level, category, timestamp);
CREATE INDEX idx_log_metadata ON "Log" USING GIN(metadata);
```

#### AlertRule テーブル
```sql
CREATE TABLE "AlertRule" (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  conditions      JSONB NOT NULL,          -- アラート条件 (JSON形式)
  thresholdCount  INTEGER NOT NULL,        -- 閾値カウント
  timeWindow      INTEGER NOT NULL,        -- 時間窓 (分)
  isActive        BOOLEAN NOT NULL DEFAULT true,
  createdBy       INTEGER REFERENCES "User"(id),
  createdAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_alertrule_isActive ON "AlertRule"(isActive);
CREATE INDEX idx_alertrule_createdBy ON "AlertRule"(createdBy);
```

#### Alert テーブル
```sql
CREATE TABLE "Alert" (
  id              SERIAL PRIMARY KEY,
  ruleId          INTEGER REFERENCES "AlertRule"(id),
  ruleName        VARCHAR(255) NOT NULL,
  message         TEXT NOT NULL,
  level           VARCHAR(50) NOT NULL,    -- info, warning, error, critical
  metadata        JSONB,
  notificationSent BOOLEAN NOT NULL DEFAULT false,
  resolvedAt      TIMESTAMP,
  createdAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_alert_ruleId ON "Alert"(ruleId);
CREATE INDEX idx_alert_level ON "Alert"(level);
CREATE INDEX idx_alert_createdAt ON "Alert"(createdAt);
CREATE INDEX idx_alert_notificationSent ON "Alert"(notificationSent);
```

### データ型・制約詳細

#### ログレベル定義
```typescript
enum LogLevel {
  TRACE = 'TRACE',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL'
}
```

#### カテゴリ定義
```typescript
enum LogCategory {
  AUTH = 'AUTH',    // 認証関連
  API = 'API',      // API呼び出し
  DB = 'DB',        // データベース操作
  SEC = 'SEC',      // セキュリティ
  SYS = 'SYS',      // システム
  USER = 'USER',    // ユーザー操作
  PERF = 'PERF',    // パフォーマンス
  ERR = 'ERR'       // エラー
}
```

#### ユーザーロール定義
```typescript
enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST'
}
```

---

## API設計

### RESTful API 設計原則

#### URL設計パターン
```
/api/{version}/{resource}/{id?}/{sub-resource?}
```

#### HTTP ステータスコード使用方針
- `200 OK`: 成功
- `201 Created`: リソース作成成功
- `400 Bad Request`: クライアントエラー
- `401 Unauthorized`: 認証エラー
- `403 Forbidden`: 認可エラー
- `404 Not Found`: リソース未存在
- `500 Internal Server Error`: サーバーエラー

### API エンドポイント詳細

#### 認証API

##### POST /api/auth/login
```typescript
// Request
interface LoginRequest {
  username: string;
  password: string;
}

// Response
interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    name: string;
    email: string;
    role: UserRole;
    department?: string;
  };
}

// エラーレスポンス
interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
}
```

##### GET /api/auth/me
```typescript
// Headers
Authorization: Bearer {token}

// Response
interface UserResponse {
  id: number;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

#### ログ管理API

##### GET /api/logs
```typescript
// Query Parameters
interface LogsQuery {
  page?: number;          // デフォルト: 1
  pageSize?: number;      // デフォルト: 20, 最大: 100
  level?: LogLevel[];     // 複数選択可能
  category?: LogCategory[];
  startDate?: string;     // ISO 8601 format
  endDate?: string;       // ISO 8601 format
  message?: string;       // 部分一致検索
  traceId?: string;       // 完全一致
  userId?: number;
}

// Response
interface LogsResponse {
  data: Log[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface Log {
  id: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  metadata?: Record<string, any>;
  traceId?: string;
  sessionId?: string;
  userId?: number;
  user?: {
    id: number;
    username: string;
    name: string;
  };
  timestamp: string;
  createdAt: string;
}
```

##### POST /api/logs
```typescript
// Request
interface CreateLogRequest {
  level: LogLevel;
  category: LogCategory;
  message: string;
  metadata?: Record<string, any>;
  traceId?: string;
  sessionId?: string;
}

// Response
interface CreateLogResponse {
  id: number;
  message: string;
}
```

##### GET /api/logs/stats
```typescript
// Query Parameters
interface StatsQuery {
  startDate?: string;
  endDate?: string;
  groupBy?: 'hour' | 'day' | 'week';
}

// Response
interface LogStatsResponse {
  total: number;
  byLevel: Record<LogLevel, number>;
  byCategory: Record<LogCategory, number>;
  timeline?: Array<{
    period: string;
    count: number;
    byLevel: Record<LogLevel, number>;
  }>;
}
```

#### アラートルール管理API

##### GET /api/alert-rules
```typescript
// Query Parameters
interface AlertRulesQuery {
  page?: number;
  pageSize?: number;
  isActive?: boolean;
}

// Response
interface AlertRulesResponse {
  data: AlertRule[];
  pagination: PaginationInfo;
}

interface AlertRule {
  id: number;
  name: string;
  description?: string;
  conditions: AlertConditions;
  thresholdCount: number;
  timeWindow: number; // minutes
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: number;
    name: string;
  };
}

interface AlertConditions {
  levels?: LogLevel[];
  categories?: LogCategory[];
  messagePattern?: string;
  metadata?: Record<string, any>;
}
```

##### POST /api/alert-rules
```typescript
// Request
interface CreateAlertRuleRequest {
  name: string;
  description?: string;
  conditions: AlertConditions;
  thresholdCount: number;
  timeWindow: number;
  isActive?: boolean;
}

// Response
interface CreateAlertRuleResponse {
  id: number;
  message: string;
}
```

### API認証・認可設計

#### JWT トークン構造
```typescript
interface JWTPayload {
  userId: number;
  username: string;
  role: UserRole;
  iat: number; // issued at
  exp: number; // expires at
}
```

#### 認証ミドルウェア
```typescript
// 実装例
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded as JWTPayload;
    next();
  });
};
```

#### 認可ミドルウェア
```typescript
const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// 使用例
app.delete('/api/users/:id', authenticateToken, requireRole(['ADMIN']), deleteUser);
```

---

## フロントエンド設計

### アーキテクチャパターン

#### コンポーネント設計
```
src/
├── components/
│   ├── common/          # 共通コンポーネント
│   │   ├── CommonButton.vue
│   │   ├── CommonTable.vue
│   │   └── CommonModal.vue
│   ├── layout/          # レイアウトコンポーネント
│   │   ├── Sidebar.vue
│   │   ├── Header.vue
│   │   └── Footer.vue
│   └── feature/         # 機能固有コンポーネント
│       ├── LogTable.vue
│       ├── AlertForm.vue
│       └── UserForm.vue
├── views/               # ページコンポーネント
│   ├── Login.vue
│   ├── Dashboard.vue
│   ├── LogMonitoring.vue
│   ├── AlertRules.vue
│   ├── Users.vue
│   └── NotificationSettings.vue
├── stores/              # Pinia ストア
│   ├── auth.ts
│   ├── logs.ts
│   ├── alerts.ts
│   └── users.ts
├── api/                 # API クライアント
│   ├── index.ts
│   ├── auth.ts
│   ├── logs.ts
│   ├── alerts.ts
│   └── users.ts
├── utils/               # ユーティリティ
│   ├── api.ts
│   ├── messages.ts
│   ├── constants.ts
│   └── helpers.ts
└── types/               # TypeScript型定義
    ├── api.ts
    ├── auth.ts
    ├── logs.ts
    └── alerts.ts
```

#### 状態管理設計 (Pinia)

##### Auth Store
```typescript
// stores/auth.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false
  }),

  getters: {
    isAdmin: (state) => state.user?.role === 'ADMIN',
    currentUser: (state) => state.user
  },

  actions: {
    async login(credentials: LoginRequest) {
      const response = await authAPI.login(credentials);
      this.setToken(response.token);
      this.setUser(response.user);
    },

    setToken(token: string) {
      this.token = token;
      this.isAuthenticated = true;
      localStorage.setItem('token', token);
    },

    logout() {
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
      localStorage.removeItem('token');
    }
  }
});
```

##### Logs Store
```typescript
// stores/logs.ts
interface LogsState {
  logs: Log[];
  loading: boolean;
  filters: LogFilters;
  pagination: PaginationInfo;
  realTimeEnabled: boolean;
}

export const useLogsStore = defineStore('logs', {
  state: (): LogsState => ({
    logs: [],
    loading: false,
    filters: {
      level: [],
      category: [],
      dateRange: null
    },
    pagination: {
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0
    },
    realTimeEnabled: true
  }),

  actions: {
    async fetchLogs() {
      this.loading = true;
      try {
        const response = await logsAPI.getLogs({
          ...this.filters,
          ...this.pagination
        });
        this.logs = response.data;
        this.pagination = response.pagination;
      } finally {
        this.loading = false;
      }
    },

    addRealTimeLog(log: Log) {
      if (this.realTimeEnabled) {
        this.logs.unshift(log);
        // 最大表示件数制限
        if (this.logs.length > 1000) {
          this.logs = this.logs.slice(0, 1000);
        }
      }
    }
  }
});
```

#### ルーティング設計

```typescript
// router/index.ts
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      component: () => import('@/views/Layout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/dashboard'
        },
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('@/views/Dashboard.vue')
        },
        {
          path: 'logs',
          name: 'LogMonitoring',
          component: () => import('@/views/LogMonitoring.vue')
        },
        {
          path: 'alert-rules',
          name: 'AlertRules',
          component: () => import('@/views/AlertRules.vue'),
          meta: { requiresRole: ['ADMIN'] }
        },
        {
          path: 'users',
          name: 'Users',
          component: () => import('@/views/Users.vue'),
          meta: { requiresRole: ['ADMIN'] }
        }
      ]
    }
  ]
});

// 認証ガード
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
    return;
  }

  if (to.meta.requiresRole) {
    const requiredRoles = to.meta.requiresRole as string[];
    if (!authStore.user || !requiredRoles.includes(authStore.user.role)) {
      next('/dashboard'); // 権限不足時はダッシュボードへ
      return;
    }
  }

  next();
});
```

#### API クライアント設計

```typescript
// utils/api.ts
import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000') + '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// リクエストインターセプター（認証トークン自動付与）
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// レスポンスインターセプター（エラーハンドリング）
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 認証エラー時はログアウト
      const authStore = useAuthStore();
      authStore.logout();
      router.push('/login');
    }
    return Promise.reject(error);
  }
);
```

---

## 認証・セキュリティ設計

### JWT認証システム

#### トークン生成・検証

```typescript
// utils/jwt.ts
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = '7d';

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'log-monitoring-system',
    audience: 'log-monitoring-users'
  });
};

export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};
```

#### パスワード暗号化

```typescript
// utils/password.ts
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};
```

### セキュリティ設定

#### CORS設定
```typescript
// app.ts
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

#### セキュリティヘッダー
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
```

---

## WebSocket設計

### Socket.IO サーバー設計

```typescript
// websocket/server.ts
import { Server } from 'socket.io';
import { verifyToken } from '@/utils/jwt';

export const initializeWebSocket = (server: any) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }
  });

  // 認証ミドルウェア
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const decoded = verifyToken(token);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);

    // ルーム参加（ユーザーID別）
    socket.join(`user:${socket.userId}`);

    // 管理者のみ全体チャンネル参加
    if (socket.userRole === 'ADMIN') {
      socket.join('admin');
    }

    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });

  return io;
};
```

### リアルタイムログ配信

```typescript
// services/logService.ts
export class LogService {
  constructor(private io: Server) {}

  async createLog(logData: CreateLogRequest, userId?: number): Promise<Log> {
    // ログをデータベースに保存
    const log = await prisma.log.create({
      data: {
        ...logData,
        userId
      },
      include: {
        user: {
          select: { id: true, username: true, name: true }
        }
      }
    });

    // WebSocketで配信
    this.broadcastLog(log);

    // アラート評価
    await this.evaluateAlerts(log);

    return log;
  }

  private broadcastLog(log: Log) {
    // 全ユーザーに配信
    this.io.emit('log:new', log);

    // 特定条件のログは管理者のみに配信
    if (log.level === 'ERROR' || log.level === 'FATAL') {
      this.io.to('admin').emit('log:critical', log);
    }
  }
}
```

### クライアント側WebSocket実装

```typescript
// composables/useWebSocket.ts
import { io, Socket } from 'socket.io-client';

export const useWebSocket = () => {
  let socket: Socket | null = null;
  const isConnected = ref(false);

  const connect = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:8000', {
      auth: { token }
    });

    socket.on('connect', () => {
      isConnected.value = true;
      console.log('WebSocket connected');
    });

    socket.on('disconnect', () => {
      isConnected.value = false;
      console.log('WebSocket disconnected');
    });

    socket.on('log:new', (log: Log) => {
      const logsStore = useLogsStore();
      logsStore.addRealTimeLog(log);
    });

    socket.on('alert:new', (alert: Alert) => {
      const alertsStore = useAlertsStore();
      alertsStore.addAlert(alert);

      // 通知表示
      ElNotification({
        title: 'アラート発生',
        message: alert.message,
        type: 'warning',
        duration: 0 // 手動で閉じるまで表示
      });
    });
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      socket = null;
      isConnected.value = false;
    }
  };

  return {
    connect,
    disconnect,
    isConnected: readonly(isConnected)
  };
};
```

---

## 通知システム設計

### 通知プロバイダーアーキテクチャ

```typescript
// notification/providers/base.ts
export abstract class NotificationProvider {
  abstract send(message: NotificationMessage): Promise<boolean>;
  abstract test(): Promise<boolean>;
  abstract isConfigured(): boolean;
}

interface NotificationMessage {
  title: string;
  message: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  metadata?: Record<string, any>;
}
```

### Slack通知実装

```typescript
// notification/providers/slack.ts
export class SlackProvider extends NotificationProvider {
  private webhookUrl: string;
  private channel?: string;
  private username?: string;
  private icon?: string;

  constructor() {
    super();
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL!;
    this.channel = process.env.SLACK_CHANNEL;
    this.username = process.env.SLACK_USERNAME || 'Log Monitor';
    this.icon = process.env.SLACK_ICON || ':warning:';
  }

  async send(message: NotificationMessage): Promise<boolean> {
    if (!this.isConfigured()) {
      throw new Error('Slack not configured');
    }

    const payload = {
      channel: this.channel,
      username: this.username,
      icon_emoji: this.icon,
      attachments: [
        {
          color: this.getLevelColor(message.level),
          title: message.title,
          text: message.message,
          fields: [
            {
              title: 'Level',
              value: message.level.toUpperCase(),
              short: true
            },
            {
              title: 'Time',
              value: new Date().toISOString(),
              short: true
            }
          ],
          footer: 'Log Monitoring System',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    try {
      const response = await axios.post(this.webhookUrl, payload);
      return response.status === 200;
    } catch (error) {
      console.error('Slack notification failed:', error);
      return false;
    }
  }

  private getLevelColor(level: string): string {
    const colors = {
      info: 'good',
      warning: 'warning',
      error: 'danger',
      critical: '#ff0000'
    };
    return colors[level as keyof typeof colors] || 'good';
  }

  isConfigured(): boolean {
    return !!this.webhookUrl;
  }
}
```

### 通知マネージャー

```typescript
// notification/manager.ts
export class NotificationManager {
  private providers: Map<string, NotificationProvider> = new Map();

  constructor() {
    this.providers.set('slack', new SlackProvider());
    this.providers.set('email', new EmailProvider());
    this.providers.set('teams', new TeamsProvider());
  }

  async sendNotification(
    channels: string[],
    message: NotificationMessage
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    await Promise.all(
      channels.map(async (channel) => {
        const provider = this.providers.get(channel);
        if (provider && provider.isConfigured()) {
          try {
            results[channel] = await provider.send(message);
          } catch (error) {
            console.error(`Notification failed for ${channel}:`, error);
            results[channel] = false;
          }
        } else {
          results[channel] = false;
        }
      })
    );

    return results;
  }

  getAvailableChannels(): Record<string, boolean> {
    const channels: Record<string, boolean> = {};

    this.providers.forEach((provider, name) => {
      channels[name] = provider.isConfigured();
    });

    return channels;
  }
}
```

---

## デプロイメント設計

### Docker設定

#### Dockerfile (Frontend)
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Dockerfile (Backend)
```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 8000

CMD ["npm", "start"]
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: ./workspace/frontend
    ports:
      - "3000:80"
    environment:
      - VITE_API_BASE_URL=http://localhost:8000
    depends_on:
      - backend

  backend:
    build: ./workspace/backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/websys
      - JWT_SECRET=your-secret-key
      - NODE_ENV=production
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=websys
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### 環境変数設定

#### Backend (.env)
```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/websys"

# JWT
JWT_SECRET="your-super-secret-jwt-key"

# Server
PORT=8000
NODE_ENV=development

# Slack Notification
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
SLACK_CHANNEL="#alerts"
SLACK_USERNAME="Log Monitor"
SLACK_ICON=":warning:"

# Email Notification
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="noreply@company.com"
EMAIL_TO="admin@company.com,ops@company.com"

# Teams Notification
TEAMS_WEBHOOK_URL="https://outlook.office.com/webhook/YOUR/TEAMS/WEBHOOK"
```

#### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=http://localhost:8000
```

### 本番環境考慮事項

#### パフォーマンス最適化
- **データベース**: インデックス最適化、コネクションプーリング
- **WebSocket**: Redis Adapter使用でスケーリング対応
- **フロントエンド**: Viteビルド最適化、CDN配信

#### セキュリティ強化
- **HTTPS**: SSL/TLS証明書設定
- **環境変数**: Docker Secrets使用
- **データベース**: アクセス制限、暗号化

#### 監視・ログ
- **アプリケーションログ**: 構造化ログ出力
- **メトリクス**: Prometheus/Grafana連携
- **ヘルスチェック**: Docker HEALTHCHECK設定

---

**ドキュメント更新日**: 2025年9月21日
**次回レビュー予定**: 2025年10月21日
# ログ管理機能詳細設計書

**機能名**: ログ収集・監視・分析システム
**バージョン**: v1.2.0
**作成日**: 2025年9月21日
**更新日**: 2025年9月21日

---

## 📋 目次

1. [概要](#概要)
2. [機能詳細](#機能詳細)
3. [データ設計](#データ設計)
4. [API設計](#api設計)
5. [WebSocket設計](#websocket設計)
6. [フロントエンド設計](#フロントエンド設計)
7. [パフォーマンス設計](#パフォーマンス設計)
8. [エラーハンドリング](#エラーハンドリング)

---

## 概要

### 機能目的
- 構造化ログの効率的な収集・保存・検索
- リアルタイムログ監視とライブ配信
- 高度な検索・フィルタリング機能
- ログデータの統計・分析機能

### 技術スタック
- **バックエンド**: Express.js + Prisma ORM + PostgreSQL
- **フロントエンド**: Vue.js 3 + Element Plus + WebSocket
- **リアルタイム通信**: Socket.IO
- **データベース**: PostgreSQL (インデックス最適化)

---

## 機能詳細

### F-LOG-001: ログ収集・保存

#### 機能概要
構造化されたログデータの収集・データベース保存

#### ログ構造
```typescript
interface LogEntry {
  id: number;              // 自動生成ID
  level: LogLevel;         // ログレベル
  category: LogCategory;   // カテゴリ
  message: string;         // メッセージ本文
  metadata?: object;       // 追加情報（JSON）
  traceId?: string;        // 分散トレーシングID
  sessionId?: string;      // セッションID
  userId?: number;         // ユーザーID
  timestamp: Date;         // ログ発生時刻
  createdAt: Date;         // DB保存時刻
}
```

#### 実装詳細
```typescript
// backend/src/services/logService.ts
export class LogService {
  async createLog(logData: CreateLogRequest, userId?: number): Promise<Log> {
    try {
      // ログデータ準備
      const logEntry = {
        ...logData,
        userId,
        timestamp: new Date(),
        // traceIdが未指定の場合は自動生成
        traceId: logData.traceId || this.generateTraceId()
      };

      // データベース保存
      const log = await prisma.log.create({
        data: logEntry,
        include: {
          user: {
            select: { id: true, username: true, name: true }
          }
        }
      });

      // WebSocketでリアルタイム配信
      this.broadcastLog(log);

      // アラート評価（非同期）
      this.evaluateAlerts(log).catch(error => {
        console.error('Alert evaluation error:', error);
      });

      return log;
    } catch (error) {
      console.error('Log creation error:', error);
      throw new Error('ログの作成に失敗しました');
    }
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private broadcastLog(log: Log) {
    // 全ユーザーに配信
    this.io.emit('log:new', log);

    // 重要なログは管理者のみに配信
    if (['ERROR', 'FATAL'].includes(log.level)) {
      this.io.to('admin').emit('log:critical', log);
    }

    // 特定カテゴリのログは専用チャンネルに配信
    this.io.to(`category:${log.category}`).emit('log:category', log);
  }
}
```

### F-LOG-002: ログ検索・フィルタリング

#### 高度検索機能
```typescript
// backend/src/services/logService.ts
export class LogService {
  async searchLogs(query: LogSearchQuery): Promise<LogSearchResult> {
    const {
      page = 1,
      pageSize = 20,
      level,
      category,
      startDate,
      endDate,
      message,
      traceId,
      userId,
      metadata
    } = query;

    // クエリ条件構築
    const where: any = {};

    // レベルフィルター（複数選択対応）
    if (level && level.length > 0) {
      where.level = { in: level };
    }

    // カテゴリフィルター（複数選択対応）
    if (category && category.length > 0) {
      where.category = { in: category };
    }

    // 日時範囲フィルター
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    // メッセージ検索（部分一致）
    if (message) {
      where.message = { contains: message, mode: 'insensitive' };
    }

    // トレースID完全一致
    if (traceId) {
      where.traceId = traceId;
    }

    // ユーザーID
    if (userId) {
      where.userId = userId;
    }

    // メタデータ検索（JSONBクエリ）
    if (metadata) {
      where.metadata = { path: Object.keys(metadata), equals: Object.values(metadata) };
    }

    try {
      // 総件数取得
      const total = await prisma.log.count({ where });

      // ページネーションでデータ取得
      const logs = await prisma.log.findMany({
        where,
        include: {
          user: {
            select: { id: true, username: true, name: true }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      return {
        data: logs,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      console.error('Log search error:', error);
      throw new Error('ログ検索中にエラーが発生しました');
    }
  }
}
```

### F-LOG-003: ログ統計・分析

#### 統計データ取得
```typescript
// backend/src/services/logService.ts
export class LogService {
  async getLogStatistics(query: StatsQuery): Promise<LogStatistics> {
    const {
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000), // デフォルト: 過去24時間
      endDate = new Date(),
      groupBy = 'hour'
    } = query;

    try {
      // 基本統計
      const [totalCount, levelStats, categoryStats] = await Promise.all([
        // 総件数
        prisma.log.count({
          where: {
            timestamp: { gte: startDate, lte: endDate }
          }
        }),

        // レベル別統計
        prisma.log.groupBy({
          by: ['level'],
          where: {
            timestamp: { gte: startDate, lte: endDate }
          },
          _count: { id: true }
        }),

        // カテゴリ別統計
        prisma.log.groupBy({
          by: ['category'],
          where: {
            timestamp: { gte: startDate, lte: endDate }
          },
          _count: { id: true }
        })
      ]);

      // 時系列統計（PostgreSQL date_trunc使用）
      const timelineStats = await this.getTimelineStatistics(startDate, endDate, groupBy);

      // レスポンス整形
      const byLevel = levelStats.reduce((acc, item) => {
        acc[item.level] = item._count.id;
        return acc;
      }, {} as Record<LogLevel, number>);

      const byCategory = categoryStats.reduce((acc, item) => {
        acc[item.category] = item._count.id;
        return acc;
      }, {} as Record<LogCategory, number>);

      return {
        total: totalCount,
        byLevel,
        byCategory,
        timeline: timelineStats
      };
    } catch (error) {
      console.error('Log statistics error:', error);
      throw new Error('ログ統計取得中にエラーが発生しました');
    }
  }

  private async getTimelineStatistics(
    startDate: Date,
    endDate: Date,
    groupBy: 'hour' | 'day' | 'week'
  ): Promise<TimelineStats[]> {
    const dateFormat = {
      hour: 'YYYY-MM-DD HH24:00:00',
      day: 'YYYY-MM-DD',
      week: 'YYYY-"W"WW'
    }[groupBy];

    const result = await prisma.$queryRaw`
      SELECT
        DATE_TRUNC(${groupBy}, timestamp) as period,
        COUNT(*)::int as count,
        COUNT(CASE WHEN level = 'ERROR' THEN 1 END)::int as error_count,
        COUNT(CASE WHEN level = 'WARN' THEN 1 END)::int as warn_count,
        COUNT(CASE WHEN level = 'INFO' THEN 1 END)::int as info_count
      FROM "Log"
      WHERE timestamp >= ${startDate} AND timestamp <= ${endDate}
      GROUP BY DATE_TRUNC(${groupBy}, timestamp)
      ORDER BY period
    ` as any[];

    return result.map(row => ({
      period: row.period.toISOString(),
      count: row.count,
      byLevel: {
        ERROR: row.error_count,
        WARN: row.warn_count,
        INFO: row.info_count
      }
    }));
  }
}
```

### F-LOG-004: ログエクスポート

#### データエクスポート機能
```typescript
// backend/src/routes/logs.ts
export const exportLogs = async (req: Request, res: Response) => {
  try {
    const { format = 'json', ...searchQuery } = req.query;

    // 大量データ対応のためストリーミング
    const logs = await logService.searchLogsStream(searchQuery as any);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="logs.csv"');

      // CSV ヘッダー
      res.write('ID,Level,Category,Message,Timestamp,User,TraceID\n');

      for await (const log of logs) {
        const csvRow = [
          log.id,
          log.level,
          log.category,
          `"${log.message.replace(/"/g, '""')}"`,
          log.timestamp.toISOString(),
          log.user?.name || '',
          log.traceId || ''
        ].join(',');
        res.write(csvRow + '\n');
      }
    } else {
      // JSON形式
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="logs.json"');

      res.write('[');
      let first = true;

      for await (const log of logs) {
        if (!first) res.write(',');
        res.write(JSON.stringify(log));
        first = false;
      }
      res.write(']');
    }

    res.end();
  } catch (error) {
    console.error('Export logs error:', error);
    res.status(500).json({
      error: 'Export failed',
      message: 'ログエクスポート中にエラーが発生しました'
    });
  }
};
```

---

## データ設計

### ログレベル定義
```typescript
enum LogLevel {
  TRACE = 'TRACE',    // デバッグ用詳細情報
  DEBUG = 'DEBUG',    // デバッグ情報
  INFO = 'INFO',      // 一般情報
  WARN = 'WARN',      // 警告
  ERROR = 'ERROR',    // エラー
  FATAL = 'FATAL'     // 致命的エラー
}
```

### ログカテゴリ定義
```typescript
enum LogCategory {
  AUTH = 'AUTH',      // 認証関連
  API = 'API',        // API呼び出し
  DB = 'DB',          // データベース操作
  SEC = 'SEC',        // セキュリティ
  SYS = 'SYS',        // システム
  USER = 'USER',      // ユーザー操作
  PERF = 'PERF',      // パフォーマンス
  ERR = 'ERR'         // エラー処理
}
```

### データベーステーブル設計

```sql
CREATE TABLE "Log" (
  id              SERIAL PRIMARY KEY,
  level           VARCHAR(50) NOT NULL,
  category        VARCHAR(50) NOT NULL,
  message         TEXT NOT NULL,
  metadata        JSONB,
  traceId         VARCHAR(255),
  sessionId       VARCHAR(255),
  userId          INTEGER REFERENCES "User"(id),
  timestamp       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- パフォーマンス最適化インデックス
CREATE INDEX idx_log_level ON "Log"(level);
CREATE INDEX idx_log_category ON "Log"(category);
CREATE INDEX idx_log_timestamp ON "Log"(timestamp DESC);
CREATE INDEX idx_log_userId ON "Log"(userId);
CREATE INDEX idx_log_traceId ON "Log"(traceId);
CREATE INDEX idx_log_composite ON "Log"(level, category, timestamp);
CREATE INDEX idx_log_metadata ON "Log" USING GIN(metadata);

-- 全文検索インデックス
CREATE INDEX idx_log_message_fulltext ON "Log" USING GIN(to_tsvector('english', message));
```

---

## API設計

### エンドポイント一覧

| メソッド | エンドポイント | 説明 | 認証 | 権限 |
|---------|--------------|------|------|------|
| GET | `/api/logs` | ログ一覧取得 | ✓ | - |
| POST | `/api/logs` | ログ作成 | ✓ | - |
| GET | `/api/logs/:id` | ログ詳細取得 | ✓ | - |
| GET | `/api/logs/stats` | ログ統計取得 | ✓ | - |
| GET | `/api/logs/export` | ログエクスポート | ✓ | - |

### API詳細仕様

#### GET /api/logs

**Query Parameters:**
```typescript
interface LogsQuery {
  page?: number;           // ページ番号（デフォルト: 1）
  pageSize?: number;       // 1ページあたりの件数（デフォルト: 20, 最大: 100）
  level?: LogLevel[];      // ログレベル（複数選択可）
  category?: LogCategory[]; // カテゴリ（複数選択可）
  startDate?: string;      // 開始日時（ISO 8601形式）
  endDate?: string;        // 終了日時（ISO 8601形式）
  message?: string;        // メッセージ検索（部分一致）
  traceId?: string;        // トレースID（完全一致）
  userId?: number;         // ユーザーID
  sort?: 'asc' | 'desc';   // ソート順（デフォルト: desc）
}
```

**Response:**
```typescript
interface LogsResponse {
  data: Log[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
```

#### POST /api/logs

**Request:**
```typescript
interface CreateLogRequest {
  level: LogLevel;
  category: LogCategory;
  message: string;
  metadata?: Record<string, any>;
  traceId?: string;
  sessionId?: string;
}
```

**Response:**
```typescript
interface CreateLogResponse {
  id: number;
  message: string;
  log: Log;
}
```

---

## WebSocket設計

### リアルタイムログ配信

```typescript
// backend/src/websocket/logEvents.ts
export class LogWebSocketHandler {
  constructor(private io: Server) {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      // フィルター設定
      socket.on('log:subscribe', (filters: LogFilters) => {
        this.subscribeToLogs(socket, filters);
      });

      // フィルター解除
      socket.on('log:unsubscribe', () => {
        this.unsubscribeFromLogs(socket);
      });

      // ライブモード切り替え
      socket.on('log:setLiveMode', (enabled: boolean) => {
        socket.data.liveMode = enabled;
      });
    });
  }

  private subscribeToLogs(socket: any, filters: LogFilters) {
    socket.data.logFilters = filters;

    // カテゴリ別ルーム参加
    if (filters.categories) {
      filters.categories.forEach(category => {
        socket.join(`category:${category}`);
      });
    }

    // レベル別ルーム参加
    if (filters.levels) {
      filters.levels.forEach(level => {
        socket.join(`level:${level}`);
      });
    }
  }

  public broadcastLog(log: Log) {
    // 全体配信
    this.io.emit('log:new', log);

    // フィルター別配信
    this.io.to(`category:${log.category}`).emit('log:category', log);
    this.io.to(`level:${log.level}`).emit('log:level', log);

    // 重要ログは管理者のみ
    if (['ERROR', 'FATAL'].includes(log.level)) {
      this.io.to('admin').emit('log:critical', log);
    }
  }
}
```

### フロントエンド WebSocket クライアント

```typescript
// frontend/src/composables/useLogWebSocket.ts
export const useLogWebSocket = () => {
  const { socket, isConnected } = useWebSocket();
  const logsStore = useLogsStore();

  const subscribeToLogs = (filters: LogFilters) => {
    if (!socket.value) return;

    socket.value.emit('log:subscribe', filters);
  };

  const unsubscribeFromLogs = () => {
    if (!socket.value) return;

    socket.value.emit('log:unsubscribe');
  };

  const setLiveMode = (enabled: boolean) => {
    if (!socket.value) return;

    socket.value.emit('log:setLiveMode', enabled);
  };

  // イベントリスナー設定
  onMounted(() => {
    if (!socket.value) return;

    socket.value.on('log:new', (log: Log) => {
      logsStore.addRealTimeLog(log);
    });

    socket.value.on('log:critical', (log: Log) => {
      // 重要ログの通知表示
      ElNotification({
        title: '重要ログ',
        message: log.message,
        type: 'error',
        duration: 0
      });
    });
  });

  return {
    subscribeToLogs,
    unsubscribeFromLogs,
    setLiveMode,
    isConnected
  };
};
```

---

## フロントエンド設計

### Logs Store (Pinia)

```typescript
// frontend/src/stores/logs.ts
interface LogsState {
  logs: Log[];
  loading: boolean;
  filters: LogFilters;
  pagination: PaginationInfo;
  realTimeEnabled: boolean;
  statistics: LogStatistics | null;
}

export const useLogsStore = defineStore('logs', {
  state: (): LogsState => ({
    logs: [],
    loading: false,
    filters: {
      level: [],
      category: [],
      dateRange: null,
      message: '',
      traceId: ''
    },
    pagination: {
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0
    },
    realTimeEnabled: true,
    statistics: null
  }),

  getters: {
    filteredLogs: (state) => {
      if (!state.realTimeEnabled) return state.logs;

      return state.logs.filter(log => {
        // フィルター適用
        if (state.filters.level.length > 0 && !state.filters.level.includes(log.level)) {
          return false;
        }

        if (state.filters.category.length > 0 && !state.filters.category.includes(log.category)) {
          return false;
        }

        if (state.filters.message && !log.message.toLowerCase().includes(state.filters.message.toLowerCase())) {
          return false;
        }

        return true;
      });
    },

    logLevelCounts: (state) => {
      const counts = {
        TRACE: 0, DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, FATAL: 0
      };

      state.logs.forEach(log => {
        counts[log.level]++;
      });

      return counts;
    }
  },

  actions: {
    async fetchLogs() {
      this.loading = true;
      try {
        const response = await logsAPI.getLogs({
          ...this.filters,
          page: this.pagination.page,
          pageSize: this.pagination.pageSize
        });

        this.logs = response.data;
        this.pagination = response.pagination;
      } catch (error) {
        console.error('Fetch logs error:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchStatistics() {
      try {
        this.statistics = await logsAPI.getStatistics();
      } catch (error) {
        console.error('Fetch statistics error:', error);
      }
    },

    addRealTimeLog(log: Log) {
      if (!this.realTimeEnabled) return;

      this.logs.unshift(log);

      // メモリ使用量制限
      if (this.logs.length > 1000) {
        this.logs = this.logs.slice(0, 1000);
      }
    },

    setFilters(filters: Partial<LogFilters>) {
      Object.assign(this.filters, filters);
    },

    setRealTimeEnabled(enabled: boolean) {
      this.realTimeEnabled = enabled;
    },

    clearLogs() {
      this.logs = [];
    }
  }
});
```

### ログ監視コンポーネント

```vue
<!-- frontend/src/views/LogMonitoring.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useLogsStore } from '@/stores/logs'
import { useLogWebSocket } from '@/composables/useLogWebSocket'

const logsStore = useLogsStore()
const { subscribeToLogs, setLiveMode, isConnected } = useLogWebSocket()

const autoScroll = ref(true)
const tableRef = ref()

// リアルタイム更新の監視
watchEffect(() => {
  if (autoScroll.value && logsStore.logs.length > 0) {
    nextTick(() => {
      tableRef.value?.scrollToBottom?.()
    })
  }
})

// フィルター変更時のWebSocket再購読
watch(() => logsStore.filters, (newFilters) => {
  if (isConnected.value) {
    subscribeToLogs(newFilters)
  }
}, { deep: true })

onMounted(async () => {
  // 初期データ取得
  await logsStore.fetchLogs()
  await logsStore.fetchStatistics()

  // WebSocket購読開始
  if (isConnected.value) {
    subscribeToLogs(logsStore.filters)
    setLiveMode(logsStore.realTimeEnabled)
  }
})

const handleRealTimeToggle = (enabled: boolean) => {
  logsStore.setRealTimeEnabled(enabled)
  setLiveMode(enabled)
}

const handleExport = async (format: 'json' | 'csv') => {
  try {
    const url = await logsAPI.exportLogs({
      ...logsStore.filters,
      format
    })

    // ダウンロード処理
    const link = document.createElement('a')
    link.href = url
    link.download = `logs.${format}`
    link.click()
  } catch (error) {
    ElMessage.error('エクスポートに失敗しました')
  }
}
</script>
```

---

## パフォーマンス設計

### データベース最適化

1. **インデックス戦略**
   ```sql
   -- 複合インデックス（よく使われる組み合わせ）
   CREATE INDEX idx_log_level_timestamp ON "Log"(level, timestamp DESC);
   CREATE INDEX idx_log_category_timestamp ON "Log"(category, timestamp DESC);
   CREATE INDEX idx_log_user_timestamp ON "Log"(userId, timestamp DESC);

   -- 部分インデックス（アクティブなログのみ）
   CREATE INDEX idx_log_recent ON "Log"(timestamp DESC)
   WHERE timestamp > NOW() - INTERVAL '30 days';
   ```

2. **パーティショニング**
   ```sql
   -- 月別パーティション（PostgreSQL 10+）
   CREATE TABLE log_y2025m01 PARTITION OF "Log"
   FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
   ```

3. **自動アーカイブ**
   ```sql
   -- 古いログの自動削除（例: 90日以上前）
   DELETE FROM "Log" WHERE timestamp < NOW() - INTERVAL '90 days';
   ```

### WebSocket最適化

1. **バッチ配信**
   ```typescript
   class LogBatchProcessor {
     private batch: Log[] = [];
     private batchTimeout: NodeJS.Timeout | null = null;

     addLog(log: Log) {
       this.batch.push(log);

       if (this.batch.length >= 10) {
         this.flushBatch();
       } else if (!this.batchTimeout) {
         this.batchTimeout = setTimeout(() => this.flushBatch(), 1000);
       }
     }

     private flushBatch() {
       if (this.batch.length > 0) {
         this.io.emit('log:batch', this.batch);
         this.batch = [];
       }

       if (this.batchTimeout) {
         clearTimeout(this.batchTimeout);
         this.batchTimeout = null;
       }
     }
   }
   ```

2. **接続プーリング**
   ```typescript
   // Redis Adapter使用でスケーリング対応
   import { createAdapter } from '@socket.io/redis-adapter';
   import { createClient } from 'redis';

   const pubClient = createClient({ url: 'redis://localhost:6379' });
   const subClient = pubClient.duplicate();

   io.adapter(createAdapter(pubClient, subClient));
   ```

---

## エラーハンドリング

### エラーコード定義

| コード | 説明 | HTTPステータス |
|--------|------|---------------|
| E-LOG-001 | ログ作成失敗 | 500 |
| E-LOG-002 | ログ検索失敗 | 500 |
| E-LOG-003 | 統計取得失敗 | 500 |
| E-LOG-004 | エクスポート失敗 | 500 |
| E-LOG-005 | 無効なフィルター | 400 |

### エラーハンドリング実装

```typescript
// backend/src/middleware/errorHandler.ts
export const logErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // ログエラーを別システムに記録
  console.error('Log system error:', {
    error: error.message,
    stack: error.stack,
    request: {
      method: req.method,
      url: req.url,
      body: req.body,
      query: req.query
    },
    user: req.user
  });

  // エラーレスポンス
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'リクエストパラメータが無効です',
      details: error.message
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: 'ログ処理中にエラーが発生しました'
  });
};
```

---

**ドキュメント作成日**: 2025年9月21日
**次回レビュー予定**: 2025年10月21日
**関連ドキュメント**:
- アラート管理機能設計書
- WebSocket通信設計書
- データベース設計書
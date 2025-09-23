# アラートシステム詳細設計書

**機能名**: アラートルール管理・通知システム
**バージョン**: v1.2.0
**作成日**: 2025年9月21日
**更新日**: 2025年9月21日

---

## 📋 目次

1. [概要](#概要)
2. [機能詳細](#機能詳細)
3. [データ設計](#データ設計)
4. [API設計](#api設計)
5. [アラート評価エンジン](#アラート評価エンジン)
6. [通知システム](#通知システム)
7. [フロントエンド設計](#フロントエンド設計)
8. [パフォーマンス設計](#パフォーマンス設計)

---

## 概要

### 機能目的
- カスタマイズ可能なアラートルールの設定・管理
- リアルタイムログ評価による自動アラート生成
- 多チャンネル通知（Slack・Email・Teams）
- アラート履歴管理と分析

### 技術スタック
- **バックエンド**: Express.js + Prisma ORM + Node.js
- **フロントエンド**: Vue.js 3 + Element Plus
- **通知**: Slack Webhook + SMTP + Teams Webhook
- **評価エンジン**: リアルタイム並列処理

---

## 機能詳細

### F-ALERT-001: アラートルール管理

#### 機能概要
アラート条件の作成・編集・削除・有効化/無効化

#### アラートルール構造
```typescript
interface AlertRule {
  id: number;
  name: string;
  description?: string;
  conditions: AlertConditions;
  thresholdCount: number;     // 閾値カウント
  timeWindow: number;         // 時間窓（分）
  isActive: boolean;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AlertConditions {
  levels?: LogLevel[];        // 対象ログレベル
  categories?: LogCategory[]; // 対象カテゴリ
  messagePattern?: string;    // メッセージパターン（正規表現対応）
  metadata?: Record<string, any>; // メタデータ条件
  userIds?: number[];         // 対象ユーザーID
}
```

#### 実装詳細
```typescript
// backend/src/services/alertRuleService.ts
export class AlertRuleService {
  async createAlertRule(data: CreateAlertRuleRequest, createdBy: number): Promise<AlertRule> {
    try {
      // 条件の妥当性検証
      this.validateConditions(data.conditions);

      const alertRule = await prisma.alertRule.create({
        data: {
          ...data,
          createdBy,
          conditions: data.conditions as any // JSONBとして保存
        },
        include: {
          creator: {
            select: { id: true, name: true, username: true }
          }
        }
      });

      // ログ記録
      await this.logService.createLog({
        level: 'INFO',
        category: 'SYS',
        message: `Alert rule "${alertRule.name}" created`,
        userId: createdBy,
        metadata: { alertRuleId: alertRule.id }
      });

      return alertRule;
    } catch (error) {
      console.error('Create alert rule error:', error);
      throw new Error('アラートルールの作成に失敗しました');
    }
  }

  async updateAlertRule(id: number, data: UpdateAlertRuleRequest, userId: number): Promise<AlertRule> {
    try {
      // 既存ルール確認
      const existingRule = await prisma.alertRule.findUnique({
        where: { id }
      });

      if (!existingRule) {
        throw new Error('アラートルールが見つかりません');
      }

      // 条件の妥当性検証
      if (data.conditions) {
        this.validateConditions(data.conditions);
      }

      const updatedRule = await prisma.alertRule.update({
        where: { id },
        data: {
          ...data,
          conditions: data.conditions as any,
          updatedAt: new Date()
        },
        include: {
          creator: {
            select: { id: true, name: true, username: true }
          }
        }
      });

      // ログ記録
      await this.logService.createLog({
        level: 'INFO',
        category: 'SYS',
        message: `Alert rule "${updatedRule.name}" updated`,
        userId,
        metadata: { alertRuleId: id, changes: data }
      });

      return updatedRule;
    } catch (error) {
      console.error('Update alert rule error:', error);
      throw new Error('アラートルールの更新に失敗しました');
    }
  }

  private validateConditions(conditions: AlertConditions) {
    // メッセージパターンの正規表現検証
    if (conditions.messagePattern) {
      try {
        new RegExp(conditions.messagePattern);
      } catch (error) {
        throw new Error('無効な正規表現パターンです');
      }
    }

    // ログレベルの妥当性検証
    if (conditions.levels) {
      const validLevels = Object.values(LogLevel);
      const invalidLevels = conditions.levels.filter(level => !validLevels.includes(level));
      if (invalidLevels.length > 0) {
        throw new Error(`無効なログレベル: ${invalidLevels.join(', ')}`);
      }
    }

    // カテゴリの妥当性検証
    if (conditions.categories) {
      const validCategories = Object.values(LogCategory);
      const invalidCategories = conditions.categories.filter(cat => !validCategories.includes(cat));
      if (invalidCategories.length > 0) {
        throw new Error(`無効なカテゴリ: ${invalidCategories.join(', ')}`);
      }
    }
  }
}
```

### F-ALERT-002: アラート評価エンジン

#### リアルタイム評価機能
```typescript
// backend/src/services/alertEvaluationService.ts
export class AlertEvaluationService {
  private activeRules: Map<number, AlertRule> = new Map();
  private logBuffer: Map<number, Log[]> = new Map(); // ルールIDごとのログバッファ

  constructor(
    private alertRuleService: AlertRuleService,
    private notificationService: NotificationService
  ) {
    this.loadActiveRules();
  }

  async evaluateLog(log: Log): Promise<void> {
    // アクティブなルールに対して並列評価
    const evaluationPromises = Array.from(this.activeRules.values()).map(rule =>
      this.evaluateRuleForLog(rule, log)
    );

    await Promise.allSettled(evaluationPromises);
  }

  private async evaluateRuleForLog(rule: AlertRule, log: Log): Promise<void> {
    try {
      // 条件マッチング
      if (!this.matchesConditions(rule.conditions, log)) {
        return;
      }

      // ログバッファに追加
      if (!this.logBuffer.has(rule.id)) {
        this.logBuffer.set(rule.id, []);
      }

      const buffer = this.logBuffer.get(rule.id)!;
      buffer.push(log);

      // 時間窓外のログを削除
      const timeThreshold = new Date(Date.now() - rule.timeWindow * 60 * 1000);
      const filteredBuffer = buffer.filter(bufferedLog =>
        bufferedLog.timestamp >= timeThreshold
      );
      this.logBuffer.set(rule.id, filteredBuffer);

      // 閾値チェック
      if (filteredBuffer.length >= rule.thresholdCount) {
        await this.triggerAlert(rule, filteredBuffer);

        // バッファクリア（重複アラート防止）
        this.logBuffer.set(rule.id, []);
      }
    } catch (error) {
      console.error(`Alert evaluation error for rule ${rule.id}:`, error);
    }
  }

  private matchesConditions(conditions: AlertConditions, log: Log): boolean {
    // ログレベルチェック
    if (conditions.levels && conditions.levels.length > 0) {
      if (!conditions.levels.includes(log.level)) {
        return false;
      }
    }

    // カテゴリチェック
    if (conditions.categories && conditions.categories.length > 0) {
      if (!conditions.categories.includes(log.category)) {
        return false;
      }
    }

    // メッセージパターンチェック
    if (conditions.messagePattern) {
      try {
        const regex = new RegExp(conditions.messagePattern, 'i');
        if (!regex.test(log.message)) {
          return false;
        }
      } catch (error) {
        console.error('Invalid regex pattern:', conditions.messagePattern);
        return false;
      }
    }

    // ユーザーIDチェック
    if (conditions.userIds && conditions.userIds.length > 0) {
      if (!log.userId || !conditions.userIds.includes(log.userId)) {
        return false;
      }
    }

    // メタデータチェック
    if (conditions.metadata) {
      if (!log.metadata) return false;

      for (const [key, expectedValue] of Object.entries(conditions.metadata)) {
        if (log.metadata[key] !== expectedValue) {
          return false;
        }
      }
    }

    return true;
  }

  private async triggerAlert(rule: AlertRule, triggeringLogs: Log[]): Promise<void> {
    try {
      // アラート作成
      const alert = await this.createAlert(rule, triggeringLogs);

      // 通知送信
      await this.sendNotifications(alert);

      // WebSocketでリアルタイム通知
      this.broadcastAlert(alert);

    } catch (error) {
      console.error('Alert trigger error:', error);
    }
  }

  private async createAlert(rule: AlertRule, logs: Log[]): Promise<Alert> {
    const alertMessage = this.generateAlertMessage(rule, logs);

    return await prisma.alert.create({
      data: {
        ruleId: rule.id,
        ruleName: rule.name,
        message: alertMessage,
        level: this.determineAlertLevel(logs),
        metadata: {
          triggeringLogIds: logs.map(log => log.id),
          logCount: logs.length,
          timeWindow: rule.timeWindow,
          threshold: rule.thresholdCount
        },
        notificationSent: false
      }
    });
  }

  private generateAlertMessage(rule: AlertRule, logs: Log[]): string {
    const logCount = logs.length;
    const timeWindow = rule.timeWindow;
    const uniqueLevels = [...new Set(logs.map(log => log.level))];
    const uniqueCategories = [...new Set(logs.map(log => log.category))];

    return `アラート: ${rule.name}\n` +
           `${timeWindow}分間で${logCount}件のログが閾値(${rule.thresholdCount})を超えました\n` +
           `レベル: ${uniqueLevels.join(', ')}\n` +
           `カテゴリ: ${uniqueCategories.join(', ')}\n` +
           `最新ログ: ${logs[logs.length - 1].message}`;
  }

  private determineAlertLevel(logs: Log[]): string {
    // 最も重要なログレベルを選択
    const levelPriority = { FATAL: 5, ERROR: 4, WARN: 3, INFO: 2, DEBUG: 1, TRACE: 0 };

    let maxPriority = 0;
    let alertLevel = 'info';

    logs.forEach(log => {
      const priority = levelPriority[log.level] || 0;
      if (priority > maxPriority) {
        maxPriority = priority;
        alertLevel = priority >= 4 ? 'critical' : priority >= 3 ? 'error' : 'warning';
      }
    });

    return alertLevel;
  }
}
```

### F-ALERT-003: アラートテスト機能

```typescript
// backend/src/services/alertRuleService.ts
export class AlertRuleService {
  async testAlertRule(ruleId: number, userId: number): Promise<TestAlertResult> {
    try {
      const rule = await prisma.alertRule.findUnique({
        where: { id: ruleId }
      });

      if (!rule) {
        throw new Error('アラートルールが見つかりません');
      }

      // テスト用の模擬ログを生成
      const testLogs = this.generateTestLogs(rule);

      // テスト評価実行
      const wouldTrigger = testLogs.length >= rule.thresholdCount;

      // テスト通知送信
      if (wouldTrigger) {
        const testAlert = {
          id: 0,
          ruleId: rule.id,
          ruleName: rule.name,
          message: `テスト通知: ${rule.name}のアラート条件が満たされました`,
          level: 'info',
          metadata: { isTest: true },
          notificationSent: false,
          createdAt: new Date()
        };

        await this.notificationService.sendTestNotification(testAlert);
      }

      // ログ記録
      await this.logService.createLog({
        level: 'INFO',
        category: 'SYS',
        message: `Alert rule "${rule.name}" tested`,
        userId,
        metadata: {
          alertRuleId: ruleId,
          testResult: wouldTrigger ? 'triggered' : 'not_triggered',
          testLogCount: testLogs.length
        }
      });

      return {
        success: true,
        wouldTrigger,
        testLogCount: testLogs.length,
        message: wouldTrigger
          ? 'アラート条件が満たされ、テスト通知を送信しました'
          : 'アラート条件が満たされませんでした'
      };

    } catch (error) {
      console.error('Test alert rule error:', error);
      throw new Error('アラートルールのテストに失敗しました');
    }
  }

  private generateTestLogs(rule: AlertRule): Log[] {
    const testLogs: Log[] = [];
    const now = new Date();

    // ルール条件に基づいてテストログを生成
    for (let i = 0; i < rule.thresholdCount; i++) {
      const testLog = {
        id: Date.now() + i,
        level: rule.conditions.levels?.[0] || 'ERROR',
        category: rule.conditions.categories?.[0] || 'SYS',
        message: `テストログメッセージ ${i + 1}`,
        metadata: rule.conditions.metadata || {},
        traceId: `test_trace_${i}`,
        sessionId: `test_session`,
        userId: rule.conditions.userIds?.[0] || 1,
        timestamp: new Date(now.getTime() - i * 1000),
        createdAt: new Date()
      } as Log;

      testLogs.push(testLog);
    }

    return testLogs;
  }
}
```

---

## データ設計

### アラートルールテーブル
```sql
CREATE TABLE "AlertRule" (
  id              SERIAL PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  conditions      JSONB NOT NULL,          -- アラート条件
  thresholdCount  INTEGER NOT NULL,        -- 閾値カウント
  timeWindow      INTEGER NOT NULL,        -- 時間窓（分）
  isActive        BOOLEAN NOT NULL DEFAULT true,
  createdBy       INTEGER REFERENCES "User"(id),
  createdAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_alertrule_isActive ON "AlertRule"(isActive);
CREATE INDEX idx_alertrule_createdBy ON "AlertRule"(createdBy);
CREATE INDEX idx_alertrule_conditions ON "AlertRule" USING GIN(conditions);
```

### アラート履歴テーブル
```sql
CREATE TABLE "Alert" (
  id              SERIAL PRIMARY KEY,
  ruleId          INTEGER REFERENCES "AlertRule"(id),
  ruleName        VARCHAR(255) NOT NULL,
  message         TEXT NOT NULL,
  level           VARCHAR(50) NOT NULL,    -- info, warning, error, critical
  metadata        JSONB,
  notificationSent BOOLEAN NOT NULL DEFAULT false,
  notificationChannels JSONB,              -- 送信チャンネル記録
  resolvedAt      TIMESTAMP,
  resolvedBy      INTEGER REFERENCES "User"(id),
  createdAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_alert_ruleId ON "Alert"(ruleId);
CREATE INDEX idx_alert_level ON "Alert"(level);
CREATE INDEX idx_alert_createdAt ON "Alert"(createdAt DESC);
CREATE INDEX idx_alert_notificationSent ON "Alert"(notificationSent);
CREATE INDEX idx_alert_resolvedAt ON "Alert"(resolvedAt);
```

### アラート条件定義
```typescript
interface AlertConditions {
  levels?: LogLevel[];                    // 対象ログレベル
  categories?: LogCategory[];             // 対象カテゴリ
  messagePattern?: string;                // メッセージパターン（正規表現）
  metadata?: Record<string, any>;         // メタデータ条件
  userIds?: number[];                     // 対象ユーザーID
  excludePatterns?: string[];             // 除外パターン
  severityThreshold?: number;             // 重要度閾値
}
```

---

## API設計

### エンドポイント一覧

| メソッド | エンドポイント | 説明 | 認証 | 権限 |
|---------|--------------|------|------|------|
| GET | `/api/alert-rules` | アラートルール一覧 | ✓ | - |
| POST | `/api/alert-rules` | アラートルール作成 | ✓ | ADMIN |
| GET | `/api/alert-rules/:id` | アラートルール詳細 | ✓ | - |
| PUT | `/api/alert-rules/:id` | アラートルール更新 | ✓ | ADMIN |
| DELETE | `/api/alert-rules/:id` | アラートルール削除 | ✓ | ADMIN |
| POST | `/api/alert-rules/:id/test` | アラートルールテスト | ✓ | ADMIN |
| GET | `/api/alerts` | アラート履歴一覧 | ✓ | - |
| PUT | `/api/alerts/:id/resolve` | アラート解決 | ✓ | ADMIN |

### API詳細仕様

#### POST /api/alert-rules

**Request:**
```typescript
interface CreateAlertRuleRequest {
  name: string;
  description?: string;
  conditions: AlertConditions;
  thresholdCount: number;      // 1以上
  timeWindow: number;          // 1以上（分）
  isActive?: boolean;
}
```

**Response:**
```typescript
interface CreateAlertRuleResponse {
  id: number;
  message: string;
  alertRule: AlertRule;
}
```

#### GET /api/alert-rules

**Query Parameters:**
```typescript
interface AlertRulesQuery {
  page?: number;
  pageSize?: number;
  isActive?: boolean;
  createdBy?: number;
  search?: string;             // 名前・説明での検索
}
```

**Response:**
```typescript
interface AlertRulesResponse {
  data: AlertRule[];
  pagination: PaginationInfo;
  statistics: {
    total: number;
    active: number;
    inactive: number;
  };
}
```

---

## アラート評価エンジン

### 評価アルゴリズム

```typescript
// backend/src/services/alertEvaluationEngine.ts
export class AlertEvaluationEngine {
  private static instance: AlertEvaluationEngine;
  private ruleCache: Map<number, AlertRule> = new Map();
  private logBuffers: Map<number, CircularBuffer<Log>> = new Map();

  static getInstance(): AlertEvaluationEngine {
    if (!AlertEvaluationEngine.instance) {
      AlertEvaluationEngine.instance = new AlertEvaluationEngine();
    }
    return AlertEvaluationEngine.instance;
  }

  async initialize() {
    // アクティブなルールをロード
    await this.loadActiveRules();

    // 定期的なルール更新
    setInterval(() => this.loadActiveRules(), 60000); // 1分ごと
  }

  private async loadActiveRules() {
    try {
      const activeRules = await prisma.alertRule.findMany({
        where: { isActive: true }
      });

      // キャッシュ更新
      this.ruleCache.clear();
      this.logBuffers.clear();

      activeRules.forEach(rule => {
        this.ruleCache.set(rule.id, rule);
        this.logBuffers.set(rule.id, new CircularBuffer<Log>(rule.thresholdCount * 2));
      });

      console.log(`Loaded ${activeRules.length} active alert rules`);
    } catch (error) {
      console.error('Failed to load alert rules:', error);
    }
  }

  async processLog(log: Log): Promise<void> {
    const evaluationPromises: Promise<void>[] = [];

    // 各ルールに対して並列評価
    for (const [ruleId, rule] of this.ruleCache) {
      evaluationPromises.push(this.evaluateLogForRule(log, rule));
    }

    // すべての評価を並列実行
    await Promise.allSettled(evaluationPromises);
  }

  private async evaluateLogForRule(log: Log, rule: AlertRule): Promise<void> {
    try {
      // 条件マッチング
      if (!this.matchesConditions(rule.conditions as AlertConditions, log)) {
        return;
      }

      // ログバッファに追加
      const buffer = this.logBuffers.get(rule.id)!;
      buffer.add(log);

      // 時間窓内のログを取得
      const windowStart = new Date(Date.now() - rule.timeWindow * 60 * 1000);
      const logsInWindow = buffer.getAll().filter(l => l.timestamp >= windowStart);

      // 閾値チェック
      if (logsInWindow.length >= rule.thresholdCount) {
        await this.triggerAlert(rule, logsInWindow);

        // クールダウン（5分間は同じルールでアラート生成しない）
        this.setCooldown(rule.id, 5 * 60 * 1000);
      }
    } catch (error) {
      console.error(`Error evaluating rule ${rule.id}:`, error);
    }
  }

  private cooldowns: Map<number, number> = new Map();

  private setCooldown(ruleId: number, duration: number) {
    this.cooldowns.set(ruleId, Date.now() + duration);
  }

  private isInCooldown(ruleId: number): boolean {
    const cooldownEnd = this.cooldowns.get(ruleId);
    if (!cooldownEnd) return false;

    if (Date.now() > cooldownEnd) {
      this.cooldowns.delete(ruleId);
      return false;
    }

    return true;
  }
}

// 循環バッファ実装
class CircularBuffer<T> {
  private items: T[] = [];
  private head = 0;
  private size = 0;

  constructor(private capacity: number) {}

  add(item: T) {
    if (this.size < this.capacity) {
      this.items.push(item);
      this.size++;
    } else {
      this.items[this.head] = item;
      this.head = (this.head + 1) % this.capacity;
    }
  }

  getAll(): T[] {
    if (this.size < this.capacity) {
      return [...this.items];
    }

    return [
      ...this.items.slice(this.head),
      ...this.items.slice(0, this.head)
    ];
  }
}
```

---

## 通知システム

### 通知マネージャー

```typescript
// backend/src/services/notificationManager.ts
export class NotificationManager {
  private providers: Map<string, NotificationProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    this.providers.set('slack', new SlackProvider());
    this.providers.set('email', new EmailProvider());
    this.providers.set('teams', new TeamsProvider());
  }

  async sendAlertNotification(alert: Alert): Promise<NotificationResult> {
    const results: Record<string, boolean> = {};
    const errors: Record<string, string> = {};

    // 設定された通知チャンネルを取得
    const channels = await this.getActiveChannels();

    // 並列通知送信
    const notificationPromises = channels.map(async (channel) => {
      const provider = this.providers.get(channel);
      if (!provider?.isConfigured()) {
        results[channel] = false;
        errors[channel] = 'Provider not configured';
        return;
      }

      try {
        const message = this.formatAlertMessage(alert, channel);
        const success = await provider.send(message);
        results[channel] = success;
      } catch (error) {
        results[channel] = false;
        errors[channel] = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Notification failed for ${channel}:`, error);
      }
    });

    await Promise.allSettled(notificationPromises);

    // 通知結果を記録
    await prisma.alert.update({
      where: { id: alert.id },
      data: {
        notificationSent: Object.values(results).some(success => success),
        notificationChannels: { results, errors }
      }
    });

    return { results, errors };
  }

  private formatAlertMessage(alert: Alert, channel: string): NotificationMessage {
    const baseMessage = {
      title: `🚨 アラート: ${alert.ruleName}`,
      message: alert.message,
      level: alert.level as any,
      metadata: {
        alertId: alert.id,
        ruleId: alert.ruleId,
        timestamp: alert.createdAt,
        channel
      }
    };

    // チャンネル別のフォーマット調整
    switch (channel) {
      case 'slack':
        return {
          ...baseMessage,
          title: `:warning: ${baseMessage.title}`,
          metadata: {
            ...baseMessage.metadata,
            color: this.getLevelColor(alert.level),
            fields: [
              { title: 'ルール', value: alert.ruleName, short: true },
              { title: 'レベル', value: alert.level.toUpperCase(), short: true },
              { title: '時刻', value: alert.createdAt.toISOString(), short: false }
            ]
          }
        };

      case 'teams':
        return {
          ...baseMessage,
          metadata: {
            ...baseMessage.metadata,
            themeColor: this.getLevelColor(alert.level),
            sections: [
              {
                activityTitle: alert.ruleName,
                activitySubtitle: `Level: ${alert.level.toUpperCase()}`,
                activityText: alert.message,
                facts: [
                  { name: 'Alert ID', value: alert.id.toString() },
                  { name: 'Time', value: alert.createdAt.toISOString() }
                ]
              }
            ]
          }
        };

      default:
        return baseMessage;
    }
  }

  private getLevelColor(level: string): string {
    const colors = {
      info: '#36a2eb',
      warning: '#ffcd56',
      error: '#ff6384',
      critical: '#ff0000'
    };
    return colors[level as keyof typeof colors] || '#36a2eb';
  }

  private async getActiveChannels(): Promise<string[]> {
    const channels: string[] = [];

    for (const [name, provider] of this.providers) {
      if (provider.isConfigured()) {
        channels.push(name);
      }
    }

    return channels;
  }
}
```

---

## フロントエンド設計

### Alerts Store (Pinia)

```typescript
// frontend/src/stores/alerts.ts
interface AlertsState {
  alertRules: AlertRule[];
  alerts: Alert[];
  loading: boolean;
  filters: AlertFilters;
  pagination: PaginationInfo;
  statistics: AlertStatistics | null;
}

export const useAlertsStore = defineStore('alerts', {
  state: (): AlertsState => ({
    alertRules: [],
    alerts: [],
    loading: false,
    filters: {
      level: [],
      resolved: null,
      dateRange: null
    },
    pagination: {
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0
    },
    statistics: null
  }),

  getters: {
    activeRules: (state) => state.alertRules.filter(rule => rule.isActive),
    inactiveRules: (state) => state.alertRules.filter(rule => !rule.isActive),
    unresolvedAlerts: (state) => state.alerts.filter(alert => !alert.resolvedAt),
    alertsByLevel: (state) => {
      const counts = { info: 0, warning: 0, error: 0, critical: 0 };
      state.alerts.forEach(alert => {
        if (counts.hasOwnProperty(alert.level)) {
          counts[alert.level as keyof typeof counts]++;
        }
      });
      return counts;
    }
  },

  actions: {
    async fetchAlertRules() {
      this.loading = true;
      try {
        const response = await alertsAPI.getAlertRules();
        this.alertRules = response.data;
      } finally {
        this.loading = false;
      }
    },

    async createAlertRule(data: CreateAlertRuleRequest) {
      const response = await alertsAPI.createAlertRule(data);
      this.alertRules.push(response.alertRule);
      return response;
    },

    async updateAlertRule(id: number, data: UpdateAlertRuleRequest) {
      const response = await alertsAPI.updateAlertRule(id, data);
      const index = this.alertRules.findIndex(rule => rule.id === id);
      if (index !== -1) {
        this.alertRules[index] = response.alertRule;
      }
      return response;
    },

    async deleteAlertRule(id: number) {
      await alertsAPI.deleteAlertRule(id);
      this.alertRules = this.alertRules.filter(rule => rule.id !== id);
    },

    async testAlertRule(id: number) {
      return await alertsAPI.testAlertRule(id);
    },

    async fetchAlerts() {
      this.loading = true;
      try {
        const response = await alertsAPI.getAlerts({
          ...this.filters,
          page: this.pagination.page,
          pageSize: this.pagination.pageSize
        });

        this.alerts = response.data;
        this.pagination = response.pagination;
      } finally {
        this.loading = false;
      }
    },

    addRealTimeAlert(alert: Alert) {
      this.alerts.unshift(alert);

      // メモリ使用量制限
      if (this.alerts.length > 500) {
        this.alerts = this.alerts.slice(0, 500);
      }
    },

    async resolveAlert(id: number) {
      await alertsAPI.resolveAlert(id);
      const alert = this.alerts.find(a => a.id === id);
      if (alert) {
        alert.resolvedAt = new Date();
      }
    }
  }
});
```

---

## パフォーマンス設計

### 評価エンジン最適化

1. **並列処理**
   ```typescript
   // ルール評価の並列実行
   const evaluationPromises = rules.map(rule => this.evaluateRule(rule, log));
   await Promise.allSettled(evaluationPromises);
   ```

2. **メモリ効率**
   ```typescript
   // 循環バッファによるメモリ使用量制限
   class CircularBuffer<T> {
     private items: T[] = [];
     private capacity: number;

     constructor(capacity: number) {
       this.capacity = Math.max(capacity, 100); // 最小容量確保
     }
   }
   ```

3. **データベース最適化**
   ```sql
   -- アラート履歴の自動パーティション
   CREATE TABLE alert_y2025m01 PARTITION OF "Alert"
   FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

   -- 古いアラートの自動アーカイブ
   DELETE FROM "Alert"
   WHERE createdAt < NOW() - INTERVAL '90 days'
   AND resolvedAt IS NOT NULL;
   ```

### 通知システム最適化

1. **レート制限**
   ```typescript
   class RateLimiter {
     private requests: Map<string, number[]> = new Map();

     isAllowed(key: string, limit: number, window: number): boolean {
       const now = Date.now();
       const requests = this.requests.get(key) || [];

       // 時間窓外のリクエストを削除
       const validRequests = requests.filter(time => now - time < window);

       if (validRequests.length >= limit) {
         return false;
       }

       validRequests.push(now);
       this.requests.set(key, validRequests);
       return true;
     }
   }
   ```

2. **バッチ通知**
   ```typescript
   // 同一ルールの複数アラートをまとめて通知
   class BatchNotificationProcessor {
     private batches: Map<number, Alert[]> = new Map();

     addAlert(alert: Alert) {
       const batch = this.batches.get(alert.ruleId) || [];
       batch.push(alert);
       this.batches.set(alert.ruleId, batch);

       // 5分後にバッチ送信
       setTimeout(() => this.processBatch(alert.ruleId), 5 * 60 * 1000);
     }
   }
   ```

---

**ドキュメント作成日**: 2025年9月21日
**次回レビュー予定**: 2025年10月21日
**関連ドキュメント**:
- 通知システム設計書
- ログ管理機能設計書
- WebSocket通信設計書
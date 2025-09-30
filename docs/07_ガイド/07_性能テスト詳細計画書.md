# workflow.ts分割 性能テスト詳細計画書

## 📋 テスト計画概要

**作成日**: 2025-09-28
**対象**: workflow.ts マイクロサービス型分割
**テスト方針**: Core Web Vitals準拠・実環境負荷・継続監視
**品質目標**: 95%削減効果の定量検証・性能回帰防止

---

## 🎯 性能テスト目標・KPI

### 主要KPI
```json
{
  "initial_load_reduction": {
    "target": "95%",
    "baseline": "56KB",
    "target_size": "3KB",
    "tolerance": "±5%"
  },
  "api_response_time": {
    "target": "40% improvement",
    "baseline": "200ms",
    "target_time": "120ms",
    "sla_limit": "100ms"
  },
  "memory_usage": {
    "target": "60% reduction",
    "baseline": "267MB",
    "target_usage": "107MB",
    "critical_limit": "150MB"
  },
  "concurrent_users": {
    "target": "1000 users",
    "baseline": "500 users",
    "degradation_limit": "10%"
  }
}
```

### Core Web Vitals基準
```json
{
  "LCP": {
    "excellent": "< 2.5s",
    "needs_improvement": "2.5s - 4.0s",
    "poor": "> 4.0s",
    "target": "< 2.0s"
  },
  "FID": {
    "excellent": "< 100ms",
    "needs_improvement": "100ms - 300ms",
    "poor": "> 300ms",
    "target": "< 50ms"
  },
  "CLS": {
    "excellent": "< 0.1",
    "needs_improvement": "0.1 - 0.25",
    "poor": "> 0.25",
    "target": "< 0.05"
  }
}
```

---

## 🧪 テストシナリオ設計

### シナリオ1: 初回読み込み性能テスト

#### テスト内容
- **目的**: 95%削減効果の検証
- **対象**: メインルーター読み込み時間
- **手法**: バンドルサイズ分析・ネットワーク速度別測定

#### 実装例
```typescript
// 性能測定スクリプト
class BundleSizeAnalyzer {
  async measureBundleSize() {
    const analyzer = new BundleAnalyzerPlugin({
      analyzerMode: 'json',
      openAnalyzer: false,
      generateStatsFile: true
    });

    const stats = await this.buildWithAnalyzer();

    return {
      legacyWorkflowSize: this.extractModuleSize(stats, 'workflow.ts'),
      newWorkflowSize: this.extractModuleSize(stats, 'workflow/index.ts'),
      reductionPercentage: this.calculateReduction(legacy, newSize)
    };
  }

  private calculateReduction(before: number, after: number): number {
    return ((before - after) / before) * 100;
  }
}
```

#### 測定項目
```json
{
  "bundle_analysis": {
    "legacy_workflow_size": "56KB",
    "new_main_router_size": "3KB",
    "individual_services": {
      "workflow_types": "7KB",
      "workflow_requests": "9KB",
      "emergency_approval": "6KB"
    }
  },
  "network_conditions": {
    "fast_3g": "750ms",
    "slow_3g": "2000ms",
    "regular_4g": "300ms"
  }
}
```

### シナリオ2: API応答時間テスト

#### テスト内容
- **目的**: 40%高速化の検証
- **対象**: 51個のAPIエンドポイント
- **手法**: 負荷テスト・レスポンス時間分析

#### 実装例
```typescript
// API負荷テストスイート
class WorkflowAPILoadTest {
  private readonly endpoints = [
    '/api/workflow/types',
    '/api/workflow/requests',
    '/api/workflow/emergency/request',
    // ... 51個のエンドポイント
  ];

  async runLoadTest() {
    const results = [];

    for (const endpoint of this.endpoints) {
      const result = await this.testEndpoint(endpoint);
      results.push(result);
    }

    return this.analyzeResults(results);
  }

  private async testEndpoint(endpoint: string) {
    const autocannon = require('autocannon');

    return new Promise((resolve) => {
      autocannon({
        url: `http://localhost:8000${endpoint}`,
        connections: 100,
        duration: 30,
        headers: {
          'Authorization': 'Bearer test-token'
        }
      }, (err, result) => {
        resolve({
          endpoint,
          avgLatency: result.latency.average,
          p95Latency: result.latency.p95,
          throughput: result.requests.average,
          errors: result.errors
        });
      });
    });
  }
}
```

### シナリオ3: メモリ使用量テスト

#### テスト内容
- **目的**: 60%削減の検証
- **対象**: Node.jsプロセス・V8ヒープ
- **手法**: メモリプロファイリング・長時間稼働テスト

#### 実装例
```typescript
// メモリ使用量監視
class MemoryProfiler {
  private memorySnapshots: MemorySnapshot[] = [];

  startMonitoring() {
    setInterval(() => {
      const usage = process.memoryUsage();
      const snapshot: MemorySnapshot = {
        timestamp: new Date(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        rss: usage.rss,
        activeServices: this.getActiveServices()
      };

      this.memorySnapshots.push(snapshot);
      this.checkMemoryThresholds(snapshot);
    }, 10000); // 10秒間隔
  }

  private checkMemoryThresholds(snapshot: MemorySnapshot) {
    const heapUsageMB = snapshot.heapUsed / 1024 / 1024;

    if (heapUsageMB > 150) { // 150MB閾値
      this.alertManager.sendAlert({
        type: 'MEMORY_THRESHOLD_EXCEEDED',
        usage: heapUsageMB,
        threshold: 150,
        services: snapshot.activeServices
      });
    }
  }
}
```

### シナリオ4: 同時接続数テスト

#### テスト内容
- **目的**: 1000ユーザー同時接続性能確認
- **対象**: WebSocket・HTTP長時間接続
- **手法**: 段階的負荷増加・限界値測定

#### 実装例
```typescript
// 同時接続テスト
class ConcurrentUserTest {
  async runConcurrencyTest() {
    const testPlan = [
      { users: 100, duration: 300 },  // 5分
      { users: 500, duration: 600 },  // 10分
      { users: 1000, duration: 900 }, // 15分
      { users: 1500, duration: 300 }  // 限界テスト
    ];

    const results = [];

    for (const phase of testPlan) {
      console.log(`🚀 Testing ${phase.users} concurrent users`);
      const result = await this.testConcurrentUsers(phase.users, phase.duration);
      results.push(result);

      // 性能劣化チェック
      if (result.avgResponseTime > 500) { // 500ms超過
        console.log(`⚠️ Performance degradation at ${phase.users} users`);
        break;
      }
    }

    return results;
  }

  private async testConcurrentUsers(userCount: number, duration: number) {
    const users = Array.from({ length: userCount }, (_, i) =>
      new VirtualUser(`user_${i}`)
    );

    const startTime = Date.now();
    const promises = users.map(user => user.simulateWorkflow(duration));

    const results = await Promise.allSettled(promises);
    const endTime = Date.now();

    return {
      userCount,
      duration,
      totalTime: endTime - startTime,
      successRate: this.calculateSuccessRate(results),
      avgResponseTime: this.calculateAvgResponseTime(results),
      errorCount: this.countErrors(results)
    };
  }
}
```

---

## 📊 テスト実行計画

### Phase 1: ベースライン測定（Day 1）

#### 分割前性能測定
```bash
# ベースライン測定スクリプト
./scripts/baseline-measurement.sh

# 実行内容
- バンドルサイズ分析
- API応答時間測定 (51エンドポイント)
- メモリ使用量プロファイリング
- 同時接続数限界測定
```

#### 測定結果例
```json
{
  "baseline": {
    "bundle_size": "56KB",
    "avg_api_response": "200ms",
    "memory_usage": "267MB",
    "max_concurrent_users": "500",
    "core_web_vitals": {
      "LCP": "3.2s",
      "FID": "150ms",
      "CLS": "0.15"
    }
  }
}
```

### Phase 2: 分割後性能測定（Day 2-4）

#### 各マイクロサービス個別測定
```typescript
// 個別サービステスト実行
const serviceTests = [
  { name: 'workflow-types', port: 8001 },
  { name: 'workflow-requests', port: 8002 },
  { name: 'emergency-approval', port: 8003 },
  // ... 9サービス全て
];

for (const service of serviceTests) {
  await this.testIndividualService(service);
}
```

### Phase 3: 統合性能測定（Day 5-7）

#### フルスタック統合テスト
```bash
# 統合性能テスト
./scripts/integrated-performance-test.sh

# 実行内容
- 全マイクロサービス同時稼働
- エンドツーエンド性能測定
- 実ユーザーシナリオ再現
- 性能回帰テスト
```

### Phase 4: 本番環境性能検証（Day 8-9）

#### 本番レプリカ環境テスト
```typescript
// 本番環境レプリカでの検証
class ProductionReplicaTest {
  async runProductionTest() {
    // 本番データレプリケーション
    await this.replicateProductionData();

    // 実トラフィックパターン再現
    await this.simulateRealTraffic();

    // 24時間連続稼働テスト
    await this.run24HourStressTest();

    // 結果分析・レポート生成
    return await this.generatePerformanceReport();
  }
}
```

---

## 🔍 監視・アラート設定

### リアルタイム監視ダッシュボード

#### Grafana監視設定
```json
{
  "dashboards": {
    "workflow_performance": {
      "panels": [
        {
          "title": "API Response Time",
          "type": "graph",
          "targets": [
            "avg(api_response_time{service=~'workflow.*'})"
          ],
          "alert": {
            "condition": "> 100ms",
            "frequency": "10s"
          }
        },
        {
          "title": "Memory Usage",
          "type": "singlestat",
          "targets": [
            "sum(nodejs_heap_size_used_bytes{service=~'workflow.*'})"
          ],
          "alert": {
            "condition": "> 150MB",
            "frequency": "30s"
          }
        },
        {
          "title": "Bundle Size Trend",
          "type": "graph",
          "targets": [
            "bundle_size{module='workflow'}"
          ]
        }
      ]
    }
  }
}
```

#### アラート設定
```typescript
// アラート管理システム
class PerformanceAlertManager {
  private readonly thresholds = {
    api_response_time: 100, // ms
    memory_usage: 150,      // MB
    error_rate: 1,          // %
    cpu_usage: 80           // %
  };

  async checkPerformanceMetrics() {
    const metrics = await this.collectMetrics();

    for (const [metric, value] of Object.entries(metrics)) {
      if (value > this.thresholds[metric]) {
        await this.sendAlert({
          metric,
          value,
          threshold: this.thresholds[metric],
          severity: this.calculateSeverity(metric, value),
          timestamp: new Date()
        });
      }
    }
  }

  private calculateSeverity(metric: string, value: number): string {
    const threshold = this.thresholds[metric];
    const ratio = value / threshold;

    if (ratio > 2.0) return 'CRITICAL';
    if (ratio > 1.5) return 'HIGH';
    if (ratio > 1.2) return 'MEDIUM';
    return 'LOW';
  }
}
```

---

## 📈 継続的性能監視

### 自動性能回帰テスト

#### GitHub Actions統合
```yaml
# .github/workflows/performance-regression.yml
name: Performance Regression Test

on:
  pull_request:
    paths:
      - 'src/routes/workflow/**'
  schedule:
    - cron: '0 2 * * *' # 毎日午前2時

jobs:
  performance-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm install

      - name: Run performance tests
        run: npm run test:performance

      - name: Compare with baseline
        run: |
          node scripts/compare-performance.js \
            --baseline ./performance/baseline.json \
            --current ./performance/current.json \
            --threshold 10

      - name: Upload performance report
        uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: performance-report.html
```

### 性能トレンド分析

#### 長期トレンド監視
```typescript
// 性能トレンド分析
class PerformanceTrendAnalyzer {
  async analyzePerformanceTrend(days: number = 30) {
    const data = await this.getPerformanceData(days);

    const trends = {
      bundle_size: this.calculateTrend(data.map(d => d.bundleSize)),
      response_time: this.calculateTrend(data.map(d => d.avgResponseTime)),
      memory_usage: this.calculateTrend(data.map(d => d.memoryUsage)),
      error_rate: this.calculateTrend(data.map(d => d.errorRate))
    };

    // 悪化トレンド検出
    const deteriorating = Object.entries(trends)
      .filter(([_, trend]) => trend.slope > 0.1) // 10%以上の悪化
      .map(([metric, trend]) => ({ metric, trend }));

    if (deteriorating.length > 0) {
      await this.alertManager.sendTrendAlert({
        type: 'PERFORMANCE_DETERIORATION',
        metrics: deteriorating,
        timeframe: days
      });
    }

    return trends;
  }
}
```

---

## 📋 テスト成功基準

### 必須達成項目
- [ ] **95%削減**: 56KB → 3KB (±5%)
- [ ] **40%高速化**: 200ms → 120ms (API応答時間)
- [ ] **60%メモリ削減**: 267MB → 107MB
- [ ] **Core Web Vitals**: LCP < 2.0s, FID < 50ms, CLS < 0.05

### 品質保証項目
- [ ] **機能回帰**: 51エンドポイント全て正常動作
- [ ] **性能回帰**: 既存機能の性能劣化なし
- [ ] **同時接続**: 1000ユーザー対応
- [ ] **24時間稼働**: メモリリークなし

### 運用準備項目
- [ ] **監視設定**: 全メトリクス監視開始
- [ ] **アラート設定**: 閾値ベースアラート稼働
- [ ] **ダッシュボード**: リアルタイム可視化
- [ ] **自動テスト**: CI/CD統合完了

---

## 🚀 テスト実行コマンド

### 開発環境テスト
```bash
# 全性能テスト実行
npm run test:performance

# 特定シナリオテスト
npm run test:bundle-size
npm run test:api-response
npm run test:memory-usage
npm run test:concurrent-users

# 継続監視開始
npm run monitor:performance
```

### 本番環境テスト
```bash
# 本番レプリカテスト
npm run test:production-replica

# 負荷テスト
npm run test:load

# 監視ダッシュボード起動
npm run dashboard:performance
```

---

*作成日: 2025-09-28*
*テスト期間: 9日間（実装と並行）*
*責任者: 性能エンジニア・品質保証チーム*
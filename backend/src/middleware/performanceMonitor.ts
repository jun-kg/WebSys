/**
 * Performance Monitor Middleware
 * API性能監視ミドルウェア
 */

import { Request, Response, NextFunction } from 'express';

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: Date;
  memoryUsage: NodeJS.MemoryUsage;
  service?: string;
}

interface AlertConfig {
  type: string;
  endpoint: string;
  duration?: number;
  threshold: number;
  timestamp: Date;
}

class AlertManager {
  private alertThresholds = {
    responseTime: 1000,    // 1秒
    memoryUsage: 150,      // 150MB
    errorRate: 5           // 5%
  };

  async sendAlert(config: AlertConfig): Promise<void> {
    console.warn('🚨 PERFORMANCE ALERT:', {
      type: config.type,
      endpoint: config.endpoint,
      threshold: config.threshold,
      actual: config.duration || 0,
      timestamp: config.timestamp
    });

    // 実際の運用では、Slack/Teams/Email等への通知を実装
    // await this.notifySlack(config);
    // await this.notifyEmail(config);
  }
}

class MetricsCollector {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 10000; // メモリ使用量制限

  record(metric: PerformanceMetrics): void {
    this.metrics.push(metric);

    // メモリ使用量制限
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift(); // 古いメトリクスを削除
    }
  }

  getMetrics(limit?: number): PerformanceMetrics[] {
    if (limit) {
      return this.metrics.slice(-limit);
    }
    return [...this.metrics];
  }

  getAverageResponseTime(endpoint?: string): number {
    let targetMetrics = this.metrics;

    if (endpoint) {
      targetMetrics = this.metrics.filter(m => m.endpoint === endpoint);
    }

    if (targetMetrics.length === 0) return 0;

    const totalDuration = targetMetrics.reduce((sum, m) => sum + m.duration, 0);
    return totalDuration / targetMetrics.length;
  }

  getErrorRate(timeWindowMs: number = 300000): number { // デフォルト5分
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindowMs);

    const recentMetrics = this.metrics.filter(m => m.timestamp >= windowStart);
    if (recentMetrics.length === 0) return 0;

    const errorCount = recentMetrics.filter(m => m.statusCode >= 500).length;
    return (errorCount / recentMetrics.length) * 100;
  }

  clear(): void {
    this.metrics = [];
  }
}

export class PerformanceMonitor {
  private alertManager = new AlertManager();
  private metricsCollector = new MetricsCollector();

  /**
   * 性能監視ミドルウェア
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage();

      // レスポンス終了時の処理
      res.on('finish', async () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        const endMemory = process.memoryUsage();

        const metric: PerformanceMetrics = {
          endpoint: req.route?.path || req.path,
          method: req.method,
          duration,
          statusCode: res.statusCode,
          timestamp: new Date(),
          memoryUsage: endMemory,
          service: process.env.SERVICE_NAME || 'workflow-service'
        };

        // メトリクス記録
        this.metricsCollector.record(metric);

        // パフォーマンスアラートチェック
        await this.checkPerformanceThresholds(metric);

        // ログ出力（開発環境）
        if (process.env.NODE_ENV === 'development') {
          this.logPerformanceMetric(metric);
        }
      });

      next();
    };
  }

  /**
   * 性能しきい値チェック
   */
  private async checkPerformanceThresholds(metric: PerformanceMetrics): Promise<void> {
    // レスポンス時間チェック
    if (metric.duration > 1000) { // 1秒超過
      await this.alertManager.sendAlert({
        type: 'SLA_VIOLATION',
        endpoint: metric.endpoint,
        duration: metric.duration,
        threshold: 1000,
        timestamp: metric.timestamp
      });
    }

    // メモリ使用量チェック
    const memoryUsageMB = metric.memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > 150) { // 150MB超過
      await this.alertManager.sendAlert({
        type: 'MEMORY_THRESHOLD_EXCEEDED',
        endpoint: metric.endpoint,
        threshold: 150,
        timestamp: metric.timestamp
      });
    }

    // エラー率チェック
    const errorRate = this.metricsCollector.getErrorRate();
    if (errorRate > 5) { // 5%超過
      await this.alertManager.sendAlert({
        type: 'HIGH_ERROR_RATE',
        endpoint: metric.endpoint,
        threshold: 5,
        timestamp: metric.timestamp
      });
    }
  }

  /**
   * パフォーマンスメトリクスのログ出力
   */
  private logPerformanceMetric(metric: PerformanceMetrics): void {
    const memoryMB = Math.round(metric.memoryUsage.heapUsed / 1024 / 1024);

    console.log(`📊 [${metric.service}] ${metric.method} ${metric.endpoint} - ${metric.duration}ms - ${metric.statusCode} - ${memoryMB}MB`);

    // 閾値超過時の警告ログ
    if (metric.duration > 500) {
      console.warn(`⚠️ Slow response: ${metric.endpoint} took ${metric.duration}ms`);
    }
  }

  /**
   * パフォーマンス統計の取得
   */
  getPerformanceStats() {
    const recentMetrics = this.metricsCollector.getMetrics(1000); // 直近1000件

    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        memoryUsage: process.memoryUsage()
      };
    }

    const totalRequests = recentMetrics.length;
    const averageResponseTime = this.metricsCollector.getAverageResponseTime();
    const errorRate = this.metricsCollector.getErrorRate();

    const responseTimes = recentMetrics.map(m => m.duration).sort((a, b) => a - b);
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p95ResponseTime = responseTimes[p95Index] || 0;

    const endpointStats = this.getEndpointStats(recentMetrics);

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime),
      p95ResponseTime,
      errorRate: Math.round(errorRate * 100) / 100,
      memoryUsage: process.memoryUsage(),
      endpointStats
    };
  }

  /**
   * エンドポイント別統計
   */
  private getEndpointStats(metrics: PerformanceMetrics[]) {
    const endpointMap = new Map<string, PerformanceMetrics[]>();

    metrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!endpointMap.has(key)) {
        endpointMap.set(key, []);
      }
      endpointMap.get(key)!.push(metric);
    });

    const endpointStats: any[] = [];

    endpointMap.forEach((endpointMetrics, endpoint) => {
      const totalRequests = endpointMetrics.length;
      const averageResponseTime = endpointMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
      const errorCount = endpointMetrics.filter(m => m.statusCode >= 500).length;
      const errorRate = (errorCount / totalRequests) * 100;

      endpointStats.push({
        endpoint,
        totalRequests,
        averageResponseTime: Math.round(averageResponseTime),
        errorRate: Math.round(errorRate * 100) / 100
      });
    });

    return endpointStats.sort((a, b) => b.totalRequests - a.totalRequests);
  }

  /**
   * メトリクスのリセット
   */
  resetMetrics(): void {
    this.metricsCollector.clear();
    console.log('Performance metrics cleared');
  }

  /**
   * ヘルスチェック用のメトリクス取得
   */
  getHealthMetrics() {
    const stats = this.getPerformanceStats();
    const memoryUsageMB = Math.round(stats.memoryUsage.heapUsed / 1024 / 1024);

    return {
      status: this.getHealthStatus(stats, memoryUsageMB),
      responseTime: stats.averageResponseTime,
      errorRate: stats.errorRate,
      memoryUsage: memoryUsageMB,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * ヘルス状態の判定
   */
  private getHealthStatus(stats: any, memoryUsageMB: number): 'healthy' | 'warning' | 'critical' {
    if (stats.errorRate > 10 || memoryUsageMB > 200 || stats.averageResponseTime > 2000) {
      return 'critical';
    }
    if (stats.errorRate > 5 || memoryUsageMB > 150 || stats.averageResponseTime > 1000) {
      return 'warning';
    }
    return 'healthy';
  }
}

// シングルトンインスタンス
export const performanceMonitor = new PerformanceMonitor();
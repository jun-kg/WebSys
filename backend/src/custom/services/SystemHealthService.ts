import { prisma } from '@core/lib/prisma';
import os from 'os';
import process from 'process';
import { getWebSocketService } from '@core/services/WebSocketService';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: ServiceHealth;
    application: ServiceHealth;
    system: ServiceHealth;
  };
  metrics: SystemMetrics;
}

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: any;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  network: {
    activeConnections: number;
  };
  application: {
    uptime: number;
    activeSessions: number;
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
  };
}

export class SystemHealthService {
  private static instance: SystemHealthService;
  private requestCount = 0;
  private errorCount = 0;
  private responseTimes: number[] = [];
  private startTime = Date.now();
  private lastHealthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  private healthMonitorInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Prismaシングルトンを使用
  }

  static getInstance(): SystemHealthService {
    if (!SystemHealthService.instance) {
      SystemHealthService.instance = new SystemHealthService();
    }
    return SystemHealthService.instance;
  }

  /**
   * 包括的ヘルスチェック実行
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // 並行してすべてのヘルスチェックを実行
      const [databaseHealth, systemMetrics] = await Promise.all([
        this.checkDatabaseHealth(),
        this.getSystemMetrics()
      ]);

      const applicationHealth = await this.checkApplicationHealth();

      // 全体的なステータスを決定
      const overallStatus = this.determineOverallStatus([
        databaseHealth.status,
        applicationHealth.status,
        systemMetrics.cpu.usage > 90 ? 'unhealthy' :
        systemMetrics.memory.percentage > 90 ? 'degraded' : 'healthy'
      ]);

      const overallResult = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        services: {
          database: databaseHealth,
          application: applicationHealth,
          system: {
            status: systemMetrics.cpu.usage > 90 || systemMetrics.memory.percentage > 90 ? 'degraded' : 'healthy',
            responseTime: Date.now() - startTime
          }
        },
        metrics: systemMetrics
      };

      // ステータス変化をチェックしてアラートを送信
      this.checkStatusChange(overallResult);

      // WebSocketでリアルタイム配信
      this.broadcastHealthUpdate(overallResult);

      return overallResult;
    } catch (error) {
      console.error('Health check failed:', error);
      const errorResult = {
        status: 'unhealthy' as const,
        timestamp: new Date().toISOString(),
        services: {
          database: { status: 'unhealthy' as const, error: 'Health check failed' },
          application: { status: 'unhealthy' as const, error: 'Health check failed' },
          system: { status: 'unhealthy' as const, error: 'Health check failed' }
        },
        metrics: await this.getSystemMetrics()
      };

      this.checkStatusChange(errorResult);
      this.broadcastHealthUpdate(errorResult);
      return errorResult;
    }
  }

  /**
   * データベースヘルスチェック
   */
  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // 簡単なクエリでデータベース接続を確認
      await prisma.$queryRaw`SELECT 1 as health_check`;

      // 接続プール情報の取得（可能であれば）
      const responseTime = Date.now() - startTime;

      return {
        status: responseTime > 1000 ? 'degraded' : 'healthy',
        responseTime,
        details: {
          connectionPool: 'active',
          queryPerformance: responseTime < 100 ? 'excellent' :
                           responseTime < 500 ? 'good' : 'slow'
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Database connection failed'
      };
    }
  }

  /**
   * アプリケーションヘルスチェック
   */
  private async checkApplicationHealth(): Promise<ServiceHealth> {
    try {
      // アクティブセッション数を取得
      const activeSessions = await this.getActiveSessionCount();

      // エラー率計算
      const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

      // 平均レスポンス時間計算
      const avgResponseTime = this.responseTimes.length > 0
        ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
        : 0;

      const status = errorRate > 10 ? 'unhealthy' :
                    errorRate > 5 ? 'degraded' : 'healthy';

      return {
        status,
        details: {
          activeSessions,
          errorRate: `${errorRate.toFixed(2)}%`,
          averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
          totalRequests: this.requestCount,
          uptime: `${((Date.now() - this.startTime) / 1000 / 60).toFixed(1)} minutes`
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Application health check failed'
      };
    }
  }

  /**
   * システムメトリクス取得
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    // CPU使用率の計算（簡易版）
    const cpuUsage = await this.getCpuUsage();

    return {
      cpu: {
        usage: cpuUsage,
        cores: cpus.length,
        loadAverage: os.loadavg()
      },
      memory: {
        used: usedMem,
        free: freeMem,
        total: totalMem,
        percentage: (usedMem / totalMem) * 100
      },
      disk: await this.getDiskUsage(),
      network: {
        activeConnections: await this.getActiveConnections()
      },
      application: {
        uptime: process.uptime(),
        activeSessions: await this.getActiveSessionCount(),
        totalRequests: this.requestCount,
        errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0,
        averageResponseTime: this.responseTimes.length > 0
          ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
          : 0
      }
    };
  }

  /**
   * CPU使用率計算
   */
  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const cpus = os.cpus();
      const startUsage = cpus.map(cpu => {
        const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
        const idle = cpu.times.idle;
        return { total, idle };
      });

      setTimeout(() => {
        const cpus2 = os.cpus();
        const endUsage = cpus2.map(cpu => {
          const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
          const idle = cpu.times.idle;
          return { total, idle };
        });

        let totalUsage = 0;
        for (let i = 0; i < startUsage.length; i++) {
          const totalDiff = endUsage[i].total - startUsage[i].total;
          const idleDiff = endUsage[i].idle - startUsage[i].idle;
          const usage = 100 - (100 * idleDiff / totalDiff);
          totalUsage += usage;
        }

        resolve(totalUsage / startUsage.length);
      }, 100);
    });
  }

  /**
   * ディスク使用量取得
   */
  private async getDiskUsage(): Promise<{ used: number; free: number; total: number; percentage: number }> {
    try {
      const fs = require('fs');
      const stats = fs.statSync('.');

      // 簡易的な実装（実際の環境では statvfs を使用）
      const total = 100 * 1024 * 1024 * 1024; // 100GB仮定
      const free = 50 * 1024 * 1024 * 1024;   // 50GB空き仮定
      const used = total - free;

      return {
        used,
        free,
        total,
        percentage: (used / total) * 100
      };
    } catch (error) {
      return {
        used: 0,
        free: 0,
        total: 0,
        percentage: 0
      };
    }
  }

  /**
   * アクティブ接続数取得
   */
  private async getActiveConnections(): Promise<number> {
    try {
      // 簡易実装（実際の環境ではnetstatやssコマンドを使用）
      return Math.floor(Math.random() * 100) + 10;
    } catch (error) {
      return 0;
    }
  }

  /**
   * アクティブセッション数取得
   */
  private async getActiveSessionCount(): Promise<number> {
    try {
      const count = await prisma.user_sessions.count({
        where: {
          isActive: true,
          expiresAt: {
            gt: new Date()
          }
        }
      });
      return count;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 全体的なステータス決定
   */
  private determineOverallStatus(statuses: string[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (statuses.includes('unhealthy')) return 'unhealthy';
    if (statuses.includes('degraded')) return 'degraded';
    return 'healthy';
  }

  /**
   * リクエスト統計の記録
   */
  recordRequest(responseTime: number, isError = false): void {
    this.requestCount++;
    if (isError) this.errorCount++;

    this.responseTimes.push(responseTime);

    // 直近1000件のレスポンス時間のみ保持
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  /**
   * 簡易パフォーマンステスト実行
   */
  async performLoadTest(): Promise<any> {
    const results = {
      duration: 10000, // 10秒
      requests: 0,
      failures: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity
    };

    const startTime = Date.now();
    const endTime = startTime + results.duration;
    const responseTimes: number[] = [];

    while (Date.now() < endTime) {
      try {
        const reqStart = Date.now();
        await this.checkDatabaseHealth();
        const responseTime = Date.now() - reqStart;

        results.requests++;
        responseTimes.push(responseTime);
        results.maxResponseTime = Math.max(results.maxResponseTime, responseTime);
        results.minResponseTime = Math.min(results.minResponseTime, responseTime);

        // 小さな待機時間
        await new Promise(resolve => setTimeout(resolve, 10));
      } catch (error) {
        results.failures++;
      }
    }

    results.averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;

    return {
      ...results,
      successRate: ((results.requests - results.failures) / results.requests) * 100,
      requestsPerSecond: results.requests / (results.duration / 1000)
    };
  }

  /**
   * ステータス変化をチェックしてアラートを送信
   */
  private checkStatusChange(healthResult: HealthCheckResult): void {
    const currentStatus = healthResult.status;

    if (currentStatus !== this.lastHealthStatus) {
      const webSocketService = getWebSocketService();

      if (webSocketService) {
        let alertLevel: 'info' | 'warning' | 'error' | 'critical';
        let message: string;

        switch (currentStatus) {
          case 'healthy':
            alertLevel = 'info';
            message = `システム状態が正常に回復しました (前の状態: ${this.getStatusLabel(this.lastHealthStatus)})`;
            break;
          case 'degraded':
            alertLevel = 'warning';
            message = `システム状態が注意レベルに変化しました (前の状態: ${this.getStatusLabel(this.lastHealthStatus)})`;
            break;
          case 'unhealthy':
            alertLevel = 'critical';
            message = `システム状態が異常レベルに変化しました (前の状態: ${this.getStatusLabel(this.lastHealthStatus)})`;
            break;
        }

        webSocketService.broadcastHealthAlert({
          level: alertLevel,
          service: 'system',
          message,
          details: healthResult
        });
      }

      this.lastHealthStatus = currentStatus;
    }
  }

  /**
   * WebSocketでヘルスデータをブロードキャスト
   */
  private broadcastHealthUpdate(healthResult: HealthCheckResult): void {
    const webSocketService = getWebSocketService();

    if (webSocketService) {
      webSocketService.broadcastHealthMetrics(healthResult);
    }
  }

  /**
   * リアルタイム監視を開始
   */
  public startRealTimeMonitoring(intervalMs: number = 30000): void {
    if (this.healthMonitorInterval) {
      this.stopRealTimeMonitoring();
    }

    this.healthMonitorInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Real-time health monitoring error:', error);
      }
    }, intervalMs);

    console.log(`Real-time health monitoring started (interval: ${intervalMs}ms)`);
  }

  /**
   * リアルタイム監視を停止
   */
  public stopRealTimeMonitoring(): void {
    if (this.healthMonitorInterval) {
      clearInterval(this.healthMonitorInterval);
      this.healthMonitorInterval = null;
      console.log('Real-time health monitoring stopped');
    }
  }

  /**
   * ステータスラベル取得
   */
  private getStatusLabel(status: string): string {
    switch (status) {
      case 'healthy': return '正常';
      case 'degraded': return '注意';
      case 'unhealthy': return '異常';
      default: return '不明';
    }
  }
}
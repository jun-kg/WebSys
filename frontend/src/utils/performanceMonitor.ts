/**
 * Performance Monitor
 * Core Web Vitals & カスタムメトリクス監視システム
 */

interface PerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
}

interface WebVitalsMetrics {
  // Core Web Vitals
  FCP: number | null; // First Contentful Paint
  LCP: number | null; // Largest Contentful Paint
  FID: number | null; // First Input Delay
  CLS: number | null; // Cumulative Layout Shift

  // その他メトリクス
  TTFB: number | null; // Time to First Byte
  TTI: number | null;  // Time to Interactive

  // カスタムメトリクス
  routeChangeTime: number | null;
  apiResponseTime: number | null;
  memoryUsage: number | null;

  // デバイス情報
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connection: string;
  viewport: { width: number; height: number };

  // タイムスタンプ
  timestamp: number;
  sessionId: string;
}

interface PerformanceThresholds {
  FCP: { good: number; needsImprovement: number };
  LCP: { good: number; needsImprovement: number };
  FID: { good: number; needsImprovement: number };
  CLS: { good: number; needsImprovement: number };
  TTFB: { good: number; needsImprovement: number };
  memoryUsage: { good: number; needsImprovement: number };
}

class PerformanceMonitor {
  private metrics: WebVitalsMetrics;
  private thresholds: PerformanceThresholds;
  private sessionId: string;
  private observers: Map<string, PerformanceObserver> = new Map();
  private apiStartTimes: Map<string, number> = new Map();
  private reportQueue: WebVitalsMetrics[] = [];
  private reportInterval: number = 30000; // 30秒
  private maxQueueSize: number = 50;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.metrics = this.initializeMetrics();
    this.thresholds = this.getPerformanceThresholds();

    this.setupObservers();
    this.startReporting();
    this.setupBeforeUnload();
  }

  private initializeMetrics(): WebVitalsMetrics {
    return {
      FCP: null,
      LCP: null,
      FID: null,
      CLS: null,
      TTFB: null,
      TTI: null,
      routeChangeTime: null,
      apiResponseTime: null,
      memoryUsage: null,
      deviceType: this.detectDeviceType(),
      connection: this.getConnectionType(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      timestamp: Date.now(),
      sessionId: this.sessionId
    };
  }

  private getPerformanceThresholds(): PerformanceThresholds {
    return {
      FCP: { good: 1800, needsImprovement: 3000 },
      LCP: { good: 2500, needsImprovement: 4000 },
      FID: { good: 100, needsImprovement: 300 },
      CLS: { good: 0.1, needsImprovement: 0.25 },
      TTFB: { good: 800, needsImprovement: 1800 },
      memoryUsage: { good: 0.5, needsImprovement: 0.8 }
    };
  }

  private setupObservers() {
    // LCP (Largest Contentful Paint) Observer
    if ('PerformanceObserver' in window) {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.LCP = lastEntry.startTime;
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }
    }

    // FID (First Input Delay) Observer
    if ('PerformanceObserver' in window) {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name === 'first-input' && 'processingStart' in entry) {
            this.metrics.FID = (entry as any).processingStart - entry.startTime;
          }
        });
      });

      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }
    }

    // CLS (Cumulative Layout Shift) Observer
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            this.metrics.CLS = clsValue;
          }
        });
      });

      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }

    // Navigation Timing Observer
    if ('PerformanceObserver' in window) {
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.metrics.TTFB = navEntry.responseStart - navEntry.requestStart;
            this.metrics.FCP = navEntry.loadEventEnd - navEntry.navigationStart;
          }
        });
      });

      try {
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', navObserver);
      } catch (e) {
        console.warn('Navigation observer not supported');
      }
    }

    // Paint Observer for FCP
    if ('PerformanceObserver' in window) {
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.FCP = entry.startTime;
          }
        });
      });

      try {
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.set('paint', paintObserver);
      } catch (e) {
        console.warn('Paint observer not supported');
      }
    }
  }

  /**
   * APIリクエスト開始時刻記録
   */
  public recordAPIStart(apiName: string): void {
    this.apiStartTimes.set(apiName, performance.now());
  }

  /**
   * APIレスポンス時間記録
   */
  public recordAPIEnd(apiName: string): void {
    const startTime = this.apiStartTimes.get(apiName);
    if (startTime) {
      const responseTime = performance.now() - startTime;
      this.metrics.apiResponseTime = responseTime;
      this.apiStartTimes.delete(apiName);

      // API遅延アラート
      if (responseTime > 5000) { // 5秒以上
        this.reportSlowAPI(apiName, responseTime);
      }
    }
  }

  /**
   * ルート変更時間記録
   */
  public recordRouteChange(routeName: string, startTime: number): void {
    const changeTime = performance.now() - startTime;
    this.metrics.routeChangeTime = changeTime;

    // ルート変更遅延アラート
    if (changeTime > 2000) { // 2秒以上
      this.reportSlowRoute(routeName, changeTime);
    }
  }

  /**
   * メモリ使用量更新
   */
  public updateMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;

      // メモリリークアラート
      if (this.metrics.memoryUsage > this.thresholds.memoryUsage.needsImprovement) {
        this.reportMemoryLeak();
      }
    }
  }

  /**
   * デバイスタイプ検出
   */
  private detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  /**
   * 接続タイプ取得
   */
  private getConnectionType(): string {
    const connection = (navigator as any).connection;
    return connection?.effectiveType || 'unknown';
  }

  /**
   * セッションID生成
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * パフォーマンス評価
   */
  public evaluatePerformance(): { score: number; issues: string[] } {
    const issues: string[] = [];
    let score = 100;

    // Core Web Vitals評価
    if (this.metrics.FCP && this.metrics.FCP > this.thresholds.FCP.needsImprovement) {
      issues.push(`FCP遅延: ${this.metrics.FCP.toFixed(0)}ms`);
      score -= 15;
    }

    if (this.metrics.LCP && this.metrics.LCP > this.thresholds.LCP.needsImprovement) {
      issues.push(`LCP遅延: ${this.metrics.LCP.toFixed(0)}ms`);
      score -= 20;
    }

    if (this.metrics.FID && this.metrics.FID > this.thresholds.FID.needsImprovement) {
      issues.push(`FID遅延: ${this.metrics.FID.toFixed(0)}ms`);
      score -= 15;
    }

    if (this.metrics.CLS && this.metrics.CLS > this.thresholds.CLS.needsImprovement) {
      issues.push(`CLS不安定: ${this.metrics.CLS.toFixed(3)}`);
      score -= 10;
    }

    if (this.metrics.memoryUsage && this.metrics.memoryUsage > this.thresholds.memoryUsage.needsImprovement) {
      issues.push(`メモリ使用量高: ${(this.metrics.memoryUsage * 100).toFixed(1)}%`);
      score -= 20;
    }

    return { score: Math.max(0, score), issues };
  }

  /**
   * レポート送信
   */
  private async sendReport(metrics: WebVitalsMetrics[]): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('Performance Metrics:', metrics);
        return;
      }

      // 本番環境ではAPIにレポート送信
      await fetch('/api/performance/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metrics }),
      });
    } catch (error) {
      console.warn('Failed to send performance report:', error);
    }
  }

  /**
   * 遅いAPI警告
   */
  private reportSlowAPI(apiName: string, responseTime: number): void {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Slow API detected: ${apiName} took ${responseTime.toFixed(0)}ms`);
    }
  }

  /**
   * 遅いルート変更警告
   */
  private reportSlowRoute(routeName: string, changeTime: number): void {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Slow route change: ${routeName} took ${changeTime.toFixed(0)}ms`);
    }
  }

  /**
   * メモリリーク警告
   */
  private reportMemoryLeak(): void {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Memory usage high: ${(this.metrics.memoryUsage! * 100).toFixed(1)}%`);
    }
  }

  /**
   * 定期レポート開始
   */
  private startReporting(): void {
    setInterval(() => {
      this.updateMemoryUsage();

      const currentMetrics = { ...this.metrics };
      currentMetrics.timestamp = Date.now();

      this.reportQueue.push(currentMetrics);

      if (this.reportQueue.length >= this.maxQueueSize) {
        this.flushReports();
      }
    }, this.reportInterval);
  }

  /**
   * レポートキューを送信
   */
  private flushReports(): void {
    if (this.reportQueue.length > 0) {
      this.sendReport([...this.reportQueue]);
      this.reportQueue = [];
    }
  }

  /**
   * ページ離脱時の処理
   */
  private setupBeforeUnload(): void {
    window.addEventListener('beforeunload', () => {
      this.flushReports();
    });

    // Page Visibility API
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushReports();
      }
    });
  }

  /**
   * メトリクス取得
   */
  public getMetrics(): WebVitalsMetrics {
    this.updateMemoryUsage();
    return { ...this.metrics };
  }

  /**
   * クリーンアップ
   */
  public destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.flushReports();
  }
}

// シングルトンインスタンス
export const performanceMonitor = new PerformanceMonitor();

// Vue用コンポーザブル
export const usePerformanceMonitor = () => {
  return {
    recordAPIStart: performanceMonitor.recordAPIStart.bind(performanceMonitor),
    recordAPIEnd: performanceMonitor.recordAPIEnd.bind(performanceMonitor),
    recordRouteChange: performanceMonitor.recordRouteChange.bind(performanceMonitor),
    updateMemoryUsage: performanceMonitor.updateMemoryUsage.bind(performanceMonitor),
    getMetrics: performanceMonitor.getMetrics.bind(performanceMonitor),
    evaluatePerformance: performanceMonitor.evaluatePerformance.bind(performanceMonitor),
    monitor: performanceMonitor
  };
};

export default PerformanceMonitor;
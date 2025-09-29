/**
 * Mobile Performance Optimizer
 * モバイル端末向けパフォーマンス最適化ユーティリティ
 */

interface MobileConfig {
  enableLazyLoading: boolean;
  enableImageOptimization: boolean;
  enableDeferredRendering: boolean;
  throttleScrollEvents: boolean;
  batchDOMUpdates: boolean;
  cacheStrategy: 'memory' | 'sessionStorage' | 'hybrid';
}

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  networkSpeed: string;
  batteryLevel?: number;
}

class MobileOptimizer {
  private config: MobileConfig;
  private metrics: PerformanceMetrics;
  private observer: IntersectionObserver | null = null;
  private deferredTasks: (() => void)[] = [];

  constructor(config: Partial<MobileConfig> = {}) {
    this.config = {
      enableLazyLoading: true,
      enableImageOptimization: true,
      enableDeferredRendering: true,
      throttleScrollEvents: true,
      batchDOMUpdates: true,
      cacheStrategy: 'hybrid',
      ...config
    };

    this.metrics = {
      loadTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      networkSpeed: 'unknown'
    };

    this.init();
  }

  private init() {
    this.detectDeviceCapabilities();
    this.setupIntersectionObserver();
    this.optimizeEventListeners();
    this.monitorPerformance();
  }

  /**
   * デバイス性能検出と自動設定調整
   */
  private detectDeviceCapabilities() {
    const memory = (navigator as any).deviceMemory || 4;
    const connection = (navigator as any).connection;

    // メモリ不足端末は設定を軽量化
    if (memory < 4) {
      this.config.enableImageOptimization = false;
      this.config.enableDeferredRendering = false;
      this.config.cacheStrategy = 'sessionStorage';
    }

    // 低速回線時は遅延読み込み強化
    if (connection?.effectiveType && ['slow-2g', '2g'].includes(connection.effectiveType)) {
      this.config.enableLazyLoading = true;
      this.config.batchDOMUpdates = true;
    }

    this.metrics.networkSpeed = connection?.effectiveType || 'unknown';
    this.logPerformance('Device capabilities detected', {
      memory,
      networkSpeed: this.metrics.networkSpeed,
      optimizedConfig: this.config
    });
  }

  /**
   * 遅延読み込み用Intersection Observer設定
   */
  private setupIntersectionObserver() {
    if (!this.config.enableLazyLoading) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            this.loadElement(element);
            this.observer?.unobserve(element);
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );
  }

  /**
   * イベントリスナー最適化
   */
  private optimizeEventListeners() {
    if (!this.config.throttleScrollEvents) return;

    // スクロールイベント間引き
    let scrollTimeout: number;
    const optimizedScrollHandler = (handler: EventListener) => {
      return (event: Event) => {
        if (scrollTimeout) return;

        scrollTimeout = window.setTimeout(() => {
          handler(event);
          scrollTimeout = 0;
        }, 16); // 60FPS制限
      };
    };

    // 既存のスクロールリスナーを最適化版に置き換え
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (type === 'scroll' && typeof listener === 'function') {
        listener = optimizedScrollHandler(listener);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  }

  /**
   * パフォーマンス監視
   */
  private monitorPerformance() {
    // 初期ロード時間測定
    if (performance.timing) {
      this.metrics.loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    }

    // メモリ使用量監視
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }

    // バッテリー情報取得（サポート端末のみ）
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.metrics.batteryLevel = battery.level * 100;

        // バッテリー低下時は省電力モード
        if (battery.level < 0.2) {
          this.enablePowerSavingMode();
        }
      }).catch(() => {
        // バッテリーAPI未対応
      });
    }
  }

  /**
   * 要素の遅延読み込み実行
   */
  private loadElement(element: HTMLElement) {
    const dataSrc = element.getAttribute('data-src');
    if (dataSrc) {
      if (element instanceof HTMLImageElement) {
        element.src = dataSrc;
      } else {
        element.style.backgroundImage = `url(${dataSrc})`;
      }
      element.removeAttribute('data-src');
    }
  }

  /**
   * DOM更新のバッチ処理
   */
  public batchDOMUpdates(updates: (() => void)[]) {
    if (!this.config.batchDOMUpdates) {
      updates.forEach(update => update());
      return;
    }

    // 次のフレームで一括実行
    requestAnimationFrame(() => {
      updates.forEach(update => update());
    });
  }

  /**
   * 遅延タスク実行（アイドル時処理）
   */
  public deferTask(task: () => void) {
    if (!this.config.enableDeferredRendering) {
      task();
      return;
    }

    this.deferredTasks.push(task);

    // requestIdleCallback対応端末
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const deferredTask = this.deferredTasks.shift();
        if (deferredTask) deferredTask();
      });
    } else {
      // フォールバック: setTimeout
      setTimeout(() => {
        const deferredTask = this.deferredTasks.shift();
        if (deferredTask) deferredTask();
      }, 100);
    }
  }

  /**
   * 省電力モード有効化
   */
  private enablePowerSavingMode() {
    this.config.enableImageOptimization = false;
    this.config.enableDeferredRendering = true;
    this.config.batchDOMUpdates = true;

    this.logPerformance('Power saving mode enabled', { batteryLevel: this.metrics.batteryLevel });
  }

  /**
   * 遅延読み込み要素の登録
   */
  public registerLazyElement(element: HTMLElement) {
    if (this.observer) {
      this.observer.observe(element);
    }
  }

  /**
   * キャッシュ最適化
   */
  public optimizeCache(key: string, data: any, ttl: number = 300000) { // 5分TTL
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl
    };

    switch (this.config.cacheStrategy) {
      case 'memory':
        // メモリキャッシュ（セッション内のみ）
        (window as any).mobileCache = (window as any).mobileCache || {};
        (window as any).mobileCache[key] = cacheData;
        break;

      case 'sessionStorage':
        try {
          sessionStorage.setItem(`mobile_${key}`, JSON.stringify(cacheData));
        } catch (e) {
          // ストレージ容量不足時のフォールバック
          console.warn('SessionStorage full, falling back to memory cache');
        }
        break;

      case 'hybrid':
        // 小さなデータ: sessionStorage, 大きなデータ: memory
        const dataSize = JSON.stringify(data).length;
        if (dataSize < 50000) { // 50KB未満
          try {
            sessionStorage.setItem(`mobile_${key}`, JSON.stringify(cacheData));
          } catch (e) {
            (window as any).mobileCache = (window as any).mobileCache || {};
            (window as any).mobileCache[key] = cacheData;
          }
        } else {
          (window as any).mobileCache = (window as any).mobileCache || {};
          (window as any).mobileCache[key] = cacheData;
        }
        break;
    }
  }

  /**
   * キャッシュから取得
   */
  public getFromCache(key: string): any | null {
    let cacheData: any = null;

    switch (this.config.cacheStrategy) {
      case 'memory':
        cacheData = (window as any).mobileCache?.[key];
        break;

      case 'sessionStorage':
        try {
          const stored = sessionStorage.getItem(`mobile_${key}`);
          if (stored) {
            cacheData = JSON.parse(stored);
          }
        } catch (e) {
          // パースエラー時は無視
        }
        break;

      case 'hybrid':
        // sessionStorageを先にチェック
        try {
          const stored = sessionStorage.getItem(`mobile_${key}`);
          if (stored) {
            cacheData = JSON.parse(stored);
          }
        } catch (e) {
          // フォールバックでmemoryキャッシュ
          cacheData = (window as any).mobileCache?.[key];
        }
        break;
    }

    if (cacheData) {
      // TTLチェック
      if (Date.now() - cacheData.timestamp > cacheData.ttl) {
        return null; // 期限切れ
      }
      return cacheData.data;
    }

    return null;
  }

  /**
   * パフォーマンスログ出力
   */
  private logPerformance(message: string, data?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MobileOptimizer] ${message}`, {
        metrics: this.metrics,
        config: this.config,
        ...data
      });
    }
  }

  /**
   * メトリクス取得
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 設定更新
   */
  public updateConfig(newConfig: Partial<MobileConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * クリーンアップ
   */
  public destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.deferredTasks = [];
  }
}

// シングルトンインスタンス
export const mobileOptimizer = new MobileOptimizer();

// Vue用コンポーザブル
export const useMobileOptimizer = () => {
  return {
    optimizer: mobileOptimizer,
    batchDOMUpdates: mobileOptimizer.batchDOMUpdates.bind(mobileOptimizer),
    deferTask: mobileOptimizer.deferTask.bind(mobileOptimizer),
    registerLazyElement: mobileOptimizer.registerLazyElement.bind(mobileOptimizer),
    optimizeCache: mobileOptimizer.optimizeCache.bind(mobileOptimizer),
    getFromCache: mobileOptimizer.getFromCache.bind(mobileOptimizer),
    getMetrics: mobileOptimizer.getMetrics.bind(mobileOptimizer)
  };
};

export default MobileOptimizer;
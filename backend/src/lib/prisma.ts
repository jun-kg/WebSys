import { PrismaClient } from '@prisma/client';

// グローバル型定義（開発環境でのホットリロード対応）
declare global {
  var __prisma: PrismaClient | undefined;
}

/**
 * Prismaクライアント統一管理システム
 *
 * 【設計原則】
 * 1. シングルトンパターンによる単一インスタンス保証
 * 2. 開発環境でのホットリロード対応
 * 3. グレースフルシャットダウン対応
 * 4. 水平展開での接続プール最適化
 */
class DatabaseManager {
  private static instance: PrismaClient | null = null;
  private static isInitialized = false;

  /**
   * Prismaクライアントインスタンスを取得
   *
   * @returns {PrismaClient} 初期化済みPrismaクライアント
   * @throws {Error} 初期化に失敗した場合
   */
  public static getInstance(): PrismaClient {
    if (!DatabaseManager.instance || !DatabaseManager.isInitialized) {
      DatabaseManager.initialize();
    }

    if (!DatabaseManager.instance) {
      throw new Error('Failed to initialize Prisma client');
    }

    return DatabaseManager.instance;
  }

  /**
   * Prismaクライアントを初期化
   *
   * @private
   */
  private static initialize(): void {
    try {
      // 開発環境での既存インスタンス再利用
      if (process.env.NODE_ENV === 'development' && global.__prisma) {
        DatabaseManager.instance = global.__prisma;
        DatabaseManager.isInitialized = true;
        console.log('[Prisma] Reusing existing development instance');
        return;
      }

      // 新しいPrismaクライアントインスタンス作成
      DatabaseManager.instance = new PrismaClient({
        log: DatabaseManager.getLogLevel(),
        errorFormat: 'pretty',
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      });

      // 開発環境でグローバルに保存
      if (process.env.NODE_ENV === 'development') {
        global.__prisma = DatabaseManager.instance;
      }

      // グレースフルシャットダウンハンドラー設定
      DatabaseManager.setupShutdownHandlers();

      DatabaseManager.isInitialized = true;
      console.log('[Prisma] Client initialized successfully');

    } catch (error) {
      console.error('[Prisma] Initialization failed:', error);
      throw new Error(`Prisma initialization failed: ${error}`);
    }
  }

  /**
   * 環境に応じたログレベルを取得
   *
   * @private
   * @returns {Array} ログレベル配列
   */
  private static getLogLevel(): Array<'query' | 'info' | 'warn' | 'error'> {
    switch (process.env.NODE_ENV) {
      case 'development':
        return ['query', 'info', 'warn', 'error'];
      case 'test':
        return ['warn', 'error'];
      case 'production':
        return ['error'];
      default:
        return ['error'];
    }
  }

  /**
   * グレースフルシャットダウンハンドラーを設定
   *
   * @private
   */
  private static setupShutdownHandlers(): void {
    const shutdownHandler = async (signal: string) => {
      console.log(`[Prisma] Received ${signal}, shutting down gracefully`);
      await DatabaseManager.disconnect();
      process.exit(0);
    };

    // プロセス終了シグナルハンドラー
    process.on('SIGINT', () => shutdownHandler('SIGINT'));
    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('beforeExit', async () => {
      await DatabaseManager.disconnect();
    });
  }

  /**
   * Prismaクライアント接続を切断
   *
   * @returns {Promise<void>}
   */
  public static async disconnect(): Promise<void> {
    if (DatabaseManager.instance) {
      try {
        await DatabaseManager.instance.$disconnect();
        console.log('[Prisma] Client disconnected successfully');
      } catch (error) {
        console.error('[Prisma] Error during disconnect:', error);
      } finally {
        DatabaseManager.instance = null;
        DatabaseManager.isInitialized = false;

        // 開発環境でグローバル変数もクリア
        if (process.env.NODE_ENV === 'development') {
          global.__prisma = undefined;
        }
      }
    }
  }

  /**
   * データベース接続ヘルスチェック
   *
   * @returns {Promise<boolean>} 接続が正常な場合true
   */
  public static async healthCheck(): Promise<boolean> {
    try {
      const prisma = DatabaseManager.getInstance();
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('[Prisma] Health check failed:', error);
      return false;
    }
  }

  /**
   * 接続統計情報を取得（監視用）
   *
   * @returns {Object} 接続統計情報
   */
  public static getConnectionInfo() {
    return {
      isConnected: !!DatabaseManager.instance && DatabaseManager.isInitialized,
      environment: process.env.NODE_ENV || 'unknown',
      databaseUrl: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':***@'),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * インスタンスを強制的にリセット（テスト用）
   *
   * @private
   */
  public static __resetForTesting(): void {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Reset method is only available in test environment');
    }
    DatabaseManager.instance = null;
    DatabaseManager.isInitialized = false;
  }
}

/**
 * メインのPrismaクライアントエクスポート
 *
 * 【使用方法】
 * import { prisma } from '../lib/prisma';
 * const users = await prisma.users.findMany();
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const instance = DatabaseManager.getInstance();
    const value = instance[prop as keyof PrismaClient];

    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});

// ユーティリティエクスポート
export { DatabaseManager };

// 型エクスポート
export type { PrismaClient } from '@prisma/client';

/**
 * 初期化確認用のヘルパー関数
 *
 * @returns {boolean} 初期化済みの場合true
 */
export const isPrismaReady = (): boolean => {
  try {
    DatabaseManager.getInstance();
    return true;
  } catch {
    return false;
  }
};

// 即座初期化（モジュールロード時）
try {
  DatabaseManager.getInstance();
  console.log('[Prisma] Module loaded and initialized');
} catch (error) {
  console.error('[Prisma] Module initialization failed:', error);
}
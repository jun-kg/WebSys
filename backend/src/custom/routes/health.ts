import { Router, Request, Response } from 'express';
import { SystemHealthService } from '@custom/services/SystemHealthService';
import { authMiddleware } from '@core/middleware/auth';

const router = Router();
const healthService = SystemHealthService.getInstance();

/**
 * 基本ヘルスチェック（認証不要）
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const healthCheck = await healthService.performHealthCheck();
    const responseTime = Date.now() - startTime;

    // レスポンス時間を記録
    healthService.recordRequest(responseTime, false);

    // ステータスコードを適切に設定
    const statusCode = healthCheck.status === 'healthy' ? 200 :
                      healthCheck.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: healthCheck.status !== 'unhealthy',
      data: healthCheck
    });
  } catch (error) {
    healthService.recordRequest(Date.now() - Date.now(), true);
    console.error('Health check endpoint error:', error);
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * 詳細ヘルスチェック（認証必要）
 */
router.get('/health/detailed', authMiddleware, async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    const healthCheck = await healthService.performHealthCheck();
    const responseTime = Date.now() - startTime;

    healthService.recordRequest(responseTime, false);

    res.json({
      success: true,
      data: {
        ...healthCheck,
        internal: {
          requestProcessingTime: responseTime,
          timestamp: new Date().toISOString(),
          version: process.env.APP_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        }
      }
    });
  } catch (error) {
    healthService.recordRequest(Date.now() - Date.now(), true);
    console.error('Detailed health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Detailed health check failed'
    });
  }
});

/**
 * システムメトリクス取得（認証必要）
 */
router.get('/health/metrics', authMiddleware, async (req: Request, res: Response) => {
  try {
    const healthCheck = await healthService.performHealthCheck();

    res.json({
      success: true,
      data: {
        metrics: healthCheck.metrics,
        timestamp: healthCheck.timestamp,
        status: healthCheck.status
      }
    });
  } catch (error) {
    console.error('Metrics endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system metrics'
    });
  }
});

/**
 * ライブネス プローブ（K8s用）
 */
router.get('/health/live', async (req: Request, res: Response) => {
  // アプリケーションが生きているかの簡単チェック
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * レディネス プローブ（K8s用）
 */
router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    // データベース接続確認
    const healthCheck = await healthService.performHealthCheck();
    const isReady = healthCheck.services.database.status !== 'unhealthy';

    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        services: healthCheck.services
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        reason: 'Database connection failed'
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * パフォーマンステスト実行（認証必要・管理者のみ）
 */
router.post('/health/loadtest', authMiddleware, async (req: Request, res: Response) => {
  try {
    // 管理者権限チェック
    const user = (req as any).user;
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const loadTestResults = await healthService.performLoadTest();

    res.json({
      success: true,
      data: {
        ...loadTestResults,
        timestamp: new Date().toISOString(),
        performedBy: user.username
      }
    });
  } catch (error) {
    console.error('Load test error:', error);
    res.status(500).json({
      success: false,
      error: 'Load test failed'
    });
  }
});

/**
 * ヘルスチェック履歴取得（認証必要）
 */
router.get('/health/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    // 複数回のヘルスチェックを実行して履歴を生成
    const history = [];
    const checkCount = parseInt(req.query.count as string) || 5;

    for (let i = 0; i < Math.min(checkCount, 10); i++) {
      const healthCheck = await healthService.performHealthCheck();
      history.push({
        ...healthCheck,
        checkNumber: i + 1
      });

      // 短い間隔を空ける
      if (i < checkCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    res.json({
      success: true,
      data: {
        history,
        summary: {
          totalChecks: history.length,
          healthyCount: history.filter(h => h.status === 'healthy').length,
          degradedCount: history.filter(h => h.status === 'degraded').length,
          unhealthyCount: history.filter(h => h.status === 'unhealthy').length
        }
      }
    });
  } catch (error) {
    console.error('Health history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get health history'
    });
  }
});

export default router;
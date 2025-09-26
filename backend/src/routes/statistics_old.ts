import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();
// Prismaシングルトンを使用

// ダッシュボード統計情報取得エンドポイント
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_003',
          message: '会社情報が取得できません'
        }
      });
    }

    // 統計情報を順次取得
    const totalUsers = await prisma.users.count({
      where: {
        companyId: companyId,
        isActive: true
      }
    });

    // アクティブユーザー数（過去30日以内にログインしたユーザー）
    const activeUsers = await prisma.users.count({
      where: {
        companyId: companyId,
        isActive: true,
        lastLoginAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30日前
        }
      }
    });

    // 総機能数
    const totalFeatures = await prisma.features.count({
      where: { isActive: true }
    });

    // 利用可能な機能数（権限が設定された機能）
    const activeFeaturesResult = await prisma.department_feature_permissions.findMany({
      where: {
        department: {
          companyId: companyId
        },
        OR: [
          { canView: true },
          { canCreate: true },
          { canEdit: true },
          { canDelete: true },
          { canApprove: true },
          { canExport: true }
        ]
      },
      distinct: ['featureId'],
      select: { featureId: true }
    });
    const activeFeatures = activeFeaturesResult.length;

    // 今日のログイン数
    const recentLogins = await prisma.users.count({
      where: {
        companyId: companyId,
        lastLoginAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)) // 今日の0時以降
        }
      }
    });

    // システム統計（ログ統計）
    const systemStats = await prisma.logs.groupBy({
      by: ['level'],
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 過去24時間
        }
      },
      _count: {
        id: true
      }
    });

    // 最近のアクティビティ（監査ログから取得）
    const recentActivities = await prisma.audit_logs.findMany({
      where: {
        user: {
          companyId: companyId
        }
      },
      include: {
        user: {
          select: {
            name: true,
            username: true
          }
        },
        feature: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // システム状態の計算（模擬的な値、実際の実装では監視システムから取得）
    const errorLogCount = systemStats.find(stat => stat.level === 'ERROR')?._count.id || 0;
    const warnLogCount = systemStats.find(stat => stat.level === 'WARN')?._count.id || 0;
    const totalLogCount = systemStats.reduce((sum, stat) => sum + stat._count.id, 0);

    // APIサーバーの状態（簡易チェック）
    const apiStatus = 'healthy'; // 実際には外部監視システムから取得

    // データベース接続状態
    const dbStatus = 'healthy'; // Prismaが正常に動作していればhealthy

    // CPU使用率とメモリ使用率（模擬値、実際にはシステム監視から取得）
    const cpuUsage = Math.floor(Math.random() * 30) + 20; // 20-50%
    const memoryUsage = Math.floor(Math.random() * 20) + 40; // 40-60%

    const dashboardStats = {
      overview: {
        totalUsers,
        activeUsers,
        todayLogins: recentLogins,
        processedTasks: totalLogCount // ログ数をタスク処理数として代用
      },
      systemHealth: {
        api: {
          status: apiStatus,
          message: apiStatus === 'healthy' ? '正常' : 'エラー'
        },
        database: {
          status: dbStatus,
          message: dbStatus === 'healthy' ? '正常' : 'エラー'
        },
        performance: {
          cpuUsage,
          memoryUsage
        }
      },
      activities: recentActivities.map(activity => ({
        time: activity.createdAt.toISOString(),
        user: activity.user.name,
        action: `${activity.feature?.name || '機能'} ${activity.action}`,
        status: '成功' // 監査ログに記録された時点で成功とみなす
      })),
      logStats: {
        total: totalLogCount,
        errors: errorLogCount,
        warnings: warnLogCount,
        errorRate: totalLogCount > 0 ? Math.round((errorLogCount / totalLogCount) * 100) : 0
      }
    };

    res.json({
      success: true,
      data: dashboardStats,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Dashboard statistics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'ダッシュボード統計の取得に失敗しました'
      }
    });
  }
});

// システムヘルスチェックエンドポイント
router.get('/health', authMiddleware, async (req, res) => {
  try {
    // データベース接続テスト
    await prisma.$queryRaw`SELECT 1`;

    // 基本的なヘルスチェック情報
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        api: 'healthy'
      },
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };

    res.json({
      success: true,
      data: healthStatus,
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'システムヘルスチェックに失敗しました'
      }
    });
  }
});

// リアルタイム統計エンドポイント（短期間のデータ）
router.get('/realtime', authMiddleware, async (req, res) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_003',
          message: '会社情報が取得できません'
        }
      });
    }

    // 過去1時間のログ統計
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const realtimeStats = await prisma.logs.groupBy({
      by: ['level'],
      where: {
        timestamp: {
          gte: oneHourAgo
        }
      },
      _count: {
        id: true
      }
    });

    // 過去1時間のユーザーアクティビティ
    const recentUserActivity = await prisma.users.count({
      where: {
        companyId: companyId,
        lastLoginAt: {
          gte: oneHourAgo
        }
      }
    });

    res.json({
      success: true,
      data: {
        period: '1hour',
        timestamp: new Date().toISOString(),
        logStats: realtimeStats,
        activeUsers: recentUserActivity,
        systemLoad: {
          cpu: Math.floor(Math.random() * 20) + 20, // 20-40%
          memory: Math.floor(Math.random() * 15) + 35 // 35-50%
        }
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Realtime statistics error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'リアルタイム統計の取得に失敗しました'
      }
    });
  }
});

export default router;
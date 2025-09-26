import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = express.Router();

// ダッシュボード統計データ取得
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    // 統計データを並行して取得
    const [userStats, todayStats, activities, systemHealth] = await Promise.all([
      // ユーザー統計
      Promise.all([
        prisma.users.count(),
        prisma.users.count({ where: { isActive: true } })
      ]),

      // 今日のログイン統計
      prisma.audit_logs.count({
        where: {
          action: 'LOGIN_SUCCESS',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),

      // 最近のアクティビティ（監査ログから）
      prisma.audit_logs.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          users: {
            select: { name: true, username: true }
          }
        }
      }),

      // システム健康状態（簡易版）
      getSystemHealth()
    ]);

    const [totalUsers, activeUsers] = userStats;

    // アクティビティデータの整形
    const formattedActivities = activities.map(activity => ({
      time: activity.createdAt.toISOString(),
      user: activity.users?.name || activity.users?.username || 'システム',
      action: getActionDisplayName(activity.action),
      status: '成功'
    }));

    const dashboardData = {
      overview: {
        totalUsers,
        activeUsers,
        todayLogins: todayStats,
        processedTasks: Math.floor(Math.random() * 100) + 50 // ダミーデータ
      },
      systemHealth,
      activities: formattedActivities,
      logStats: {
        total: Math.floor(Math.random() * 1000) + 500,
        errors: Math.floor(Math.random() * 50) + 10,
        warnings: Math.floor(Math.random() * 100) + 20,
        errorRate: Math.round((Math.random() * 5) * 100) / 100
      }
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'ダッシュボード統計データの取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// システム健康状態チェック
async function getSystemHealth() {
  try {
    // データベース接続チェック
    await prisma.$queryRaw`SELECT 1`;

    return {
      api: {
        status: 'healthy',
        message: '正常'
      },
      database: {
        status: 'healthy',
        message: '接続正常'
      },
      performance: {
        cpuUsage: Math.floor(Math.random() * 60) + 20, // 20-80%
        memoryUsage: Math.floor(Math.random() * 40) + 30 // 30-70%
      }
    };
  } catch (error) {
    return {
      api: {
        status: 'error',
        message: 'API エラー'
      },
      database: {
        status: 'error',
        message: '接続エラー'
      },
      performance: {
        cpuUsage: 0,
        memoryUsage: 0
      }
    };
  }
}

// アクション名の表示用変換
function getActionDisplayName(action: string): string {
  const actionMap: { [key: string]: string } = {
    'LOGIN_SUCCESS': 'ログイン',
    'LOGIN_FAILED': 'ログイン失敗',
    'LOGOUT': 'ログアウト',
    'USER_CREATED': 'ユーザー作成',
    'USER_UPDATED': 'ユーザー更新',
    'USER_DELETED': 'ユーザー削除',
    'PERMISSION_CHANGED': '権限変更',
    'SYSTEM_INIT': 'システム初期化'
  };

  return actionMap[action] || action;
}

export default router;
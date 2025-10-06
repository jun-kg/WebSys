import { Router } from 'express';
import { Request, Response } from 'express';
import { prisma } from '@core/lib/prisma';
import { authMiddleware } from '@core/middleware/auth';

const router = Router();
// Prismaシングルトンを使用

// 認証ミドルウェアを適用
router.use(authMiddleware);

/**
 * 機能一覧取得
 * GET /api/features
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, parentId, isMenuItem, isActive } = req.query;

    const where: any = {};

    if (category) where.category = category;
    if (parentId) where.parentId = parseInt(parentId as string);
    if (isMenuItem !== undefined) where.isMenuItem = isMenuItem === 'true';
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const features = await prisma.features.findMany({
      where,
      include: {
        features: {
          select: { id: true, name: true, code: true }
        },
        other_features: {
          select: { id: true, name: true, code: true }
        }
      },
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: {
        features
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  } catch (error) {
    console.error('Error fetching features:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバー内部エラーが発生しました'
      }
    });
  }
});

/**
 * 機能カテゴリ一覧取得
 * GET /api/features/categories
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    // カテゴリマスタ定義
    const categoryMaster: Record<string, string> = {
      'SYSTEM': 'システム管理',
      'USER_MGMT': 'ユーザー管理',
      'LOG_MGMT': 'ログ管理',
      'FEATURE_MGMT': '機能管理',
      'REPORT': 'レポート',
      'DASHBOARD': 'ダッシュボード',
      'ADMIN': '管理',
      'GENERAL': '一般',
      'MANAGEMENT': '管理',
      'MONITORING': '監視',
      'CUSTOM': 'カスタム'
    };

    const categoriesRaw = await prisma.features.groupBy({
      by: ['category'],
      _count: true,
      where: {
        isActive: true
      }
    });

    // フロントエンドが期待する形式に変換
    const categories = categoriesRaw.map(cat => ({
      code: cat.category,
      name: categoryMaster[cat.category] || cat.category,
      description: `${categoryMaster[cat.category] || cat.category}カテゴリ`,
      featureCount: cat._count
    }));

    // 定義済みカテゴリのうち、まだ使用されていないものも追加
    const usedCategories = new Set(categoriesRaw.map(cat => cat.category));
    for (const [code, name] of Object.entries(categoryMaster)) {
      if (!usedCategories.has(code)) {
        categories.push({
          code,
          name,
          description: `${name}カテゴリ`,
          featureCount: 0
        });
      }
    }

    // 表示順でソート
    categories.sort((a, b) => {
      const order = ['SYSTEM', 'USER_MGMT', 'LOG_MGMT', 'FEATURE_MGMT', 'ADMIN', 'GENERAL', 'MANAGEMENT', 'MONITORING', 'REPORT', 'DASHBOARD', 'CUSTOM'];
      return order.indexOf(a.code) - order.indexOf(b.code);
    });

    res.json({
      success: true,
      data: {
        categories
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバー内部エラーが発生しました'
      }
    });
  }
});

/**
 * 機能詳細取得
 * GET /api/features/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const featureId = parseInt(req.params.id);

    if (isNaN(featureId)) {
      return res.status(400).json({ error: 'Invalid feature ID' });
    }

    const feature = await prisma.features.findUnique({
      where: { id: featureId },
      include: {
        features: {
          select: { id: true, name: true, code: true }
        },
        other_features: {
          select: { id: true, name: true, code: true, isActive: true }
        },
        department_feature_permissions: {
          include: {
            departments: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!feature) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '指定された機能が見つかりません'
        }
      });
    }

    res.json({
      success: true,
      data: feature,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  } catch (error) {
    console.error('Error fetching feature:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバー内部エラーが発生しました'
      }
    });
  }
});


/**
 * 機能登録
 * POST /api/features
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      code,
      name,
      description,
      category,
      parentId,
      urlPattern,
      apiPattern,
      icon,
      displayOrder,
      isMenuItem
    } = req.body;

    // 必須項目チェック
    if (!code || !name || !category) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'コード、名前、カテゴリは必須項目です'
        }
      });
    }

    // 重複チェック
    const existingFeature = await prisma.features.findUnique({
      where: { code }
    });

    if (existingFeature) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: '指定されたコードは既に存在します'
        }
      });
    }

    // パス生成
    let path = '';
    if (parentId) {
      const parent = await prisma.features.findUnique({
        where: { id: parentId },
        select: { path: true }
      });
      if (parent) {
        path = `${parent.path}/{{id}}`;
      }
    } else {
      path = '/{{id}}';
    }

    const feature = await prisma.features.create({
      data: {
        code,
        name,
        description,
        category,
        parentId,
        path,
        urlPattern,
        apiPattern,
        icon,
        displayOrder: displayOrder ?? 0,
        isMenuItem: isMenuItem ?? true,
        updatedAt: new Date()
      },
      include: {
        other_features: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    // パスの実際のIDで更新
    const finalPath = path.replace('{{id}}', feature.id.toString());
    await prisma.features.update({
      where: { id: feature.id },
      data: { path: finalPath }
    });

    res.status(201).json({
      success: true,
      data: {
        ...feature,
        path: finalPath
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  } catch (error) {
    console.error('Error creating feature:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバー内部エラーが発生しました'
      }
    });
  }
});

/**
 * 機能更新
 * PUT /api/features/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const featureId = parseInt(req.params.id);
    const {
      name,
      description,
      category,
      parentId,
      urlPattern,
      apiPattern,
      icon,
      displayOrder,
      isMenuItem,
      isActive
    } = req.body;

    const existingFeature = await prisma.features.findUnique({
      where: { id: featureId }
    });

    if (!existingFeature) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '指定された機能が見つかりません'
        }
      });
    }

    const feature = await prisma.features.update({
      where: { id: featureId },
      data: {
        name,
        description,
        category,
        parentId,
        urlPattern,
        apiPattern,
        icon,
        displayOrder,
        isMenuItem,
        isActive
      },
      include: {
        features: {
          select: { id: true, name: true, code: true }
        },
        other_features: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    res.json({
      success: true,
      data: feature,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  } catch (error) {
    console.error('Error updating feature:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバー内部エラーが発生しました'
      }
    });
  }
});

/**
 * 機能削除（論理削除）
 * DELETE /api/features/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const featureId = parseInt(req.params.id);

    const existingFeature = await prisma.features.findUnique({
      where: { id: featureId },
      include: {
        other_features: true
      }
    });

    if (!existingFeature) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '指定された機能が見つかりません'
        }
      });
    }

    // 子機能がある場合は削除を拒否
    if (existingFeature.other_features.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REFERENCE_ERROR',
          message: '子機能が存在するため削除できません'
        }
      });
    }

    await prisma.features.update({
      where: { id: featureId },
      data: { isActive: false }
    });

    res.json({
      success: true,
      data: {
        message: '機能を削除しました'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  } catch (error) {
    console.error('Error deleting feature:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバー内部エラーが発生しました'
      }
    });
  }
});

export default router;
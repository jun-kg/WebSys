import { Router } from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// 認証ミドルウェアを適用
router.use(authMiddleware);

/**
 * 部署ツリー取得
 * GET /api/departments/tree
 */
router.get('/tree', async (req: Request, res: Response) => {
  try {
    const { companyId, includeInactive } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '会社IDが必要です'
        }
      });
    }

    const where: any = {
      companyId: parseInt(companyId as string)
    };

    if (includeInactive !== 'true') {
      where.isActive = true;
    }

    const departments = await prisma.department.findMany({
      where,
      include: {
        parent: {
          select: { id: true, name: true }
        },
        _count: {
          select: {
            userDepartments: {
              where: {
                expiredDate: null
              }
            }
          }
        }
      },
      orderBy: [
        { level: 'asc' },
        { displayOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    // ツリー構造に変換
    const tree = buildDepartmentTree(departments);

    res.json({
      success: true,
      data: {
        tree
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  } catch (error) {
    console.error('Error fetching department tree:', error);
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
 * 部署一覧取得（フラット）
 * GET /api/departments
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { companyId, parentId, level, search, page = 1, limit = 50 } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '会社IDが必要です'
        }
      });
    }

    const where: any = {
      companyId: parseInt(companyId as string),
      isActive: true
    };

    if (parentId) where.parentId = parseInt(parentId as string);
    if (level) where.level = parseInt(level as string);
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { nameKana: { contains: search as string } },
        { code: { contains: search as string } }
      ];
    }

    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        include: {
          parent: {
            select: { id: true, name: true, path: true }
          },
          _count: {
            select: {
              userDepartments: {
                where: {
                  expiredDate: null
                }
              },
              children: {
                where: {
                  isActive: true
                }
              }
            }
          }
        },
        orderBy: [
          { level: 'asc' },
          { displayOrder: 'asc' },
          { name: 'asc' }
        ],
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string)
      }),
      prisma.department.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        departments: departments.map(dept => ({
          ...dept,
          userCount: dept._count.userDepartments,
          childDepartments: dept._count.children
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
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
 * 部署詳細取得
 * GET /api/departments/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const departmentId = parseInt(req.params.id);

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        company: {
          select: { id: true, name: true }
        },
        parent: {
          select: { id: true, name: true, path: true }
        },
        children: {
          where: { isActive: true },
          select: { id: true, name: true, code: true, level: true }
        },
        userDepartments: {
          where: {
            expiredDate: null
          },
          include: {
            user: {
              select: { id: true, name: true, email: true, employeeCode: true }
            }
          }
        },
        _count: {
          select: {
            userDepartments: {
              where: {
                expiredDate: null
              }
            }
          }
        }
      }
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '指定された部署が見つかりません'
        }
      });
    }

    const response = {
      ...department,
      users: department.userDepartments.map(ud => ({
        id: ud.user.id,
        name: ud.user.name,
        email: ud.user.email,
        employeeCode: ud.user.employeeCode,
        role: ud.role,
        isPrimary: ud.isPrimary,
        assignedDate: ud.assignedDate
      })),
      totalUsers: department._count.userDepartments,
      childDepartments: department.children.length
    };

    delete response.userDepartments;
    delete response._count;

    res.json({
      success: true,
      data: response,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  } catch (error) {
    console.error('Error fetching department:', error);
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
 * 部署登録
 * POST /api/departments
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { companyId, code, name, nameKana, parentId, displayOrder } = req.body;

    // 必須項目チェック
    if (!companyId || !code || !name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '会社ID、コード、名前は必須項目です'
        }
      });
    }

    // 重複チェック
    const existingDept = await prisma.department.findFirst({
      where: {
        companyId,
        code
      }
    });

    if (existingDept) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: '指定されたコードは既に存在します'
        }
      });
    }

    // レベルとパスの計算
    let level = 1;
    let path = '';

    if (parentId) {
      const parent = await prisma.department.findUnique({
        where: { id: parentId },
        select: { level: true, path: true }
      });

      if (!parent) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '指定された親部署が見つかりません'
          }
        });
      }

      level = parent.level + 1;
      path = `${parent.path}/{{id}}`;
    } else {
      path = '/{{id}}';
    }

    const department = await prisma.department.create({
      data: {
        companyId,
        code,
        name,
        nameKana,
        parentId,
        level,
        path,
        displayOrder: displayOrder ?? 0
      },
      include: {
        parent: {
          select: { id: true, name: true }
        }
      }
    });

    // パスの実際のIDで更新
    const finalPath = path.replace('{{id}}', department.id.toString());
    await prisma.department.update({
      where: { id: department.id },
      data: { path: finalPath }
    });

    res.status(201).json({
      success: true,
      data: {
        ...department,
        path: finalPath
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id']
      }
    });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'サーバー内部エラーが発生しました'
      }
    });
  }
});

// ヘルパー関数：部署ツリー構築
function buildDepartmentTree(departments: any[]): any[] {
  const deptMap = new Map();
  const rootDepts: any[] = [];

  // マップに登録し、初期構造を作成
  departments.forEach(dept => {
    deptMap.set(dept.id, {
      ...dept,
      userCount: dept._count.userDepartments,
      children: []
    });
  });

  // 親子関係を構築
  departments.forEach(dept => {
    if (dept.parentId) {
      const parent = deptMap.get(dept.parentId);
      if (parent) {
        parent.children.push(deptMap.get(dept.id));
      }
    } else {
      rootDepts.push(deptMap.get(dept.id));
    }
  });

  return rootDepts;
}

export default router;
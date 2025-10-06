import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import bcrypt from 'bcryptjs'
import { authMiddleware, requireAdmin } from '@core/middleware/auth'
import { checkDepartmentScope } from '@core/middleware/checkDepartmentScope'
import { prisma } from '@core/lib/prisma'

const router = Router()

// Get all users with pagination (protected)
// ADMIN: GLOBAL（全社ユーザー閲覧）
// MANAGER: DEPARTMENT（部署ユーザー閲覧）
// USER/GUEST: 権限なし（自分のみ GET /:id で閲覧）
router.get('/',
  authMiddleware,
  checkDepartmentScope({ action: 'USER_VIEW' }),
  async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const search = req.query.search as string || ''

    const skip = (page - 1) * pageSize

    // Build where clause for search
    const whereClause = search ? {
      OR: [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } }
      ]
    } : {}

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        where: whereClause,
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          companyId: true,
          companies: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          primaryDepartmentId: true,
          departments: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          employeeCode: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.users.count({ where: whereClause })
    ])

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    })
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'SYS_001',
        message: 'サーバーエラーが発生しました'
      }
    })
  }
})

// Get user by ID (protected)
// ADMIN: GLOBAL（全ユーザー閲覧）
// MANAGER: DEPARTMENT（部署ユーザー閲覧）
// USER: SELF（自分のみ閲覧）
// GUEST: SELF（自分のみ閲覧）
router.get('/:id',
  authMiddleware,
  checkDepartmentScope({ action: 'USER_VIEW', targetUserIdParam: 'id' }),
  async (req, res) => {
  const { id } = req.params

  try {
    const user = await prisma.users.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        primaryDepartmentId: true,
        primaryDepartment: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        employeeCode: true,
        joinDate: true,
        leaveDate: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_001',
          message: 'ユーザーが見つかりません'
        }
      })
    }

    res.json({
      success: true,
      data: { user }
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'SYS_001',
        message: 'サーバーエラーが発生しました'
      }
    })
  }
})

// Create user (admin only)
// ADMIN: GLOBAL（全社ユーザー作成可能）
// MANAGER/USER/GUEST: 権限なし
router.post(
  '/',
  authMiddleware,
  checkDepartmentScope({ action: 'USER_CREATE' }),
  [
    body('username')
      .notEmpty()
      .withMessage('ユーザー名は必須です')
      .isLength({ min: 3, max: 50 })
      .withMessage('ユーザー名は3-50文字で入力してください')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('ユーザー名は英数字とアンダースコアのみ使用できます'),
    body('email')
      .isEmail()
      .withMessage('有効なメールアドレスを入力してください')
      .normalizeEmail(),
    body('password')
      .optional()
      .isLength({ min: 6, max: 128 })
      .withMessage('パスワードは6-128文字で入力してください'),
    body('useDefaultPassword')
      .optional()
      .isBoolean()
      .withMessage('デフォルトパスワード使用フラグはbooleanで指定してください'),
    body('name')
      .notEmpty()
      .withMessage('氏名は必須です')
      .isLength({ min: 1, max: 100 })
      .withMessage('氏名は1-100文字で入力してください'),
    body('companyId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('有効な会社IDを指定してください'),
    body('primaryDepartmentId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('有効な部署IDを指定してください'),
    body('employeeCode')
      .optional()
      .isLength({ max: 50 })
      .withMessage('社員番号は50文字以内で入力してください'),
    body('role')
      .optional()
      .isIn(['ADMIN', 'MANAGER', 'USER', 'GUEST'])
      .withMessage('有効な役割を指定してください')
  ],
  async (req, res) => {
    const {
      username,
      email,
      password,
      useDefaultPassword,
      name,
      companyId,
      primaryDepartmentId,
      employeeCode,
      joinDate,
      role
    } = req.body

    // useDefaultPasswordが指定されている場合はpasswordのバリデーションをスキップ
    const errors = validationResult(req);
    const filteredErrors = errors.array().filter(error => {
      // useDefaultPasswordがtrueの場合、passwordエラーをスキップ
      return !(useDefaultPassword && error.path === 'password');
    });

    if (filteredErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力値が不正です',
          details: filteredErrors
        }
      });
    }

    try {
      // Check if user exists
      const existingUser = await prisma.users.findFirst({
        where: {
          OR: [{ username }, { email }]
        }
      })

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'USER_002',
            message: 'ユーザー名またはメールアドレスは既に使用されています'
          }
        })
      }

      // Validate company and department if provided
      if (companyId) {
        const company = await prisma.companies.findUnique({
          where: { id: companyId }
        })
        if (!company) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'COMPANY_001',
              message: '指定された会社が見つかりません'
            }
          })
        }
      }

      if (primaryDepartmentId) {
        const department = await prisma.departments.findUnique({
          where: { id: primaryDepartmentId }
        })
        if (!department) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'DEPT_001',
              message: '指定された部署が見つかりません'
            }
          })
        }
      }

      // パスワードの設定: デフォルトパスワードまたは指定されたパスワード
      const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || 'Welcome123!'
      const passwordToUse = useDefaultPassword ? DEFAULT_PASSWORD : (password || DEFAULT_PASSWORD)

      // Hash password
      const hashedPassword = await bcrypt.hash(passwordToUse, 12)

      // Create user
      const user = await prisma.users.create({
        data: {
          username,
          email,
          password: hashedPassword,
          name,
          companyId: companyId || null,
          primaryDepartmentId: primaryDepartmentId || null,
          employeeCode: employeeCode || null,
          joinDate: joinDate ? new Date(joinDate) : null,
          isFirstLogin: true, // 新規ユーザーは必ず初回ログインフラグを設定
          role: role || 'USER',
          updatedAt: new Date()
        },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          companyId: true,
          company: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          primaryDepartmentId: true,
          primaryDepartment: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          employeeCode: true,
          joinDate: true,
          role: true,
          isActive: true,
          createdAt: true
        }
      })

      res.status(201).json({
        success: true,
        data: { user },
        message: useDefaultPassword || !password ?
          `ユーザーが作成されました。初期パスワード: ${passwordToUse}` :
          'ユーザーが作成されました。'
      })
    } catch (error) {
      console.error('Create user error:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'SYS_001',
          message: 'サーバーエラーが発生しました'
        }
      })
    }
  }
)

// Update user
// ADMIN: GLOBAL（全ユーザー編集可能）
// MANAGER: DEPARTMENT（部署ユーザー編集可能）
// USER: SELF（自分のみ編集可能）
// GUEST: 権限なし
router.put(
  '/:id',
  authMiddleware,
  checkDepartmentScope({ action: 'USER_EDIT', targetUserIdParam: 'id' }),
  [
    body('username')
      .optional()
      .isLength({ min: 3, max: 50 })
      .withMessage('ユーザー名は3-50文字で入力してください')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('ユーザー名は英数字とアンダースコアのみ使用できます'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('有効なメールアドレスを入力してください')
      .normalizeEmail(),
    body('password')
      .optional()
      .isLength({ min: 6, max: 128 })
      .withMessage('パスワードは6-128文字で入力してください'),
    body('name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('氏名は1-100文字で入力してください'),
    body('companyId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('有効な会社IDを指定してください'),
    body('primaryDepartmentId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('有効な部署IDを指定してください'),
    body('employeeCode')
      .optional()
      .isLength({ max: 50 })
      .withMessage('社員番号は50文字以内で入力してください'),
    body('role')
      .optional()
      .isIn(['ADMIN', 'MANAGER', 'USER', 'GUEST'])
      .withMessage('有効な役割を指定してください'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('有効フラグはtrue/falseで指定してください')
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力値が不正です',
          details: errors.array()
        }
      })
    }

    const { id } = req.params
    const {
      username,
      email,
      password,
      name,
      companyId,
      primaryDepartmentId,
      employeeCode,
      joinDate,
      leaveDate,
      role,
      isActive
    } = req.body

    try {
      // Check if user exists
      const existingUser = await prisma.users.findUnique({
        where: { id: parseInt(id) }
      })

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_001',
            message: 'ユーザーが見つかりません'
          }
        })
      }

      // Check for duplicate username/email if updating
      if (username || email) {
        const duplicateUser = await prisma.users.findFirst({
          where: {
            AND: [
              { id: { not: parseInt(id) } },
              {
                OR: [
                  username ? { username } : {},
                  email ? { email } : {}
                ].filter(condition => Object.keys(condition).length > 0)
              }
            ]
          }
        })

        if (duplicateUser) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'USER_002',
              message: 'ユーザー名またはメールアドレスは既に使用されています'
            }
          })
        }
      }

      // Prepare update data
      const updateData: any = {}
      if (username !== undefined) updateData.username = username
      if (email !== undefined) updateData.email = email
      if (name !== undefined) updateData.name = name
      if (companyId !== undefined) updateData.companyId = companyId
      if (primaryDepartmentId !== undefined) updateData.primaryDepartmentId = primaryDepartmentId
      if (employeeCode !== undefined) updateData.employeeCode = employeeCode
      if (joinDate !== undefined) updateData.joinDate = joinDate ? new Date(joinDate) : null
      if (leaveDate !== undefined) updateData.leaveDate = leaveDate ? new Date(leaveDate) : null
      if (role !== undefined) updateData.role = role
      if (isActive !== undefined) updateData.isActive = isActive

      // Hash password if provided
      if (password) {
        updateData.password = await bcrypt.hash(password, 12)
      }

      // Update user
      const user = await prisma.users.update({
        where: { id: parseInt(id) },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          companyId: true,
          company: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          primaryDepartmentId: true,
          primaryDepartment: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          employeeCode: true,
          joinDate: true,
          leaveDate: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          updatedAt: true
        }
      })

      res.json({
        success: true,
        data: { user },
        message: 'ユーザー情報を更新しました'
      })
    } catch (error) {
      console.error('Update user error:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'SYS_001',
          message: 'サーバーエラーが発生しました'
        }
      })
    }
  }
)

// Delete user (admin only)
// ADMIN: GLOBAL（全ユーザー削除可能）
// MANAGER/USER/GUEST: 権限なし
router.delete('/:id',
  authMiddleware,
  checkDepartmentScope({ action: 'USER_DELETE', targetUserIdParam: 'id' }),
  async (req, res) => {
  const { id } = req.params

  try {
    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { id: parseInt(id) }
    })

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_001',
          message: 'ユーザーが見つかりません'
        }
      })
    }

    // Soft delete by setting isActive to false instead of hard delete
    await prisma.users.update({
      where: { id: parseInt(id) },
      data: {
        isActive: false,
        leaveDate: new Date()
      }
    })

    res.json({
      success: true,
      message: 'ユーザーを無効化しました'
    })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'SYS_001',
        message: 'サーバーエラーが発生しました'
      }
    })
  }
})

// Get companies and departments for user form
router.get('/form-data/companies-departments', authMiddleware, async (req, res) => {
  try {
    const [companies, departments] = await Promise.all([
      prisma.companies.findMany({
        where: { isActive: true },
        select: {
          id: true,
          code: true,
          name: true
        },
        orderBy: { name: 'asc' }
      }),
      prisma.departments.findMany({
        where: { isActive: true },
        select: {
          id: true,
          companyId: true,
          code: true,
          name: true
        },
        orderBy: [{ companyId: 'asc' }, { name: 'asc' }]
      })
    ])

    res.json({
      success: true,
      data: {
        companies,
        departments
      }
    })
  } catch (error) {
    console.error('Get form data error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'SYS_001',
        message: 'サーバーエラーが発生しました'
      }
    })
  }
})

export default router
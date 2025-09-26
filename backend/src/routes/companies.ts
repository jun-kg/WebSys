import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { authMiddleware, requireAdmin } from '../middleware/auth'
import { prisma } from '../lib/prisma'

const router = Router()

// Get all companies with pagination (protected)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10
    const search = req.query.search as string || ''

    const skip = (page - 1) * pageSize

    // Build where clause for search
    const whereClause = search ? {
      AND: [
        { isActive: true },
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } }
          ]
        }
      ]
    } : { isActive: true }

    const [companies, total] = await Promise.all([
      prisma.companies.findMany({
        where: whereClause,
        select: {
          id: true,
          code: true,
          name: true,
          nameKana: true,
          industry: true,
          establishedDate: true,
          employeeCount: true,
          address: true,
          phone: true,
          email: true,
          contractPlan: true,
          maxUsers: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              users: true,
              departments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.companies.count({ where: whereClause })
    ])

    res.json({
      success: true,
      data: {
        companies,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      }
    })
  } catch (error) {
    console.error('Get companies error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'SYS_001',
        message: 'サーバーエラーが発生しました'
      }
    })
  }
})

// Get company by ID (protected)
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params

  try {
    const company = await prisma.companies.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        code: true,
        name: true,
        nameKana: true,
        industry: true,
        establishedDate: true,
        employeeCount: true,
        address: true,
        phone: true,
        email: true,
        contractPlan: true,
        maxUsers: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        departments: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true
          },
          where: { isActive: true }
        },
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            role: true,
            isActive: true
          },
          where: { isActive: true }
        }
      }
    })

    if (!company) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COMPANY_001',
          message: '会社が見つかりません'
        }
      })
    }

    res.json({
      success: true,
      data: { company }
    })
  } catch (error) {
    console.error('Get company error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'SYS_001',
        message: 'サーバーエラーが発生しました'
      }
    })
  }
})

// Create company (admin only)
router.post(
  '/',
  authMiddleware,
  requireAdmin,
  [
    body('code')
      .notEmpty()
      .withMessage('会社コードは必須です')
      .isLength({ min: 2, max: 20 })
      .withMessage('会社コードは2-20文字で入力してください')
      .matches(/^[A-Z0-9_]+$/)
      .withMessage('会社コードは大文字英数字とアンダースコアのみ使用できます'),
    body('name')
      .notEmpty()
      .withMessage('会社名は必須です')
      .isLength({ min: 1, max: 100 })
      .withMessage('会社名は1-100文字で入力してください'),
    body('address')
      .optional()
      .isLength({ max: 255 })
      .withMessage('住所は255文字以内で入力してください'),
    body('phone')
      .optional()
      .matches(/^[0-9-+()]*$/)
      .withMessage('電話番号は数字とハイフン、プラス、括弧のみ使用できます')
      .isLength({ max: 20 })
      .withMessage('電話番号は20文字以内で入力してください'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('有効なメールアドレスを入力してください')
      .normalizeEmail(),
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

    const { code, name, address, phone, email } = req.body

    try {
      // Check if company code already exists
      const existingCompany = await prisma.companies.findFirst({
        where: { code }
      })

      if (existingCompany) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'COMPANY_002',
            message: '会社コードは既に使用されています'
          }
        })
      }

      // Create company
      const company = await prisma.companies.create({
        data: {
          code,
          name,
          address: address || null,
          phone: phone || null,
          email: email || null,
        },
        select: {
          id: true,
          code: true,
          name: true,
          address: true,
          phone: true,
          email: true,
          isActive: true,
          createdAt: true
        }
      })

      res.status(201).json({
        success: true,
        data: { company },
        message: '会社を作成しました'
      })
    } catch (error) {
      console.error('Create company error:', error)
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

// Update company (admin only)
router.put(
  '/:id',
  authMiddleware,
  requireAdmin,
  [
    body('code')
      .optional()
      .isLength({ min: 2, max: 20 })
      .withMessage('会社コードは2-20文字で入力してください')
      .matches(/^[A-Z0-9_]+$/)
      .withMessage('会社コードは大文字英数字とアンダースコアのみ使用できます'),
    body('name')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('会社名は1-100文字で入力してください'),
    body('address')
      .optional()
      .isLength({ max: 255 })
      .withMessage('住所は255文字以内で入力してください'),
    body('phone')
      .optional()
      .matches(/^[0-9-+()]*$/)
      .withMessage('電話番号は数字とハイフン、プラス、括弧のみ使用できます')
      .isLength({ max: 20 })
      .withMessage('電話番号は20文字以内で入力してください'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('有効なメールアドレスを入力してください')
      .normalizeEmail(),
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
    const { code, name, address, phone, email, isActive } = req.body

    try {
      // Check if company exists
      const existingCompany = await prisma.companies.findUnique({
        where: { id: parseInt(id) }
      })

      if (!existingCompany) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'COMPANY_001',
            message: '会社が見つかりません'
          }
        })
      }

      // Check for duplicate code if updating
      if (code) {
        const duplicateCompany = await prisma.companies.findFirst({
          where: {
            AND: [
              { id: { not: parseInt(id) } },
              { code }
            ]
          }
        })

        if (duplicateCompany) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'COMPANY_002',
              message: '会社コードは既に使用されています'
            }
          })
        }
      }

      // Prepare update data
      const updateData: any = {}
      if (code !== undefined) updateData.code = code
      if (name !== undefined) updateData.name = name
      if (address !== undefined) updateData.address = address
      if (phone !== undefined) updateData.phone = phone
      if (email !== undefined) updateData.email = email
      if (isActive !== undefined) updateData.isActive = isActive

      // Update company
      const company = await prisma.companies.update({
        where: { id: parseInt(id) },
        data: updateData,
        select: {
          id: true,
          code: true,
          name: true,
          address: true,
          phone: true,
          email: true,
          isActive: true,
          updatedAt: true
        }
      })

      res.json({
        success: true,
        data: { company },
        message: '会社情報を更新しました'
      })
    } catch (error) {
      console.error('Update company error:', error)
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

// Delete company (admin only) - Soft delete
router.delete('/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params

  try {
    // Check if company exists
    const existingCompany = await prisma.companies.findUnique({
      where: { id: parseInt(id) },
      include: {
        users: { where: { isActive: true } },
        departments: { where: { isActive: true } }
      }
    })

    if (!existingCompany) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COMPANY_001',
          message: '会社が見つかりません'
        }
      })
    }

    // Check if company has active users or departments
    if (existingCompany.users.length > 0 || existingCompany.departments.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'COMPANY_003',
          message: 'アクティブなユーザーまたは部署が存在するため、会社を削除できません'
        }
      })
    }

    // Soft delete by setting isActive to false
    await prisma.companies.update({
      where: { id: parseInt(id) },
      data: { isActive: false }
    })

    res.json({
      success: true,
      message: '会社を無効化しました'
    })
  } catch (error) {
    console.error('Delete company error:', error)
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
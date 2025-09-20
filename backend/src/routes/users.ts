import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()
const prisma = new PrismaClient()

// Get all users (protected)
router.get('/', authenticate, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        department: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    res.json(users)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

// Get user by ID (protected)
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        department: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return res.status(404).json({ message: 'ユーザーが見つかりません' })
    }

    res.json(user)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

// Create user (admin only)
router.post(
  '/',
  authenticate,
  authorize(['ADMIN']),
  [
    body('username').notEmpty().withMessage('ユーザー名は必須です'),
    body('email').isEmail().withMessage('有効なメールアドレスを入力してください'),
    body('password').isLength({ min: 6 }).withMessage('パスワードは6文字以上である必要があります'),
    body('name').notEmpty().withMessage('氏名は必須です')
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { username, email, password, name, department, role } = req.body

    try {
      // Check if user exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ username }, { email }]
        }
      })

      if (existingUser) {
        return res.status(400).json({ message: 'ユーザー名またはメールアドレスは既に使用されています' })
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      // Create user
      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          name,
          department: department || null,
          role: role || 'USER'
        },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          department: true,
          role: true,
          isActive: true
        }
      })

      res.status(201).json(user)
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: 'サーバーエラーが発生しました' })
    }
  }
)

// Update user (admin only)
router.put(
  '/:id',
  authenticate,
  authorize(['ADMIN']),
  [
    body('email').optional().isEmail().withMessage('有効なメールアドレスを入力してください'),
    body('password').optional().isLength({ min: 6 }).withMessage('パスワードは6文字以上である必要があります')
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { id } = req.params
    const { username, email, password, name, department, role, isActive } = req.body

    try {
      // Prepare update data
      const updateData: any = {}
      if (username !== undefined) updateData.username = username
      if (email !== undefined) updateData.email = email
      if (name !== undefined) updateData.name = name
      if (department !== undefined) updateData.department = department
      if (role !== undefined) updateData.role = role
      if (isActive !== undefined) updateData.isActive = isActive

      // Hash password if provided
      if (password) {
        updateData.password = await bcrypt.hash(password, 10)
      }

      // Update user
      const user = await prisma.user.update({
        where: { id: parseInt(id) },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          department: true,
          role: true,
          isActive: true
        }
      })

      res.json(user)
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: 'サーバーエラーが発生しました' })
    }
  }
)

// Delete user (admin only)
router.delete('/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { id } = req.params

  try {
    await prisma.user.delete({
      where: { id: parseInt(id) }
    })

    res.json({ message: 'ユーザーを削除しました' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'サーバーエラーが発生しました' })
  }
})

export default router
import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// Login
router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('ユーザー名は必須です'),
    body('password').notEmpty().withMessage('パスワードは必須です')
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { username, password } = req.body

    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { username }
      })

      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'ユーザー名またはパスワードが正しくありません' })
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password)
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'ユーザー名またはパスワードが正しくありません' })
      }

      // Generate token
      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          role: user.role
        },
        process.env.JWT_SECRET!,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      )

      // Return user info and token
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          department: user.department,
          role: user.role
        }
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: 'サーバーエラーが発生しました' })
    }
  }
)

// Register (for initial setup)
router.post(
  '/register',
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

    const { username, email, password, name, department } = req.body

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
          role: 'USER'
        }
      })

      // Generate token
      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          role: user.role
        },
        process.env.JWT_SECRET!,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        }
      )

      res.status(201).json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          department: user.department,
          role: user.role
        }
      })
    } catch (error) {
      console.error(error)
      res.status(500).json({ message: 'サーバーエラーが発生しました' })
    }
  }
)

export default router
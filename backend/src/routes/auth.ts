import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/AuthService';
import { authMiddleware, getClientInfo } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();
const authService = new AuthService();

// ログイン試行制限
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回の試行
  message: {
    success: false,
    error: {
      code: 'AUTH_006',
      message: 'ログイン試行回数が上限に達しました。15分後に再試行してください。'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ip = ipKeyGenerator(req);
    const username = req.body.username || 'unknown';
    return `${ip}:${username}`;
  }
});

// Login
router.post(
  '/login',
  loginRateLimit,
  [
    body('username')
      .notEmpty()
      .withMessage('ユーザー名は必須です')
      .isLength({ min: 1, max: 50 })
      .withMessage('ユーザー名は1-50文字で入力してください'),
    body('password')
      .notEmpty()
      .withMessage('パスワードは必須です')
      .isLength({ min: 1, max: 128 })
      .withMessage('パスワードは1-128文字で入力してください')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力値が不正です',
          details: errors.array()
        }
      });
    }

    const { username, password } = req.body;
    const clientInfo = getClientInfo(req);

    try {
      const result = await authService.login(
        { username, password },
        clientInfo
      );

      if (result.success) {
        res.json({
          success: true,
          data: {
            token: result.token,
            user: result.user,
            expiresIn: result.expiresIn
          }
        });
      } else {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_001',
            message: result.error
          }
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SYS_001',
          message: 'サーバーエラーが発生しました'
        }
      });
    }
  }
);

// Logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    if (req.token) {
      await authService.logout(req.token);
    }

    res.json({
      success: true,
      data: {
        message: 'ログアウトしました'
      }
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYS_001',
        message: 'ログアウトに失敗しました'
      }
    });
  }
});

// Token verification
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Authorization header missing'
        }
      });
    }

    const token = authHeader.substring(7);
    const result = await authService.verifyToken(token);

    if (result.isValid) {
      res.json({
        success: true,
        data: {
          user: result.user,
          expiresIn: result.expiresIn
        }
      });
    } else {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_003',
          message: result.error
        }
      });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYS_001',
        message: 'トークン検証に失敗しました'
      }
    });
  }
});

// Register (for initial setup)
router.post(
  '/register',
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
      .isLength({ min: 6, max: 128 })
      .withMessage('パスワードは6-128文字で入力してください'),
    body('name')
      .notEmpty()
      .withMessage('氏名は必須です')
      .isLength({ min: 1, max: 100 })
      .withMessage('氏名は1-100文字で入力してください')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力値が不正です',
          details: errors.array()
        }
      });
    }

    const { username, email, password, name } = req.body;

    try {
      // Check if user exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ username }, { email }]
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'USER_002',
            message: 'ユーザー名またはメールアドレスは既に使用されています'
          }
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          name,
          role: 'USER'
        }
      });

      // Auto-login after registration
      const clientInfo = getClientInfo(req);
      const loginResult = await authService.login(
        { username, password },
        clientInfo
      );

      if (loginResult.success) {
        res.status(201).json({
          success: true,
          data: {
            token: loginResult.token,
            user: loginResult.user,
            expiresIn: loginResult.expiresIn,
            message: 'ユーザー登録が完了しました'
          }
        });
      } else {
        res.status(201).json({
          success: true,
          data: {
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              name: user.name,
              role: user.role
            },
            message: 'ユーザー登録が完了しました。ログインしてください。'
          }
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SYS_001',
          message: 'サーバーエラーが発生しました'
        }
      });
    }
  }
);

export default router;
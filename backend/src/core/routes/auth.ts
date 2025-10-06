import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { prisma } from '@core/lib/prisma';
import { AuthService } from '../services/AuthService';
import { securityService } from '../services/SecurityService';
import { authMiddleware, getClientInfo } from '../middleware/auth';
import { log, LogCategory } from '../utils/logger';

const router = Router();
const authService = new AuthService();

// ログイン試行制限 - 一時的に緩和
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100回の試行（テスト用）
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
  async (req: Request, res: Response) => {
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
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user,
            accessExpiresIn: result.accessExpiresIn,
            refreshExpiresIn: result.refreshExpiresIn,
            isFirstLogin: result.isFirstLogin,
            requirePasswordChange: result.requirePasswordChange
          }
        });

        log.info(LogCategory.AUTH, `Login successful: ${username}`, {
          userId: result.user?.id,
          ipAddress: clientInfo.ipAddress
        });
      } else {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_001',
            message: result.error
          }
        });

        log.warn(LogCategory.AUTH, `Login failed: ${username}`, {
          error: result.error,
          ipAddress: clientInfo.ipAddress
        });
      }
    } catch (error) {
      log.error(LogCategory.AUTH, 'Login endpoint error', error as Error);
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

// Refresh Token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_MISSING',
          message: 'リフレッシュトークンが必要です'
        }
      });
    }

    const clientInfo = getClientInfo(req);
    const result = await securityService.refreshAccessToken(refreshToken, clientInfo.ipAddress);

    if (result.isValid && result.newAccessToken) {
      res.json({
        success: true,
        data: {
          accessToken: result.newAccessToken,
          expiresIn: 15 * 60 // 15分
        }
      });

      log.info(LogCategory.AUTH, 'Token refresh successful', {
        userId: result.payload?.userId,
        ipAddress: clientInfo.ipAddress
      });
    } else {
      res.status(401).json({
        success: false,
        error: {
          code: 'REFRESH_TOKEN_INVALID',
          message: result.error || 'リフレッシュトークンが無効です'
        }
      });

      log.warn(LogCategory.AUTH, 'Token refresh failed', {
        error: result.error,
        errorCode: result.errorCode,
        ipAddress: clientInfo.ipAddress
      });
    }

  } catch (error) {
    log.error(LogCategory.AUTH, 'Refresh endpoint error', error as Error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYS_001',
        message: 'システムエラーが発生しました'
      }
    });
  }
});

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

// パスワード変更（初回ログイン時・通常変更）
router.post(
  '/change-password',
  authMiddleware,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('現在のパスワードは必須です'),
    body('newPassword')
      .isLength({ min: 6, max: 128 })
      .withMessage('新しいパスワードは6-128文字で入力してください')
      .custom((value, { req }) => value !== req.body.currentPassword)
      .withMessage('新しいパスワードは現在のパスワードと異なる必要があります')
  ],
  async (req: Request, res: Response) => {
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

    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_002',
          message: '認証が必要です'
        }
      });
    }

    try {
      // ユーザー情報取得
      const user = await prisma.users.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'ユーザーが見つかりません'
          }
        });
      }

      // 現在のパスワード確認
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_PASSWORD',
            message: '現在のパスワードが正しくありません'
          }
        });
      }

      // 新しいパスワードをハッシュ化
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // パスワード更新と初回ログインフラグのリセット
      await prisma.users.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          isFirstLogin: false,
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        message: 'パスワードが正常に変更されました'
      });
    } catch (error) {
      console.error('パスワード変更エラー:', error);
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

// パスワードリセットリクエスト（メール送信）
router.post(
  '/request-password-reset',
  [
    body('email')
      .isEmail()
      .withMessage('有効なメールアドレスを入力してください')
      .normalizeEmail()
  ],
  async (req: Request, res: Response) => {
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

    const { email } = req.body;

    try {
      // ユーザー存在確認
      const user = await prisma.users.findUnique({
        where: { email }
      });

      // セキュリティのため、ユーザーが存在しない場合も成功を返す
      if (!user) {
        return res.json({
          success: true,
          message: 'パスワードリセット用のメールを送信しました（該当するアカウントがある場合）'
        });
      }

      // リセットトークン生成
      const crypto = await import('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiry = new Date();
      resetExpiry.setHours(resetExpiry.getHours() + 1); // 1時間有効

      // トークンを保存
      await prisma.users.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpiry: resetExpiry
        }
      });

      // メール送信実装
      const { emailService } = await import('../utils/email');
      const emailSent = await emailService.sendPasswordResetEmail(email, resetToken, user.username);

      if (!emailSent) {
        console.warn(`Failed to send password reset email to ${email}`);
      }

      res.json({
        success: true,
        message: 'パスワードリセット用のメールを送信しました（該当するアカウントがある場合）',
        // 開発環境のみトークンを返す
        ...(process.env.NODE_ENV === 'development' && { resetToken })
      });
    } catch (error) {
      console.error('パスワードリセットリクエストエラー:', error);
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

// パスワードリセット実行
router.post(
  '/reset-password',
  [
    body('token')
      .notEmpty()
      .withMessage('リセットトークンは必須です'),
    body('newPassword')
      .isLength({ min: 6, max: 128 })
      .withMessage('新しいパスワードは6-128文字で入力してください')
  ],
  async (req: Request, res: Response) => {
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

    const { token, newPassword } = req.body;

    try {
      // トークンでユーザーを検索
      const user = await prisma.users.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpiry: {
            gt: new Date()
          }
        }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'リセットトークンが無効または期限切れです'
          }
        });
      }

      // 新しいパスワードをハッシュ化
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // パスワード更新とトークンクリア
      await prisma.users.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiry: null,
          isFirstLogin: false,
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        message: 'パスワードが正常にリセットされました'
      });
    } catch (error) {
      console.error('パスワードリセットエラー:', error);
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
  async (req: Request, res: Response) => {
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
      const existingUser = await prisma.users.findFirst({
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
      const user = await prisma.users.create({
        data: {
          username,
          email,
          password: hashedPassword,
          name,
          role: 'USER',
          createdAt: new Date(),
          updatedAt: new Date()
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
            accessToken: loginResult.accessToken,
            refreshToken: loginResult.refreshToken,
            user: loginResult.user,
            accessExpiresIn: loginResult.accessExpiresIn,
            refreshExpiresIn: loginResult.refreshExpiresIn,
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

// Security Health (Admin only)
router.get('/security/health', authMiddleware, async (req, res) => {
  try {
    // 管理者権限チェック
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: '管理者権限が必要です'
        }
      });
    }

    const health = securityService.getSecurityHealth();

    res.json({
      success: true,
      data: {
        security: health,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    log.error(LogCategory.AUTH, 'Security health endpoint error', error as Error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYS_001',
        message: 'システムエラーが発生しました'
      }
    });
  }
});

export default router;
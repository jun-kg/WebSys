import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { Request, Response, NextFunction } from 'express'

// セキュリティヘッダー設定
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
})

// レート制限設定
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // リクエスト上限
  message: {
    error: 'Too many requests',
    message: 'リクエストが多すぎます。しばらく待ってから再試行してください。'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// 認証API用の厳しいレート制限
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // ログイン試行回数制限
  message: {
    error: 'Too many login attempts',
    message: 'ログイン試行回数が多すぎます。15分後に再試行してください。'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
})

// 管理者API用レート制限
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 200, // 管理者は制限緩和
  message: {
    error: 'Too many admin requests',
    message: '管理者APIのリクエストが多すぎます。'
  },
  standardHeaders: true,
  legacyHeaders: false
})

// IPアドレス取得ミドルウェア
export const getClientIP = (req: Request, res: Response, next: NextFunction) => {
  const forwarded = req.headers['x-forwarded-for'] as string
  const ip = forwarded ? forwarded.split(',')[0] : req.connection.remoteAddress
  req.ip = ip || 'unknown'
  next()
}

// セキュリティログミドルウェア
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - startTime
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.userId || null
    }

    // セキュリティ関連のエンドポイントをログ
    if (req.url.includes('/auth/') || req.url.includes('/admin/')) {
      console.log('SECURITY_LOG:', JSON.stringify(logData))
    }
  })

  next()
}
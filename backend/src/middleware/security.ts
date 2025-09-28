/**
 * Security Middleware
 * セキュリティミドルウェア - セキュリティヘッダー・CSRF・XSS対策
 *
 * 機能:
 * - セキュリティヘッダー設定
 * - CORS・CSP・HSTS対応
 * - XSS・CSRF対策
 * - IP・User-Agent検証
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { log, LogCategory } from '../utils/logger';

interface SecurityConfig {
  corsOrigins: string[];
  cspDirectives: Record<string, string[]>;
  rateLimits: {
    general: { windowMs: number; max: number };
    auth: { windowMs: number; max: number };
    api: { windowMs: number; max: number };
  };
}

const defaultConfig: SecurityConfig = {
  corsOrigins: [
    'http://localhost:3000',
    'https://localhost:3000',
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ].filter(Boolean),

  cspDirectives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Vue開発時必要
      "'unsafe-eval'",   // Vue開発時必要
      'https://fonts.gstatic.com'
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'",
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ],
    fontSrc: [
      "'self'",
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ],
    imgSrc: [
      "'self'",
      'data:',
      'https:'
    ],
    connectSrc: [
      "'self'",
      'http://localhost:8000',
      'https://localhost:8000',
      'ws://localhost:3000',
      'wss://localhost:3000'
    ],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"]
  },

  rateLimits: {
    general: {
      windowMs: 15 * 60 * 1000, // 15分
      max: 1000 // 一般的なリクエスト
    },
    auth: {
      windowMs: 15 * 60 * 1000, // 15分
      max: 10 // 認証関連
    },
    api: {
      windowMs: 1 * 60 * 1000, // 1分
      max: 100 // API呼び出し
    }
  }
};

/**
 * セキュリティヘッダー設定
 */
export const securityHeaders = (config: Partial<SecurityConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config };

  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: finalConfig.cspDirectives,
      reportOnly: process.env.NODE_ENV === 'development'
    },

    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1年
      includeSubDomains: true,
      preload: true
    },

    // X-Frame-Options
    frameguard: {
      action: 'deny'
    },

    // X-Content-Type-Options
    noSniff: true,

    // X-XSS-Protection
    xssFilter: true,

    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    },


    // Hide X-Powered-By
    hidePoweredBy: true,

    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production',

    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: {
      policy: 'same-origin'
    },

    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    },

    // Origin-Agent-Cluster
    originAgentCluster: true,

    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false
    },

  });
};

/**
 * CORS設定
 */
export const corsMiddleware = (config: Partial<SecurityConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    // Development環境では全てのオリジンを許可
    if (process.env.NODE_ENV === 'development') {
      res.header('Access-Control-Allow-Origin', origin || '*');
    } else {
      // Production環境では許可されたオリジンのみ
      if (origin && finalConfig.corsOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
      }
    }

    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token');
    res.header('Access-Control-Max-Age', '86400'); // 24時間

    // Preflight request handling
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    next();
  };
};

/**
 * 一般的なレート制限
 */
export const generalRateLimit = (config: Partial<SecurityConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config };

  return rateLimit({
    windowMs: finalConfig.rateLimits.general.windowMs,
    max: finalConfig.rateLimits.general.max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'リクエスト制限に達しました。しばらく時間をおいてから再試行してください。'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      log.security('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        url: req.url,
        method: req.method
      });
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'リクエスト制限に達しました。しばらく時間をおいてから再試行してください。'
        }
      });
    }
  });
};

/**
 * 認証用レート制限
 */
export const authRateLimit = (config: Partial<SecurityConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config };

  return rateLimit({
    windowMs: finalConfig.rateLimits.auth.windowMs,
    max: finalConfig.rateLimits.auth.max,
    message: {
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: '認証試行回数が上限に達しました。15分後に再試行してください。'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const username = req.body?.username || 'unknown';
      return `auth:${req.ip}:${username}`;
    },
    handler: (req, res, next) => {
      log.security('Auth rate limit exceeded', {
        ip: req.ip,
        username: req.body?.username,
        userAgent: req.headers['user-agent']
      });
      res.status(429).json({
        success: false,
        error: {
          code: 'AUTH_RATE_LIMIT_EXCEEDED',
          message: '認証試行回数が上限に達しました。15分後に再試行してください。'
        }
      });
    }
  });
};

/**
 * API用レート制限
 */
export const apiRateLimit = (config: Partial<SecurityConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config };

  return rateLimit({
    windowMs: finalConfig.rateLimits.api.windowMs,
    max: finalConfig.rateLimits.api.max,
    message: {
      success: false,
      error: {
        code: 'API_RATE_LIMIT_EXCEEDED',
        message: 'API呼び出し制限に達しました。1分後に再試行してください。'
      }
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

/**
 * 悪意のあるリクエスト検知
 */
export const maliciousRequestDetection = (req: Request, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    // SQLインジェクション
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i,
    // XSSパターン
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    // パストラバーサル
    /\.\.(\/|\\)/,
    // コマンドインジェクション
    /(\;|\||\&|\$\(|\`)/
  ];

  const userAgent = req.headers['user-agent'] || '';
  const requestBody = JSON.stringify(req.body);
  const queryString = JSON.stringify(req.query);
  const url = req.url;

  // User-Agent検証
  if (!userAgent || userAgent.length < 10) {
    log.security('Suspicious request: Invalid User-Agent', {
      ip: req.ip,
      userAgent,
      url
    });
  }

  // 悪意のあるパターンチェック
  const allContent = `${requestBody} ${queryString} ${url}`;
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(allContent)) {
      log.security('Malicious request detected', {
        ip: req.ip,
        userAgent,
        url,
        method: req.method,
        pattern: pattern.toString()
      });

      return res.status(400).json({
        success: false,
        error: {
          code: 'MALICIOUS_REQUEST',
          message: '不正なリクエストが検出されました。'
        }
      });
    }
  }

  next();
};

/**
 * IP ホワイトリスト（管理機能用）
 */
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress;

    // Development環境では全てのIPを許可
    if (process.env.NODE_ENV === 'development') {
      return next();
    }

    if (!clientIP || !allowedIPs.includes(clientIP)) {
      log.security('IP not in whitelist', {
        ip: clientIP,
        userAgent: req.headers['user-agent'],
        url: req.url
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'IP_NOT_ALLOWED',
          message: 'アクセスが許可されていないIPアドレスです。'
        }
      });
    }

    next();
  };
};

/**
 * リクエストサイズ制限
 */
export const requestSizeLimit = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxBytes = parseSize(maxSize);

    if (contentLength > maxBytes) {
      log.security('Request size limit exceeded', {
        ip: req.ip,
        contentLength,
        maxBytes,
        url: req.url
      });

      return res.status(413).json({
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: 'リクエストサイズが制限を超えています。'
        }
      });
    }

    next();
  };
};

/**
 * ヘルパー関数
 */
function parseSize(size: string): number {
  const units: Record<string, number> = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';

  return Math.floor(value * units[unit]);
}

/**
 * セキュリティミドルウェア統合
 */
export const applySecurity = (app: any, config: Partial<SecurityConfig> = {}) => {
  // セキュリティヘッダー
  app.use(securityHeaders(config));

  // CORS
  app.use(corsMiddleware(config));

  // 一般的なレート制限
  app.use(generalRateLimit(config));

  // リクエストサイズ制限
  app.use(requestSizeLimit());

  // 悪意のあるリクエスト検知
  app.use(maliciousRequestDetection);

  log.info(LogCategory.SEC, 'Security middleware applied');
};
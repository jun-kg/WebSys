import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/AuthService';
import { User, UserRole } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
}

interface ClientInfo {
  ipAddress: string;
  userAgent?: string;
}

interface JwtPayload {
  userId: number;
  username: string;
  role: string;
  companyId?: number;
  departmentId?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      token?: string;
    }
  }
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
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
    const authService = new AuthService();

    const verificationResult = await authService.verifyToken(token);

    if (!verificationResult.isValid) {
      // エラーコードに基づいて適切なHTTPステータスを返す
      const errorCode = verificationResult.errorCode || 'AUTH_003';

      // より詳細なステータスコード判定
      const statusCode =
        // トークン関連エラー (401)
        ['TOKEN_MISSING', 'TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_MALFORMED',
         'TOKEN_PAYLOAD_INVALID', 'TOKEN_VERIFICATION_ERROR'].includes(errorCode) ? 401 :

        // セッション関連エラー (401)
        ['SESSION_EXPIRED', 'SESSION_INVALID', 'SESSION_NOT_FOUND', 'SESSION_INACTIVE'].includes(errorCode) ? 401 :

        // ユーザー関連エラー (403)
        ['USER_INVALID', 'USER_NOT_FOUND', 'USER_INACTIVE'].includes(errorCode) ? 403 :

        // システムエラー (500)
        errorCode === 'SYSTEM_ERROR' ? 500 :

        // デフォルト (401)
        401;

      // ログレベルの調整（システムエラーのみERRORログ、その他は情報ログ）
      if (errorCode === 'SYSTEM_ERROR') {
        console.error('Auth middleware system error:', {
          errorCode,
          error: verificationResult.error,
          timestamp: new Date().toISOString()
        });
      } else {
        console.log('Auth middleware validation failed:', {
          errorCode,
          message: verificationResult.error
        });
      }

      return res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: verificationResult.error,
          ...(statusCode >= 500 && {
            // 500番台エラーの場合は追加情報を含める
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || 'unknown'
          })
        }
      });
    }

    req.user = verificationResult.user;
    req.token = token;

    next();
  } catch (error) {
    // 予期しないミドルウェアエラーの詳細ログ
    console.error('Auth middleware unexpected error:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection?.remoteAddress
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'SYS_001',
        message: '認証処理中にシステムエラーが発生しました',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Authentication required'
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_004',
          message: 'Insufficient permissions'
        }
      });
    }

    next();
  };
};

export const requirePermission = (featureCode: string, action: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Authentication required'
        }
      });
    }

    // TODO: 権限チェックロジックを実装
    // 現在は仮実装として管理者のみ許可
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_004',
          message: 'Permission denied'
        }
      });
    }

    next();
  };
};

export const requireAdmin = requireRole(['ADMIN']);
export const requireManager = requireRole(['ADMIN', 'MANAGER']);
export const requireUser = requireRole(['ADMIN', 'MANAGER', 'USER']);

export const getClientInfo = (req: Request): ClientInfo => {
  const ipAddress = (req.headers['x-forwarded-for'] as string) ||
                   req.connection.remoteAddress ||
                   req.socket.remoteAddress ||
                   '127.0.0.1';

  const userAgent = req.headers['user-agent'];

  return {
    ipAddress: ipAddress.toString(),
    userAgent
  };
};

// 既存のミドルウェアとの互換性のため
export const authenticate = authMiddleware;
export const authorize = (roles: string[]) => requireRole(roles as UserRole[]);
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/AuthService';
import { users, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';

interface AuthenticatedRequest extends Request {
  user?: users;
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
      user?: users;
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

        // デフォルト (401)
        401;

      // ログレベルの調整（重大エラーのみERRORログ、その他は情報ログ）
      if (['USER_INACTIVE', 'INVALID'].includes(errorCode)) {
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
  } catch (error: any) {
    // 予期しないミドルウェアエラーの詳細ログ
    console.error('Auth middleware unexpected error:', {
      error: error?.message || 'Unknown error',
      stack: error?.stack,
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

    // 管理者は全権限を持つ
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    try {
      // Simple role-based permission check (permission tables may not be implemented yet)
      if (req.user.role === 'MANAGER') {
        next();
        return;
      }

      // For now, temporarily allow all authenticated users
      next();
      return;

      /*
      // TODO: Implement proper permission system when tables are available
      // ユーザーの権限を取得
      const userPermissions = await prisma.userPermissions.findMany({
        where: {
          userId: req.user.id,
          isActive: true
        },
        include: {
          feature: true
        }
      });

      // 部署の権限も取得（ユーザーが部署に所属している場合）
      let departmentPermissions: any[] = [];
      if (req.user.primaryDepartmentId) {
        departmentPermissions = await prisma.departmentPermissions.findMany({
          where: {
            departmentId: req.user.primaryDepartmentId,
            isActive: true
          },
          include: {
            feature: true
          }
        });
      }

      // 機能コードに対応する権限をチェック
      const hasUserPermission = userPermissions.some((perm: any) =>
        perm.feature.code === featureCode &&
        (action === 'READ' ? perm.canView :
         action === 'CREATE' ? perm.canCreate :
         action === 'UPDATE' ? perm.canEdit :
         action === 'DELETE' ? perm.canDelete : false)
      );

      const hasDepartmentPermission = departmentPermissions.some(perm =>
        perm.feature.code === featureCode &&
        (action === 'READ' ? perm.canView :
         action === 'CREATE' ? perm.canCreate :
         action === 'UPDATE' ? perm.canEdit :
         action === 'DELETE' ? perm.canDelete : false)
      );

      // ユーザー権限または部署権限のどちらかがあれば許可
      if (hasUserPermission || hasDepartmentPermission) {
        next();
        return;
      }

      // 権限がない場合は403エラー
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_004',
          message: `Permission denied: ${featureCode}.${action}`
        }
      });
      */

    } catch (error: any) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_005',
          message: 'Permission check failed'
        }
      });
    }
  };
};

export const requireAdmin = requireRole(['ADMIN']);
export const requireManager = requireRole(['ADMIN', 'MANAGER']);
export const requireusers = requireRole(['ADMIN', 'MANAGER', 'USER']);

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
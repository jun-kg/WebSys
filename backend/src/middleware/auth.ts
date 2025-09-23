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
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_003',
          message: verificationResult.error
        }
      });
    }

    req.user = verificationResult.user;
    req.token = token;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SYS_001',
        message: 'Internal server error'
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
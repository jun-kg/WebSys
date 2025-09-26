import { prisma } from '../lib/prisma';

interface ClientInfo {
  ipAddress: string;
  userAgent?: string;
}

export class AuditService {
  constructor() {
    // Prismaシングルトンを使用
  }

  async logLoginAttempt(
    userIdentifier: string,
    success: boolean,
    clientInfo: ClientInfo,
    failureReason?: string
  ): Promise<void> {
    try {
      // ユーザーIDを数値として取得（失敗時は0）
      let userId = 0;
      if (success) {
        userId = parseInt(userIdentifier);
      }

      await prisma.audit_logs.create({
        data: {
          userId: userId || 1, // 仮のユーザーID（実際は適切なユーザーIDを設定）
          action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
          targetType: 'USER',
          targetId: userId || 0,
          reason: failureReason || undefined,
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  async logPasswordChange(userId: number, clientInfo: ClientInfo): Promise<void> {
    try {
      await prisma.audit_logs.create({
        data: {
          userId,
          action: 'PASSWORD_CHANGE',
          targetType: 'USER',
          targetId: userId,
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to log password change:', error);
    }
  }

  async logSessionActivity(
    userId: number,
    action: 'CREATE' | 'INVALIDATE' | 'EXPIRE',
    sessionId: number
  ): Promise<void> {
    try {
      await prisma.audit_logs.create({
        data: {
          userId,
          action: `SESSION_${action}`,
          targetType: 'SESSION',
          targetId: sessionId,
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to log session activity:', error);
    }
  }

  async logPermissionChange(
    userId: number,
    targetType: string,
    targetId: number,
    featureId?: number,
    oldPermissions?: any,
    newPermissions?: any,
    reason?: string,
    clientInfo?: ClientInfo
  ): Promise<void> {
    try {
      await prisma.audit_logs.create({
        data: {
          userId,
          action: 'PERMISSION_CHANGE',
          targetType,
          targetId,
          featureId,
          oldPermissions,
          newPermissions,
          reason,
          ipAddress: clientInfo?.ipAddress,
          userAgent: clientInfo?.userAgent,
          createdAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to log permission change:', error);
    }
  }
}
/**
 * ゲストユーザーサービス
 * Phase 3 - T016
 *
 * 外部協力者・監査法人向けの一時的なアクセス提供機能
 */

import { prisma } from '../../core/lib/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * ゲスト制約定数
 */
export const GUEST_RESTRICTIONS = {
  // 禁止操作
  FORBIDDEN_ACTIONS: [
    'USER_CREATE',
    'USER_DELETE',
    'USER_ROLE_CHANGE',
    'DEPT_CREATE',
    'DEPT_DELETE',
    'DEPT_EDIT',
    'PERMISSION_CREATE',
    'PERMISSION_EDIT',
    'PERMISSION_DELETE',
    'SYSTEM_SETTING',
    'FEATURE_MANAGE',
    'WORKFLOW_CREATE',
    'WORKFLOW_EDIT',
    'WORKFLOW_DELETE',
    'WORKFLOW_APPROVE',
    'WORKFLOW_EMERGENCY',
    'DATA_DELETE',
    'LOG_DELETE',
  ],

  // セキュリティ設定
  SECURITY: {
    MAX_VALIDITY_DAYS: 90,           // 最大有効期限
    DEFAULT_VALIDITY_DAYS: 30,       // デフォルト有効期限
    SESSION_TIMEOUT_MINUTES: 30,     // セッションタイムアウト
    MAX_LOGIN_ATTEMPTS: 3,           // 最大ログイン試行回数
    LOCKOUT_DURATION_MINUTES: 60,    // ロックアウト時間
    MAX_CONCURRENT_SESSIONS: 1,      // 同時セッション数
    DOWNLOAD_SIZE_LIMIT_MB: 10,      // ダウンロード上限
  },

  // 許可機能（デフォルト）
  DEFAULT_ALLOWED_FEATURES: [
    'REPORT_VIEW',
    'DATA_VIEW',
    'AUDIT_VIEW_LIMITED',
  ],
};

/**
 * ゲスト招待データ
 */
export interface GuestInvitationData {
  email: string;
  name: string;
  organization?: string;
  purpose: string;
  validDays: number;
  allowedFeatures: string[];
  invitedBy: number;
  ipWhitelist?: string[];
}

/**
 * ゲスト招待結果
 */
export interface GuestInvitationResult {
  guestUser: any;
  user: any;
  tempPassword: string;
  inviterName: string;
}

/**
 * GuestUserService
 */
export class GuestUserService {

  /**
   * ゲストユーザー招待
   */
  async inviteGuest(data: GuestInvitationData): Promise<GuestInvitationResult> {
    const { email, name, organization, purpose, validDays, allowedFeatures, invitedBy, ipWhitelist } = data;

    // バリデーション
    if (validDays < 1 || validDays > GUEST_RESTRICTIONS.SECURITY.MAX_VALIDITY_DAYS) {
      throw new Error(`有効期限は1〜${GUEST_RESTRICTIONS.SECURITY.MAX_VALIDITY_DAYS}日以内で設定してください`);
    }

    // 禁止機能チェック
    const forbiddenFeatures = allowedFeatures.filter(f =>
      GUEST_RESTRICTIONS.FORBIDDEN_ACTIONS.includes(f)
    );
    if (forbiddenFeatures.length > 0) {
      throw new Error(`ゲストユーザーに禁止された機能が含まれています: ${forbiddenFeatures.join(', ')}`);
    }

    // 招待者権限チェック
    const inviter = await prisma.users.findUnique({
      where: { id: invitedBy }
    });

    if (!inviter || !['ADMIN', 'MANAGER'].includes(inviter.role)) {
      throw new Error('ゲストユーザーの招待はADMINまたはMANAGER権限が必要です');
    }

    // 既存ユーザーチェック
    const existingUser = await prisma.users.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('このメールアドレスは既に登録されています');
    }

    // 1. 一時パスワード生成
    const tempPassword = this.generateSecurePassword(16);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 2. 有効期限計算
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    // 3. トランザクション実行
    const result = await prisma.$transaction(async (tx) => {
      // ユーザー作成
      const user = await tx.users.create({
        data: {
          username: `guest_${Date.now()}`,
          email,
          name,
          password: hashedPassword,
          role: 'GUEST',
          isActive: true,
          isFirstLogin: true,
          companyId: inviter.companyId,
        }
      });

      // ゲスト情報作成
      const guestUser = await tx.guest_users.create({
        data: {
          userId: user.id,
          invitedBy,
          organization: organization || null,
          purpose,
          validUntil,
          allowedFeatures,
          ipWhitelist: ipWhitelist || [],
          isActive: true,
        }
      });

      // 監査ログ記録
      await tx.audit_logs.create({
        data: {
          userId: invitedBy,
          action: 'GUEST_USER_INVITED',
          targetType: 'USER',
          targetId: user.id,
          newValue: JSON.stringify({
            guestEmail: email,
            validUntil,
            allowedFeatures,
            purpose,
          }),
        }
      });

      return { user, guestUser };
    });

    return {
      guestUser: result.guestUser,
      user: result.user,
      tempPassword,
      inviterName: inviter.name,
    };
  }

  /**
   * ゲストユーザーアクセスチェック
   */
  async checkGuestAccess(userId: number, action: string): Promise<boolean> {
    const guestUser = await prisma.guest_users.findUnique({
      where: { userId }
    });

    if (!guestUser || !guestUser.isActive) {
      return false;
    }

    // 有効期限チェック
    if (new Date() > guestUser.validUntil) {
      await this.expireGuestUser(userId);
      return false;
    }

    // 禁止操作チェック
    if (GUEST_RESTRICTIONS.FORBIDDEN_ACTIONS.includes(action)) {
      await this.logSecurityEvent(userId, 'ACCESS_DENIED', 'MEDIUM', {
        action,
        reason: 'FORBIDDEN_ACTION'
      });
      return false;
    }

    // 許可機能チェック
    if (!guestUser.allowedFeatures.includes(action)) {
      await this.logSecurityEvent(userId, 'ACCESS_DENIED', 'LOW', {
        action,
        reason: 'NOT_IN_ALLOWED_FEATURES'
      });
      return false;
    }

    // アクセスカウント更新
    await prisma.guest_users.update({
      where: { userId },
      data: {
        lastAccessAt: new Date(),
        accessCount: { increment: 1 }
      }
    });

    return true;
  }

  /**
   * ゲストユーザー有効期限切れ処理
   */
  async expireGuestUser(userId: number): Promise<void> {
    await prisma.$transaction([
      prisma.guest_users.update({
        where: { userId },
        data: { isActive: false }
      }),
      prisma.users.update({
        where: { id: userId },
        data: { isActive: false }
      }),
      prisma.audit_logs.create({
        data: {
          userId,
          action: 'GUEST_USER_EXPIRED',
          targetType: 'USER',
          targetId: userId,
          newValue: JSON.stringify({ reason: 'VALIDITY_PERIOD_EXCEEDED' }),
        }
      })
    ]);
  }

  /**
   * ゲストユーザー一覧取得
   */
  async getGuestUsers(companyId: number, filters?: {
    isActive?: boolean;
    expiringWithinDays?: number;
  }): Promise<any[]> {
    const where: any = {
      user: { companyId }
    };

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.expiringWithinDays) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + filters.expiringWithinDays);
      where.validUntil = { lte: expiryDate };
      where.isActive = true;
    }

    return await prisma.guest_users.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
            isActive: true,
            lastLoginAt: true,
          }
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * ゲストユーザー詳細取得
   */
  async getGuestUserDetail(userId: number): Promise<any> {
    return await prisma.guest_users.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          }
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });
  }

  /**
   * ゲストユーザー無効化
   */
  async deactivateGuest(userId: number, deactivatedBy: number): Promise<void> {
    await prisma.$transaction([
      prisma.guest_users.update({
        where: { userId },
        data: { isActive: false }
      }),
      prisma.users.update({
        where: { id: userId },
        data: { isActive: false }
      }),
      prisma.audit_logs.create({
        data: {
          userId: deactivatedBy,
          action: 'GUEST_USER_DEACTIVATED',
          targetType: 'USER',
          targetId: userId,
          newValue: JSON.stringify({ deactivatedBy }),
        }
      })
    ]);
  }

  /**
   * ゲストユーザー有効期限延長
   */
  async extendValidity(userId: number, additionalDays: number, extendedBy: number): Promise<void> {
    const guestUser = await prisma.guest_users.findUnique({
      where: { userId }
    });

    if (!guestUser) {
      throw new Error('ゲストユーザーが見つかりません');
    }

    const newValidUntil = new Date(guestUser.validUntil);
    newValidUntil.setDate(newValidUntil.getDate() + additionalDays);

    // 最大期限チェック
    const maxValidUntil = new Date();
    maxValidUntil.setDate(maxValidUntil.getDate() + GUEST_RESTRICTIONS.SECURITY.MAX_VALIDITY_DAYS);

    if (newValidUntil > maxValidUntil) {
      throw new Error(`有効期限は最大${GUEST_RESTRICTIONS.SECURITY.MAX_VALIDITY_DAYS}日まで延長可能です`);
    }

    await prisma.$transaction([
      prisma.guest_users.update({
        where: { userId },
        data: { validUntil: newValidUntil }
      }),
      prisma.audit_logs.create({
        data: {
          userId: extendedBy,
          action: 'GUEST_VALIDITY_EXTENDED',
          targetType: 'USER',
          targetId: userId,
          oldValue: guestUser.validUntil.toISOString(),
          newValue: newValidUntil.toISOString(),
        }
      })
    ]);
  }

  /**
   * 有効期限切れゲストの自動無効化（バッチ処理）
   */
  async expireExpiredGuests(): Promise<number> {
    const expiredGuests = await prisma.guest_users.findMany({
      where: {
        isActive: true,
        validUntil: { lt: new Date() }
      },
      select: { userId: true }
    });

    for (const guest of expiredGuests) {
      await this.expireGuestUser(guest.userId);
    }

    return expiredGuests.length;
  }

  /**
   * ゲストユーザーアクセスログ取得
   */
  async getAccessLog(userId: number, limit: number = 100): Promise<any[]> {
    return await prisma.security_events.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * セキュリティパスワード生成
   */
  private generateSecurePassword(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length];
    }

    // 最低限の複雑性確保
    if (!/[A-Z]/.test(password)) password = 'A' + password.slice(1);
    if (!/[a-z]/.test(password)) password = password.slice(0, -1) + 'a';
    if (!/[0-9]/.test(password)) password = password.slice(0, -1) + '1';
    if (!/[!@#$%^&*]/.test(password)) password = password.slice(0, -1) + '!';

    return password;
  }

  /**
   * セキュリティイベントログ記録
   */
  private async logSecurityEvent(
    userId: number,
    eventType: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    details: any
  ): Promise<void> {
    await prisma.security_events.create({
      data: {
        userId,
        type: eventType,
        ipAddress: details.ipAddress || 'unknown',
        userAgent: details.userAgent,
        details: JSON.stringify(details),
      }
    });
  }
}

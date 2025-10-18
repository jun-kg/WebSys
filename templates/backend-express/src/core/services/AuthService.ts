import { users as User, UserRole } from '@prisma/client';
import { prisma } from '@core/lib/prisma';
import { AuditService } from './AuditService';
import { securityService } from './SecurityService';
import { log, LogCategory } from '../utils/logger';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResult {
  success: boolean;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
  accessExpiresIn?: number;
  refreshExpiresIn?: number;
  error?: string;
  isFirstLogin?: boolean;
  requirePasswordChange?: boolean;
}

interface ClientInfo {
  ipAddress: string;
  userAgent?: string;
}

interface TokenVerificationResult {
  isValid: boolean;
  user?: User;
  expiresIn?: number;
  error?: string;
  errorCode?: 'EXPIRED' | 'INVALID' | 'BLACKLISTED' | 'MALFORMED' | 'SESSION_NOT_FOUND' | 'USER_NOT_FOUND' | 'USER_INACTIVE';
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

interface LockStatus {
  isLocked: boolean;
  unlockAt?: string;
}

export class AuthService {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  async login(request: LoginRequest, clientInfo: ClientInfo): Promise<LoginResult> {
    try {
      // 入力バリデーション
      const validation = this.validateLoginInput(request);
      if (!validation.isValid) {
        await this.logFailedAttempt(request.username, clientInfo, 'INVALID_INPUT');
        return { success: false, error: validation.error };
      }

      // ユーザー存在確認
      const user = await this.findUserByUsername(request.username);
      if (!user) {
        await this.logFailedAttempt(request.username, clientInfo, 'USER_NOT_FOUND');
        return { success: false, error: 'ユーザー名またはパスワードが正しくありません' };
      }

      // アカウントロック確認（SecurityService使用）
      const lockCheck = securityService.checkLoginAttempts(user.username);
      if (lockCheck.isLocked) {
        await this.logFailedAttempt(request.username, clientInfo, 'ACCOUNT_LOCKED');
        return {
          success: false,
          error: `アカウントがロックされています。${lockCheck.lockUntil?.toLocaleString()}まで待機してください`
        };
      }

      // パスワード検証（SecurityService使用）
      const isPasswordValid = await securityService.verifyPassword(request.password, user.password);
      if (!isPasswordValid) {
        securityService.recordFailedLogin(user.username);
        await this.recordFailedAttempt(user.id, clientInfo);
        await this.logFailedAttempt(request.username, clientInfo, 'WRONG_PASSWORD');
        return { success: false, error: 'ユーザー名またはパスワードが正しくありません' };
      }

      // ログイン成功時の失敗回数リセット
      securityService.clearFailedAttempts(user.username);

      // アクティブユーザー確認
      if (!user.isActive) {
        await this.logFailedAttempt(request.username, clientInfo, 'INACTIVE_USER');
        return { success: false, error: 'アカウントが無効になっています' };
      }

      // 同時セッション数チェック
      const sessionCount = await this.getActiveSessionCount(user.id);
      const maxSessions = this.getMaxSessionsForRole(user.role);
      if (sessionCount >= maxSessions) {
        await this.cleanupOldestSession(user.id);
      }

      // JWT トークンペア生成（SecurityService使用）
      const tokenPair = await securityService.generateTokenPair(user);

      // セッション保存（アクセストークンのみ保存）
      await this.createSession(user.id, tokenPair.accessToken, clientInfo);

      // ログイン履歴記録
      await this.logSuccessfulLogin(user.id, clientInfo);

      // 失敗回数リセット
      await this.resetFailedAttempts(user.id);

      // 最終ログイン時刻更新（初回ログインフラグもリセット）
      await this.updateLastLogin(user.id);

      // 初回ログインチェック
      const isFirstLogin = user.isFirstLogin || false;

      return {
        success: true,
        user: this.sanitizeUser(user),
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        accessExpiresIn: tokenPair.accessExpiresIn,
        refreshExpiresIn: tokenPair.refreshExpiresIn,
        isFirstLogin,
        requirePasswordChange: isFirstLogin
      };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'システムエラーが発生しました' };
    }
  }

  async logout(token: string): Promise<void> {
    try {
      // SecurityServiceを使用してトークン検証・無効化
      const validation = securityService.validateAccessToken(token);
      if (!validation.isValid || !validation.payload) {
        log.warn(LogCategory.AUTH, 'Invalid token in logout attempt', { token: token.substring(0, 20) + '...' });
        return;
      }

      // リフレッシュトークンも無効化
      await securityService.revokeTokens(validation.payload.userId, validation.payload.jti);

      // セッション無効化
      await this.invalidateSession(token);

      // ログアウト履歴記録
      await this.logLogout(validation.payload.userId);

    } catch (error) {
      log.error(LogCategory.AUTH, 'Logout error', error as Error);
    }
  }

  async verifyToken(token: string): Promise<TokenVerificationResult> {
    try {
      // SecurityServiceを使用してトークン検証
      const validation = securityService.validateAccessToken(token);

      if (!validation.isValid) {
        return {
          isValid: false,
          error: validation.error || 'トークンが無効です',
          errorCode: validation.errorCode
        };
      }

      if (!validation.payload) {
        return {
          isValid: false,
          error: 'トークンペイロードが不正です',
          errorCode: 'INVALID'
        };
      }

      // ユーザー存在・アクティブ確認
      const user = await this.findUserById(validation.payload.userId);
      if (!user) {
        return {
          isValid: false,
          error: `ユーザーが見つかりません (ユーザーID: ${validation.payload.userId})`,
          errorCode: 'USER_NOT_FOUND'
        };
      }

      if (!user.isActive) {
        return {
          isValid: false,
          error: `ユーザーアカウントが無効になっています (ユーザー: ${user.username})`,
          errorCode: 'USER_INACTIVE'
        };
      }

      // セッション確認・更新
      const session = await this.findSessionByToken(token);
      if (session) {
        if (!session.isActive) {
          return {
            isValid: false,
            error: 'セッションが無効化されています',
            errorCode: 'SESSION_NOT_FOUND'
          };
        }

        // セッション期限確認
        const now = new Date();
        if (session.expiresAt < now) {
          await this.invalidateSession(token);
          return {
            isValid: false,
            error: 'セッションが期限切れです',
            errorCode: 'SESSION_NOT_FOUND'
          };
        }

        // 最終アクティビティ更新
        await this.updateSessionActivity(session.id);
      }

      // JWT期限から残り時間を計算
      const expiresInSeconds = validation.payload.exp - Math.floor(Date.now() / 1000);

      return {
        isValid: true,
        user: this.sanitizeUser(user),
        expiresIn: Math.max(0, expiresInSeconds)
      };

    } catch (error: any) {
      // 予期しないシステムエラー
      console.error('Token verification system error:', {
        error: error?.message || 'Unknown error',
        stack: error?.stack,
        tokenLength: token?.length,
        timestamp: new Date().toISOString()
      });

      return {
        isValid: false,
        error: `システムエラーが発生しました: ${error?.message || 'Unknown error'}`,
        errorCode: 'INVALID'
      };
    }
  }

  private validateLoginInput(request: LoginRequest): ValidationResult {
    if (!request.username || !request.password) {
      return { isValid: false, error: 'ユーザー名とパスワードを入力してください' };
    }

    if (request.username.length > 50) {
      return { isValid: false, error: 'ユーザー名が長すぎます' };
    }

    if (request.password.length > 128) {
      return { isValid: false, error: 'パスワードが長すぎます' };
    }

    return { isValid: true };
  }

  private async findUserByUsername(username: string): Promise<User | null> {
    return prisma.users.findUnique({
      where: { username }
    });
  }

  private async findUserById(id: number): Promise<User | null> {
    return prisma.users.findUnique({
      where: { id }
    });
  }

  private async checkAccountLock(userId: number): Promise<LockStatus> {
    // 簡易実装：実際の運用では別テーブルで管理
    // ここでは仮実装として、現在の時間ベースで判定
    return { isLocked: false };
  }

  private async recordFailedAttempt(userId: number, clientInfo: ClientInfo): Promise<void> {
    // 失敗試行の記録
    // 実際の実装では専用テーブルを作成して管理
    await this.auditService.logLoginAttempt(
      userId.toString(),
      false,
      clientInfo,
      'WRONG_PASSWORD'
    );
  }

  private async resetFailedAttempts(userId: number): Promise<void> {
    // 失敗回数のリセット
    // 実際の実装では専用テーブルのレコードを削除
  }

  private async getActiveSessionCount(userId: number): Promise<number> {
    return prisma.user_sessions.count({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date()
        }
      }
    });
  }

  private getMaxSessionsForRole(role: UserRole): number {
    switch (role) {
      case 'ADMIN': return 5;
      case 'MANAGER': return 4;
      case 'USER': return 3;
      case 'GUEST': return 2;
      default: return 3;
    }
  }

  private async cleanupOldestSession(userId: number): Promise<void> {
    const oldestSession = await prisma.user_sessions.findFirst({
      where: {
        userId,
        isActive: true
      },
      orderBy: {
        lastActivity: 'asc'
      }
    });

    if (oldestSession) {
      await prisma.user_sessions.update({
        where: { id: oldestSession.id },
        data: { isActive: false }
      });
    }
  }

  private async createSession(
    userId: number,
    token: string,
    clientInfo: ClientInfo
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8時間後

    await prisma.user_sessions.create({
      data: {
        userId,
        sessionToken: token,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        expiresAt,
        lastActivity: new Date(),
        isActive: true,
        updatedAt: new Date()
      }
    });
  }

  private async findSessionByToken(token: string) {
    return prisma.user_sessions.findUnique({
      where: { sessionToken: token }
    });
  }

  private async invalidateSession(token: string): Promise<void> {
    await prisma.user_sessions.updateMany({
      where: { sessionToken: token },
      data: { isActive: false }
    });
  }

  private async updateSessionActivity(sessionId: number): Promise<void> {
    await prisma.user_sessions.update({
      where: { id: sessionId },
      data: { lastActivity: new Date() }
    });
  }

  private async logSuccessfulLogin(userId: number, clientInfo: ClientInfo): Promise<void> {
    await this.auditService.logLoginAttempt(
      userId.toString(),
      true,
      clientInfo
    );
  }

  private async logFailedAttempt(
    username: string,
    clientInfo: ClientInfo,
    reason: string
  ): Promise<void> {
    await this.auditService.logLoginAttempt(
      username,
      false,
      clientInfo,
      reason
    );
  }

  private async logLogout(userId: number): Promise<void> {
    // ログアウト履歴の記録
    // 実際の実装では専用のログテーブルに記録
  }

  private async updateLastLogin(userId: number): Promise<void> {
    await prisma.users.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() }
    });
  }

  private sanitizeUser(user: any): any {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}
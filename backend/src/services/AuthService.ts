import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, User, UserRole } from '@prisma/client';
import { AuditService } from './AuditService';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResult {
  success: boolean;
  user?: User;
  token?: string;
  expiresIn?: number;
  error?: string;
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
  private prisma: PrismaClient;
  private auditService: AuditService;
  private saltRounds = 12;
  private tokenSecret = process.env.JWT_SECRET || 'development-secret-key';
  private tokenExpiry = '8h';

  constructor() {
    this.prisma = new PrismaClient();
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

      // アカウントロック確認
      const lockStatus = await this.checkAccountLock(user.id);
      if (lockStatus.isLocked) {
        await this.logFailedAttempt(request.username, clientInfo, 'ACCOUNT_LOCKED');
        return {
          success: false,
          error: `アカウントがロックされています。${lockStatus.unlockAt}まで待機してください`
        };
      }

      // パスワード検証
      const isPasswordValid = await bcrypt.compare(request.password, user.password);
      if (!isPasswordValid) {
        await this.recordFailedAttempt(user.id, clientInfo);
        await this.logFailedAttempt(request.username, clientInfo, 'WRONG_PASSWORD');
        return { success: false, error: 'ユーザー名またはパスワードが正しくありません' };
      }

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

      // JWTトークン生成
      const tokenPayload = {
        userId: user.id,
        username: user.username,
        role: user.role,
        companyId: user.companyId,
        departmentId: user.primaryDepartmentId
      };

      const token = jwt.sign(tokenPayload, this.tokenSecret, {
        expiresIn: this.tokenExpiry
      });

      // セッション保存
      await this.createSession(user.id, token, clientInfo);

      // ログイン履歴記録
      await this.logSuccessfulLogin(user.id, clientInfo);

      // 失敗回数リセット
      await this.resetFailedAttempts(user.id);

      // 最終ログイン時刻更新
      await this.updateLastLogin(user.id);

      return {
        success: true,
        user: this.sanitizeUser(user),
        token,
        expiresIn: 8 * 60 * 60 // 8時間（秒）
      };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'システムエラーが発生しました' };
    }
  }

  async logout(token: string): Promise<void> {
    try {
      // トークンから情報を抽出
      const decoded = jwt.decode(token) as any;
      if (!decoded?.userId) return;

      // セッション無効化
      await this.invalidateSession(token);

      // ログアウト履歴記録
      await this.logLogout(decoded.userId);

    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async verifyToken(token: string): Promise<TokenVerificationResult> {
    try {
      // JWT検証
      const decoded = jwt.verify(token, this.tokenSecret) as any;

      // セッション存在確認
      const session = await this.findSessionByToken(token);
      if (!session || !session.isActive) {
        return { isValid: false, error: 'セッションが無効です' };
      }

      // セッション期限確認
      if (session.expiresAt < new Date()) {
        await this.invalidateSession(token);
        return { isValid: false, error: 'セッションが期限切れです' };
      }

      // ユーザー存在・アクティブ確認
      const user = await this.findUserById(decoded.userId);
      if (!user || !user.isActive) {
        await this.invalidateSession(token);
        return { isValid: false, error: 'ユーザーが無効です' };
      }

      // 最終アクティビティ更新
      await this.updateSessionActivity(session.id);

      return {
        isValid: true,
        user: this.sanitizeUser(user),
        expiresIn: Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
      };

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { isValid: false, error: 'トークンが期限切れです' };
      } else if (error instanceof jwt.JsonWebTokenError) {
        return { isValid: false, error: 'トークンが無効です' };
      }

      console.error('Token verification error:', error);
      return { isValid: false, error: 'トークン検証エラー' };
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
    return this.prisma.user.findUnique({
      where: { username },
      include: {
        company: true,
        primaryDepartment: true
      }
    });
  }

  private async findUserById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        company: true,
        primaryDepartment: true
      }
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
    return this.prisma.userSession.count({
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
    const oldestSession = await this.prisma.userSession.findFirst({
      where: {
        userId,
        isActive: true
      },
      orderBy: {
        lastActivity: 'asc'
      }
    });

    if (oldestSession) {
      await this.prisma.userSession.update({
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

    await this.prisma.userSession.create({
      data: {
        userId,
        sessionToken: token,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        expiresAt,
        lastActivity: new Date(),
        isActive: true
      }
    });
  }

  private async findSessionByToken(token: string) {
    return this.prisma.userSession.findUnique({
      where: { sessionToken: token }
    });
  }

  private async invalidateSession(token: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { sessionToken: token },
      data: { isActive: false }
    });
  }

  private async updateSessionActivity(sessionId: number): Promise<void> {
    await this.prisma.userSession.update({
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
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() }
    });
  }

  private sanitizeUser(user: any): any {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}
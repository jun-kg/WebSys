/**
 * Security Service
 * セキュリティサービス - JWT・暗号化・セキュリティ機能統合
 *
 * 機能:
 * - 短期・長期JWT戦略
 * - トークンブラックリスト管理
 * - セキュリティイベント監視
 * - 暗号化・ハッシュ機能
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { users as User } from '@prisma/client';
import { prisma } from '@core/lib/prisma';
import { log, LogCategory } from '../utils/logger';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
}

interface TokenPayload {
  userId: number;
  username: string;
  role: string;
  companyId: number;
  departmentId?: number;
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
  jti: string; // JWT ID for blacklisting
}

interface TokenValidation {
  isValid: boolean;
  payload?: TokenPayload;
  error?: string;
  errorCode?: 'EXPIRED' | 'INVALID' | 'BLACKLISTED' | 'MALFORMED';
}

interface SecurityEvent {
  type: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'TOKEN_REFRESH' | 'LOGOUT' | 'SUSPICIOUS_ACTIVITY';
  userId?: number;
  ipAddress: string;
  userAgent?: string;
  details?: any;
  timestamp: Date;
}

export class SecurityService {
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry = '15m'; // 15分
  private refreshTokenExpiry = '7d';  // 7日
  private saltRounds = 12;

  // メモリベースのブラックリスト（本番環境ではRedisを推奨）
  private tokenBlacklist = new Set<string>();
  private suspiciousIPs = new Map<string, number>();
  private failedAttempts = new Map<string, { count: number; lockUntil?: Date }>();

  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'development-access-secret';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'development-refresh-secret';

    if (process.env.NODE_ENV === 'production') {
      if (this.accessTokenSecret === 'development-access-secret') {
        throw new Error('JWT_ACCESS_SECRET must be set in production');
      }
      if (this.refreshTokenSecret === 'development-refresh-secret') {
        throw new Error('JWT_REFRESH_SECRET must be set in production');
      }
    }
  }

  /**
   * トークンペア生成（アクセス + リフレッシュ）
   */
  async generateTokenPair(user: User): Promise<TokenPair> {
    const jti = this.generateJTI();

    const basePayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      companyId: user.companyId,
      departmentId: user.primaryDepartmentId
    };

    // アクセストークン（短期）
    const accessToken = jwt.sign(
      { ...basePayload, type: 'access', jti },
      this.accessTokenSecret,
      { expiresIn: this.accessTokenExpiry } as SignOptions
    );

    // リフレッシュトークン（長期）
    const refreshToken = jwt.sign(
      { ...basePayload, type: 'refresh', jti },
      this.refreshTokenSecret,
      { expiresIn: this.refreshTokenExpiry } as SignOptions
    );

    // データベースにリフレッシュトークンを保存
    await this.storeRefreshToken(user.id, jti, refreshToken);

    log.security('Token pair generated', {
      userId: user.id,
      username: user.username,
      jti
    });

    return {
      accessToken,
      refreshToken,
      accessExpiresIn: 15 * 60, // 15分（秒）
      refreshExpiresIn: 7 * 24 * 60 * 60 // 7日（秒）
    };
  }

  /**
   * アクセストークン検証
   */
  validateAccessToken(token: string): TokenValidation {
    try {
      // ブラックリストチェック
      if (this.isTokenBlacklisted(token)) {
        return {
          isValid: false,
          error: 'Token is blacklisted',
          errorCode: 'BLACKLISTED'
        };
      }

      const payload = jwt.verify(token, this.accessTokenSecret) as TokenPayload;

      if (payload.type !== 'access') {
        return {
          isValid: false,
          error: 'Invalid token type',
          errorCode: 'INVALID'
        };
      }

      return {
        isValid: true,
        payload
      };

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          isValid: false,
          error: 'Token expired',
          errorCode: 'EXPIRED'
        };
      }

      return {
        isValid: false,
        error: 'Invalid token',
        errorCode: 'MALFORMED'
      };
    }
  }

  /**
   * リフレッシュトークン検証・新しいアクセストークン生成
   */
  async refreshAccessToken(refreshToken: string, ipAddress: string): Promise<TokenValidation & { newAccessToken?: string }> {
    try {
      const payload = jwt.verify(refreshToken, this.refreshTokenSecret) as TokenPayload;

      if (payload.type !== 'refresh') {
        return {
          isValid: false,
          error: 'Invalid refresh token type',
          errorCode: 'INVALID'
        };
      }

      // データベースでリフレッシュトークンの有効性確認
      const storedToken = await prisma.refresh_tokens.findFirst({
        where: {
          userId: payload.userId,
          jti: payload.jti,
          isActive: true
        }
      });

      if (!storedToken) {
        log.security('Refresh token not found in database', {
          userId: payload.userId,
          jti: payload.jti,
          ipAddress
        });

        return {
          isValid: false,
          error: 'Refresh token not found',
          errorCode: 'INVALID'
        };
      }

      // ユーザー情報を取得
      const user = await prisma.users.findUnique({
        where: { id: payload.userId }
      });

      if (!user || !user.isActive) {
        return {
          isValid: false,
          error: 'User not found or inactive',
          errorCode: 'INVALID'
        };
      }

      // 新しいアクセストークンを生成
      const newJti = this.generateJTI();
      const newAccessToken = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          role: user.role,
          companyId: user.companyId,
          departmentId: user.primaryDepartmentId,
          type: 'access',
          jti: newJti
        },
        this.accessTokenSecret,
        { expiresIn: this.accessTokenExpiry } as SignOptions
      );

      // セキュリティイベントをログ
      await this.logSecurityEvent({
        type: 'TOKEN_REFRESH',
        userId: user.id,
        ipAddress,
        details: { jti: payload.jti, newJti },
        timestamp: new Date()
      });

      return {
        isValid: true,
        payload,
        newAccessToken
      };

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          isValid: false,
          error: 'Refresh token expired',
          errorCode: 'EXPIRED'
        };
      }

      return {
        isValid: false,
        error: 'Invalid refresh token',
        errorCode: 'MALFORMED'
      };
    }
  }

  /**
   * トークン無効化（ログアウト）
   */
  async revokeTokens(userId: number, jti?: string): Promise<void> {
    try {
      if (jti) {
        // 特定のトークンを無効化
        await prisma.refresh_tokens.updateMany({
          where: {
            userId,
            jti,
            isActive: true
          },
          data: {
            isActive: false,
            revokedAt: new Date()
          }
        });

        this.addToBlacklist(jti);
      } else {
        // ユーザーの全トークンを無効化
        await prisma.refresh_tokens.updateMany({
          where: {
            userId,
            isActive: true
          },
          data: {
            isActive: false,
            revokedAt: new Date()
          }
        });
      }

      log.security('Tokens revoked', { userId, jti });

    } catch (error) {
      log.error(LogCategory.SEC, 'Failed to revoke tokens', error as Error, { userId, jti });
      throw error;
    }
  }

  /**
   * パスワードハッシュ化
   */
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.saltRounds);
  }

  /**
   * パスワード検証
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * ログイン試行制限チェック
   */
  checkLoginAttempts(identifier: string): { isLocked: boolean; lockUntil?: Date } {
    const attempts = this.failedAttempts.get(identifier);

    if (!attempts) {
      return { isLocked: false };
    }

    if (attempts.lockUntil && attempts.lockUntil > new Date()) {
      return { isLocked: true, lockUntil: attempts.lockUntil };
    }

    if (attempts.lockUntil && attempts.lockUntil <= new Date()) {
      // ロック期間が終了
      this.failedAttempts.delete(identifier);
      return { isLocked: false };
    }

    return { isLocked: false };
  }

  /**
   * ログイン失敗記録
   */
  recordFailedLogin(identifier: string): void {
    const attempts = this.failedAttempts.get(identifier) || { count: 0 };
    attempts.count++;

    // 5回失敗で30分ロック
    if (attempts.count >= 5) {
      attempts.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      log.security('Account locked due to failed login attempts', { identifier, attempts: attempts.count });
    }

    this.failedAttempts.set(identifier, attempts);
  }

  /**
   * ログイン成功時の処理
   */
  clearFailedAttempts(identifier: string): void {
    this.failedAttempts.delete(identifier);
  }

  /**
   * セキュリティイベント記録
   */
  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // データベースにセキュリティイベントを保存
      await prisma.security_events.create({
        data: {
          type: event.type,
          userId: event.userId,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          details: event.details ? JSON.stringify(event.details) : null,
          timestamp: event.timestamp
        }
      });

    } catch (error) {
      log.error(LogCategory.SEC, 'Failed to log security event', error as Error, event);
    }
  }

  /**
   * プライベートメソッド
   */
  private generateJTI(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private async storeRefreshToken(userId: number, jti: string, token: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    await prisma.refresh_tokens.create({
      data: {
        userId,
        jti,
        tokenHash: hashedToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7日
        isActive: true
      }
    });
  }

  private isTokenBlacklisted(token: string): boolean {
    const jti = this.extractJTI(token);
    return jti ? this.tokenBlacklist.has(jti) : false;
  }

  private extractJTI(token: string): string | null {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded?.jti || null;
    } catch {
      return null;
    }
  }

  private addToBlacklist(jti: string): void {
    this.tokenBlacklist.add(jti);

    // メモリ制限（10000個まで）
    if (this.tokenBlacklist.size > 10000) {
      const iterator = this.tokenBlacklist.values();
      for (let i = 0; i < 1000; i++) {
        const { value, done } = iterator.next();
        if (done) break;
        this.tokenBlacklist.delete(value);
      }
    }
  }

  /**
   * セキュリティヘルスチェック
   */
  getSecurityHealth() {
    return {
      blacklistedTokens: this.tokenBlacklist.size,
      suspiciousIPs: this.suspiciousIPs.size,
      lockedAccounts: Array.from(this.failedAttempts.entries()).filter(([_, attempts]) =>
        attempts.lockUntil && attempts.lockUntil > new Date()
      ).length,
      timestamp: new Date().toISOString()
    };
  }
}

// シングルトンインスタンス
export const securityService = new SecurityService();
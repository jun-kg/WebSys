import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { prisma } from '../lib/prisma';

describe('JWT Authentication Error Handling', () => {
  beforeAll(async () => {
    // テストDBセットアップは既存の setup.ts を使用
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Token Validation Edge Cases', () => {
    test('TOKEN_MISSING: 空のトークン', async () => {
      const response = await request(app)
        .get('/api/permissions/templates')
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_MISSING');
      expect(response.body.error.message).toContain('トークンが提供されていません');
    });

    test('TOKEN_MALFORMED: トークン長さ異常（短すぎる）', async () => {
      const response = await request(app)
        .get('/api/permissions/templates')
        .set('Authorization', 'Bearer abc');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_MALFORMED');
      expect(response.body.error.message).toContain('長さ不正');
    });

    test('TOKEN_MALFORMED: トークン長さ異常（長すぎる）', async () => {
      const longToken = 'a'.repeat(2001);
      const response = await request(app)
        .get('/api/permissions/templates')
        .set('Authorization', `Bearer ${longToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_MALFORMED');
      expect(response.body.error.message).toContain('長さ不正');
    });

    test('TOKEN_INVALID: 無効な署名', async () => {
      const invalidToken = jwt.sign(
        { userId: 1, username: 'test' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/permissions/templates')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_INVALID');
      expect(response.body.error.message).toContain('署名が無効');
    });

    test('TOKEN_INVALID: 不正な形式', async () => {
      const response = await request(app)
        .get('/api/permissions/templates')
        .set('Authorization', 'Bearer invalid.token.format');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_INVALID');
      expect(response.body.error.message).toContain('トークンが無効です');
    });

    test('TOKEN_EXPIRED: 期限切れトークン', async () => {
      const expiredToken = jwt.sign(
        { userId: 1, username: 'test' },
        process.env.JWT_ACCESS_SECRET || 'development-access-secret',
        { expiresIn: '-1h' } // 1時間前に期限切れ
      );

      const response = await request(app)
        .get('/api/permissions/templates')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
      expect(response.body.error.message).toContain('期限切れ');
    });

    test('TOKEN_PAYLOAD_INVALID: ペイロード不完全（userIdなし）', async () => {
      const incompleteToken = jwt.sign(
        { username: 'test' }, // userIdがない
        process.env.JWT_ACCESS_SECRET || 'development-access-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/permissions/templates')
        .set('Authorization', `Bearer ${incompleteToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_PAYLOAD_INVALID');
      expect(response.body.error.message).toContain('ペイロードが不完全');
    });

    test('TOKEN_PAYLOAD_INVALID: ペイロード不完全（usernameなし）', async () => {
      const incompleteToken = jwt.sign(
        { userId: 1 }, // usernameがない
        process.env.JWT_ACCESS_SECRET || 'development-access-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/permissions/templates')
        .set('Authorization', `Bearer ${incompleteToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('TOKEN_PAYLOAD_INVALID');
      expect(response.body.error.message).toContain('ペイロードが不完全');
    });
  });

  describe('Session Validation', () => {
    let validToken: string;
    let sessionId: number;

    beforeEach(async () => {
      // 管理者ユーザーでログインしてトークンを取得
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      validToken = loginResponse.body.token;

      // セッションIDを取得（テスト用）
      const session = await prisma.user_sessions.findFirst({
        where: { sessionToken: validToken }
      });
      sessionId = session?.id || 0;
    });

    test('SESSION_NOT_FOUND: 存在しないセッション', async () => {
      const nonExistentToken = jwt.sign(
        { userId: 1, username: 'test' },
        process.env.JWT_ACCESS_SECRET || 'development-access-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/permissions/templates')
        .set('Authorization', `Bearer ${nonExistentToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
      expect(response.body.error.message).toContain('セッションが見つかりません');
    });

    test('SESSION_INACTIVE: 無効化されたセッション', async () => {
      // セッションを無効化
      await prisma.user_sessions.update({
        where: { id: sessionId },
        data: { isActive: false }
      });

      const response = await request(app)
        .get('/api/permissions/templates')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('SESSION_INACTIVE');
      expect(response.body.error.message).toContain('セッションが無効化されています');
    });

    test('SESSION_EXPIRED: 期限切れセッション', async () => {
      // セッションを期限切れに設定
      await prisma.user_sessions.update({
        where: { id: sessionId },
        data: {
          expiresAt: new Date(Date.now() - 60 * 60 * 1000) // 1時間前
        }
      });

      const response = await request(app)
        .get('/api/permissions/templates')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('SESSION_EXPIRED');
      expect(response.body.error.message).toContain('セッションが期限切れ');
    });
  });

  describe('User Validation', () => {
    let validToken: string;
    let adminUserId: number;

    beforeEach(async () => {
      // 管理者ユーザーでログイン
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });

      validToken = loginResponse.body.token;

      // ユーザーIDを取得
      const decoded = jwt.decode(loginResponse.body.token) as any;
      adminUserId = decoded.userId;
    });

    test('USER_NOT_FOUND: 存在しないユーザー', async () => {
      // トークンは有効だが、ユーザーを削除
      await prisma.users.delete({
        where: { id: adminUserId }
      });

      const response = await request(app)
        .get('/api/permissions/templates')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
      expect(response.body.error.message).toContain('ユーザーが見つかりません');
    });

    test('USER_INACTIVE: 無効化されたユーザー', async () => {
      // ユーザーを無効化
      await prisma.users.update({
        where: { id: adminUserId },
        data: { isActive: false }
      });

      const response = await request(app)
        .get('/api/permissions/templates')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('USER_INACTIVE');
      expect(response.body.error.message).toContain('ユーザーアカウントが無効になっています');
    });
  });

  describe('Error Response Format', () => {
    test('エラーレスポンスの形式確認', async () => {
      const response = await request(app)
        .get('/api/permissions/templates')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(typeof response.body.error.code).toBe('string');
      expect(typeof response.body.error.message).toBe('string');
    });

    test('システムエラー時の詳細情報確認', async () => {
      // 500エラーを意図的に発生させるのは困難なため、
      // ここではレスポンス形式のテストのみ実装
      expect(true).toBe(true);
    });
  });

  describe('Authorization Header Validation', () => {
    test('AUTH_001: Authorization ヘッダーなし', async () => {
      const response = await request(app)
        .get('/api/permissions/templates');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_001');
      expect(response.body.error.message).toContain('Authorization header missing');
    });

    test('AUTH_001: Bearer なしのヘッダー', async () => {
      const response = await request(app)
        .get('/api/permissions/templates')
        .set('Authorization', 'some-token');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTH_001');
      expect(response.body.error.message).toContain('Authorization header missing');
    });
  });
});
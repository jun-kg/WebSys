/**
 * PermissionController 単体試験
 *
 * テストカバレッジ:
 * 1. GET /api/permissions/matrix - 権限マトリクス取得
 * 2. GET /api/permissions/my-permissions - 自分の権限一覧取得
 * 3. GET /api/permissions/check - 権限チェック
 * 4. POST /api/permissions/clear-cache - キャッシュクリア
 * 5. GET /api/permissions/cache-stats - キャッシュ統計取得
 */

import request from 'supertest';
import express from 'express';
import { PermissionController } from '../core/controllers/PermissionController';
import { RolePermissionService } from '../core/services/RolePermissionService';

// RolePermissionServiceモック
jest.mock('../core/services/RolePermissionService');

describe('PermissionController', () => {
  let app: express.Application;
  let controller: PermissionController;

  // 認証ミドルウェアモック（users型に準拠）
  const mockAuthMiddleware = (user: any) => (req: any, res: any, next: any) => {
    if (user) {
      // users型のフィールドに変換
      req.user = {
        id: user.userId || user.id,
        username: user.username,
        email: user.email || `${user.username}@example.com`,
        name: user.name || user.username,
        password: 'hashed',
        role: user.role,
        companyId: user.companyId || 1,
        primaryDepartmentId: user.departmentId || null,
        employeeCode: null,
        joinDate: null,
        position: null,
        isActive: true,
        isFirstLogin: false,
        passwordChangedAt: null,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } else {
      req.user = null;
    }
    next();
  };

  beforeEach(() => {
    app = express();
    app.use(express.json());
    controller = new PermissionController();

    jest.clearAllMocks();
  });

  describe('GET /api/permissions/matrix', () => {
    it('管理者は権限マトリクスを取得できる', async () => {
      const mockMatrix = [
        {
          role: 'ADMIN',
          permissions: [
            { action: 'USER_CREATE', scope: 'GLOBAL', description: 'ユーザー作成（全社）' }
          ]
        }
      ];

      (RolePermissionService.prototype.getPermissionMatrix as jest.Mock).mockResolvedValue(mockMatrix);

      app.get('/matrix', mockAuthMiddleware({ userId: 1, role: 'ADMIN' }), (req, res) => {
        controller.getPermissionMatrix(req, res);
      });

      const response = await request(app).get('/matrix').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.matrix).toEqual(mockMatrix);
      expect(response.body.data.totalRoles).toBe(1);
      expect(response.body.data.totalPermissions).toBe(1);
    });

    it('一般ユーザーは権限マトリクスを取得できない（403）', async () => {
      app.get('/matrix', mockAuthMiddleware({ userId: 2, role: 'USER' }), (req, res) => {
        controller.getPermissionMatrix(req, res);
      });

      const response = await request(app).get('/matrix').expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('管理者権限が必要です');
    });

    it('未認証ユーザーはアクセスできない', async () => {
      app.get('/matrix', mockAuthMiddleware(null), (req, res) => {
        controller.getPermissionMatrix(req, res);
      });

      const response = await request(app).get('/matrix').expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/permissions/my-permissions', () => {
    it('ログイン中のユーザーは自分の権限を取得できる', async () => {
      const mockMatrix = [
        {
          role: 'USER',
          permissions: [
            { action: 'USER_VIEW', scope: 'SELF', description: 'ユーザー閲覧（自分のみ）' },
            { action: 'USER_EDIT', scope: 'SELF', description: 'ユーザー編集（自分のみ）' }
          ]
        },
        {
          role: 'ADMIN',
          permissions: []
        }
      ];

      (RolePermissionService.prototype.getPermissionMatrix as jest.Mock).mockResolvedValue(mockMatrix);

      app.get('/my-permissions', mockAuthMiddleware({ userId: 3, username: 'testuser', role: 'USER' }), (req, res) => {
        controller.getMyPermissions(req, res);
      });

      const response = await request(app).get('/my-permissions').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userId).toBe(3);
      expect(response.body.data.username).toBe('testuser');
      expect(response.body.data.role).toBe('USER');
      expect(response.body.data.permissions).toHaveLength(2);
      expect(response.body.data.totalPermissions).toBe(2);
    });

    it('未認証ユーザーはアクセスできない（401）', async () => {
      app.get('/my-permissions', mockAuthMiddleware(null), (req, res) => {
        controller.getMyPermissions(req, res);
      });

      const response = await request(app).get('/my-permissions').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('認証が必要です');
    });

    it('役職権限が見つからない場合は404エラー', async () => {
      (RolePermissionService.prototype.getPermissionMatrix as jest.Mock).mockResolvedValue([
        { role: 'ADMIN', permissions: [] }
      ]);

      app.get('/my-permissions', mockAuthMiddleware({ userId: 4, username: 'guest', role: 'GUEST' }), (req, res) => {
        controller.getMyPermissions(req, res);
      });

      const response = await request(app).get('/my-permissions').expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('権限情報が見つかりません');
    });
  });

  describe('GET /api/permissions/check', () => {
    it('権限チェック成功（許可）', async () => {
      (RolePermissionService.prototype.checkPermission as jest.Mock).mockResolvedValue({
        allowed: true,
        scope: 'GLOBAL'
      });

      app.get('/check', mockAuthMiddleware({ userId: 1, role: 'ADMIN' }), (req, res) => {
        controller.checkPermission(req, res);
      });

      const response = await request(app)
        .get('/check?action=USER_EDIT&targetUserId=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.allowed).toBe(true);
      expect(response.body.data.scope).toBe('GLOBAL');
      expect(response.body.data.message).toBe('権限があります');
    });

    it('権限チェック成功（拒否）', async () => {
      (RolePermissionService.prototype.checkPermission as jest.Mock).mockResolvedValue({
        allowed: false,
        scope: 'SELF',
        reason: 'SELF scope: can only access own data'
      });

      app.get('/check', mockAuthMiddleware({ userId: 3, role: 'USER' }), (req, res) => {
        controller.checkPermission(req, res);
      });

      const response = await request(app)
        .get('/check?action=USER_EDIT&targetUserId=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.allowed).toBe(false);
      expect(response.body.data.scope).toBe('SELF');
      expect(response.body.data.reason).toContain('SELF scope');
      expect(response.body.data.message).toBe('権限がありません');
    });

    it('アクション名が未指定の場合は400エラー', async () => {
      app.get('/check', mockAuthMiddleware({ userId: 1, role: 'ADMIN' }), (req, res) => {
        controller.checkPermission(req, res);
      });

      const response = await request(app).get('/check').expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('アクション名が必要です');
    });

    it('未認証ユーザーはアクセスできない（401）', async () => {
      app.get('/check', mockAuthMiddleware(null), (req, res) => {
        controller.checkPermission(req, res);
      });

      const response = await request(app).get('/check?action=USER_EDIT').expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/permissions/clear-cache', () => {
    it('管理者はキャッシュをクリアできる', async () => {
      RolePermissionService.clearCache = jest.fn();

      app.post('/clear-cache', mockAuthMiddleware({ userId: 1, role: 'ADMIN' }), (req, res) => {
        controller.clearCache(req, res);
      });

      const response = await request(app).post('/clear-cache').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('キャッシュをクリアしました');
      expect(RolePermissionService.clearCache).toHaveBeenCalled();
    });

    it('一般ユーザーはキャッシュをクリアできない（403）', async () => {
      app.post('/clear-cache', mockAuthMiddleware({ userId: 2, role: 'USER' }), (req, res) => {
        controller.clearCache(req, res);
      });

      const response = await request(app).post('/clear-cache').expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('管理者権限が必要です');
    });
  });

  describe('GET /api/permissions/cache-stats', () => {
    it('管理者はキャッシュ統計を取得できる', async () => {
      RolePermissionService.getCacheStats = jest.fn().mockReturnValue({
        permissionCacheSize: 10,
        userDepartmentCacheSize: 5,
        cacheTTL: 300000
      });

      app.get('/cache-stats', mockAuthMiddleware({ userId: 1, role: 'ADMIN' }), (req, res) => {
        controller.getCacheStats(req, res);
      });

      const response = await request(app).get('/cache-stats').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.permissionCacheSize).toBe(10);
      expect(response.body.data.userDepartmentCacheSize).toBe(5);
      expect(response.body.data.cacheTTL).toBe(300000);
    });

    it('一般ユーザーはキャッシュ統計を取得できない（403）', async () => {
      app.get('/cache-stats', mockAuthMiddleware({ userId: 2, role: 'USER' }), (req, res) => {
        controller.getCacheStats(req, res);
      });

      const response = await request(app).get('/cache-stats').expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});

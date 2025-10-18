/**
 * RolePermissionService 単体試験
 *
 * テストカバレッジ:
 * 1. getUserPermissionScope - 権限スコープ取得
 * 2. checkPermission - 権限チェック（GLOBAL, DEPARTMENT, SELF）
 * 3. validateScope - スコープ検証ロジック
 * 4. getPermissionMatrix - 権限マトリクス取得
 * 5. キャッシュ機能
 * 6. エラーハンドリング
 */

import { RolePermissionService, PermissionScope } from '../core/services/RolePermissionService';
import { prisma } from '../core/lib/prisma';

// Prismaクライアントモック
jest.mock('../core/lib/prisma', () => ({
  prisma: {
    users: {
      findUnique: jest.fn()
    },
    role_permissions: {
      findUnique: jest.fn(),
      findMany: jest.fn()
    },
    user_departments: {
      findMany: jest.fn()
    }
  }
}));

describe('RolePermissionService', () => {
  let service: RolePermissionService;

  beforeEach(() => {
    service = new RolePermissionService();
    jest.clearAllMocks();
    RolePermissionService.clearCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserPermissionScope', () => {
    it('ADMIN役職のユーザーはGLOBAL権限を取得できる', async () => {
      // ユーザー情報モック
      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        role: 'ADMIN',
        isActive: true
      });

      // 権限情報モック
      (prisma.role_permissions.findUnique as jest.Mock).mockResolvedValue({
        scope: 'GLOBAL'
      });

      const scope = await service.getUserPermissionScope(1, 'USER_EDIT');

      expect(scope).toBe(PermissionScope.GLOBAL);
      expect(prisma.users.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, role: true, isActive: true }
      });
    });

    it('MANAGER役職のユーザーはDEPARTMENT権限を取得できる', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        role: 'MANAGER',
        isActive: true
      });

      (prisma.role_permissions.findUnique as jest.Mock).mockResolvedValue({
        scope: 'DEPARTMENT'
      });

      const scope = await service.getUserPermissionScope(2, 'USER_EDIT');

      expect(scope).toBe(PermissionScope.DEPARTMENT);
    });

    it('USER役職のユーザーはSELF権限を取得できる', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        id: 3,
        role: 'USER',
        isActive: true
      });

      (prisma.role_permissions.findUnique as jest.Mock).mockResolvedValue({
        scope: 'SELF'
      });

      const scope = await service.getUserPermissionScope(3, 'USER_EDIT');

      expect(scope).toBe(PermissionScope.SELF);
    });

    it('無効なユーザーはnullを返す', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        id: 4,
        role: 'USER',
        isActive: false
      });

      const scope = await service.getUserPermissionScope(4, 'USER_EDIT');

      expect(scope).toBe(null);
    });

    it('存在しないユーザーはnullを返す', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue(null);

      const scope = await service.getUserPermissionScope(999, 'USER_EDIT');

      expect(scope).toBe(null);
    });

    it('権限が見つからない場合はnullを返す', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        id: 5,
        role: 'GUEST',
        isActive: true
      });

      (prisma.role_permissions.findUnique as jest.Mock).mockResolvedValue(null);

      const scope = await service.getUserPermissionScope(5, 'USER_DELETE');

      expect(scope).toBe(null);
    });

    it('キャッシュが有効な場合は2回目のクエリを省略する', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        role: 'ADMIN',
        isActive: true
      });

      (prisma.role_permissions.findUnique as jest.Mock).mockResolvedValue({
        scope: 'GLOBAL'
      });

      // 1回目
      await service.getUserPermissionScope(1, 'USER_EDIT');

      // 2回目（キャッシュヒット）
      await service.getUserPermissionScope(1, 'USER_EDIT');

      // usersは2回呼ばれるが、role_permissionsは1回のみ
      expect(prisma.users.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.role_permissions.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkPermission - GLOBAL権限', () => {
    it('GLOBAL権限: 全ユーザーにアクセス許可', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        role: 'ADMIN',
        isActive: true
      });

      (prisma.role_permissions.findUnique as jest.Mock).mockResolvedValue({
        scope: 'GLOBAL'
      });

      const result = await service.checkPermission(1, 'USER_EDIT', {
        userId: 1,
        targetUserId: 999
      });

      expect(result.allowed).toBe(true);
      expect(result.scope).toBe(PermissionScope.GLOBAL);
    });
  });

  describe('checkPermission - DEPARTMENT権限', () => {
    it('DEPARTMENT権限: 同じ部署のユーザーにアクセス許可', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        role: 'MANAGER',
        isActive: true
      });

      (prisma.role_permissions.findUnique as jest.Mock).mockResolvedValue({
        scope: 'DEPARTMENT'
      });

      // ユーザー2の部署: [1, 2]
      // ユーザー3の部署: [2, 3]
      // 共通部署: 2
      (prisma.user_departments.findMany as jest.Mock)
        .mockResolvedValueOnce([
          { departmentId: 1 },
          { departmentId: 2 }
        ])
        .mockResolvedValueOnce([
          { departmentId: 2 },
          { departmentId: 3 }
        ]);

      const result = await service.checkPermission(2, 'USER_EDIT', {
        userId: 2,
        targetUserId: 3
      });

      expect(result.allowed).toBe(true);
      expect(result.scope).toBe(PermissionScope.DEPARTMENT);
    });

    it('DEPARTMENT権限: 異なる部署のユーザーにアクセス拒否', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        role: 'MANAGER',
        isActive: true
      });

      (prisma.role_permissions.findUnique as jest.Mock).mockResolvedValue({
        scope: 'DEPARTMENT'
      });

      // ユーザー2の部署: [1]
      // ユーザー4の部署: [3]
      // 共通部署: なし
      (prisma.user_departments.findMany as jest.Mock)
        .mockResolvedValueOnce([{ departmentId: 1 }])
        .mockResolvedValueOnce([{ departmentId: 3 }]);

      const result = await service.checkPermission(2, 'USER_EDIT', {
        userId: 2,
        targetUserId: 4
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('no common department');
    });

    it('DEPARTMENT権限: 対象部署IDで検証（部署ベース）', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        role: 'MANAGER',
        isActive: true
      });

      (prisma.role_permissions.findUnique as jest.Mock).mockResolvedValue({
        scope: 'DEPARTMENT'
      });

      // ユーザー2の部署: [1, 2]
      (prisma.user_departments.findMany as jest.Mock).mockResolvedValue([
        { departmentId: 1 },
        { departmentId: 2 }
      ]);

      const result = await service.checkPermission(2, 'DEPT_VIEW', {
        userId: 2,
        targetDepartmentId: 2
      });

      expect(result.allowed).toBe(true);
    });

    it('DEPARTMENT権限: 所属していない部署にアクセス拒否', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        id: 2,
        role: 'MANAGER',
        isActive: true
      });

      (prisma.role_permissions.findUnique as jest.Mock).mockResolvedValue({
        scope: 'DEPARTMENT'
      });

      // ユーザー2の部署: [1]
      (prisma.user_departments.findMany as jest.Mock).mockResolvedValue([
        { departmentId: 1 }
      ]);

      const result = await service.checkPermission(2, 'DEPT_VIEW', {
        userId: 2,
        targetDepartmentId: 3
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not in target department');
    });
  });

  describe('checkPermission - SELF権限', () => {
    it('SELF権限: 自分のデータにアクセス許可', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        id: 3,
        role: 'USER',
        isActive: true
      });

      (prisma.role_permissions.findUnique as jest.Mock).mockResolvedValue({
        scope: 'SELF'
      });

      const result = await service.checkPermission(3, 'USER_EDIT', {
        userId: 3,
        targetUserId: 3
      });

      expect(result.allowed).toBe(true);
      expect(result.scope).toBe(PermissionScope.SELF);
    });

    it('SELF権限: 他人のデータにアクセス拒否', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        id: 3,
        role: 'USER',
        isActive: true
      });

      (prisma.role_permissions.findUnique as jest.Mock).mockResolvedValue({
        scope: 'SELF'
      });

      const result = await service.checkPermission(3, 'USER_EDIT', {
        userId: 3,
        targetUserId: 5
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('SELF scope: can only access own data');
    });

    it('SELF権限: 対象ユーザーIDが未指定の場合はエラー', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        id: 3,
        role: 'USER',
        isActive: true
      });

      (prisma.role_permissions.findUnique as jest.Mock).mockResolvedValue({
        scope: 'SELF'
      });

      const result = await service.checkPermission(3, 'USER_EDIT', {
        userId: 3
      });

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Target user ID required');
    });
  });

  describe('getPermissionMatrix', () => {
    it('全役職の権限マトリクスを取得できる', async () => {
      const mockPermissions = [
        {
          role: 'ADMIN',
          action: 'USER_CREATE',
          scope: 'GLOBAL',
          description: 'ユーザー作成（全社）'
        },
        {
          role: 'ADMIN',
          action: 'USER_EDIT',
          scope: 'GLOBAL',
          description: 'ユーザー編集（全社）'
        },
        {
          role: 'MANAGER',
          action: 'USER_EDIT',
          scope: 'DEPARTMENT',
          description: 'ユーザー編集（部署）'
        },
        {
          role: 'USER',
          action: 'USER_EDIT',
          scope: 'SELF',
          description: 'ユーザー編集（自分のみ）'
        }
      ];

      (prisma.role_permissions.findMany as jest.Mock).mockResolvedValue(mockPermissions);

      const matrix = await service.getPermissionMatrix();

      expect(matrix).toHaveLength(3); // ADMIN, MANAGER, USER
      expect(matrix[0].role).toBe('ADMIN');
      expect(matrix[0].permissions).toHaveLength(2);
      expect(matrix[1].role).toBe('MANAGER');
      expect(matrix[1].permissions).toHaveLength(1);
      expect(matrix[2].role).toBe('USER');
      expect(matrix[2].permissions).toHaveLength(1);
    });

    it('権限が存在しない場合は空配列を返す', async () => {
      (prisma.role_permissions.findMany as jest.Mock).mockResolvedValue([]);

      const matrix = await service.getPermissionMatrix();

      expect(matrix).toEqual([]);
    });
  });

  describe('キャッシュ機能', () => {
    it('clearCache: キャッシュをクリアできる', async () => {
      (prisma.users.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        role: 'ADMIN',
        isActive: true
      });

      (prisma.role_permissions.findUnique as jest.Mock).mockResolvedValue({
        scope: 'GLOBAL'
      });

      // キャッシュに保存
      await service.getUserPermissionScope(1, 'USER_EDIT');

      // キャッシュクリア
      RolePermissionService.clearCache();

      // 再度呼び出し（キャッシュミス）
      await service.getUserPermissionScope(1, 'USER_EDIT');

      // role_permissionsが2回呼ばれることを確認
      expect(prisma.role_permissions.findUnique).toHaveBeenCalledTimes(2);
    });

    it('getCacheStats: キャッシュ統計を取得できる', () => {
      const stats = RolePermissionService.getCacheStats();

      expect(stats).toHaveProperty('permissionCacheSize');
      expect(stats).toHaveProperty('userDepartmentCacheSize');
      expect(stats).toHaveProperty('cacheTTL');
      expect(stats.cacheTTL).toBe(5 * 60 * 1000); // 5分
    });
  });

  describe('エラーハンドリング', () => {
    it('データベースエラー時はnullを返す', async () => {
      (prisma.users.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const scope = await service.getUserPermissionScope(1, 'USER_EDIT');

      expect(scope).toBe(null);
    });

    it('checkPermissionでエラー時はallowed=falseを返す', async () => {
      // getUserPermissionScope内でエラーを発生させる
      (prisma.users.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await service.checkPermission(1, 'USER_EDIT', {
        userId: 1,
        targetUserId: 2
      });

      expect(result.allowed).toBe(false);
      // getUserPermissionScopeがnullを返すため、"Permission not granted"エラーになる
      expect(result.reason).toContain('Permission not granted');
    });
  });
});

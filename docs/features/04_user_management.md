# ユーザー管理機能詳細設計書

**機能名**: ユーザー管理・権限制御システム
**バージョン**: v1.2.0
**作成日**: 2025年9月21日
**更新日**: 2025年9月21日

---

## 📋 目次

1. [概要](#概要)
2. [機能詳細](#機能詳細)
3. [データ設計](#データ設計)
4. [API設計](#api設計)
5. [権限制御設計](#権限制御設計)
6. [フロントエンド設計](#フロントエンド設計)
7. [セキュリティ設計](#セキュリティ設計)
8. [バリデーション設計](#バリデーション設計)

---

## 概要

### 機能目的
- システム利用者の包括的管理
- ロールベースアクセス制御（RBAC）実装
- ユーザー情報の CRUD 操作
- アクティブ状態管理と権限制御

### 技術スタック
- **バックエンド**: Express.js + Prisma ORM + bcrypt
- **フロントエンド**: Vue.js 3 + Element Plus + Pinia
- **認証**: JWT Bearer Token
- **パスワード暗号化**: bcrypt (Salt rounds: 10)

---

## 機能詳細

### F-USER-001: ユーザー CRUD 操作

#### ユーザー作成機能
```typescript
// backend/src/services/userService.ts
export class UserService {
  async createUser(data: CreateUserRequest, createdBy: number): Promise<User> {
    try {
      // 重複チェック
      await this.checkDuplicateUser(data.username, data.email);

      // パスワードハッシュ化
      const hashedPassword = await this.hashPassword(data.password);

      // ユーザー作成
      const user = await prisma.user.create({
        data: {
          username: data.username,
          name: data.name,
          email: data.email,
          password: hashedPassword,
          department: data.department,
          role: data.role || 'USER',
          isActive: data.isActive ?? true
        },
        select: this.userSelectFields
      });

      // 作成ログ記録
      await this.logService.createLog({
        level: 'INFO',
        category: 'USER',
        message: `User "${user.username}" created`,
        userId: createdBy,
        metadata: {
          targetUserId: user.id,
          targetUsername: user.username,
          role: user.role
        }
      });

      return user;
    } catch (error) {
      console.error('Create user error:', error);
      if (error instanceof DuplicateUserError) {
        throw error;
      }
      throw new Error('ユーザーの作成に失敗しました');
    }
  }

  private async checkDuplicateUser(username: string, email: string): Promise<void> {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new DuplicateUserError('このユーザー名は既に使用されています');
      }
      if (existingUser.email === email) {
        throw new DuplicateUserError('このメールアドレスは既に使用されています');
      }
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  private userSelectFields = {
    id: true,
    username: true,
    name: true,
    email: true,
    department: true,
    role: true,
    isActive: true,
    createdAt: true,
    updatedAt: true
    // password は除外
  };
}
```

#### ユーザー更新機能
```typescript
// backend/src/services/userService.ts
export class UserService {
  async updateUser(id: number, data: UpdateUserRequest, updatedBy: number): Promise<User> {
    try {
      // 対象ユーザー存在確認
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        throw new UserNotFoundError('ユーザーが見つかりません');
      }

      // 重複チェック（自分以外）
      if (data.username || data.email) {
        await this.checkDuplicateUserForUpdate(id, data.username, data.email);
      }

      // 更新データ準備
      const updateData: any = {
        ...data,
        updatedAt: new Date()
      };

      // パスワード更新時はハッシュ化
      if (data.password) {
        updateData.password = await this.hashPassword(data.password);
      }

      // ユーザー更新
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: this.userSelectFields
      });

      // 更新ログ記録
      await this.logService.createLog({
        level: 'INFO',
        category: 'USER',
        message: `User "${updatedUser.username}" updated`,
        userId: updatedBy,
        metadata: {
          targetUserId: id,
          targetUsername: updatedUser.username,
          updatedFields: Object.keys(data),
          previousRole: existingUser.role,
          newRole: updatedUser.role
        }
      });

      return updatedUser;
    } catch (error) {
      console.error('Update user error:', error);
      if (error instanceof UserNotFoundError || error instanceof DuplicateUserError) {
        throw error;
      }
      throw new Error('ユーザーの更新に失敗しました');
    }
  }

  private async checkDuplicateUserForUpdate(
    userId: number,
    username?: string,
    email?: string
  ): Promise<void> {
    if (!username && !email) return;

    const conditions: any[] = [];
    if (username) conditions.push({ username });
    if (email) conditions.push({ email });

    const existingUser = await prisma.user.findFirst({
      where: {
        AND: [
          { id: { not: userId } },
          { OR: conditions }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new DuplicateUserError('このユーザー名は既に使用されています');
      }
      if (existingUser.email === email) {
        throw new DuplicateUserError('このメールアドレスは既に使用されています');
      }
    }
  }
}
```

#### ユーザー削除機能
```typescript
// backend/src/services/userService.ts
export class UserService {
  async deleteUser(id: number, deletedBy: number): Promise<void> {
    try {
      // 対象ユーザー存在確認
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true, role: true }
      });

      if (!existingUser) {
        throw new UserNotFoundError('ユーザーが見つかりません');
      }

      // 自分自身の削除防止
      if (id === deletedBy) {
        throw new InvalidOperationError('自分自身を削除することはできません');
      }

      // 最後の管理者削除防止
      if (existingUser.role === 'ADMIN') {
        const adminCount = await prisma.user.count({
          where: { role: 'ADMIN', isActive: true }
        });

        if (adminCount <= 1) {
          throw new InvalidOperationError('最後の管理者を削除することはできません');
        }
      }

      // 関連データの処理
      await this.handleUserDeletion(id);

      // ユーザー削除（論理削除または物理削除）
      if (this.useSoftDelete) {
        await prisma.user.update({
          where: { id },
          data: {
            isActive: false,
            username: `${existingUser.username}_deleted_${Date.now()}`,
            email: `deleted_${Date.now()}@example.com`,
            updatedAt: new Date()
          }
        });
      } else {
        await prisma.user.delete({
          where: { id }
        });
      }

      // 削除ログ記録
      await this.logService.createLog({
        level: 'WARN',
        category: 'USER',
        message: `User "${existingUser.username}" deleted`,
        userId: deletedBy,
        metadata: {
          targetUserId: id,
          targetUsername: existingUser.username,
          deletionType: this.useSoftDelete ? 'soft' : 'hard'
        }
      });

    } catch (error) {
      console.error('Delete user error:', error);
      if (error instanceof UserNotFoundError || error instanceof InvalidOperationError) {
        throw error;
      }
      throw new Error('ユーザーの削除に失敗しました');
    }
  }

  private async handleUserDeletion(userId: number): Promise<void> {
    // ユーザー関連データの処理
    await Promise.all([
      // アラートルールの作成者を null に更新
      prisma.alertRule.updateMany({
        where: { createdBy: userId },
        data: { createdBy: null }
      }),

      // ログの userId を null に更新（または削除）
      prisma.log.updateMany({
        where: { userId },
        data: { userId: null }
      })
    ]);
  }

  private useSoftDelete = true; // 設定可能
}
```

### F-USER-002: ユーザー検索・フィルタリング

```typescript
// backend/src/services/userService.ts
export class UserService {
  async getUsers(query: UsersQuery): Promise<UsersResponse> {
    const {
      page = 1,
      pageSize = 20,
      username,
      department,
      role,
      isActive,
      search
    } = query;

    try {
      // 検索条件構築
      const where: any = {};

      // ユーザー名フィルター
      if (username) {
        where.username = { contains: username, mode: 'insensitive' };
      }

      // 部署フィルター
      if (department) {
        where.department = department;
      }

      // ロールフィルター
      if (role) {
        where.role = role;
      }

      // アクティブ状態フィルター
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      // 全文検索
      if (search) {
        where.OR = [
          { username: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { department: { contains: search, mode: 'insensitive' } }
        ];
      }

      // 総件数取得
      const total = await prisma.user.count({ where });

      // ページネーションでデータ取得
      const users = await prisma.user.findMany({
        where,
        select: this.userSelectFields,
        orderBy: [
          { isActive: 'desc' },  // アクティブユーザーを優先
          { role: 'asc' },       // ロール順
          { createdAt: 'desc' }  // 作成日降順
        ],
        skip: (page - 1) * pageSize,
        take: pageSize
      });

      return {
        data: users,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        },
        statistics: await this.getUserStatistics()
      };

    } catch (error) {
      console.error('Get users error:', error);
      throw new Error('ユーザー一覧の取得に失敗しました');
    }
  }

  private async getUserStatistics(): Promise<UserStatistics> {
    const [totalCount, activeCount, roleStats] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true }
      })
    ]);

    const byRole = roleStats.reduce((acc, item) => {
      acc[item.role] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: totalCount,
      active: activeCount,
      inactive: totalCount - activeCount,
      byRole
    };
  }
}
```

### F-USER-003: アクティブ状態管理

```typescript
// backend/src/services/userService.ts
export class UserService {
  async toggleUserStatus(id: number, isActive: boolean, updatedBy: number): Promise<User> {
    try {
      // 対象ユーザー確認
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, username: true, role: true, isActive: true }
      });

      if (!existingUser) {
        throw new UserNotFoundError('ユーザーが見つかりません');
      }

      // 自分自身の無効化防止
      if (id === updatedBy && !isActive) {
        throw new InvalidOperationError('自分自身を無効化することはできません');
      }

      // 最後の管理者無効化防止
      if (existingUser.role === 'ADMIN' && !isActive) {
        const activeAdminCount = await prisma.user.count({
          where: { role: 'ADMIN', isActive: true }
        });

        if (activeAdminCount <= 1) {
          throw new InvalidOperationError('最後の管理者を無効化することはできません');
        }
      }

      // 状態更新
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          isActive,
          updatedAt: new Date()
        },
        select: this.userSelectFields
      });

      // ステータス変更ログ
      await this.logService.createLog({
        level: 'INFO',
        category: 'USER',
        message: `User "${existingUser.username}" ${isActive ? 'activated' : 'deactivated'}`,
        userId: updatedBy,
        metadata: {
          targetUserId: id,
          targetUsername: existingUser.username,
          previousStatus: existingUser.isActive,
          newStatus: isActive
        }
      });

      return updatedUser;

    } catch (error) {
      console.error('Toggle user status error:', error);
      if (error instanceof UserNotFoundError || error instanceof InvalidOperationError) {
        throw error;
      }
      throw new Error('ユーザー状態の変更に失敗しました');
    }
  }
}
```

---

## データ設計

### ユーザーテーブル
```sql
CREATE TABLE "User" (
  id              SERIAL PRIMARY KEY,
  username        VARCHAR(255) UNIQUE NOT NULL,
  name            VARCHAR(255) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password        VARCHAR(255) NOT NULL,
  department      VARCHAR(255),
  role            VARCHAR(50) NOT NULL DEFAULT 'USER',
  isActive        BOOLEAN NOT NULL DEFAULT true,
  lastLoginAt     TIMESTAMP,
  createdAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_user_username ON "User"(username);
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_user_role ON "User"(role);
CREATE INDEX idx_user_isActive ON "User"(isActive);
CREATE INDEX idx_user_department ON "User"(department);
CREATE INDEX idx_user_composite ON "User"(role, isActive, createdAt);

-- 全文検索インデックス
CREATE INDEX idx_user_search ON "User"
USING GIN(to_tsvector('english', username || ' ' || name || ' ' || COALESCE(email, '') || ' ' || COALESCE(department, '')));
```

### ユーザーロール定義
```typescript
enum UserRole {
  ADMIN = 'ADMIN',      // システム管理者
  USER = 'USER',        // 一般ユーザー
  GUEST = 'GUEST'       // ゲストユーザー
}

interface UserRolePermissions {
  [UserRole.ADMIN]: {
    users: ['create', 'read', 'update', 'delete'];
    logs: ['create', 'read', 'export'];
    alerts: ['create', 'read', 'update', 'delete', 'test'];
    notifications: ['read', 'test', 'send'];
    system: ['read', 'update'];
  };
  [UserRole.USER]: {
    users: ['read']; // 自分の情報のみ
    logs: ['create', 'read'];
    alerts: ['read'];
    notifications: [];
    system: [];
  };
  [UserRole.GUEST]: {
    users: [];
    logs: ['read']; // 制限付き
    alerts: ['read'];
    notifications: [];
    system: [];
  };
}
```

### 部署マスタ
```typescript
enum Department {
  SALES = 'sales',           // 営業部
  DEVELOPMENT = 'development', // 開発部
  HR = 'hr',                 // 人事部
  ACCOUNTING = 'accounting', // 経理部
  MANAGEMENT = 'management', // 経営陣
  IT = 'it',                 // IT部門
  SUPPORT = 'support'        // サポート部
}

const DEPARTMENT_LABELS = {
  [Department.SALES]: '営業部',
  [Department.DEVELOPMENT]: '開発部',
  [Department.HR]: '人事部',
  [Department.ACCOUNTING]: '経理部',
  [Department.MANAGEMENT]: '経営陣',
  [Department.IT]: 'IT部門',
  [Department.SUPPORT]: 'サポート部'
};
```

---

## API設計

### エンドポイント一覧

| メソッド | エンドポイント | 説明 | 認証 | 権限 |
|---------|--------------|------|------|------|
| GET | `/api/users` | ユーザー一覧取得 | ✓ | ADMIN |
| POST | `/api/users` | ユーザー作成 | ✓ | ADMIN |
| GET | `/api/users/:id` | ユーザー詳細取得 | ✓ | ADMIN/本人 |
| PUT | `/api/users/:id` | ユーザー更新 | ✓ | ADMIN/本人 |
| DELETE | `/api/users/:id` | ユーザー削除 | ✓ | ADMIN |
| PATCH | `/api/users/:id/status` | 状態切り替え | ✓ | ADMIN |
| GET | `/api/users/profile` | 自分のプロフィール | ✓ | - |
| PUT | `/api/users/profile` | プロフィール更新 | ✓ | - |

### API詳細仕様

#### GET /api/users

**Query Parameters:**
```typescript
interface UsersQuery {
  page?: number;
  pageSize?: number;
  username?: string;
  department?: string;
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  sortBy?: 'username' | 'name' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}
```

**Response:**
```typescript
interface UsersResponse {
  data: User[];
  pagination: PaginationInfo;
  statistics: UserStatistics;
}

interface UserStatistics {
  total: number;
  active: number;
  inactive: number;
  byRole: Record<UserRole, number>;
  byDepartment: Record<string, number>;
}
```

#### POST /api/users

**Request:**
```typescript
interface CreateUserRequest {
  username: string;        // 3-50文字、英数字とアンダースコア
  name: string;           // 1-255文字
  email: string;          // 有効なメールアドレス形式
  password: string;       // 6文字以上
  department?: string;    // 部署
  role?: UserRole;        // デフォルト: USER
  isActive?: boolean;     // デフォルト: true
}
```

**Response:**
```typescript
interface CreateUserResponse {
  id: number;
  message: string;
  user: User;
}
```

#### PUT /api/users/:id

**Request:**
```typescript
interface UpdateUserRequest {
  username?: string;
  name?: string;
  email?: string;
  password?: string;      // 更新する場合のみ
  department?: string;
  role?: UserRole;
  isActive?: boolean;
}
```

---

## 権限制御設計

### RBAC実装

```typescript
// backend/src/middleware/rbac.ts
export class RBACMiddleware {
  static requirePermission(resource: string, action: string) {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = req.user;
      if (!user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: '認証が必要です'
        });
      }

      const hasPermission = this.checkPermission(user.role, resource, action);
      if (!hasPermission) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: '権限が不足しています'
        });
      }

      next();
    };
  }

  static requireOwnershipOrAdmin(resourceIdParam: string = 'id') {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = req.user;
      const resourceId = parseInt(req.params[resourceIdParam]);

      // 管理者は全てアクセス可能
      if (user.role === 'ADMIN') {
        return next();
      }

      // 本人のリソースのみアクセス可能
      if (user.userId === resourceId) {
        return next();
      }

      return res.status(403).json({
        error: 'Access denied',
        message: 'このリソースにアクセスする権限がありません'
      });
    };
  }

  private static checkPermission(role: UserRole, resource: string, action: string): boolean {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return false;

    const resourcePermissions = permissions[resource];
    if (!resourcePermissions) return false;

    return resourcePermissions.includes(action);
  }
}

// 使用例
router.get('/users',
  authenticateToken,
  RBACMiddleware.requirePermission('users', 'read'),
  getUsers
);

router.put('/users/:id',
  authenticateToken,
  RBACMiddleware.requireOwnershipOrAdmin(),
  updateUser
);
```

### 権限マトリックス

```typescript
const ROLE_PERMISSIONS = {
  [UserRole.ADMIN]: {
    users: ['create', 'read', 'update', 'delete', 'toggle_status'],
    logs: ['create', 'read', 'export', 'delete'],
    alerts: ['create', 'read', 'update', 'delete', 'test'],
    notifications: ['read', 'test', 'send', 'configure'],
    system: ['read', 'update', 'backup', 'restore']
  },
  [UserRole.USER]: {
    users: ['read_own', 'update_own'],
    logs: ['create', 'read'],
    alerts: ['read'],
    notifications: [],
    system: []
  },
  [UserRole.GUEST]: {
    users: ['read_own'],
    logs: ['read'],
    alerts: ['read'],
    notifications: [],
    system: []
  }
};
```

---

## フロントエンド設計

### Users Store (Pinia)

```typescript
// frontend/src/stores/users.ts
interface UsersState {
  users: User[];
  loading: boolean;
  filters: UserFilters;
  pagination: PaginationInfo;
  statistics: UserStatistics | null;
  currentUser: User | null;
}

export const useUsersStore = defineStore('users', {
  state: (): UsersState => ({
    users: [],
    loading: false,
    filters: {
      username: '',
      department: '',
      role: '',
      isActive: null,
      search: ''
    },
    pagination: {
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0
    },
    statistics: null,
    currentUser: null
  }),

  getters: {
    activeUsers: (state) => state.users.filter(user => user.isActive),
    inactiveUsers: (state) => state.users.filter(user => !user.isActive),
    usersByRole: (state) => {
      const groups: Record<string, User[]> = {};
      state.users.forEach(user => {
        if (!groups[user.role]) groups[user.role] = [];
        groups[user.role].push(user);
      });
      return groups;
    },
    usersByDepartment: (state) => {
      const groups: Record<string, User[]> = {};
      state.users.forEach(user => {
        const dept = user.department || '未設定';
        if (!groups[dept]) groups[dept] = [];
        groups[dept].push(user);
      });
      return groups;
    }
  },

  actions: {
    async fetchUsers() {
      this.loading = true;
      try {
        const response = await usersAPI.getUsers({
          ...this.filters,
          page: this.pagination.page,
          pageSize: this.pagination.pageSize
        });

        this.users = response.data;
        this.pagination = response.pagination;
        this.statistics = response.statistics;
      } catch (error) {
        console.error('Fetch users error:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createUser(data: CreateUserRequest) {
      const response = await usersAPI.createUser(data);
      this.users.push(response.user);
      if (this.statistics) {
        this.statistics.total++;
        this.statistics.byRole[response.user.role]++;
      }
      return response;
    },

    async updateUser(id: number, data: UpdateUserRequest) {
      const response = await usersAPI.updateUser(id, data);
      const index = this.users.findIndex(user => user.id === id);
      if (index !== -1) {
        this.users[index] = response.user;
      }
      return response;
    },

    async deleteUser(id: number) {
      await usersAPI.deleteUser(id);
      this.users = this.users.filter(user => user.id !== id);
      if (this.statistics) {
        this.statistics.total--;
      }
    },

    async toggleUserStatus(id: number, isActive: boolean) {
      const response = await usersAPI.toggleUserStatus(id, isActive);
      const index = this.users.findIndex(user => user.id === id);
      if (index !== -1) {
        this.users[index] = response.user;
      }
      return response;
    },

    setFilters(filters: Partial<UserFilters>) {
      Object.assign(this.filters, filters);
    },

    resetFilters() {
      this.filters = {
        username: '',
        department: '',
        role: '',
        isActive: null,
        search: ''
      };
    }
  }
});
```

### ユーザー管理コンポーネント

```vue
<!-- frontend/src/views/Users.vue -->
<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import { showSuccess, showError, showApiError } from '@/utils/messages'

const usersStore = useUsersStore()
const authStore = useAuthStore()

const loading = ref(false)
const dialogVisible = ref(false)
const userFormRef = ref<FormInstance>()

const userForm = reactive({
  id: 0,
  username: '',
  name: '',
  email: '',
  password: '',
  department: '',
  role: 'USER'
})

const userRules = reactive<FormRules>({
  username: [
    { required: true, message: 'ユーザー名を入力してください', trigger: 'blur' },
    { min: 3, max: 50, message: '3-50文字で入力してください', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '英数字とアンダースコアのみ使用できます', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '氏名を入力してください', trigger: 'blur' },
    { max: 255, message: '255文字以下で入力してください', trigger: 'blur' }
  ],
  email: [
    { required: true, message: 'メールアドレスを入力してください', trigger: 'blur' },
    { type: 'email', message: '正しいメールアドレスを入力してください', trigger: 'blur' }
  ],
  password: [
    {
      required: computed(() => userForm.id === 0),
      message: 'パスワードを入力してください',
      trigger: 'blur'
    },
    { min: 6, message: '6文字以上で入力してください', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '権限を選択してください', trigger: 'change' }
  ]
})

const dialogTitle = computed(() => userForm.id ? 'ユーザー編集' : '新規ユーザー')

const canManageUsers = computed(() => authStore.isAdmin)

// 初期化
onMounted(() => {
  if (canManageUsers.value) {
    usersStore.fetchUsers()
  }
})

const handleAdd = () => {
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row: User) => {
  Object.assign(userForm, {
    ...row,
    password: '' // パスワードは編集時は空にする
  })
  dialogVisible.value = true
}

const handleDelete = (row: User) => {
  ElMessageBox.confirm(
    `ユーザー「${row.name}」を削除してもよろしいですか？`,
    '確認',
    {
      confirmButtonText: '削除',
      cancelButtonText: 'キャンセル',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await usersStore.deleteUser(row.id)
      showSuccess('S-USER-003') // ユーザー削除成功
    } catch (error) {
      showApiError(error, 'E-USER-006') // ユーザー削除失敗
    }
  }).catch(() => {
    // キャンセル時はメッセージ不要
  })
}

const handleSave = async () => {
  if (!userFormRef.value) return

  await userFormRef.value.validate(async (valid) => {
    if (!valid) return

    try {
      const userData = {
        username: userForm.username,
        name: userForm.name,
        email: userForm.email,
        department: userForm.department || undefined,
        role: userForm.role,
        ...(userForm.password && { password: userForm.password })
      }

      if (userForm.id) {
        // 更新
        await usersStore.updateUser(userForm.id, userData)
        showSuccess('S-USER-002') // ユーザー更新成功
      } else {
        // 新規作成
        if (!userForm.password) {
          showError('E-VALID-001') // パスワード必須
          return
        }
        await usersStore.createUser({ ...userData, password: userForm.password })
        showSuccess('S-USER-001') // ユーザー作成成功
      }

      dialogVisible.value = false
    } catch (error) {
      showApiError(error, userForm.id ? 'E-USER-005' : 'E-USER-001')
    }
  })
}

const handleStatusChange = async (row: User) => {
  try {
    await usersStore.toggleUserStatus(row.id, row.isActive)
    showSuccess('S-USER-002') // ユーザー更新成功
  } catch (error) {
    // エラー時は元の状態に戻す
    row.isActive = !row.isActive
    showApiError(error, 'E-USER-005') // ユーザー更新失敗
  }
}

const resetForm = () => {
  Object.assign(userForm, {
    id: 0,
    username: '',
    name: '',
    email: '',
    password: '',
    department: '',
    role: 'USER'
  })
}
</script>
```

---

## セキュリティ設計

### パスワードポリシー

```typescript
// backend/src/utils/passwordPolicy.ts
export class PasswordPolicy {
  private static readonly MIN_LENGTH = 6;
  private static readonly MAX_LENGTH = 100;
  private static readonly REQUIRE_UPPERCASE = false;
  private static readonly REQUIRE_LOWERCASE = false;
  private static readonly REQUIRE_NUMBERS = false;
  private static readonly REQUIRE_SPECIAL_CHARS = false;

  static validate(password: string): ValidationResult {
    const errors: string[] = [];

    // 長さチェック
    if (password.length < this.MIN_LENGTH) {
      errors.push(`パスワードは${this.MIN_LENGTH}文字以上である必要があります`);
    }

    if (password.length > this.MAX_LENGTH) {
      errors.push(`パスワードは${this.MAX_LENGTH}文字以下である必要があります`);
    }

    // 文字種チェック（必要に応じて有効化）
    if (this.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('パスワードには大文字を含める必要があります');
    }

    if (this.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('パスワードには小文字を含める必要があります');
    }

    if (this.REQUIRE_NUMBERS && !/\d/.test(password)) {
      errors.push('パスワードには数字を含める必要があります');
    }

    if (this.REQUIRE_SPECIAL_CHARS && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('パスワードには特殊文字を含める必要があります');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static generateSecurePassword(length: number = 12): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password;
  }
}
```

### セキュアなパスワード処理

```typescript
// backend/src/utils/securePassword.ts
export class SecurePasswordHandler {
  private static readonly SALT_ROUNDS = 10;
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15分

  static async hashPassword(password: string): Promise<string> {
    try {
      // パスワードポリシー検証
      const validation = PasswordPolicy.validate(password);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      return await bcrypt.hash(password, this.SALT_ROUNDS);
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error('パスワードの暗号化に失敗しました');
    }
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  // アカウントロックアウト機能（Redis等での実装を推奨）
  static async checkLoginAttempts(username: string): Promise<boolean> {
    // 実装例（メモリベース、本番環境ではRedis使用推奨）
    const attempts = this.loginAttempts.get(username) || { count: 0, lastAttempt: 0 };

    if (attempts.count >= this.MAX_LOGIN_ATTEMPTS) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
      if (timeSinceLastAttempt < this.LOCKOUT_DURATION) {
        return false; // ロックアウト中
      } else {
        // ロックアウト期間終了、カウントリセット
        this.loginAttempts.delete(username);
      }
    }

    return true;
  }

  static async recordLoginAttempt(username: string, success: boolean): Promise<void> {
    if (success) {
      // 成功時はカウントリセット
      this.loginAttempts.delete(username);
    } else {
      // 失敗時はカウント増加
      const attempts = this.loginAttempts.get(username) || { count: 0, lastAttempt: 0 };
      attempts.count++;
      attempts.lastAttempt = Date.now();
      this.loginAttempts.set(username, attempts);
    }
  }

  private static loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
}
```

---

## バリデーション設計

### サーバーサイドバリデーション

```typescript
// backend/src/validators/userValidator.ts
import { z } from 'zod';

export const CreateUserSchema = z.object({
  username: z.string()
    .min(3, 'ユーザー名は3文字以上である必要があります')
    .max(50, 'ユーザー名は50文字以下である必要があります')
    .regex(/^[a-zA-Z0-9_]+$/, 'ユーザー名は英数字とアンダースコアのみ使用できます'),

  name: z.string()
    .min(1, '氏名は必須です')
    .max(255, '氏名は255文字以下である必要があります'),

  email: z.string()
    .email('有効なメールアドレスを入力してください')
    .max(255, 'メールアドレスは255文字以下である必要があります'),

  password: z.string()
    .min(6, 'パスワードは6文字以上である必要があります')
    .max(100, 'パスワードは100文字以下である必要があります'),

  department: z.string()
    .max(255, '部署名は255文字以下である必要があります')
    .optional(),

  role: z.enum(['ADMIN', 'USER', 'GUEST'])
    .default('USER'),

  isActive: z.boolean()
    .default(true)
});

export const UpdateUserSchema = CreateUserSchema.partial().extend({
  password: z.string()
    .min(6, 'パスワードは6文字以上である必要があります')
    .max(100, 'パスワードは100文字以下である必要があります')
    .optional()
});

// バリデーションミドルウェア
export const validateCreateUser = (req: Request, res: Response, next: NextFunction) => {
  try {
    req.body = CreateUserSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'リクエストデータが無効です',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }
    next(error);
  }
};
```

### フロントエンドバリデーション

```typescript
// frontend/src/utils/userValidation.ts
export const createUserValidationRules = (): FormRules => ({
  username: [
    { required: true, message: 'ユーザー名を入力してください', trigger: 'blur' },
    { min: 3, max: 50, message: '3-50文字で入力してください', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z0-9_]+$/,
      message: '英数字とアンダースコアのみ使用できます',
      trigger: 'blur'
    },
    {
      asyncValidator: async (rule, value) => {
        if (value && value.length >= 3) {
          const isAvailable = await checkUsernameAvailability(value);
          if (!isAvailable) {
            throw new Error('このユーザー名は既に使用されています');
          }
        }
      },
      trigger: 'blur'
    }
  ],

  name: [
    { required: true, message: '氏名を入力してください', trigger: 'blur' },
    { max: 255, message: '255文字以下で入力してください', trigger: 'blur' }
  ],

  email: [
    { required: true, message: 'メールアドレスを入力してください', trigger: 'blur' },
    { type: 'email', message: '正しいメールアドレスを入力してください', trigger: 'blur' },
    {
      asyncValidator: async (rule, value) => {
        if (value && value.includes('@')) {
          const isAvailable = await checkEmailAvailability(value);
          if (!isAvailable) {
            throw new Error('このメールアドレスは既に使用されています');
          }
        }
      },
      trigger: 'blur'
    }
  ],

  password: [
    { required: true, message: 'パスワードを入力してください', trigger: 'blur' },
    { min: 6, max: 100, message: '6-100文字で入力してください', trigger: 'blur' },
    { validator: validatePasswordStrength, trigger: 'blur' }
  ],

  role: [
    { required: true, message: '権限を選択してください', trigger: 'change' }
  ]
});

const validatePasswordStrength = (rule: any, value: string, callback: Function) => {
  if (!value) {
    callback();
    return;
  }

  const strength = calculatePasswordStrength(value);
  if (strength < 2) {
    callback(new Error('パスワードが弱すぎます。より強力なパスワードを設定してください'));
  } else {
    callback();
  }
};

const calculatePasswordStrength = (password: string): number => {
  let strength = 0;

  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

  return strength;
};
```

---

**ドキュメント作成日**: 2025年9月21日
**次回レビュー予定**: 2025年10月21日
**関連ドキュメント**:
- 認証システム設計書
- セキュリティ設計書
- データベース設計書
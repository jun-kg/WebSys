import { vi } from 'vitest';
import { config } from '@vue/test-utils';
import ElementPlus from 'element-plus';

// Element Plus のグローバル設定
config.global.plugins = [ElementPlus];

// API モックの設定
vi.mock('@/api/permissions', () => ({
  getPermissionTemplates: vi.fn(),
  createPermissionTemplate: vi.fn(),
  updatePermissionTemplate: vi.fn(),
  deletePermissionTemplate: vi.fn(),
  applyPermissionTemplate: vi.fn()
}));

vi.mock('@/api/features', () => ({
  getFeatures: vi.fn()
}));

vi.mock('@/api/departments', () => ({
  getDepartments: vi.fn()
}));

// Pinia store のモック
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: {
      id: 1,
      username: 'testuser',
      role: 'ADMIN',
      companyId: 1
    },
    isAuthenticated: true
  }))
}));

// Element Plus のメッセージコンポーネントをモック
vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus');
  return {
    ...actual,
    ElMessage: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn()
    },
    ElMessageBox: {
      confirm: vi.fn()
    }
  };
});
/**
 * 役職権限初期データ
 * Phase 3 - T014
 *
 * 4つの役職（ADMIN, MANAGER, USER, GUEST）の権限を定義
 */

import { prisma } from '../../src/core/lib/prisma';

interface RolePermissionSeed {
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'GUEST';
  action: string;
  scope: 'GLOBAL' | 'DEPARTMENT' | 'SELF';
  description: string;
}

/**
 * 役職権限マトリクス
 *
 * スコープ定義:
 * - GLOBAL: 全社アクセス可能
 * - DEPARTMENT: 所属部署のみアクセス可能
 * - SELF: 自分のデータのみアクセス可能
 */
const rolePermissions: RolePermissionSeed[] = [
  // ========================================
  // ADMIN権限（システム管理者）
  // ========================================

  // ユーザー管理
  { role: 'ADMIN', action: 'USER_VIEW', scope: 'GLOBAL', description: '全ユーザー閲覧' },
  { role: 'ADMIN', action: 'USER_CREATE', scope: 'GLOBAL', description: '全社ユーザー作成' },
  { role: 'ADMIN', action: 'USER_EDIT', scope: 'GLOBAL', description: '全ユーザー編集' },
  { role: 'ADMIN', action: 'USER_DELETE', scope: 'GLOBAL', description: '全ユーザー削除' },
  { role: 'ADMIN', action: 'USER_ROLE_CHANGE', scope: 'GLOBAL', description: '役職変更' },

  // 部署管理
  { role: 'ADMIN', action: 'DEPT_VIEW', scope: 'GLOBAL', description: '全部署閲覧' },
  { role: 'ADMIN', action: 'DEPT_CREATE', scope: 'GLOBAL', description: '部署作成' },
  { role: 'ADMIN', action: 'DEPT_EDIT', scope: 'GLOBAL', description: '全部署編集' },
  { role: 'ADMIN', action: 'DEPT_DELETE', scope: 'GLOBAL', description: '部署削除' },

  // 会社管理
  { role: 'ADMIN', action: 'COMPANY_VIEW', scope: 'GLOBAL', description: '会社情報閲覧' },
  { role: 'ADMIN', action: 'COMPANY_EDIT', scope: 'GLOBAL', description: '会社情報編集' },

  // 権限管理
  { role: 'ADMIN', action: 'PERMISSION_VIEW', scope: 'GLOBAL', description: '全権限閲覧' },
  { role: 'ADMIN', action: 'PERMISSION_CREATE', scope: 'GLOBAL', description: '権限作成' },
  { role: 'ADMIN', action: 'PERMISSION_EDIT', scope: 'GLOBAL', description: '権限編集' },
  { role: 'ADMIN', action: 'PERMISSION_DELETE', scope: 'GLOBAL', description: '権限削除' },

  // ワークフロー管理
  { role: 'ADMIN', action: 'WORKFLOW_VIEW', scope: 'GLOBAL', description: '全ワークフロー閲覧' },
  { role: 'ADMIN', action: 'WORKFLOW_CREATE', scope: 'GLOBAL', description: 'ワークフロー作成' },
  { role: 'ADMIN', action: 'WORKFLOW_EDIT', scope: 'GLOBAL', description: 'ワークフロー編集' },
  { role: 'ADMIN', action: 'WORKFLOW_DELETE', scope: 'GLOBAL', description: 'ワークフロー削除' },
  { role: 'ADMIN', action: 'WORKFLOW_APPROVE', scope: 'GLOBAL', description: '全承認実行' },
  { role: 'ADMIN', action: 'WORKFLOW_EMERGENCY', scope: 'GLOBAL', description: '緊急承認実行' },

  // レポート・監査
  { role: 'ADMIN', action: 'LOG_VIEW', scope: 'GLOBAL', description: '全監査ログ閲覧' },
  { role: 'ADMIN', action: 'LOG_EXPORT', scope: 'GLOBAL', description: 'ログエクスポート' },
  { role: 'ADMIN', action: 'LOG_DELETE', scope: 'GLOBAL', description: 'ログ削除' },
  { role: 'ADMIN', action: 'REPORT_VIEW', scope: 'GLOBAL', description: '全統計レポート閲覧' },
  { role: 'ADMIN', action: 'ALERT_MANAGE', scope: 'GLOBAL', description: 'アラート管理' },

  // システム設定
  { role: 'ADMIN', action: 'SYSTEM_SETTING', scope: 'GLOBAL', description: 'システム設定変更' },
  { role: 'ADMIN', action: 'FEATURE_MANAGE', scope: 'GLOBAL', description: '機能管理' },

  // ========================================
  // MANAGER権限（部署管理者）
  // ========================================

  // ユーザー管理（自部署のみ）
  { role: 'MANAGER', action: 'USER_VIEW', scope: 'DEPARTMENT', description: '自部署ユーザー閲覧' },
  { role: 'MANAGER', action: 'USER_CREATE', scope: 'DEPARTMENT', description: '自部署ユーザー作成' },
  { role: 'MANAGER', action: 'USER_EDIT', scope: 'DEPARTMENT', description: '自部署ユーザー編集' },
  { role: 'MANAGER', action: 'USER_DELETE', scope: 'DEPARTMENT', description: '自部署ユーザー削除' },

  // 部署管理（自部署のみ）
  { role: 'MANAGER', action: 'DEPT_VIEW', scope: 'DEPARTMENT', description: '自部署閲覧' },
  { role: 'MANAGER', action: 'DEPT_EDIT', scope: 'DEPARTMENT', description: '自部署編集' },

  // 権限管理（自部署のみ）
  { role: 'MANAGER', action: 'PERMISSION_VIEW', scope: 'DEPARTMENT', description: '自部署権限閲覧' },
  { role: 'MANAGER', action: 'PERMISSION_EDIT', scope: 'DEPARTMENT', description: '自部署権限編集' },

  // ワークフロー管理（自部署のみ）
  { role: 'MANAGER', action: 'WORKFLOW_VIEW', scope: 'DEPARTMENT', description: '自部署ワークフロー閲覧' },
  { role: 'MANAGER', action: 'WORKFLOW_CREATE', scope: 'DEPARTMENT', description: '自部署ワークフロー作成' },
  { role: 'MANAGER', action: 'WORKFLOW_EDIT', scope: 'DEPARTMENT', description: '自部署ワークフロー編集' },
  { role: 'MANAGER', action: 'WORKFLOW_APPROVE', scope: 'DEPARTMENT', description: '自部署承認実行' },
  { role: 'MANAGER', action: 'WORKFLOW_EMERGENCY', scope: 'DEPARTMENT', description: '自部署緊急承認' },

  // レポート・監査（自部署のみ）
  { role: 'MANAGER', action: 'LOG_VIEW', scope: 'DEPARTMENT', description: '自部署ログ閲覧' },
  { role: 'MANAGER', action: 'LOG_EXPORT', scope: 'DEPARTMENT', description: '自部署ログエクスポート' },
  { role: 'MANAGER', action: 'REPORT_VIEW', scope: 'DEPARTMENT', description: '自部署レポート閲覧' },
  { role: 'MANAGER', action: 'ALERT_MANAGE', scope: 'DEPARTMENT', description: '自部署アラート管理' },

  // ========================================
  // USER権限（一般ユーザー）
  // ========================================

  // ユーザー管理（自分のみ）
  { role: 'USER', action: 'USER_VIEW', scope: 'SELF', description: '自分のプロフィール閲覧' },
  { role: 'USER', action: 'USER_EDIT', scope: 'SELF', description: '自分のプロフィール編集' },

  // 部署閲覧（所属部署のみ）
  { role: 'USER', action: 'DEPT_VIEW', scope: 'DEPARTMENT', description: '所属部署閲覧' },

  // ワークフロー（自分の申請のみ）
  { role: 'USER', action: 'WORKFLOW_VIEW', scope: 'SELF', description: '自分の申請閲覧' },
  { role: 'USER', action: 'WORKFLOW_CREATE', scope: 'SELF', description: '申請作成' },
  { role: 'USER', action: 'WORKFLOW_EDIT', scope: 'SELF', description: '自分の申請編集' },
  { role: 'USER', action: 'WORKFLOW_APPROVE', scope: 'SELF', description: '割当承認実行' },

  // レポート（自分のみ）
  { role: 'USER', action: 'REPORT_VIEW', scope: 'SELF', description: '自分のレポート閲覧' },

  // ========================================
  // GUEST権限（ゲストユーザー - 最小権限）
  // ========================================
  // ゲストユーザーは招待時に指定された allowedFeatures のみアクセス可能
  // ここでは基本的な権限のみ定義し、詳細制約は GuestUserService で制御

  // ユーザー管理（自分のみ・閲覧のみ）
  { role: 'GUEST', action: 'USER_VIEW', scope: 'SELF', description: '自分のプロフィール閲覧' },

  // ワークフロー（閲覧のみ）
  { role: 'GUEST', action: 'WORKFLOW_VIEW', scope: 'SELF', description: '割当ワークフロー閲覧' },

  // レポート（閲覧のみ）
  { role: 'GUEST', action: 'REPORT_VIEW', scope: 'SELF', description: '割当レポート閲覧' },

  // データ閲覧（allowedFeatures: DATA_VIEW）
  { role: 'GUEST', action: 'DATA_VIEW', scope: 'SELF', description: 'データ閲覧' },

  // 監査ログ（制限付き閲覧、allowedFeatures: AUDIT_VIEW_LIMITED）
  { role: 'GUEST', action: 'AUDIT_VIEW', scope: 'SELF', description: '監査ログ閲覧（制限付き）' },

  // ログ閲覧（allowedFeatures: LOG_VIEW）
  { role: 'GUEST', action: 'LOG_VIEW', scope: 'SELF', description: 'ログ閲覧（制限付き）' },
];

/**
 * 役職権限初期データ投入
 */
export async function seedRolePermissions() {
  console.log('🌱 Seeding role permissions...');

  // 既存データをクリア
  await prisma.role_permissions.deleteMany({});
  console.log('✅ Existing role permissions cleared');

  // 一括作成
  const created = await prisma.role_permissions.createMany({
    data: rolePermissions.map(p => ({
      role: p.role,
      action: p.action,
      scope: p.scope,
      description: p.description
    })),
    skipDuplicates: true
  });

  console.log(`✅ Created ${created.count} role permissions`);

  // 統計表示
  const stats = rolePermissions.reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n📊 Role Permission Statistics:');
  for (const [role, count] of Object.entries(stats)) {
    console.log(`  ${role}: ${count} permissions`);
  }

  console.log('\n✅ Role permissions seeding completed!');
}

// スタンドアロン実行
seedRolePermissions()
  .catch((error) => {
    console.error('❌ Error seeding role permissions:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * 型安全なPrismaモデルアクセサー
 *
 * このファイルは、Prismaモデル名の誤用を防ぐための型安全ラッパーを提供します。
 * 単数形・キャメルケースの誤用によるランタイムエラーを型レベルで防止します。
 *
 * @example
 * // ❌ 危険（ランタイムエラーの可能性）
 * const users = await prisma.user.findMany()  // 単数形エラー
 *
 * // ✅ 安全（型チェックで保護）
 * import { db } from '@/types/prisma-safe'
 * const users = await db.users.findMany()
 */

import { PrismaClient } from '@prisma/client'
import { prisma } from '../core/lib/prisma'

/**
 * 全Prismaモデルの型安全マッピング
 *
 * 各プロパティはPrismaClientの対応するモデルへの参照を保持します。
 * これにより、存在しないモデル名へのアクセスをTypeScriptレベルで防止します。
 */
export type SafePrismaModels = {
  // 認証・権限管理
  users: PrismaClient['users']
  companies: PrismaClient['companies']
  departments: PrismaClient['departments']
  user_departments: PrismaClient['user_departments']
  user_sessions: PrismaClient['user_sessions']
  refresh_tokens: PrismaClient['refresh_tokens']
  login_attempts: PrismaClient['login_attempts']

  // 機能権限
  features: PrismaClient['features']
  department_feature_permissions: PrismaClient['department_feature_permissions']
  permission_templates: PrismaClient['permission_templates']
  permission_template_features: PrismaClient['permission_template_features']
  permission_template_details: PrismaClient['permission_template_details']
  permission_inheritance_rules: PrismaClient['permission_inheritance_rules']

  // 監査・ログ
  audit_logs: PrismaClient['audit_logs']
  logs: PrismaClient['logs']
  log_statistics: PrismaClient['log_statistics']
  log_categories: PrismaClient['log_categories']
  alert_rules: PrismaClient['alert_rules']

  // セキュリティ
  security_events: PrismaClient['security_events']
  security_settings: PrismaClient['security_settings']

  // ワークフロー
  workflow_types: PrismaClient['workflow_types']
  workflow_requests: PrismaClient['workflow_requests']
  workflow_attachments: PrismaClient['workflow_attachments']
  workflow_notifications: PrismaClient['workflow_notifications']
  approval_routes: PrismaClient['approval_routes']
  approval_history: PrismaClient['approval_history']
  approval_delegates: PrismaClient['approval_delegates']
  auto_approval_rules: PrismaClient['auto_approval_rules']
  auto_approval_logs: PrismaClient['auto_approval_logs']

  // システムメッセージ
  system_messages: PrismaClient['system_messages']
  message_definitions: PrismaClient['message_definitions']
}

/**
 * 型安全なPrismaモデルインスタンス
 *
 * 全てのモデルアクセスはこのオブジェクトを経由することで、
 * モデル名の誤用を防止できます。
 *
 * @example
 * // ✅ 正しい使用方法
 * import { db } from '@/types/prisma-safe'
 *
 * const users = await db.users.findMany()
 * const companies = await db.companies.findMany()
 * const logs = await db.logs.findMany()
 *
 * // ❌ TypeScriptエラー（コンパイル時に検出）
 * const user = await db.user.findMany()  // Property 'user' does not exist
 * const alertRule = await db.alertRule.findMany()  // Property 'alertRule' does not exist
 */
export const db: SafePrismaModels = {
  // 認証・権限管理
  users: prisma.users,
  companies: prisma.companies,
  departments: prisma.departments,
  user_departments: prisma.user_departments,
  user_sessions: prisma.user_sessions,
  refresh_tokens: prisma.refresh_tokens,
  login_attempts: prisma.login_attempts,

  // 機能権限
  features: prisma.features,
  department_feature_permissions: prisma.department_feature_permissions,
  permission_templates: prisma.permission_templates,
  permission_template_features: prisma.permission_template_features,
  permission_template_details: prisma.permission_template_details,
  permission_inheritance_rules: prisma.permission_inheritance_rules,

  // 監査・ログ
  audit_logs: prisma.audit_logs,
  logs: prisma.logs,
  log_statistics: prisma.log_statistics,
  log_categories: prisma.log_categories,
  alert_rules: prisma.alert_rules,

  // セキュリティ
  security_events: prisma.security_events,
  security_settings: prisma.security_settings,

  // ワークフロー
  workflow_types: prisma.workflow_types,
  workflow_requests: prisma.workflow_requests,
  workflow_attachments: prisma.workflow_attachments,
  workflow_notifications: prisma.workflow_notifications,
  approval_routes: prisma.approval_routes,
  approval_history: prisma.approval_history,
  approval_delegates: prisma.approval_delegates,
  auto_approval_rules: prisma.auto_approval_rules,
  auto_approval_logs: prisma.auto_approval_logs,

  // システムメッセージ
  system_messages: prisma.system_messages,
  message_definitions: prisma.message_definitions,
}

/**
 * 型安全なPrismaインスタンス生成関数
 *
 * テスト環境など、カスタムPrismaインスタンスが必要な場合に使用します。
 *
 * @param client - カスタムPrismaClientインスタンス
 * @returns 型安全なモデルマッピング
 *
 * @example
 * // テスト用モックPrisma
 * const mockPrisma = new PrismaClient()
 * const testDb = createSafePrisma(mockPrisma)
 *
 * const users = await testDb.users.findMany()
 */
export function createSafePrisma(client: PrismaClient): SafePrismaModels {
  return {
    // 認証・権限管理
    users: client.users,
    companies: client.companies,
    departments: client.departments,
    user_departments: client.user_departments,
    user_sessions: client.user_sessions,
    refresh_tokens: client.refresh_tokens,
    login_attempts: client.login_attempts,

    // 機能権限
    features: client.features,
    department_feature_permissions: client.department_feature_permissions,
    permission_templates: client.permission_templates,
    permission_template_features: client.permission_template_features,
    permission_template_details: client.permission_template_details,
    permission_inheritance_rules: client.permission_inheritance_rules,

    // 監査・ログ
    audit_logs: client.audit_logs,
    logs: client.logs,
    log_statistics: client.log_statistics,
    log_categories: client.log_categories,
    alert_rules: client.alert_rules,

    // セキュリティ
    security_events: client.security_events,
    security_settings: client.security_settings,

    // ワークフロー
    workflow_types: client.workflow_types,
    workflow_requests: client.workflow_requests,
    workflow_attachments: client.workflow_attachments,
    workflow_notifications: client.workflow_notifications,
    approval_routes: client.approval_routes,
    approval_history: client.approval_history,
    approval_delegates: client.approval_delegates,
    auto_approval_rules: client.auto_approval_rules,
    auto_approval_logs: client.auto_approval_logs,

    // システムメッセージ
    system_messages: client.system_messages,
    message_definitions: client.message_definitions,
  }
}

/**
 * よく使うモデルのエイリアス
 *
 * 頻繁に使用するモデルへのショートカットを提供します。
 */
export const {
  users: Users,
  companies: Companies,
  departments: Departments,
  logs: Logs,
  features: Features,
  audit_logs: AuditLogs,
} = db

/**
 * 使用ガイド
 *
 * ## 基本的な使い方
 * ```typescript
 * import { db } from '@/types/prisma-safe'
 *
 * // ✅ 型安全なクエリ
 * const users = await db.users.findMany()
 * const company = await db.companies.findUnique({ where: { id: 1 } })
 * ```
 *
 * ## エイリアスの使用
 * ```typescript
 * import { Users, Companies, Logs } from '@/types/prisma-safe'
 *
 * const allUsers = await Users.findMany()
 * const allCompanies = await Companies.findMany()
 * ```
 *
 * ## テスト環境での使用
 * ```typescript
 * import { createSafePrisma } from '@/types/prisma-safe'
 * import { PrismaClient } from '@prisma/client'
 *
 * const testPrisma = new PrismaClient()
 * const testDb = createSafePrisma(testPrisma)
 *
 * const users = await testDb.users.findMany()
 * ```
 *
 * ## 移行ガイド
 *
 * ### Before（従来の方法）
 * ```typescript
 * import { prisma } from '@/lib/prisma'
 *
 * const users = await prisma.users.findMany()  // ランタイムエラーの可能性
 * ```
 *
 * ### After（型安全な方法）
 * ```typescript
 * import { db } from '@/types/prisma-safe'
 *
 * const users = await db.users.findMany()  // 型チェックで保護
 * ```
 */

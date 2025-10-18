/**
 * 認証・権限関連ユーティリティ関数
 */

import { useAuthStore } from '@custom/stores/auth'

/**
 * 指定された機能に対する権限があるかチェック
 * @param featureCode - 機能コード
 * @param action - アクション（オプション）
 * @returns 権限があるかどうか
 */
export function hasPermission(featureCode: string, action?: string): boolean {
  const authStore = useAuthStore()
  return authStore.hasPermission(featureCode, action)
}

/**
 * 管理者権限があるかチェック
 * @returns 管理者権限があるかどうか
 */
export function isAdmin(): boolean {
  const authStore = useAuthStore()
  return authStore.isAdmin
}

/**
 * マネージャー権限があるかチェック
 * @returns マネージャー権限があるかどうか
 */
export function isManager(): boolean {
  const authStore = useAuthStore()
  return authStore.isManager
}

/**
 * 認証済みかチェック
 * @returns 認証済みかどうか
 */
export function isAuthenticated(): boolean {
  const authStore = useAuthStore()
  return authStore.isAuthenticated
}

/**
 * 現在のユーザー情報を取得
 * @returns ユーザー情報
 */
export function getCurrentUser() {
  const authStore = useAuthStore()
  return authStore.user
}

/**
 * 現在のユーザーの会社情報を取得
 * @returns 会社情報
 */
export function getUserCompany() {
  const authStore = useAuthStore()
  return authStore.userCompany
}

/**
 * 現在のユーザーの部署情報を取得
 * @returns 部署情報
 */
export function getUserDepartment() {
  const authStore = useAuthStore()
  return authStore.userDepartment
}

/**
 * 現在のユーザーの表示名を取得
 * @returns 表示名
 */
export function getDisplayName(): string {
  const authStore = useAuthStore()
  return authStore.getDisplayName()
}

/**
 * トークンを取得
 * @returns JWTトークン
 */
export function getToken(): string | null {
  const authStore = useAuthStore()
  return authStore.token
}

/**
 * 指定されたロールかどうかチェック
 * @param role - チェックするロール
 * @returns 指定されたロールかどうか
 */
export function hasRole(role: string): boolean {
  const authStore = useAuthStore()
  return authStore.user?.role === role
}

/**
 * 複数のロールのいずれかを持っているかチェック
 * @param roles - チェックするロールの配列
 * @returns いずれかのロールを持っているかどうか
 */
export function hasAnyRole(roles: string[]): boolean {
  const authStore = useAuthStore()
  return roles.includes(authStore.user?.role || '')
}

/**
 * 同じ会社のユーザーかどうかチェック
 * @param targetCompanyId - 対象の会社ID
 * @returns 同じ会社かどうか
 */
export function isSameCompany(targetCompanyId: number): boolean {
  const authStore = useAuthStore()
  return authStore.user?.companyId === targetCompanyId
}

/**
 * 同じ部署のユーザーかどうかチェック
 * @param targetDepartmentId - 対象の部署ID
 * @returns 同じ部署かどうか
 */
export function isSameDepartment(targetDepartmentId: number): boolean {
  const authStore = useAuthStore()
  return authStore.user?.primaryDepartmentId === targetDepartmentId
}
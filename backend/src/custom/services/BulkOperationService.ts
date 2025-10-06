/**
 * 一括操作サービス (Phase 3 - T021)
 * CSV インポート・エクスポート機能
 */

import { prisma } from '../../core/lib/prisma'
import type { UserRole } from '@prisma/client'

// CSV エクスポートオプション
export interface CsvExportOptions {
  companyId?: number
  departmentId?: number
  role?: UserRole
  isActive?: boolean
  includeInactive?: boolean
}

// CSV インポートレコード
export interface CsvImportRecord {
  rowNumber: number
  username?: string
  email?: string
  name?: string
  employeeCode?: string
  role?: string
  companyId?: number
  departmentId?: number
  isActive?: boolean
}

// バリデーション結果
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  validRecords: CsvImportRecord[]
  invalidRecords: CsvImportRecord[]
}

// バリデーションエラー
export interface ValidationError {
  rowNumber: number
  field: string
  value: any
  message: string
  errorType: 'REQUIRED' | 'FORMAT' | 'DUPLICATE' | 'NOT_FOUND' | 'INVALID'
}

// インポート結果
export interface ImportResult {
  logId: number
  totalRecords: number
  successRecords: number
  failedRecords: number
  errors: ValidationError[]
}

export class BulkOperationService {
  /**
   * ユーザー情報をCSVエクスポート
   */
  async exportUsersToCSV(options: CsvExportOptions = {}): Promise<string> {
    const where: any = {}

    if (options.companyId) {
      where.companyId = options.companyId
    }

    if (options.departmentId) {
      where.primaryDepartmentId = options.departmentId
    }

    if (options.role) {
      where.role = options.role
    }

    if (!options.includeInactive) {
      where.isActive = true
    } else if (options.isActive !== undefined) {
      where.isActive = options.isActive
    }

    const users = await prisma.users.findMany({
      where,
      include: {
        companies: true,
        departments: true
      },
      orderBy: [{ companyId: 'asc' }, { id: 'asc' }]
    })

    // CSV ヘッダー
    const headers = [
      'ID',
      'ユーザー名',
      'メールアドレス',
      '氏名',
      '社員コード',
      '役職',
      '会社ID',
      '会社名',
      '部署ID',
      '部署名',
      '入社日',
      '退職日',
      '有効/無効'
    ]

    // CSV データ
    const rows = users.map((user) => [
      user.id,
      user.username,
      user.email,
      user.name,
      user.employeeCode || '',
      user.role,
      user.companyId || '',
      user.companies?.name || '',
      user.primaryDepartmentId || '',
      user.departments?.name || '',
      user.joinDate ? user.joinDate.toISOString().split('T')[0] : '',
      user.leaveDate ? user.leaveDate.toISOString().split('T')[0] : '',
      user.isActive ? '有効' : '無効'
    ])

    // CSV 生成 (RFC 4180 準拠)
    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell)
            // ダブルクォートまたはカンマを含む場合はエスケープ
            if (cellStr.includes('"') || cellStr.includes(',') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`
            }
            return cellStr
          })
          .join(',')
      )
      .join('\n')

    return csvContent
  }

  /**
   * CSV データをバリデーション
   */
  async validateCsvData(records: CsvImportRecord[]): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const validRecords: CsvImportRecord[] = []
    const invalidRecords: CsvImportRecord[] = []

    // ユーザー名・メールアドレスの重複チェック用
    const existingUsernames = new Set(
      (await prisma.users.findMany({ select: { username: true } })).map((u) => u.username)
    )
    const existingEmails = new Set(
      (await prisma.users.findMany({ select: { email: true } })).map((u) => u.email)
    )

    // CSV内の重複チェック用
    const csvUsernames = new Set<string>()
    const csvEmails = new Set<string>()

    for (const record of records) {
      const recordErrors: ValidationError[] = []

      // 必須フィールドチェック
      if (!record.username || record.username.trim() === '') {
        recordErrors.push({
          rowNumber: record.rowNumber,
          field: 'username',
          value: record.username,
          message: 'ユーザー名は必須です',
          errorType: 'REQUIRED'
        })
      }

      if (!record.email || record.email.trim() === '') {
        recordErrors.push({
          rowNumber: record.rowNumber,
          field: 'email',
          value: record.email,
          message: 'メールアドレスは必須です',
          errorType: 'REQUIRED'
        })
      }

      if (!record.name || record.name.trim() === '') {
        recordErrors.push({
          rowNumber: record.rowNumber,
          field: 'name',
          value: record.name,
          message: '氏名は必須です',
          errorType: 'REQUIRED'
        })
      }

      // フォーマットチェック
      if (record.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(record.email)) {
          recordErrors.push({
            rowNumber: record.rowNumber,
            field: 'email',
            value: record.email,
            message: 'メールアドレスの形式が不正です',
            errorType: 'FORMAT'
          })
        }
      }

      // ユーザー名の重複チェック
      if (record.username) {
        if (existingUsernames.has(record.username)) {
          recordErrors.push({
            rowNumber: record.rowNumber,
            field: 'username',
            value: record.username,
            message: 'このユーザー名は既に使用されています',
            errorType: 'DUPLICATE'
          })
        }
        if (csvUsernames.has(record.username)) {
          recordErrors.push({
            rowNumber: record.rowNumber,
            field: 'username',
            value: record.username,
            message: 'CSV内でユーザー名が重複しています',
            errorType: 'DUPLICATE'
          })
        }
        csvUsernames.add(record.username)
      }

      // メールアドレスの重複チェック
      if (record.email) {
        if (existingEmails.has(record.email)) {
          recordErrors.push({
            rowNumber: record.rowNumber,
            field: 'email',
            value: record.email,
            message: 'このメールアドレスは既に使用されています',
            errorType: 'DUPLICATE'
          })
        }
        if (csvEmails.has(record.email)) {
          recordErrors.push({
            rowNumber: record.rowNumber,
            field: 'email',
            value: record.email,
            message: 'CSV内でメールアドレスが重複しています',
            errorType: 'DUPLICATE'
          })
        }
        csvEmails.add(record.email)
      }

      // 役職の妥当性チェック
      if (record.role) {
        const validRoles = ['ADMIN', 'MANAGER', 'USER', 'GUEST']
        if (!validRoles.includes(record.role)) {
          recordErrors.push({
            rowNumber: record.rowNumber,
            field: 'role',
            value: record.role,
            message: '役職が不正です (ADMIN, MANAGER, USER, GUEST のいずれか)',
            errorType: 'INVALID'
          })
        }
      }

      // 会社IDの存在確認
      if (record.companyId) {
        const company = await prisma.companies.findUnique({
          where: { id: record.companyId }
        })
        if (!company) {
          recordErrors.push({
            rowNumber: record.rowNumber,
            field: 'companyId',
            value: record.companyId,
            message: '指定された会社IDが存在しません',
            errorType: 'NOT_FOUND'
          })
        }
      }

      // 部署IDの存在確認
      if (record.departmentId) {
        const department = await prisma.departments.findUnique({
          where: { id: record.departmentId }
        })
        if (!department) {
          recordErrors.push({
            rowNumber: record.rowNumber,
            field: 'departmentId',
            value: record.departmentId,
            message: '指定された部署IDが存在しません',
            errorType: 'NOT_FOUND'
          })
        }
      }

      // レコードの分類
      if (recordErrors.length > 0) {
        errors.push(...recordErrors)
        invalidRecords.push(record)
      } else {
        validRecords.push(record)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      validRecords,
      invalidRecords
    }
  }

  /**
   * CSV データをインポート実行
   */
  async importUsers(
    records: CsvImportRecord[],
    fileName: string,
    importedBy: number
  ): Promise<ImportResult> {
    // バリデーション実行
    const validationResult = await this.validateCsvData(records)

    // インポートログ作成
    const importLog = await prisma.bulk_import_logs.create({
      data: {
        type: 'USER',
        fileName,
        totalRecords: records.length,
        successRecords: 0,
        failedRecords: 0,
        status: 'PROCESSING',
        importedBy,
        validationErrors: validationResult.errors
      }
    })

    let successCount = 0
    let failedCount = 0
    const importErrors: ValidationError[] = []

    // 有効なレコードのみインポート
    for (const record of validationResult.validRecords) {
      try {
        await prisma.users.create({
          data: {
            username: record.username!,
            email: record.email!,
            name: record.name!,
            password: '$2b$10$defaultHashForCsvImport', // デフォルトパスワード（初回ログイン時に変更必須）
            employeeCode: record.employeeCode || null,
            role: (record.role as UserRole) || 'USER',
            companyId: record.companyId || null,
            primaryDepartmentId: record.departmentId || null,
            isActive: record.isActive !== undefined ? record.isActive : true,
            updatedAt: new Date()
          }
        })
        successCount++
      } catch (error: any) {
        failedCount++
        importErrors.push({
          rowNumber: record.rowNumber,
          field: 'general',
          value: null,
          message: `インポートエラー: ${error.message}`,
          errorType: 'INVALID'
        })
      }
    }

    // 無効なレコードを失敗としてカウント
    failedCount += validationResult.invalidRecords.length

    // インポートログ更新
    await prisma.bulk_import_logs.update({
      where: { id: importLog.id },
      data: {
        successRecords: successCount,
        failedRecords: failedCount,
        status: failedCount === 0 ? 'COMPLETED' : 'COMPLETED',
        completedAt: new Date(),
        errorDetails: [...validationResult.errors, ...importErrors]
      }
    })

    return {
      logId: importLog.id,
      totalRecords: records.length,
      successRecords: successCount,
      failedRecords: failedCount,
      errors: [...validationResult.errors, ...importErrors]
    }
  }

  /**
   * インポート履歴取得
   */
  async getImportHistory(
    companyId?: number,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    data: any[]
    total: number
    page: number
    limit: number
    totalPages: number
  }> {
    const where: any = { type: 'USER' }

    // 会社IDでフィルタリング（管理者以外）
    if (companyId) {
      const userIds = (
        await prisma.users.findMany({
          where: { companyId },
          select: { id: true }
        })
      ).map((u) => u.id)
      where.importedBy = { in: userIds }
    }

    const total = await prisma.bulk_import_logs.count({ where })

    const logs = await prisma.bulk_import_logs.findMany({
      where,
      include: {
        importer: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      },
      orderBy: { importedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }
}

export const bulkOperationService = new BulkOperationService()

/**
 * 一括操作API (Phase 3 - T021)
 * CSV インポート・エクスポート API
 */

import express from 'express'
import multer from 'multer'
import { parse } from 'csv-parse/sync'
import { authenticate, authorize } from '../../core/middleware/auth'
import { bulkOperationService, type CsvImportRecord } from '../services/BulkOperationService'

const router = express.Router()

// Multer 設定 (メモリストレージ)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true)
    } else {
      cb(new Error('CSV ファイルのみアップロード可能です'))
    }
  }
})

/**
 * GET /api/bulk-operations/users/export
 * ユーザー情報をCSVエクスポート
 */
router.get('/users/export', authenticate, async (req, res) => {
  try {
    const { companyId, departmentId, role, isActive, includeInactive } = req.query

    const options: any = {}

    if (companyId) options.companyId = parseInt(companyId as string)
    if (departmentId) options.departmentId = parseInt(departmentId as string)
    if (role) options.role = role as string
    if (isActive !== undefined) options.isActive = isActive === 'true'
    if (includeInactive !== undefined) options.includeInactive = includeInactive === 'true'

    const csvContent = await bulkOperationService.exportUsersToCSV(options)

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]
    const filename = `users_export_${timestamp}.csv`

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-cache')

    // BOM を追加 (Excel で文字化け防止)
    res.write('\uFEFF')
    res.write(csvContent)
    res.end()
  } catch (error: any) {
    console.error('CSV export error:', error)
    res.status(500).json({
      success: false,
      message: 'CSVエクスポートに失敗しました',
      error: error.message
    })
  }
})

/**
 * POST /api/bulk-operations/users/validate
 * CSV データをバリデーション
 */
router.post('/users/validate', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSVファイルがアップロードされていません'
      })
    }

    // CSV パース
    const csvData = req.file.buffer.toString('utf-8')
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true // BOM対応
    })

    // レコード変換
    const importRecords: CsvImportRecord[] = records.map((record: any, index: number) => ({
      rowNumber: index + 2, // ヘッダー行 + 1行目
      username: record['ユーザー名'] || record['username'],
      email: record['メールアドレス'] || record['email'],
      name: record['氏名'] || record['name'],
      employeeCode: record['社員コード'] || record['employeeCode'] || undefined,
      role: record['役職'] || record['role'] || 'USER',
      companyId: record['会社ID'] || record['companyId'] ? parseInt(record['会社ID'] || record['companyId']) : undefined,
      departmentId: record['部署ID'] || record['departmentId'] ? parseInt(record['部署ID'] || record['departmentId']) : undefined,
      isActive: record['有効/無効'] || record['isActive'] ? (record['有効/無効'] === '有効' || record['isActive'] === 'true') : true
    }))

    // バリデーション実行
    const validationResult = await bulkOperationService.validateCsvData(importRecords)

    res.json({
      success: true,
      data: {
        fileName: req.file.originalname,
        totalRecords: importRecords.length,
        validRecords: validationResult.validRecords.length,
        invalidRecords: validationResult.invalidRecords.length,
        isValid: validationResult.isValid,
        errors: validationResult.errors
      }
    })
  } catch (error: any) {
    console.error('CSV validation error:', error)
    res.status(500).json({
      success: false,
      message: 'CSVバリデーションに失敗しました',
      error: error.message
    })
  }
})

/**
 * POST /api/bulk-operations/users/import
 * CSV データをインポート実行
 */
router.post('/users/import', authenticate, authorize(['ADMIN', 'MANAGER']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'CSVファイルがアップロードされていません'
      })
    }

    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: '認証情報が不正です'
      })
    }

    // CSV パース
    const csvData = req.file.buffer.toString('utf-8')
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    })

    // レコード変換
    const importRecords: CsvImportRecord[] = records.map((record: any, index: number) => ({
      rowNumber: index + 2,
      username: record['ユーザー名'] || record['username'],
      email: record['メールアドレス'] || record['email'],
      name: record['氏名'] || record['name'],
      employeeCode: record['社員コード'] || record['employeeCode'] || undefined,
      role: record['役職'] || record['role'] || 'USER',
      companyId: record['会社ID'] || record['companyId'] ? parseInt(record['会社ID'] || record['companyId']) : undefined,
      departmentId: record['部署ID'] || record['departmentId'] ? parseInt(record['部署ID'] || record['departmentId']) : undefined,
      isActive: record['有効/無効'] || record['isActive'] ? (record['有効/無効'] === '有効' || record['isActive'] === 'true') : true
    }))

    // インポート実行
    const result = await bulkOperationService.importUsers(
      importRecords,
      req.file.originalname,
      userId
    )

    res.json({
      success: true,
      data: {
        logId: result.logId,
        totalRecords: result.totalRecords,
        successRecords: result.successRecords,
        failedRecords: result.failedRecords,
        errors: result.errors
      }
    })
  } catch (error: any) {
    console.error('CSV import error:', error)
    res.status(500).json({
      success: false,
      message: 'CSVインポートに失敗しました',
      error: error.message
    })
  }
})

/**
 * GET /api/bulk-operations/history
 * インポート履歴取得
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query
    const companyId = req.user?.role === 'ADMIN' ? undefined : req.user?.companyId

    const result = await bulkOperationService.getImportHistory(
      companyId,
      parseInt(page as string),
      parseInt(limit as string)
    )

    res.json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    })
  } catch (error: any) {
    console.error('Import history error:', error)
    res.status(500).json({
      success: false,
      message: 'インポート履歴の取得に失敗しました',
      error: error.message
    })
  }
})

export default router

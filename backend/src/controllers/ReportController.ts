/**
 * レポートコントローラ
 * 各種レポート生成機能を提供
 */

import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'

export class ReportController {

  /**
   * ユーザーレポート生成
   * GET /api/reports/users
   */
  async generateUserReport(req: Request, res: Response) {
    try {
      const format = (req.query.format as string) || 'json'
      const companyId = req.query.companyId ? Number(req.query.companyId) : undefined
      const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined

      // フィルタ条件構築
      const where: any = {}
      if (companyId) where.companyId = companyId
      if (departmentId) where.departmentId = departmentId

      // ユーザーデータ取得
      const users = await prisma.users.findMany({
        where,
        include: {
          companies: {
            select: { name: true }
          },
          departments: {
            select: { name: true }
          },
          user_departments: {
            include: {
              departments: {
                include: {
                  department_feature_permissions: {
                    include: {
                      features: {
                        select: { name: true, code: true }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { id: 'asc' }
      })

      // データ整形
      const reportData = users.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        company: user.companies?.name || '',
        department: user.departments?.name || '',
        permissionCount: user.user_departments.reduce((count, ud) =>
          count + ud.departments.department_feature_permissions.length, 0),
        lastLoginAt: user.lastLoginAt?.toISOString() || '',
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      }))

      this.sendReportResponse(res, reportData, format, 'users')

    } catch (error: any) {
      console.error('ユーザーレポート生成エラー:', error)
      res.status(500).json({
        success: false,
        message: 'ユーザーレポートの生成に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * 権限レポート生成
   * GET /api/reports/permissions
   */
  async generatePermissionReport(req: Request, res: Response) {
    try {
      const format = (req.query.format as string) || 'json'
      const companyId = req.query.companyId ? Number(req.query.companyId) : undefined
      const departmentId = req.query.departmentId ? Number(req.query.departmentId) : undefined

      // 権限データ取得（部署別 - ユーザー経由）
      const userPermissions = await prisma.user_departments.findMany({
        where: {
          ...(companyId && { users: { companyId } }),
          ...(departmentId && { departmentId })
        },
        include: {
          users: {
            select: {
              id: true,
              username: true,
              name: true,
              companies: { select: { name: true } },
              departments: { select: { name: true } }
            }
          },
          departments: {
            include: {
              department_feature_permissions: {
                include: {
                  features: {
                    select: {
                      id: true,
                      name: true,
                      code: true,
                      category: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: [
          { users: { id: 'asc' } }
        ]
      })

      // 部署別権限データ取得
      const departmentPermissions = await prisma.department_feature_permissions.findMany({
        where: {
          ...(companyId && { departments: { companyId } }),
          ...(departmentId && { departmentId })
        },
        include: {
          departments: {
            select: {
              id: true,
              name: true,
              companies: { select: { name: true } }
            }
          },
          features: {
            select: {
              id: true,
              name: true,
              code: true,
              category: true
            }
          }
        },
        orderBy: [
          { departments: { id: 'asc' } },
          { features: { category: 'asc' } },
          { features: { name: 'asc' } }
        ]
      })

      // データ整形
      const userPermissionData: any[] = []
      userPermissions.forEach(userDept => {
        userDept.departments.department_feature_permissions.forEach(perm => {
          userPermissionData.push({
            userId: userDept.users.id,
            username: userDept.users.username,
            userName: userDept.users.name,
            company: userDept.users.companies?.name || '',
            department: userDept.departments.name,
            featureId: perm.features.id,
            featureName: perm.features.name,
            featureCode: perm.features.code,
            featureCategory: perm.features.category,
            canView: perm.canView,
            canCreate: perm.canCreate,
            canEdit: perm.canEdit,
            canDelete: perm.canDelete,
            grantedAt: perm.createdAt.toISOString()
          })
        })
      })

      const reportData = {
        userPermissions: userPermissionData,
        departmentPermissions: departmentPermissions.map(perm => ({
          departmentId: perm.departments.id,
          departmentName: perm.departments.name,
          company: perm.departments.companies?.name || '',
          featureId: perm.features.id,
          featureName: perm.features.name,
          featureCode: perm.features.code,
          featureCategory: perm.features.category,
          canView: perm.canView,
          canCreate: perm.canCreate,
          canEdit: perm.canEdit,
          canDelete: perm.canDelete,
          grantedAt: perm.createdAt.toISOString()
        }))
      }

      this.sendReportResponse(res, reportData, format, 'permissions')

    } catch (error: any) {
      console.error('権限レポート生成エラー:', error)
      res.status(500).json({
        success: false,
        message: '権限レポートの生成に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * 監査レポート生成
   * GET /api/reports/audit
   */
  async generateAuditReport(req: Request, res: Response) {
    try {
      const format = (req.query.format as string) || 'json'
      const startTime = req.query.startTime as string
      const endTime = req.query.endTime as string
      const userId = req.query.userId ? Number(req.query.userId) : undefined
      const action = req.query.action as string

      // パラメータ検証
      if (!startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: '開始時間と終了時間は必須です'
        })
      }

      // フィルタ条件構築
      const where: any = {
        createdAt: {
          gte: new Date(startTime),
          lte: new Date(endTime)
        }
      }
      if (userId) where.userId = userId
      if (action) where.action = action

      // 監査ログ取得
      const auditLogs = await prisma.audit_logs.findMany({
        where,
        include: {
          users: {
            select: {
              id: true,
              username: true,
              name: true,
              companies: { select: { name: true } },
              departments: { select: { name: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      // データ整形
      const reportData = auditLogs.map(log => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        userId: log.users?.id || null,
        username: log.users?.username || 'システム',
        userName: log.users?.name || '',
        company: log.users?.companies?.name || '',
        department: log.users?.departments?.name || '',
        createdAt: log.createdAt.toISOString(),
        success: log.details?.success !== false
      }))

      this.sendReportResponse(res, reportData, format, 'audit')

    } catch (error: any) {
      console.error('監査レポート生成エラー:', error)
      res.status(500).json({
        success: false,
        message: '監査レポートの生成に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * システム統計レポート生成
   * GET /api/reports/statistics
   */
  async generateStatisticsReport(req: Request, res: Response) {
    try {
      const format = (req.query.format as string) || 'json'
      const startTime = req.query.startTime as string
      const endTime = req.query.endTime as string

      const start = startTime ? new Date(startTime) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const end = endTime ? new Date(endTime) : new Date()

      // 各種統計データを並行取得
      const [
        userStats,
        loginStats,
        permissionStats,
        logStats,
        auditStats
      ] = await Promise.all([
        // ユーザー統計
        Promise.all([
          prisma.users.count(),
          prisma.users.count({ where: { isActive: true } }),
          prisma.users.count({ where: { role: 'ADMIN' } }),
          prisma.users.count({
            where: {
              createdAt: { gte: start, lte: end }
            }
          })
        ]),

        // ログイン統計
        prisma.audit_logs.groupBy({
          by: ['action'],
          where: {
            action: { in: ['LOGIN_SUCCESS', 'LOGIN_FAILED'] },
            createdAt: { gte: start, lte: end }
          },
          _count: { action: true }
        }),

        // 権限統計
        Promise.all([
          prisma.user_departments.count(),
          prisma.department_feature_permissions.count(),
          prisma.permission_templates.count(),
          prisma.features.count()
        ]),

        // ログ統計
        prisma.logs.groupBy({
          by: ['level'],
          where: {
            timestamp: { gte: start, lte: end }
          },
          _count: { level: true }
        }),

        // 監査統計
        prisma.audit_logs.groupBy({
          by: ['action'],
          where: {
            createdAt: { gte: start, lte: end }
          },
          _count: { action: true }
        })
      ])

      const [totalUsers, activeUsers, adminUsers, newUsers] = userStats
      const [userPermissions, deptPermissions, templates, features] = permissionStats

      // データ整形
      const reportData = {
        period: {
          start: start.toISOString(),
          end: end.toISOString()
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          admins: adminUsers,
          newInPeriod: newUsers,
          activeRate: totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : '0'
        },
        permissions: {
          userPermissions,
          departmentPermissions: deptPermissions,
          templates,
          features,
          avgPermissionsPerUser: totalUsers > 0 ? (userPermissions / totalUsers).toFixed(1) : '0'
        },
        logins: loginStats.reduce((acc, stat) => {
          acc[stat.action.toLowerCase()] = stat._count.action
          return acc
        }, {} as Record<string, number>),
        logs: logStats.reduce((acc, stat) => {
          acc[stat.level.toLowerCase()] = stat._count.level
          return acc
        }, {} as Record<string, number>),
        audit: auditStats.reduce((acc, stat) => {
          acc[stat.action] = stat._count.action
          return acc
        }, {} as Record<string, number>),
        generatedAt: new Date().toISOString()
      }

      this.sendReportResponse(res, reportData, format, 'statistics')

    } catch (error: any) {
      console.error('統計レポート生成エラー:', error)
      res.status(500).json({
        success: false,
        message: '統計レポートの生成に失敗しました',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }

  /**
   * レスポンス送信（フォーマット対応）
   */
  private sendReportResponse(res: Response, data: any, format: string, reportType: string) {
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `${reportType}_report_${timestamp}`

    switch (format.toLowerCase()) {
      case 'csv':
        this.sendCSVResponse(res, data, filename)
        break
      case 'excel':
        // Excel対応は将来実装
        res.status(501).json({
          success: false,
          message: 'Excel形式は現在対応していません'
        })
        break
      default:
        // JSON
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`)
        res.json(data)
    }
  }

  /**
   * CSV レスポンス送信
   */
  private sendCSVResponse(res: Response, data: any, filename: string) {
    try {
      let csvContent = ''

      if (Array.isArray(data)) {
        // 配列データの場合
        if (data.length > 0) {
          const headers = Object.keys(data[0])
          csvContent = headers.join(',') + '\n'
          csvContent += data.map(row =>
            headers.map(header => {
              const value = row[header]
              if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`
              }
              return value
            }).join(',')
          ).join('\n')
        }
      } else {
        // オブジェクトデータの場合（権限レポートなど）
        if (data.userPermissions) {
          csvContent = this.convertObjectToCSV(data.userPermissions, 'userPermissions')
          if (data.departmentPermissions) {
            csvContent += '\n\n' + this.convertObjectToCSV(data.departmentPermissions, 'departmentPermissions')
          }
        } else {
          // 統計データなどのフラットオブジェクト
          csvContent = Object.entries(data)
            .map(([key, value]) => `${key},${JSON.stringify(value)}`)
            .join('\n')
        }
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`)
      res.send('\uFEFF' + csvContent) // BOM追加でExcelの文字化け防止

    } catch (error) {
      console.error('CSV変換エラー:', error)
      res.status(500).json({
        success: false,
        message: 'CSV変換に失敗しました'
      })
    }
  }

  /**
   * オブジェクトをCSVに変換
   */
  private convertObjectToCSV(data: any[], sectionName: string): string {
    if (!Array.isArray(data) || data.length === 0) {
      return `${sectionName}\nデータがありません`
    }

    const headers = Object.keys(data[0])
    const csvContent = `${sectionName}\n` +
      headers.join(',') + '\n' +
      data.map(row =>
        headers.map(header => {
          const value = row[header]
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      ).join('\n')

    return csvContent
  }
}
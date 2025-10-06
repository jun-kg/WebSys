/**
 * 緊急承認サービス
 *
 * 災害・システム障害等の緊急時に管理者が承認プロセスをバイパスする機能
 * 全操作の監査ログを記録し、事後承認フローを提供
 */

import { prisma } from '@core/lib/prisma';
import { WorkflowStatus } from '@core/utils/validation';

export interface EmergencyApprovalRequest {
  requestId: number;
  reason: string;
  adminUserId: number;
  companyId: number;
  notifyApprovers?: boolean;
}

export interface EmergencyApprovalResult {
  success: boolean;
  requestId: number;
  emergencyApprovalId: number;
  message: string;
  bypassedSteps: number;
  notifiedUsers: number[];
}

export class EmergencyApprovalService {

  /**
   * 緊急承認の実行
   */
  async executeEmergencyApproval(data: EmergencyApprovalRequest): Promise<EmergencyApprovalResult> {
    // 管理者権限チェック
    const admin = await prisma.users.findUnique({
      where: { id: data.adminUserId },
      select: { id: true, role: true, name: true, username: true }
    });

    if (!admin || admin.role !== 'ADMIN') {
      throw new Error('緊急承認は管理者のみ実行可能です');
    }

    // 申請の存在確認と状態チェック
    const request = await prisma.workflow_requests.findFirst({
      where: {
        id: data.requestId,
        companyId: data.companyId,
        status: {
          in: [WorkflowStatus.PENDING, 'IN_PROGRESS', 'SUBMITTED']
        }
      },
      include: {
        workflow_types: {
          include: {
            approval_routes: {
              where: { isActive: true },
              orderBy: { stepNumber: 'asc' }
            }
          }
        },
        requester: {
          select: { id: true, name: true, username: true, email: true }
        }
      }
    });

    if (!request) {
      throw new Error('緊急承認可能な申請が見つかりません');
    }

    if (request.isEmergencyMode) {
      throw new Error('この申請は既に緊急承認済みです');
    }

    // トランザクション内で緊急承認を実行
    const result = await prisma.$transaction(async (tx) => {
      // 1. 申請を緊急承認済みに更新
      const updatedRequest = await tx.workflow_requests.update({
        where: { id: data.requestId },
        data: {
          isEmergencyMode: true,
          emergencyReason: data.reason,
          emergencyApprovedBy: data.adminUserId,
          emergencyApprovedAt: new Date(),
          status: 'APPROVED',
          completedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // 2. バイパスされた承認ステップの記録
      const bypassedSteps = request.workflow_types.approval_routes.length;
      const emergencyHistory = [];

      for (const route of request.workflow_types.approval_routes) {
        const historyEntry = await tx.approval_history.create({
          data: {
            requestId: data.requestId,
            stepNumber: route.stepNumber,
            routeId: route.id,
            approverId: data.adminUserId,
            action: 'EMERGENCY_APPROVED',
            comment: `緊急承認によりバイパス: ${data.reason}`,
            processedAt: new Date(),
            processingTime: 0,
            isNotified: false
          }
        });
        emergencyHistory.push(historyEntry);
      }

      // 3. 監査ログの記録
      await tx.audit_logs.create({
        data: {
          userId: data.adminUserId,
          action: 'EMERGENCY_APPROVAL',
          targetType: 'WORKFLOW_REQUEST',
          targetId: data.requestId,
          oldPermissions: null,
          newPermissions: null,
          reason: `緊急承認実行: ${data.reason} (元ステータス: ${request.status}, バイパス段数: ${bypassedSteps})`
        }
      });

      // 4. 本来の承認者への通知準備（実装は通知サービスで行う）
      const notifiedUsers = request.workflow_types.approval_routes
        .flatMap(route => {
          if (route.approverType === 'USER') {
            return Array.isArray(route.approverValue)
              ? route.approverValue.map(v => v.userId)
              : [route.approverValue.userId];
          }
          return [];
        })
        .filter((userId): userId is number => userId !== undefined);

      return {
        success: true,
        requestId: data.requestId,
        emergencyApprovalId: emergencyHistory[0]?.id || 0,
        message: '緊急承認が完了しました',
        bypassedSteps,
        notifiedUsers: [...new Set(notifiedUsers)] // 重複除去
      };
    });

    return result;
  }

  /**
   * 緊急承認履歴の取得
   */
  async getEmergencyApprovalHistory(
    companyId: number,
    options: {
      page?: number;
      pageSize?: number;
      dateFrom?: Date;
      dateTo?: Date;
      adminUserId?: number;
    } = {}
  ) {
    const { page = 1, pageSize = 20, dateFrom, dateTo, adminUserId } = options;
    const skip = (page - 1) * pageSize;

    const whereClause: any = {
      companyId,
      isEmergencyMode: true
    };

    if (dateFrom || dateTo) {
      whereClause.emergencyApprovedAt = {};
      if (dateFrom) whereClause.emergencyApprovedAt.gte = dateFrom;
      if (dateTo) whereClause.emergencyApprovedAt.lte = dateTo;
    }

    if (adminUserId) {
      whereClause.emergencyApprovedBy = adminUserId;
    }

    const [requests, total] = await Promise.all([
      prisma.workflow_requests.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: { emergencyApprovedAt: 'desc' },
        include: {
          workflow_types: {
            select: { id: true, name: true, code: true, category: true }
          },
          requester: {
            select: { id: true, name: true, username: true }
          },
          departments: {
            select: { id: true, name: true, code: true }
          },
          approval_history: {
            where: { action: 'EMERGENCY_APPROVED' },
            orderBy: { stepNumber: 'asc' }
          }
        }
      }),
      prisma.workflow_requests.count({ where: whereClause })
    ]);

    return {
      data: requests,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 緊急承認統計情報の取得
   */
  async getEmergencyApprovalStatistics(companyId: number, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalEmergencyApprovals,
      emergencyApprovalsByReason,
      emergencyApprovalsByAdmin,
      emergencyApprovalsByWorkflowType
    ] = await Promise.all([
      // 緊急承認総数
      prisma.workflow_requests.count({
        where: {
          companyId,
          isEmergencyMode: true,
          emergencyApprovedAt: { gte: startDate }
        }
      }),

      // 理由別集計
      prisma.workflow_requests.groupBy({
        by: ['emergencyReason'],
        where: {
          companyId,
          isEmergencyMode: true,
          emergencyApprovedAt: { gte: startDate }
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),

      // 管理者別集計
      prisma.workflow_requests.groupBy({
        by: ['emergencyApprovedBy'],
        where: {
          companyId,
          isEmergencyMode: true,
          emergencyApprovedAt: { gte: startDate }
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),

      // ワークフロータイプ別集計
      prisma.workflow_requests.groupBy({
        by: ['workflowTypeId'],
        where: {
          companyId,
          isEmergencyMode: true,
          emergencyApprovedAt: { gte: startDate }
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      })
    ]);

    return {
      totalEmergencyApprovals,
      emergencyApprovalsByReason,
      emergencyApprovalsByAdmin,
      emergencyApprovalsByWorkflowType,
      period: `${days}日間`,
      generatedAt: new Date()
    };
  }

  /**
   * 緊急承認可能性のチェック
   */
  async canEmergencyApprove(requestId: number, adminUserId: number, companyId: number): Promise<{
    canApprove: boolean;
    reason?: string;
    request?: any;
  }> {
    // 管理者権限チェック
    const admin = await prisma.users.findUnique({
      where: { id: adminUserId },
      select: { role: true }
    });

    if (!admin || admin.role !== 'ADMIN') {
      return {
        canApprove: false,
        reason: '緊急承認は管理者のみ実行可能です'
      };
    }

    // 申請の確認
    const request = await prisma.workflow_requests.findFirst({
      where: {
        id: requestId,
        companyId
      },
      include: {
        workflow_types: {
          select: { id: true, name: true, code: true }
        },
        requester: {
          select: { id: true, name: true, username: true }
        }
      }
    });

    if (!request) {
      return {
        canApprove: false,
        reason: '申請が見つかりません'
      };
    }

    if (request.isEmergencyMode) {
      return {
        canApprove: false,
        reason: 'この申請は既に緊急承認済みです'
      };
    }

    if (![WorkflowStatus.PENDING, 'IN_PROGRESS', 'SUBMITTED'].includes(request.status)) {
      return {
        canApprove: false,
        reason: `現在のステータス（${request.status}）では緊急承認できません`
      };
    }

    return {
      canApprove: true,
      request
    };
  }

  /**
   * 事後承認通知の送信
   */
  async sendPostApprovalNotifications(requestId: number, notifiedUsers: number[]) {
    // 通知サービスとの連携
    // 実装は NotificationService で行う
    const notifications = [];

    for (const userId of notifiedUsers) {
      const notification = await prisma.notifications.create({
        data: {
          userId,
          type: 'EMERGENCY_APPROVAL_NOTIFICATION',
          title: '緊急承認実行通知',
          message: `申請ID ${requestId} が緊急承認により処理されました`,
          data: { requestId },
          isRead: false
        }
      });
      notifications.push(notification);
    }

    return notifications;
  }
}
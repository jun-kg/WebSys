/**
 * 承認代理サービス
 *
 * 一時的な代理承認機能
 * 承認者本人による案件ごとの代理指定・リアルタイム対応
 */

import { prisma } from '@core/lib/prisma';

export interface ProxyApprovalRequest {
  requestId: number;
  stepNumber: number;
  originalApproverId: number;
  proxyApproverId: number;
  action: 'APPROVE' | 'REJECT' | 'RETURN';
  comment?: string;
  proxyReason: string;
  attachments?: any;
}

export interface ProxyApprovalResult {
  success: boolean;
  historyId: number;
  message: string;
  nextStep?: number;
  isCompleted?: boolean;
}

export interface ProxyDesignationRequest {
  requestId: number;
  stepNumber: number;
  originalApproverId: number;
  proxyApproverId: number;
  reason: string;
}

export interface ProxyDesignationResult {
  success: boolean;
  message: string;
  designation: any;
}

export class ProxyApprovalService {

  /**
   * 代理承認の実行
   */
  async executeProxyApproval(data: ProxyApprovalRequest): Promise<ProxyApprovalResult> {
    // 1. 申請と承認ルートの確認
    const request = await prisma.workflow_requests.findUnique({
      where: { id: data.requestId },
      include: {
        workflow_types: {
          include: {
            approval_routes: {
              where: {
                stepNumber: data.stepNumber,
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!request) {
      throw new Error('申請が見つかりません');
    }

    if (request.status !== 'PENDING' && request.status !== 'IN_PROGRESS') {
      throw new Error('この申請は承認可能な状態ではありません');
    }

    const currentRoute = request.workflow_types.approval_routes.find(
      route => route.stepNumber === data.stepNumber
    );

    if (!currentRoute) {
      throw new Error('該当する承認ステップが見つかりません');
    }

    // 2. 代理権限の確認
    const canProxy = await this.canProxyApprove(
      data.requestId,
      data.stepNumber,
      data.originalApproverId,
      data.proxyApproverId
    );

    if (!canProxy.canProxy) {
      throw new Error(canProxy.reason || '代理承認の権限がありません');
    }

    // 3. トランザクション内で代理承認実行
    const result = await prisma.$transaction(async (tx) => {
      // 承認履歴作成
      const approvalHistory = await tx.approval_history.create({
        data: {
          requestId: data.requestId,
          stepNumber: data.stepNumber,
          routeId: currentRoute.id,
          approverId: data.proxyApproverId,
          action: data.action,
          comment: data.comment,
          attachments: data.attachments,
          isProxy: true,
          proxyReason: data.proxyReason,
          processingTime: 0,
          isNotified: false
        }
      });

      let nextStep: number | undefined;
      let isCompleted = false;

      // 4. 承認結果に応じた処理
      if (data.action === 'APPROVE') {
        // 次のステップを確認
        const nextRoute = await tx.approval_routes.findFirst({
          where: {
            workflowTypeId: request.workflowTypeId,
            stepNumber: { gt: data.stepNumber },
            isActive: true
          },
          orderBy: { stepNumber: 'asc' }
        });

        if (nextRoute) {
          // 次のステップに進む
          await tx.workflow_requests.update({
            where: { id: data.requestId },
            data: {
              currentStep: nextRoute.stepNumber,
              status: 'IN_PROGRESS',
              updatedAt: new Date()
            }
          });
          nextStep = nextRoute.stepNumber;
        } else {
          // 最終承認完了
          await tx.workflow_requests.update({
            where: { id: data.requestId },
            data: {
              status: 'APPROVED',
              completedAt: new Date(),
              updatedAt: new Date()
            }
          });
          isCompleted = true;
        }
      } else if (data.action === 'REJECT') {
        // 申請却下
        await tx.workflow_requests.update({
          where: { id: data.requestId },
          data: {
            status: 'REJECTED',
            completedAt: new Date(),
            updatedAt: new Date()
          }
        });
        isCompleted = true;
      } else if (data.action === 'RETURN') {
        // 申請差し戻し
        await tx.workflow_requests.update({
          where: { id: data.requestId },
          data: {
            status: 'RETURNED',
            returnReason: data.comment,
            updatedAt: new Date()
          }
        });
        isCompleted = true;
      }

      // 5. 監査ログ記録
      await tx.audit_logs.create({
        data: {
          userId: data.proxyApproverId,
          action: 'PROXY_APPROVAL',
          targetType: 'WORKFLOW_REQUEST',
          targetId: data.requestId,
          reason: `代理承認実行: ${data.originalApproverId} → ${data.proxyApproverId} (${data.action}) 理由: ${data.proxyReason}`
        }
      });

      return {
        success: true,
        historyId: approvalHistory.id,
        message: `代理承認が完了しました（${data.action}）`,
        nextStep,
        isCompleted
      };
    });

    return result;
  }

  /**
   * 代理承認可能性のチェック
   */
  async canProxyApprove(
    requestId: number,
    stepNumber: number,
    originalApproverId: number,
    proxyApproverId: number
  ): Promise<{ canProxy: boolean; reason?: string }> {
    // 1. 申請の存在確認
    const request = await prisma.workflow_requests.findUnique({
      where: { id: requestId },
      include: {
        workflow_types: {
          include: {
            approval_routes: {
              where: {
                stepNumber,
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!request) {
      return { canProxy: false, reason: '申請が見つかりません' };
    }

    if (request.currentStep !== stepNumber) {
      return { canProxy: false, reason: '現在のステップではありません' };
    }

    // 2. 承認ルートの確認
    const route = request.workflow_types.approval_routes[0];
    if (!route) {
      return { canProxy: false, reason: '承認ルートが見つかりません' };
    }

    // 3. 元の承認者が正しいかチェック
    const isValidOriginalApprover = await this.isValidApprover(route, originalApproverId);
    if (!isValidOriginalApprover) {
      return { canProxy: false, reason: '元の承認者が無効です' };
    }

    // 4. 代理承認者の存在確認
    const proxyApprover = await prisma.users.findUnique({
      where: { id: proxyApproverId },
      select: { id: true, isActive: true, role: true }
    });

    if (!proxyApprover || !proxyApprover.isActive) {
      return { canProxy: false, reason: '代理承認者が見つからないか、アクティブではありません' };
    }

    // 5. 自分自身への代理指定チェック
    if (originalApproverId === proxyApproverId) {
      return { canProxy: false, reason: '自分自身を代理に指定することはできません' };
    }

    // 6. 既に処理済みかチェック
    const existingHistory = await prisma.approval_history.findFirst({
      where: {
        requestId,
        stepNumber,
        action: { in: ['APPROVE', 'REJECT', 'RETURN'] }
      }
    });

    if (existingHistory) {
      return { canProxy: false, reason: 'このステップは既に処理済みです' };
    }

    return { canProxy: true };
  }

  /**
   * 承認者の有効性確認
   */
  private async isValidApprover(route: any, userId: number): Promise<boolean> {
    if (route.approverType === 'USER') {
      if (Array.isArray(route.approverValue)) {
        return route.approverValue.some((user: any) => user.userId === userId);
      } else {
        return route.approverValue.userId === userId;
      }
    } else if (route.approverType === 'ROLE') {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      return user?.role === route.approverValue.role;
    } else if (route.approverType === 'DEPARTMENT') {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { primaryDepartmentId: true }
      });
      return user?.primaryDepartmentId === route.approverValue.departmentId;
    }

    return false;
  }

  /**
   * 代理指定の作成（事前指定）
   */
  async createProxyDesignation(data: ProxyDesignationRequest): Promise<ProxyDesignationResult> {
    // 1. 代理可能性チェック
    const canProxy = await this.canProxyApprove(
      data.requestId,
      data.stepNumber,
      data.originalApproverId,
      data.proxyApproverId
    );

    if (!canProxy.canProxy) {
      throw new Error(canProxy.reason || '代理指定ができません');
    }

    // 2. 代理指定レコード作成（テンポラリテーブルまたは特別なステータス）
    // 今回は approval_history に PROXY_DESIGNATED アクションで記録
    const designation = await prisma.approval_history.create({
      data: {
        requestId: data.requestId,
        stepNumber: data.stepNumber,
        routeId: null,
        approverId: data.originalApproverId,
        action: 'PROXY_DESIGNATED',
        comment: `代理指定: ${data.proxyApproverId}`,
        isProxy: false,
        proxyReason: data.reason,
        processingTime: 0,
        isNotified: false
      },
      include: {
        approver: {
          select: { id: true, name: true, username: true }
        }
      }
    });

    // 3. 監査ログ記録
    await prisma.audit_logs.create({
      data: {
        userId: data.originalApproverId,
        action: 'PROXY_DESIGNATED',
        targetType: 'WORKFLOW_REQUEST',
        targetId: data.requestId,
        reason: `代理指定: ${data.originalApproverId} → ${data.proxyApproverId} 理由: ${data.reason}`
      }
    });

    return {
      success: true,
      message: '代理指定が完了しました',
      designation
    };
  }

  /**
   * 代理承認履歴の取得
   */
  async getProxyApprovalHistory(
    companyId: number,
    options: {
      page?: number;
      pageSize?: number;
      requestId?: number;
      originalApproverId?: number;
      proxyApproverId?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    const { page = 1, pageSize = 20, requestId, originalApproverId, proxyApproverId, startDate, endDate } = options;
    const skip = (page - 1) * pageSize;

    const whereClause: any = {
      isProxy: true,
      workflow_requests: {
        companyId: companyId
      }
    };

    if (requestId) whereClause.requestId = requestId;
    if (originalApproverId) {
      whereClause.OR = [
        { approverId: originalApproverId }, // 元承認者として
        {
          AND: [
            { action: 'PROXY_DESIGNATED' },
            { approverId: originalApproverId }
          ]
        }
      ];
    }
    if (proxyApproverId) whereClause.approverId = proxyApproverId;

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) whereClause.createdAt.gte = startDate;
      if (endDate) whereClause.createdAt.lte = endDate;
    }

    const [histories, total] = await Promise.all([
      prisma.approval_history.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          workflow_requests: {
            select: {
              id: true,
              requestNumber: true,
              title: true,
              status: true
            }
          },
          approver: {
            select: { id: true, name: true, username: true }
          },
          approval_routes: {
            select: { id: true, stepNumber: true, approverType: true }
          }
        }
      }),
      prisma.approval_history.count({ where: whereClause })
    ]);

    return {
      data: histories,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 代理指定の取得
   */
  async getProxyDesignations(
    requestId: number,
    stepNumber?: number
  ) {
    const whereClause: any = {
      requestId,
      action: 'PROXY_DESIGNATED'
    };

    if (stepNumber) {
      whereClause.stepNumber = stepNumber;
    }

    return await prisma.approval_history.findMany({
      where: whereClause,
      include: {
        approver: {
          select: { id: true, name: true, username: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * 代理指定の取消
   */
  async cancelProxyDesignation(designationId: number, cancelledBy: number) {
    const designation = await prisma.approval_history.findUnique({
      where: { id: designationId },
      include: {
        workflow_requests: {
          select: { id: true, requestNumber: true, title: true }
        }
      }
    });

    if (!designation) {
      throw new Error('代理指定が見つかりません');
    }

    if (designation.action !== 'PROXY_DESIGNATED') {
      throw new Error('無効な代理指定です');
    }

    // 代理指定を取消（削除）
    await prisma.$transaction(async (tx) => {
      await tx.approval_history.delete({
        where: { id: designationId }
      });

      // 監査ログ記録
      await tx.audit_logs.create({
        data: {
          userId: cancelledBy,
          action: 'PROXY_DESIGNATION_CANCELLED',
          targetType: 'WORKFLOW_REQUEST',
          targetId: designation.requestId,
          reason: `代理指定取消: ${designation.comment}`
        }
      });
    });

    return {
      success: true,
      message: '代理指定が取り消されました'
    };
  }

  /**
   * 代理承認統計の取得
   */
  async getProxyApprovalStatistics(companyId: number, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      totalProxyApprovals,
      proxyApprovalsByAction,
      proxyApprovalsByUser,
      proxyApprovalsByWorkflowType
    ] = await Promise.all([
      // 代理承認総数
      prisma.approval_history.count({
        where: {
          isProxy: true,
          createdAt: { gte: startDate },
          workflow_requests: { companyId }
        }
      }),

      // アクション別集計
      prisma.approval_history.groupBy({
        by: ['action'],
        where: {
          isProxy: true,
          createdAt: { gte: startDate },
          workflow_requests: { companyId }
        },
        _count: { action: true }
      }),

      // ユーザー別集計
      prisma.approval_history.groupBy({
        by: ['approverId'],
        where: {
          isProxy: true,
          createdAt: { gte: startDate },
          workflow_requests: { companyId }
        },
        _count: { approverId: true }
      }),

      // ワークフロータイプ別集計
      prisma.approval_history.count({
        where: {
          isProxy: true,
          createdAt: { gte: startDate },
          workflow_requests: { companyId }
        }
      })
    ]);

    return {
      totalProxyApprovals,
      proxyApprovalsByAction,
      proxyApprovalsByUser,
      proxyApprovalsByWorkflowType,
      period: `${days}日間`,
      generatedAt: new Date()
    };
  }
}
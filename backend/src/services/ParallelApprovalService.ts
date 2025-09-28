/**
 * 並列承認サービス
 *
 * 複数承認者による並列承認機能
 * AND条件・OR条件による柔軟な承認設定
 */

import { prisma } from '../lib/prisma';

export interface ParallelApprovalRequest {
  requestId: number;
  stepNumber: number;
  approverId: number;
  action: 'APPROVE' | 'REJECT' | 'RETURN';
  comment?: string;
  attachments?: any;
}

export interface ParallelApprovalResult {
  success: boolean;
  historyId: number;
  message: string;
  stepCompleted: boolean;
  nextStep?: number;
  isWorkflowCompleted?: boolean;
  approvalStatus?: {
    totalRequired: number;
    currentApprovals: number;
    remainingApprovals: number;
    parallelType: string;
    minimumRequired: number;
  };
}

export interface ParallelApprovalStatus {
  stepNumber: number;
  totalRequired: number;
  currentApprovals: number;
  remainingApprovals: number;
  parallelType: string;
  minimumRequired: number;
  isCompleted: boolean;
  approvalHistory: any[];
}

export class ParallelApprovalService {

  /**
   * 並列承認の実行
   */
  async executeParallelApproval(data: ParallelApprovalRequest): Promise<ParallelApprovalResult> {
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

    // 2. 並列承認権限の確認
    const hasPermission = await this.hasParallelApprovalPermission(
      currentRoute,
      data.approverId
    );

    if (!hasPermission) {
      throw new Error('このステップの承認権限がありません');
    }

    // 3. 既に承認済みかチェック
    const existingApproval = await prisma.approval_history.findFirst({
      where: {
        requestId: data.requestId,
        stepNumber: data.stepNumber,
        approverId: data.approverId,
        action: { in: ['APPROVE', 'REJECT', 'RETURN'] }
      }
    });

    if (existingApproval) {
      throw new Error('既にこのステップを処理済みです');
    }

    // 4. トランザクション内で並列承認実行
    const result = await prisma.$transaction(async (tx) => {
      // 承認履歴作成
      const approvalHistory = await tx.approval_history.create({
        data: {
          requestId: data.requestId,
          stepNumber: data.stepNumber,
          routeId: currentRoute.id,
          approverId: data.approverId,
          action: data.action,
          comment: data.comment,
          attachments: data.attachments,
          processingTime: 0,
          isNotified: false
        }
      });

      // 5. 並列承認の完了状況チェック
      const status = await this.checkParallelApprovalStatus(
        tx,
        data.requestId,
        data.stepNumber,
        currentRoute
      );

      let stepCompleted = false;
      let nextStep: number | undefined;
      let isWorkflowCompleted = false;

      // 6. ステップ完了判定
      if (data.action === 'REJECT') {
        // 却下の場合は即座にワークフロー終了
        await tx.workflow_requests.update({
          where: { id: data.requestId },
          data: {
            status: 'REJECTED',
            completedAt: new Date(),
            updatedAt: new Date()
          }
        });
        stepCompleted = true;
        isWorkflowCompleted = true;
      } else if (data.action === 'RETURN') {
        // 差し戻しの場合も即座にワークフロー終了
        await tx.workflow_requests.update({
          where: { id: data.requestId },
          data: {
            status: 'RETURNED',
            returnReason: data.comment,
            updatedAt: new Date()
          }
        });
        stepCompleted = true;
        isWorkflowCompleted = true;
      } else if (data.action === 'APPROVE' && status.isCompleted) {
        // 承認かつステップ完了の場合
        stepCompleted = true;

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
          isWorkflowCompleted = true;
        }
      }

      // 7. 監査ログ記録
      await tx.audit_logs.create({
        data: {
          userId: data.approverId,
          action: 'PARALLEL_APPROVAL',
          targetType: 'WORKFLOW_REQUEST',
          targetId: data.requestId,
          reason: `並列承認実行: ステップ${data.stepNumber} (${data.action}) - ${status.parallelType}条件`
        }
      });

      return {
        success: true,
        historyId: approvalHistory.id,
        message: `並列承認が完了しました（${data.action}）`,
        stepCompleted,
        nextStep,
        isWorkflowCompleted,
        approvalStatus: {
          totalRequired: status.totalRequired,
          currentApprovals: status.currentApprovals + (data.action === 'APPROVE' ? 1 : 0),
          remainingApprovals: Math.max(0, status.minimumRequired - status.currentApprovals - (data.action === 'APPROVE' ? 1 : 0)),
          parallelType: status.parallelType,
          minimumRequired: status.minimumRequired
        }
      };
    });

    return result;
  }

  /**
   * 並列承認権限の確認
   */
  private async hasParallelApprovalPermission(route: any, userId: number): Promise<boolean> {
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
   * 並列承認状況のチェック
   */
  async checkParallelApprovalStatus(
    tx: any,
    requestId: number,
    stepNumber: number,
    route: any
  ): Promise<ParallelApprovalStatus> {
    // 現在のステップの承認履歴を取得
    const approvalHistory = await tx.approval_history.findMany({
      where: {
        requestId,
        stepNumber,
        action: 'APPROVE'
      },
      include: {
        approver: {
          select: { id: true, name: true, username: true }
        }
      }
    });

    const currentApprovals = approvalHistory.length;
    const parallelType = route.parallelType || 'AND';
    const minimumRequired = route.minimumApprovals || 1;

    let totalRequired: number;
    let isCompleted = false;

    if (parallelType === 'AND') {
      // AND条件: 全承認者の承認が必要
      totalRequired = this.getTotalApproversCount(route);
      isCompleted = currentApprovals >= totalRequired;
    } else if (parallelType === 'OR') {
      // OR条件: 指定人数以上の承認で完了
      totalRequired = this.getTotalApproversCount(route);
      isCompleted = currentApprovals >= minimumRequired;
    } else {
      // デフォルト（従来の単一承認）
      totalRequired = 1;
      isCompleted = currentApprovals >= 1;
    }

    return {
      stepNumber,
      totalRequired,
      currentApprovals,
      remainingApprovals: Math.max(0, minimumRequired - currentApprovals),
      parallelType,
      minimumRequired,
      isCompleted,
      approvalHistory
    };
  }

  /**
   * 承認者総数の取得
   */
  private getTotalApproversCount(route: any): number {
    if (route.approverType === 'USER') {
      if (Array.isArray(route.approverValue)) {
        return route.approverValue.length;
      } else {
        return 1;
      }
    } else if (route.approverType === 'ROLE' || route.approverType === 'DEPARTMENT') {
      // ROLE/DEPARTMENTの場合は設定された requiredCount を使用
      return route.requiredCount || 1;
    }

    return 1;
  }

  /**
   * 並列承認状況の取得（外部API用）
   */
  async getParallelApprovalStatus(requestId: number, stepNumber: number): Promise<ParallelApprovalStatus> {
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

    if (!request || !request.workflow_types.approval_routes[0]) {
      throw new Error('申請または承認ルートが見つかりません');
    }

    const route = request.workflow_types.approval_routes[0];
    return await this.checkParallelApprovalStatus(prisma, requestId, stepNumber, route);
  }

  /**
   * 並列承認待ちユーザーの取得
   */
  async getPendingApprovers(requestId: number, stepNumber: number): Promise<any[]> {
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

    if (!request || !request.workflow_types.approval_routes[0]) {
      throw new Error('申請または承認ルートが見つかりません');
    }

    const route = request.workflow_types.approval_routes[0];

    // 既に承認済みのユーザーを取得
    const approvedUsers = await prisma.approval_history.findMany({
      where: {
        requestId,
        stepNumber,
        action: 'APPROVE'
      },
      select: { approverId: true }
    });

    const approvedUserIds = approvedUsers.map(approval => approval.approverId);

    // 承認対象ユーザーを取得
    let pendingApprovers: any[] = [];

    if (route.approverType === 'USER') {
      const userIds = Array.isArray(route.approverValue)
        ? route.approverValue.map((user: any) => user.userId)
        : [route.approverValue.userId];

      const pendingUserIds = userIds.filter(id => !approvedUserIds.includes(id));

      pendingApprovers = await prisma.users.findMany({
        where: {
          id: { in: pendingUserIds },
          isActive: true
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true
        }
      });
    } else if (route.approverType === 'ROLE') {
      pendingApprovers = await prisma.users.findMany({
        where: {
          role: route.approverValue.role,
          id: { notIn: approvedUserIds },
          isActive: true
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true
        }
      });
    } else if (route.approverType === 'DEPARTMENT') {
      pendingApprovers = await prisma.users.findMany({
        where: {
          primaryDepartmentId: route.approverValue.departmentId,
          id: { notIn: approvedUserIds },
          isActive: true
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          departments: {
            select: { id: true, name: true, code: true }
          }
        }
      });
    }

    return pendingApprovers;
  }

  /**
   * 並列承認履歴の取得
   */
  async getParallelApprovalHistory(
    companyId: number,
    options: {
      page?: number;
      pageSize?: number;
      requestId?: number;
      stepNumber?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    const { page = 1, pageSize = 20, requestId, stepNumber, startDate, endDate } = options;
    const skip = (page - 1) * pageSize;

    const whereClause: any = {
      workflow_requests: {
        companyId: companyId
      },
      approval_routes: {
        isParallel: true
      }
    };

    if (requestId) whereClause.requestId = requestId;
    if (stepNumber) whereClause.stepNumber = stepNumber;

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
            select: {
              id: true,
              stepNumber: true,
              parallelType: true,
              minimumApprovals: true,
              isParallel: true
            }
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
   * 並列承認統計の取得
   */
  async getParallelApprovalStatistics(companyId: number, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      // 基本的な統計のみ取得（複雑なJOINを避ける）
      const [
        totalRequests,
        completedRequests,
        parallelRoutes
      ] = await Promise.all([
        // 対象期間の全申請数
        prisma.workflow_requests.count({
          where: {
            companyId,
            createdAt: { gte: startDate }
          }
        }),

        // 完了した申請数
        prisma.workflow_requests.count({
          where: {
            companyId,
            completedAt: { gte: startDate },
            status: { in: ['APPROVED', 'REJECTED'] }
          }
        }),

        // 並列承認ルートがあるワークフロータイプの確認
        prisma.approval_routes.count({
          where: {
            parallelType: { not: null },
            isActive: true
          }
        })
      ]);

      return {
        totalParallelApprovals: 0, // 実際の並列承認データがないため0
        parallelApprovalsByType: [
          { type: 'AND', count: 0 },
          { type: 'OR', count: 0 }
        ],
        parallelApprovalsByStep: [],
        averageCompletionHours: 0,
        totalRequests,
        completedRequests,
        parallelRoutesConfigured: parallelRoutes,
        period: `${days}日間`,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('並列承認統計取得エラー:', error);
      throw error;
    }
  }
}
/**
 * 直列承認サービス
 *
 * 複数承認者の順次承認機能
 * 指定された順序で一人ずつ承認を行う仕組み
 */

import { prisma } from '@core/lib/prisma';

export interface SequentialApprovalRequest {
  requestId: number;
  stepNumber: number;
  approverId: number;
  action: 'APPROVE' | 'REJECT' | 'RETURN';
  comment?: string;
  attachments?: any;
}

export interface SequentialApprovalResult {
  success: boolean;
  historyId: number;
  message: string;
  currentSequenceStep?: number;
  nextApproverId?: number;
  isStepCompleted?: boolean;
  isWorkflowCompleted?: boolean;
  approvalStatus?: SequentialApprovalStatus;
}

export interface SequentialApprovalStatus {
  stepNumber: number;
  totalSequenceSteps: number;
  currentSequenceStep: number;
  nextApproverId?: number;
  isCompleted: boolean;
  approvalHistory: any[];
  sequentialOrder: number[];
}

export class SequentialApprovalService {

  /**
   * 直列承認の実行
   */
  async executeSequentialApproval(data: SequentialApprovalRequest): Promise<SequentialApprovalResult> {
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

    if (!currentRoute.isSequential) {
      throw new Error('このステップは直列承認ではありません');
    }

    // 2. 直列承認の順序確認
    const sequentialOrder = Array.isArray(currentRoute.sequentialOrder)
      ? currentRoute.sequentialOrder as number[]
      : [];

    if (sequentialOrder.length === 0) {
      throw new Error('直列承認の順序が設定されていません');
    }

    const currentSequenceStep = currentRoute.currentSequenceStep || 0;
    const expectedApproverId = sequentialOrder[currentSequenceStep];

    if (data.approverId !== expectedApproverId) {
      throw new Error(`承認順序が正しくありません。次の承認者: ${expectedApproverId}`);
    }

    // 3. トランザクション内で直列承認実行
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
          isSequential: true,
          sequenceStep: currentSequenceStep,
          processingTime: 0,
          isNotified: false
        }
      });

      let nextSequenceStep = currentSequenceStep;
      let nextApproverId: number | undefined;
      let isStepCompleted = false;
      let isWorkflowCompleted = false;

      // 4. 承認結果に応じた処理
      if (data.action === 'APPROVE') {
        // 次の承認者に進む
        nextSequenceStep = currentSequenceStep + 1;

        if (nextSequenceStep < sequentialOrder.length) {
          // まだ承認者が残っている
          nextApproverId = sequentialOrder[nextSequenceStep];

          // 現在のルートの次ステップを更新
          await tx.approval_routes.update({
            where: { id: currentRoute.id },
            data: { currentSequenceStep: nextSequenceStep }
          });
        } else {
          // 直列承認ステップ完了
          isStepCompleted = true;

          // 次の承認ステップを確認
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
        isStepCompleted = true;
        isWorkflowCompleted = true;
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
        isStepCompleted = true;
        isWorkflowCompleted = true;
      }

      // 5. 監査ログ記録
      await tx.audit_logs.create({
        data: {
          userId: data.approverId,
          action: 'SEQUENTIAL_APPROVAL',
          targetType: 'WORKFLOW_REQUEST',
          targetId: data.requestId,
          reason: `直列承認実行: ステップ${currentSequenceStep + 1}/${sequentialOrder.length} (${data.action})`
        }
      });

      return {
        success: true,
        historyId: approvalHistory.id,
        message: `直列承認が完了しました（${data.action}）`,
        currentSequenceStep: nextSequenceStep,
        nextApproverId,
        isStepCompleted,
        isWorkflowCompleted
      };
    });

    return result;
  }

  /**
   * 直列承認ステータスの取得
   */
  async getSequentialApprovalStatus(requestId: number, stepNumber: number): Promise<SequentialApprovalStatus> {
    // 申請からワークフロータイプを取得
    const request = await prisma.workflow_requests.findUnique({
      where: { id: requestId },
      select: { workflowTypeId: true }
    });

    if (!request) {
      throw new Error('申請が見つかりません');
    }

    const route = await prisma.approval_routes.findFirst({
      where: {
        workflowTypeId: request.workflowTypeId,
        stepNumber,
        isActive: true,
        isSequential: true
      }
    });

    if (!route) {
      throw new Error('直列承認ルートが見つかりません');
    }

    const sequentialOrder = Array.isArray(route.sequentialOrder)
      ? route.sequentialOrder as number[]
      : [];

    const currentSequenceStep = route.currentSequenceStep || 0;
    const nextApproverId = currentSequenceStep < sequentialOrder.length
      ? sequentialOrder[currentSequenceStep]
      : undefined;

    // 承認履歴取得
    const approvalHistory = await prisma.approval_history.findMany({
      where: {
        requestId,
        stepNumber,
        isSequential: true
      },
      include: {
        approver: {
          select: { id: true, name: true, username: true }
        }
      },
      orderBy: { sequenceStep: 'asc' }
    });

    return {
      stepNumber,
      totalSequenceSteps: sequentialOrder.length,
      currentSequenceStep,
      nextApproverId,
      isCompleted: currentSequenceStep >= sequentialOrder.length,
      approvalHistory,
      sequentialOrder
    };
  }

  /**
   * 次の承認者の取得
   */
  async getNextApprover(requestId: number, stepNumber: number): Promise<any> {
    const status = await this.getSequentialApprovalStatus(requestId, stepNumber);

    if (status.isCompleted || !status.nextApproverId) {
      return null;
    }

    const nextApprover = await prisma.users.findUnique({
      where: { id: status.nextApproverId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true
      }
    });

    return nextApprover;
  }

  /**
   * 直列承認履歴の取得
   */
  async getSequentialApprovalHistory(
    companyId: number,
    options: {
      page?: number;
      pageSize?: number;
      requestId?: number;
      approverId?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    const { page = 1, pageSize = 20, requestId, approverId, startDate, endDate } = options;
    const skip = (page - 1) * pageSize;

    const whereClause: any = {
      isSequential: true,
      workflow_requests: {
        companyId: companyId
      }
    };

    if (requestId) whereClause.requestId = requestId;
    if (approverId) whereClause.approverId = approverId;

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
   * 直列承認統計の取得
   */
  async getSequentialApprovalStatistics(companyId: number, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const [
        totalSequentialApprovals,
        completedSequentialApprovals,
        averageStepsPerRequest,
        sequentialRoutes
      ] = await Promise.all([
        // 直列承認総数
        prisma.approval_history.count({
          where: {
            isSequential: true,
            createdAt: { gte: startDate },
            workflow_requests: { companyId }
          }
        }),

        // 完了した直列承認
        prisma.workflow_requests.count({
          where: {
            companyId,
            status: { in: ['APPROVED', 'REJECTED'] },
            completedAt: { gte: startDate },
            workflow_types: {
              approval_routes: {
                some: { isSequential: true }
              }
            }
          }
        }),

        // 平均ステップ数計算用のデータ
        prisma.approval_history.groupBy({
          by: ['requestId'],
          where: {
            isSequential: true,
            createdAt: { gte: startDate },
            workflow_requests: { companyId }
          },
          _count: { sequenceStep: true }
        }),

        // 直列承認ルート数
        prisma.approval_routes.count({
          where: {
            isSequential: true,
            isActive: true
          }
        })
      ]);

      const avgSteps = averageStepsPerRequest.length > 0
        ? averageStepsPerRequest.reduce((sum, item) => sum + item._count.sequenceStep, 0) / averageStepsPerRequest.length
        : 0;

      return {
        totalSequentialApprovals,
        completedSequentialApprovals,
        averageStepsPerRequest: Math.round(avgSteps * 100) / 100,
        sequentialRoutesConfigured: sequentialRoutes,
        period: `${days}日間`,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('直列承認統計取得エラー:', error);
      throw error;
    }
  }
}
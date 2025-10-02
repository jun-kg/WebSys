/**
 * 承認サービス
 *
 * 承認プロセスの管理、承認ルート処理、代理設定等を提供
 * データ辞書・バリデーション定義書に準拠
 */

import { prisma } from '../lib/prisma';
import { WorkflowStatus, ApprovalAction, Priority } from '../utils/validation';

export interface CreateApprovalRouteRequest {
  workflowTypeId: number;
  stepNumber: number;
  approverType: string; // USER, DEPARTMENT, ROLE, DYNAMIC
  approverValue: object;
  requiredCount?: number;
  isParallel?: boolean;
  canSkip?: boolean;
  autoApproveHours?: number;
  condition?: object;
}

export interface ProcessApprovalRequest {
  requestId: number;
  approverId: number;
  action: ApprovalAction;
  comment?: string;
  delegatedTo?: number;
}

export interface CreateApprovalDelegateRequest {
  delegatorId: number;
  delegateId: number;
  workflowTypeId?: number;
  startDate: Date;
  endDate: Date;
  reason?: string;
  createdBy: number;
}

export class ApprovalService {

  /**
   * 承認ルートの作成
   */
  async createApprovalRoute(data: CreateApprovalRouteRequest) {
    // ワークフロータイプの存在確認
    const workflowType = await prisma.workflow_types.findUnique({
      where: { id: data.workflowTypeId }
    });

    if (!workflowType) {
      throw new Error('ワークフロータイプが見つかりません');
    }

    // 同じステップ番号の重複チェック
    const existingRoute = await prisma.approval_routes.findFirst({
      where: {
        workflowTypeId: data.workflowTypeId,
        stepNumber: data.stepNumber
      }
    });

    if (existingRoute) {
      throw new Error('同じステップ番号の承認ルートが既に存在します');
    }

    return await prisma.approval_routes.create({
      data: {
        workflowTypeId: data.workflowTypeId,
        stepNumber: data.stepNumber,
        approverType: data.approverType,
        approverValue: data.approverValue,
        requiredCount: data.requiredCount || 1,
        isParallel: data.isParallel || false,
        canSkip: data.canSkip || false,
        autoApproveHours: data.autoApproveHours,
        condition: data.condition
      },
      include: {
        workflow_types: {
          select: { id: true, name: true, code: true }
        }
      }
    });
  }

  /**
   * 承認ルートの一覧取得（ページネーション付き）
   */
  async getApprovalRoutes(params: {
    companyId: number;
    page: number;
    limit: number;
    search?: string;
    workflowTypeId?: number;
    isActive?: boolean;
  }) {
    const { companyId, page, limit, search, workflowTypeId, isActive } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      workflow_types: {
        companyId
      }
    };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { workflow_types: { name: { contains: search } } }
      ];
    }

    if (workflowTypeId) {
      where.workflowTypeId = workflowTypeId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [routes, total] = await Promise.all([
      prisma.approval_routes.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { workflowTypeId: 'asc' },
          { stepNumber: 'asc' }
        ],
        include: {
          workflow_types: {
            select: { id: true, name: true, code: true, category: true }
          }
        }
      }),
      prisma.approval_routes.count({ where })
    ]);

    return {
      data: routes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * 特定ワークフロータイプの承認ルート取得
   */
  async getApprovalRoutesByWorkflowType(workflowTypeId: number) {
    return await prisma.approval_routes.findMany({
      where: {
        workflowTypeId,
        isActive: true
      },
      orderBy: { stepNumber: 'asc' },
      include: {
        workflow_types: {
          select: { id: true, name: true, code: true }
        }
      }
    });
  }

  /**
   * 承認ルートIDで取得
   */
  async getApprovalRouteById(id: number, companyId: number) {
    return await prisma.approval_routes.findFirst({
      where: {
        id,
        workflow_types: {
          companyId
        }
      },
      include: {
        workflow_types: {
          select: { id: true, name: true, code: true, category: true }
        }
      }
    });
  }

  /**
   * 承認ルートの更新
   */
  async updateApprovalRoute(id: number, data: Partial<CreateApprovalRouteRequest>) {
    const route = await prisma.approval_routes.findUnique({
      where: { id }
    });

    if (!route) {
      throw new Error('承認ルートが見つかりません');
    }

    return await prisma.approval_routes.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  /**
   * 承認ルートの削除
   */
  async deleteApprovalRoute(id: number) {
    return await prisma.approval_routes.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
  }

  /**
   * 指定ステップの承認者を取得
   */
  async getApproversForStep(requestId: number, stepNumber: number): Promise<number[]> {
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
        },
        departments: true
      }
    });

    if (!request) {
      throw new Error('申請が見つかりません');
    }

    const route = request.workflow_types.approval_routes[0];
    if (!route) {
      throw new Error('承認ルートが見つかりません');
    }

    const approvers: number[] = [];

    switch (route.approverType) {
      case 'USER':
        // 直接指定されたユーザー
        const userIds = (route.approverValue as any).userIds || [];
        approvers.push(...userIds);
        break;

      case 'DEPARTMENT':
        // 部署の管理者
        const departmentId = (route.approverValue as any).departmentId || request.departmentId;
        const departmentManagers = await prisma.user_departments.findMany({
          where: {
            departmentId,
            role: 'MANAGER'
          },
          include: {
            users: {
              where: { isActive: true }
            }
          }
        });
        approvers.push(...departmentManagers.map(dm => dm.users.id));
        break;

      case 'ROLE':
        // 特定の役職のユーザー
        const role = (route.approverValue as any).role;
        const roleUsers = await prisma.users.findMany({
          where: {
            role,
            companyId: request.companyId,
            isActive: true
          }
        });
        approvers.push(...roleUsers.map(u => u.id));
        break;

      case 'DYNAMIC':
        // 動的な承認者決定
        // 実装は要件に応じて拡張
        break;
    }

    return approvers;
  }

  /**
   * 承認処理の実行
   */
  async processApproval(data: ProcessApprovalRequest) {
    const request = await prisma.workflow_requests.findUnique({
      where: { id: data.requestId },
      include: {
        workflow_types: {
          include: {
            approval_routes: {
              where: { isActive: true },
              orderBy: { stepNumber: 'asc' }
            }
          }
        }
      }
    });

    if (!request) {
      throw new Error('申請が見つかりません');
    }

    if (request.status !== WorkflowStatus.PENDING) {
      throw new Error('この申請は承認処理できません');
    }

    // 承認者権限チェック
    const approvers = await this.getApproversForStep(data.requestId, request.currentStep);
    if (!approvers.includes(data.approverId)) {
      throw new Error('この段階の承認権限がありません');
    }

    const currentRoute = request.workflow_types.approval_routes.find(
      r => r.stepNumber === request.currentStep
    );

    if (!currentRoute) {
      throw new Error('承認ルートが見つかりません');
    }

    return await prisma.$transaction(async (tx) => {
      // 承認履歴の記録
      const approvalHistory = await tx.approval_history.create({
        data: {
          requestId: data.requestId,
          stepNumber: request.currentStep,
          routeId: currentRoute.id,
          approverId: data.approverId,
          action: data.action,
          comment: data.comment,
          delegatedTo: data.delegatedTo,
          processedAt: new Date()
        }
      });

      let updatedRequest;

      switch (data.action) {
        case ApprovalAction.APPROVE:
          updatedRequest = await this.processApprove(tx, request, currentRoute);
          break;

        case ApprovalAction.REJECT:
          updatedRequest = await tx.workflow_requests.update({
            where: { id: data.requestId },
            data: {
              status: WorkflowStatus.REJECTED,
              completedAt: new Date(),
              updatedAt: new Date()
            }
          });
          break;

        case ApprovalAction.RETURN:
          updatedRequest = await tx.workflow_requests.update({
            where: { id: data.requestId },
            data: {
              status: WorkflowStatus.RETURNED,
              returnReason: data.comment,
              updatedAt: new Date()
            }
          });
          break;

        case ApprovalAction.DELEGATE:
          if (!data.delegatedTo) {
            throw new Error('代理先ユーザーが指定されていません');
          }
          // 代理処理は通知のみで、実際の承認権限は移譲される
          updatedRequest = request;
          break;

        default:
          throw new Error('無効な承認アクションです');
      }

      return {
        request: updatedRequest,
        approvalHistory
      };
    });
  }

  /**
   * 承認処理（次のステップまたは完了）
   */
  private async processApprove(tx: any, request: any, currentRoute: any) {
    const approvalRoutes = request.workflow_types.approval_routes;
    const nextStep = request.currentStep + 1;
    const nextRoute = approvalRoutes.find(r => r.stepNumber === nextStep);

    if (nextRoute) {
      // 次のステップへ
      return await tx.workflow_requests.update({
        where: { id: request.id },
        data: {
          currentStep: nextStep,
          updatedAt: new Date()
        }
      });
    } else {
      // 最終承認完了
      return await tx.workflow_requests.update({
        where: { id: request.id },
        data: {
          status: WorkflowStatus.APPROVED,
          completedAt: new Date(),
          updatedAt: new Date()
        }
      });
    }
  }

  /**
   * 承認代理設定の作成
   */
  async createApprovalDelegate(data: CreateApprovalDelegateRequest) {
    // 重複チェック
    const existing = await prisma.approval_delegates.findFirst({
      where: {
        delegatorId: data.delegatorId,
        delegateId: data.delegateId,
        workflowTypeId: data.workflowTypeId,
        isActive: true,
        AND: [
          { startDate: { lte: data.endDate } },
          { endDate: { gte: data.startDate } }
        ]
      }
    });

    if (existing) {
      throw new Error('指定期間で重複する代理設定が既に存在します');
    }

    return await prisma.approval_delegates.create({
      data: {
        delegatorId: data.delegatorId,
        delegateId: data.delegateId,
        workflowTypeId: data.workflowTypeId,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason,
        createdBy: data.createdBy
      },
      include: {
        delegator: {
          select: { id: true, name: true, username: true }
        },
        delegate: {
          select: { id: true, name: true, username: true }
        },
        workflow_types: {
          select: { id: true, name: true, code: true }
        }
      }
    });
  }

  /**
   * 承認代理設定の一覧取得
   */
  async getApprovalDelegates(
    userId: number,
    options: {
      page?: number;
      pageSize?: number;
      isActive?: boolean;
      workflowTypeId?: number;
    } = {}
  ) {
    const {
      page = 1,
      pageSize = 10,
      isActive = true,
      workflowTypeId
    } = options;

    const skip = (page - 1) * pageSize;
    const now = new Date();

    const whereClause: any = {
      OR: [
        { delegatorId: userId },
        { delegateId: userId }
      ],
      isActive
    };

    if (workflowTypeId) {
      whereClause.workflowTypeId = workflowTypeId;
    }

    // アクティブな代理設定のみの場合、期間チェック
    if (isActive) {
      whereClause.AND = [
        { startDate: { lte: now } },
        { endDate: { gte: now } }
      ];
    }

    const [delegates, total] = await Promise.all([
      prisma.approval_delegates.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          delegator: {
            select: { id: true, name: true, username: true }
          },
          delegate: {
            select: { id: true, name: true, username: true }
          },
          workflow_types: {
            select: { id: true, name: true, code: true }
          }
        }
      }),
      prisma.approval_delegates.count({ where: whereClause })
    ]);

    return {
      data: delegates,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 承認代理設定の無効化
   */
  async deactivateApprovalDelegate(id: number, userId: number) {
    const delegate = await prisma.approval_delegates.findUnique({
      where: { id }
    });

    if (!delegate) {
      throw new Error('代理設定が見つかりません');
    }

    // 代理元または代理先のユーザーのみ無効化可能
    if (delegate.delegatorId !== userId && delegate.delegateId !== userId) {
      throw new Error('この代理設定を無効化する権限がありません');
    }

    return await prisma.approval_delegates.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
  }

  /**
   * 承認履歴の取得
   */
  async getApprovalHistory(requestId: number) {
    return await prisma.approval_history.findMany({
      where: { requestId },
      orderBy: [
        { stepNumber: 'asc' },
        { processedAt: 'asc' }
      ],
      include: {
        approver: {
          select: { id: true, name: true, username: true }
        },
        delegatedFromUser: {
          select: { id: true, name: true, username: true }
        },
        delegatedToUser: {
          select: { id: true, name: true, username: true }
        },
        approval_routes: {
          select: {
            id: true,
            stepNumber: true,
            approverType: true,
            requiredCount: true,
            isParallel: true
          }
        }
      }
    });
  }

  /**
   * ユーザーの承認待ち一覧取得
   */
  async getPendingApprovals(
    userId: number,
    companyId: number,
    options: {
      page?: number;
      pageSize?: number;
      workflowTypeId?: number;
      priority?: Priority;
      isUrgent?: boolean;
    } = {}
  ) {
    const {
      page = 1,
      pageSize = 10,
      workflowTypeId,
      priority,
      isUrgent
    } = options;

    const skip = (page - 1) * pageSize;

    // ユーザーが承認者となっている申請を取得
    // 簡易実装：実際は複雑な承認者判定ロジックが必要
    const whereClause: any = {
      companyId,
      status: WorkflowStatus.PENDING
    };

    if (workflowTypeId) whereClause.workflowTypeId = workflowTypeId;
    if (priority) whereClause.priority = priority;
    if (isUrgent !== undefined) whereClause.isUrgent = isUrgent;

    const [requests, total] = await Promise.all([
      prisma.workflow_requests.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: [
          { isUrgent: 'desc' },
          { priority: 'desc' },
          { submittedAt: 'asc' }
        ],
        include: {
          workflow_types: {
            select: { id: true, name: true, code: true, category: true }
          },
          requester: {
            select: { id: true, name: true, username: true }
          },
          departments: {
            select: { id: true, name: true, code: true }
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
   * 自動承認処理（バッチ処理用）
   */
  async processAutoApprovals() {
    const now = new Date();

    // 自動承認対象の申請を取得
    const requests = await prisma.workflow_requests.findMany({
      where: {
        status: WorkflowStatus.PENDING
      },
      include: {
        workflow_types: {
          include: {
            approval_routes: {
              where: { isActive: true },
              orderBy: { stepNumber: 'asc' }
            }
          }
        }
      }
    });

    const results = [];

    for (const request of requests) {
      const currentRoute = request.workflow_types.approval_routes.find(
        r => r.stepNumber === request.currentStep
      );

      if (currentRoute?.autoApproveHours && request.submittedAt) {
        const autoApproveTime = new Date(
          request.submittedAt.getTime() + currentRoute.autoApproveHours * 60 * 60 * 1000
        );

        if (now >= autoApproveTime) {
          try {
            const result = await this.processApproval({
              requestId: request.id,
              approverId: 0, // システム自動承認
              action: ApprovalAction.AUTO_APPROVE,
              comment: `自動承認（${currentRoute.autoApproveHours}時間経過）`
            });
            results.push(result);
          } catch (error) {
            console.error(`Auto approval failed for request ${request.id}:`, error);
          }
        }
      }
    }

    return results;
  }

  /**
   * 承認統計情報の取得
   */
  async getApprovalStatistics(companyId: number, userId?: number) {
    const whereClause: any = { companyId };

    if (userId) {
      // 特定ユーザーの承認統計
      whereClause.approval_history = {
        some: { approverId: userId }
      };
    }

    const [
      totalApprovals,
      approvedCount,
      rejectedCount,
      returnedCount,
      averageProcessingTime
    ] = await Promise.all([
      prisma.approval_history.count({
        where: userId ? { approverId: userId } : {}
      }),
      prisma.approval_history.count({
        where: {
          ...(userId ? { approverId: userId } : {}),
          action: ApprovalAction.APPROVE
        }
      }),
      prisma.approval_history.count({
        where: {
          ...(userId ? { approverId: userId } : {}),
          action: ApprovalAction.REJECT
        }
      }),
      prisma.approval_history.count({
        where: {
          ...(userId ? { approverId: userId } : {}),
          action: ApprovalAction.RETURN
        }
      }),
      prisma.approval_history.aggregate({
        where: {
          ...(userId ? { approverId: userId } : {}),
          processingTime: { not: null }
        },
        _avg: { processingTime: true }
      })
    ]);

    return {
      totalApprovals,
      approvedCount,
      rejectedCount,
      returnedCount,
      approvalRate: totalApprovals > 0 ? (approvedCount / totalApprovals * 100) : 0,
      rejectionRate: totalApprovals > 0 ? (rejectedCount / totalApprovals * 100) : 0,
      averageProcessingTime: averageProcessingTime._avg.processingTime || 0
    };
  }
}
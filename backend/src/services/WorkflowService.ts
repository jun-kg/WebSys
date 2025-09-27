/**
 * ワークフローサービス
 *
 * ワークフローの基本CRUD操作とビジネスロジックを提供
 * データ辞書・バリデーション定義書に準拠
 */

import { prisma } from '../lib/prisma';
import { WorkflowStatus, Priority } from '../utils/validation';

export interface CreateWorkflowTypeRequest {
  companyId: number;
  code: string;
  name: string;
  description?: string;
  category: string;
  formSchema: object;
  validationRules?: object;
  autoApproveRules?: object;
  escalationRules?: object;
  notificationSettings?: object;
  maxAmount?: number;
  requireAttachment?: boolean;
  allowBulk?: boolean;
  displayOrder?: number;
  createdBy?: number;
}

export interface UpdateWorkflowTypeRequest {
  name?: string;
  description?: string;
  formSchema?: object;
  validationRules?: object;
  autoApproveRules?: object;
  escalationRules?: object;
  notificationSettings?: object;
  maxAmount?: number;
  requireAttachment?: boolean;
  allowBulk?: boolean;
  isActive?: boolean;
  displayOrder?: number;
  updatedBy?: number;
}

export interface CreateWorkflowRequestRequest {
  workflowTypeId: number;
  companyId: number;
  requesterId: number;
  departmentId: number;
  title: string;
  description?: string;
  formData: object;
  amount?: number;
  priority?: Priority;
  dueDate?: Date;
  isUrgent?: boolean;
}

export interface UpdateWorkflowRequestRequest {
  title?: string;
  description?: string;
  formData?: object;
  amount?: number;
  priority?: Priority;
  dueDate?: Date;
  isUrgent?: boolean;
}

export class WorkflowService {

  /**
   * ワークフロータイプの作成
   */
  async createWorkflowType(data: CreateWorkflowTypeRequest) {
    // コードの重複チェック
    const existingType = await prisma.workflow_types.findFirst({
      where: {
        companyId: data.companyId,
        code: data.code
      }
    });

    if (existingType) {
      throw new Error('このコードは既に使用されています');
    }

    return await prisma.workflow_types.create({
      data: {
        companyId: data.companyId,
        code: data.code,
        name: data.name,
        description: data.description,
        category: data.category,
        formSchema: data.formSchema,
        validationRules: data.validationRules,
        autoApproveRules: data.autoApproveRules,
        escalationRules: data.escalationRules,
        notificationSettings: data.notificationSettings,
        maxAmount: data.maxAmount,
        requireAttachment: data.requireAttachment || false,
        allowBulk: data.allowBulk || false,
        displayOrder: data.displayOrder || 0,
        createdBy: data.createdBy
      },
      include: {
        companies: {
          select: { id: true, name: true, code: true }
        },
        createdUser: {
          select: { id: true, name: true, username: true }
        }
      }
    });
  }

  /**
   * ワークフロータイプの更新
   */
  async updateWorkflowType(id: number, data: UpdateWorkflowTypeRequest, companyId: number) {
    // 存在確認
    const workflowType = await prisma.workflow_types.findFirst({
      where: { id, companyId }
    });

    if (!workflowType) {
      throw new Error('ワークフロータイプが見つかりません');
    }

    return await prisma.workflow_types.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        companies: {
          select: { id: true, name: true, code: true }
        },
        updatedUser: {
          select: { id: true, name: true, username: true }
        }
      }
    });
  }

  /**
   * ワークフロータイプの削除（論理削除）
   */
  async deleteWorkflowType(id: number, companyId: number) {
    // 存在確認
    const workflowType = await prisma.workflow_types.findFirst({
      where: { id, companyId }
    });

    if (!workflowType) {
      throw new Error('ワークフロータイプが見つかりません');
    }

    // アクティブな申請があるかチェック
    const activeRequests = await prisma.workflow_requests.count({
      where: {
        workflowTypeId: id,
        status: {
          in: [WorkflowStatus.DRAFT, WorkflowStatus.PENDING]
        }
      }
    });

    if (activeRequests > 0) {
      throw new Error('アクティブな申請があるため削除できません');
    }

    return await prisma.workflow_types.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
  }

  /**
   * ワークフロータイプの取得（単体）
   */
  async getWorkflowType(id: number, companyId: number) {
    const workflowType = await prisma.workflow_types.findFirst({
      where: { id, companyId, isActive: true },
      include: {
        companies: {
          select: { id: true, name: true, code: true }
        },
        createdUser: {
          select: { id: true, name: true, username: true }
        },
        updatedUser: {
          select: { id: true, name: true, username: true }
        },
        approval_routes: {
          where: { isActive: true },
          orderBy: { stepNumber: 'asc' }
        }
      }
    });

    if (!workflowType) {
      throw new Error('ワークフロータイプが見つかりません');
    }

    return workflowType;
  }

  /**
   * ワークフロータイプの一覧取得
   */
  async getWorkflowTypes(
    companyId: number,
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      category?: string;
      isActive?: boolean;
    } = {}
  ) {
    const {
      page = 1,
      pageSize = 10,
      search = '',
      category,
      isActive = true
    } = options;

    const skip = (page - 1) * pageSize;

    // 検索条件構築
    const whereClause: any = {
      companyId,
      isActive
    };

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category) {
      whereClause.category = category;
    }

    const [workflowTypes, total] = await Promise.all([
      prisma.workflow_types.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: [
          { displayOrder: 'asc' },
          { createdAt: 'desc' }
        ],
        include: {
          companies: {
            select: { id: true, name: true, code: true }
          },
          createdUser: {
            select: { id: true, name: true, username: true }
          },
          _count: {
            select: {
              workflow_requests: true,
              approval_routes: true
            }
          }
        }
      }),
      prisma.workflow_types.count({ where: whereClause })
    ]);

    return {
      data: workflowTypes,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 申請番号の生成
   */
  async generateRequestNumber(workflowTypeId: number): Promise<string> {
    const workflowType = await prisma.workflow_types.findUnique({
      where: { id: workflowTypeId },
      select: { code: true }
    });

    if (!workflowType) {
      throw new Error('ワークフロータイプが見つかりません');
    }

    // 今日の日付
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // 今日の連番を取得
    const todayRequests = await prisma.workflow_requests.count({
      where: {
        workflowTypeId,
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        }
      }
    });

    const sequence = (todayRequests + 1).toString().padStart(4, '0');
    return `${workflowType.code}-${dateStr}-${sequence}`;
  }

  /**
   * ワークフロー申請の作成
   */
  async createWorkflowRequest(data: CreateWorkflowRequestRequest) {
    // ワークフロータイプの存在確認
    const workflowType = await prisma.workflow_types.findFirst({
      where: {
        id: data.workflowTypeId,
        companyId: data.companyId,
        isActive: true
      }
    });

    if (!workflowType) {
      throw new Error('ワークフロータイプが見つかりません');
    }

    // 申請番号生成
    const requestNumber = await this.generateRequestNumber(data.workflowTypeId);

    return await prisma.workflow_requests.create({
      data: {
        workflowTypeId: data.workflowTypeId,
        requestNumber,
        companyId: data.companyId,
        requesterId: data.requesterId,
        departmentId: data.departmentId || 1, // デフォルト部署ID
        title: data.title,
        description: data.description,
        formData: data.formData,
        amount: data.amount,
        status: WorkflowStatus.DRAFT,
        currentStep: 1,
        priority: data.priority || Priority.NORMAL,
        dueDate: data.dueDate,
        isUrgent: data.isUrgent || false
      },
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
    });
  }

  /**
   * ワークフロー申請の更新
   */
  async updateWorkflowRequest(
    id: number,
    data: UpdateWorkflowRequestRequest,
    companyId: number,
    userId: number
  ) {
    // 存在確認と権限チェック
    const request = await prisma.workflow_requests.findFirst({
      where: { id, companyId }
    });

    if (!request) {
      throw new Error('申請が見つかりません');
    }

    // 下書き状態かつ申請者本人のみ更新可能
    if (request.status !== WorkflowStatus.DRAFT || request.requesterId !== userId) {
      throw new Error('この申請は更新できません');
    }

    return await prisma.workflow_requests.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      },
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
    });
  }

  /**
   * ワークフロー申請の削除（論理削除）
   */
  async deleteWorkflowRequest(id: number, companyId: number, userId: number) {
    // 存在確認と権限チェック
    const request = await prisma.workflow_requests.findFirst({
      where: { id, companyId }
    });

    if (!request) {
      throw new Error('申請が見つかりません');
    }

    // 下書き状態かつ申請者本人のみ削除可能
    if (request.status !== WorkflowStatus.DRAFT || request.requesterId !== userId) {
      throw new Error('この申請は削除できません');
    }

    return await prisma.workflow_requests.update({
      where: { id },
      data: {
        status: WorkflowStatus.CANCELLED,
        cancelReason: '申請者による取り消し',
        updatedAt: new Date()
      }
    });
  }

  /**
   * ワークフロー申請の提出
   */
  async submitWorkflowRequest(id: number, comment: string, companyId: number, userId: number) {
    const request = await prisma.workflow_requests.findFirst({
      where: { id, companyId },
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

    if (request.status !== WorkflowStatus.DRAFT || request.requesterId !== userId) {
      throw new Error('この申請は提出できません');
    }

    if (request.workflow_types.approval_routes.length === 0) {
      throw new Error('承認ルートが設定されていません');
    }

    return await prisma.$transaction(async (tx) => {
      // 申請ステータスを承認待ちに変更
      const updatedRequest = await tx.workflow_requests.update({
        where: { id },
        data: {
          status: WorkflowStatus.PENDING,
          submittedAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          workflow_types: {
            select: { id: true, name: true, code: true }
          },
          requester: {
            select: { id: true, name: true, username: true }
          },
          departments: {
            select: { id: true, name: true, code: true }
          }
        }
      });

      // 通知作成（最初のステップの承認者に）
      // 実装は通知サービスで行う

      return updatedRequest;
    });
  }

  /**
   * ワークフロー申請の取得（単体）
   */
  async getWorkflowRequest(id: number, companyId: number) {
    const request = await prisma.workflow_requests.findFirst({
      where: { id, companyId },
      include: {
        workflow_types: {
          select: { id: true, name: true, code: true, category: true, formSchema: true }
        },
        requester: {
          select: { id: true, name: true, username: true, email: true }
        },
        departments: {
          select: { id: true, name: true, code: true }
        },
        approval_history: {
          orderBy: { processedAt: 'desc' },
          include: {
            approver: {
              select: { id: true, name: true, username: true }
            },
            delegatedFromUser: {
              select: { id: true, name: true, username: true }
            },
            delegatedToUser: {
              select: { id: true, name: true, username: true }
            }
          }
        },
        workflow_attachments: {
          where: { isDeleted: false },
          orderBy: { uploadedAt: 'desc' },
          include: {
            uploader: {
              select: { id: true, name: true, username: true }
            }
          }
        }
      }
    });

    if (!request) {
      throw new Error('申請が見つかりません');
    }

    return request;
  }

  /**
   * ワークフロー申請の一覧取得
   */
  async getWorkflowRequests(
    companyId: number,
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: WorkflowStatus;
      workflowTypeId?: number;
      requesterId?: number;
      departmentId?: number;
      priority?: Priority;
      isUrgent?: boolean;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ) {
    const {
      page = 1,
      pageSize = 10,
      search = '',
      status,
      workflowTypeId,
      requesterId,
      departmentId,
      priority,
      isUrgent,
      dateFrom,
      dateTo
    } = options;

    const skip = (page - 1) * pageSize;

    // 検索条件構築
    const whereClause: any = { companyId };

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { requestNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (status) whereClause.status = status;
    if (workflowTypeId) whereClause.workflowTypeId = workflowTypeId;
    if (requesterId) whereClause.requesterId = requesterId;
    if (departmentId) whereClause.departmentId = departmentId;
    if (priority) whereClause.priority = priority;
    if (isUrgent !== undefined) whereClause.isUrgent = isUrgent;

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt.gte = dateFrom;
      if (dateTo) whereClause.createdAt.lte = dateTo;
    }

    const [requests, total] = await Promise.all([
      prisma.workflow_requests.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: [
          { isUrgent: 'desc' },
          { priority: 'desc' },
          { createdAt: 'desc' }
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
          },
          _count: {
            select: {
              approval_history: true,
              workflow_attachments: true
            }
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
   * ユーザーの承認待ち件数取得
   */
  async getPendingApprovalCount(userId: number, companyId: number): Promise<number> {
    // TODO: 承認者の判定ロジックを実装
    // 現在は簡易実装
    return await prisma.workflow_requests.count({
      where: {
        companyId,
        status: WorkflowStatus.PENDING
      }
    });
  }

  /**
   * ダッシュボード用統計情報取得
   */
  async getWorkflowStatistics(companyId: number) {
    const [
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      myRequests,
      urgentRequests
    ] = await Promise.all([
      prisma.workflow_requests.count({ where: { companyId } }),
      prisma.workflow_requests.count({
        where: { companyId, status: WorkflowStatus.PENDING }
      }),
      prisma.workflow_requests.count({
        where: { companyId, status: WorkflowStatus.APPROVED }
      }),
      prisma.workflow_requests.count({
        where: { companyId, status: WorkflowStatus.REJECTED }
      }),
      prisma.workflow_requests.count({
        where: { companyId, status: WorkflowStatus.DRAFT }
      }),
      prisma.workflow_requests.count({
        where: { companyId, isUrgent: true, status: WorkflowStatus.PENDING }
      })
    ]);

    return {
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      myRequests,
      urgentRequests,
      approvalRate: totalRequests > 0 ? (approvedRequests / totalRequests * 100) : 0
    };
  }

  /**
   * ワークフロー申請キャンセル
   */
  async cancelWorkflowRequest(id: number, reason: string, companyId: number) {
    const request = await prisma.workflow_requests.findFirst({
      where: {
        id,
        companyId,
        status: {
          in: ['DRAFT', 'SUBMITTED', 'IN_PROGRESS']
        }
      }
    });

    if (!request) {
      throw new Error('キャンセル可能なワークフロー申請が見つかりません');
    }

    return await prisma.workflow_requests.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelReason: reason,
        cancelledAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        workflow_types: true,
        users: {
          select: {
            id: true,
            username: true,
            name: true
          }
        },
        departments: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  /**
   * 承認待ち一覧取得
   */
  async getPendingApprovals(
    companyId: number,
    userId: number,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    // 承認待ちの申請を取得
    const [requests, total] = await Promise.all([
      prisma.workflow_requests.findMany({
        where: {
          companyId,
          status: 'IN_PROGRESS',
          approval_history: {
            some: {
              approverId: userId,
              action: 'PENDING'
            }
          }
        },
        include: {
          workflow_types: true,
          users: {
            select: {
              id: true,
              username: true,
              name: true
            }
          },
          departments: {
            select: {
              id: true,
              name: true
            }
          },
          approval_history: {
            where: {
              approverId: userId,
              action: 'PENDING'
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ],
        skip,
        take: limit
      }),

      prisma.workflow_requests.count({
        where: {
          companyId,
          status: 'IN_PROGRESS',
          approval_history: {
            some: {
              approverId: userId,
              action: 'PENDING'
            }
          }
        }
      })
    ]);

    return {
      data: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
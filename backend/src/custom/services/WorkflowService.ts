/**
 * ワークフローサービス（暫定実装）
 */

import { prisma } from '@core/lib/prisma';

export class WorkflowService {
  static instance: WorkflowService;

  static getInstance(): WorkflowService {
    if (!WorkflowService.instance) {
      WorkflowService.instance = new WorkflowService();
    }
    return WorkflowService.instance;
  }

  /**
   * ワークフロータイプ一覧取得
   */
  async getWorkflowTypes(params: any) {
    const { companyId, page = 1, limit = 20, search, category, isActive } = params;

    const where: any = { companyId };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } }
      ];
    }
    if (category) where.category = category;
    if (isActive !== undefined) where.isActive = isActive;

    const [workflowTypes, total] = await Promise.all([
      prisma.workflow_types.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { displayOrder: 'asc' }
      }),
      prisma.workflow_types.count({ where })
    ]);

    return {
      data: workflowTypes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * ワークフロー申請一覧取得
   */
  async getWorkflowRequests(params: any) {
    const { companyId, page = 1, limit = 20, search, status, workflowTypeId } = params;

    const where: any = { companyId };
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { requestNumber: { contains: search } }
      ];
    }
    if (status) where.status = status;
    if (workflowTypeId) where.workflowTypeId = workflowTypeId;

    const [requests, total] = await Promise.all([
      prisma.workflow_requests.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          workflow_types: { select: { name: true } },
          users: { select: { name: true, username: true } }
        }
      }),
      prisma.workflow_requests.count({ where })
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

  /**
   * ワークフロー統計取得
   */
  async getWorkflowStatistics(companyId: number) {
    const [totalRequests, pendingRequests, approvedRequests, rejectedRequests] = await Promise.all([
      prisma.workflow_requests.count({ where: { companyId } }),
      prisma.workflow_requests.count({ where: { companyId, status: 'PENDING' } }),
      prisma.workflow_requests.count({ where: { companyId, status: 'APPROVED' } }),
      prisma.workflow_requests.count({ where: { companyId, status: 'REJECTED' } })
    ]);

    return {
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      approvalRate: totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0
    };
  }

  /**
   * 承認待ち一覧取得
   */
  async getPendingApprovals(params: any) {
    const { companyId, userId, page = 1, limit = 20, search, workflowTypeId, priority } = params;

    // 承認待ちのワークフロー申請を取得
    const where: any = {
      companyId,
      status: 'PENDING'
    };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { requestNumber: { contains: search } }
      ];
    }
    if (workflowTypeId) where.workflowTypeId = workflowTypeId;
    if (priority) where.priority = priority;

    const [requests, total] = await Promise.all([
      prisma.workflow_requests.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          workflow_types: { select: { name: true, category: true } },
          users: { select: { id: true, name: true, username: true } }
        }
      }),
      prisma.workflow_requests.count({ where })
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

/**
 * 承認委任サービス
 *
 * 長期不在時などに承認権限を他のユーザーに委任する機能
 * 期間指定による自動適用・委任チェーンの管理・監査ログ記録
 */

import { prisma } from '../lib/prisma';

export interface ApprovalDelegationRequest {
  delegatorId: number;
  delegateId: number;
  workflowTypeId?: number; // nullの場合は全ワークフロータイプ
  startDate: Date;
  endDate: Date;
  reason?: string;
  createdBy: number;
}

export interface ApprovalDelegationResult {
  success: boolean;
  delegationId: number;
  message: string;
  delegation: any;
}

export interface DelegationCheckResult {
  canDelegate: boolean;
  reason?: string;
  existingDelegations?: any[];
  chainLevel?: number;
}

export class ApprovalDelegationService {

  /**
   * 承認委任の作成
   */
  async createDelegation(data: ApprovalDelegationRequest): Promise<ApprovalDelegationResult> {
    // 1. 委任可能性チェック
    const canDelegate = await this.canCreateDelegation(
      data.delegatorId,
      data.delegateId,
      data.workflowTypeId,
      data.startDate,
      data.endDate
    );

    if (!canDelegate.canDelegate) {
      throw new Error(canDelegate.reason || '委任の作成ができません');
    }

    // 2. トランザクション内で委任作成
    const result = await prisma.$transaction(async (tx) => {
      // 委任レコード作成
      const delegation = await tx.approval_delegates.create({
        data: {
          delegatorId: data.delegatorId,
          delegateId: data.delegateId,
          workflowTypeId: data.workflowTypeId || null,
          startDate: data.startDate,
          endDate: data.endDate,
          reason: data.reason,
          isActive: true,
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

      // 監査ログ記録
      await tx.audit_logs.create({
        data: {
          userId: data.createdBy,
          action: 'DELEGATION_CREATED',
          targetType: 'APPROVAL_DELEGATION',
          targetId: delegation.id,
          reason: `承認委任作成: ${data.delegatorId} → ${data.delegateId} (${data.startDate.toISOString().split('T')[0]} - ${data.endDate.toISOString().split('T')[0]})`
        }
      });

      return {
        success: true,
        delegationId: delegation.id,
        message: '承認委任が作成されました',
        delegation
      };
    });

    return result;
  }

  /**
   * 承認委任可能性のチェック
   */
  async canCreateDelegation(
    delegatorId: number,
    delegateId: number,
    workflowTypeId?: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<DelegationCheckResult> {
    // 1. 自分自身への委任チェック
    if (delegatorId === delegateId) {
      return {
        canDelegate: false,
        reason: '自分自身に委任することはできません'
      };
    }

    // 2. 委任先ユーザーの存在確認
    const delegate = await prisma.users.findUnique({
      where: { id: delegateId },
      select: { id: true, role: true, isActive: true }
    });

    if (!delegate || !delegate.isActive) {
      return {
        canDelegate: false,
        reason: '委任先ユーザーが見つからないか、アクティブではありません'
      };
    }

    // 3. 委任チェーンレベルチェック（最大2段階）
    const chainLevel = await this.getDelegationChainLevel(delegateId, workflowTypeId);
    if (chainLevel >= 2) {
      return {
        canDelegate: false,
        reason: '委任チェーンが最大レベル（2段階）に達しています',
        chainLevel
      };
    }

    // 4. 期間重複チェック
    if (startDate && endDate) {
      const overlapping = await prisma.approval_delegates.findMany({
        where: {
          delegatorId,
          workflowTypeId: workflowTypeId || null,
          isActive: true,
          OR: [
            {
              AND: [
                { startDate: { lte: endDate } },
                { endDate: { gte: startDate } }
              ]
            }
          ]
        },
        include: {
          delegate: {
            select: { id: true, name: true, username: true }
          }
        }
      });

      if (overlapping.length > 0) {
        return {
          canDelegate: false,
          reason: '指定期間に既存の委任が重複しています',
          existingDelegations: overlapping
        };
      }
    }

    // 5. 循環委任チェック
    const hasCircularDelegation = await this.checkCircularDelegation(delegatorId, delegateId, workflowTypeId);
    if (hasCircularDelegation) {
      return {
        canDelegate: false,
        reason: '循環委任が発生するため作成できません'
      };
    }

    return {
      canDelegate: true,
      chainLevel
    };
  }

  /**
   * 委任チェーンレベルの取得
   */
  async getDelegationChainLevel(userId: number, workflowTypeId?: number, visited: Set<number> = new Set()): Promise<number> {
    if (visited.has(userId)) {
      return 999; // 循環を検出
    }

    visited.add(userId);

    const activeDelegations = await prisma.approval_delegates.findMany({
      where: {
        delegatorId: userId,
        workflowTypeId: workflowTypeId || null,
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() }
      }
    });

    if (activeDelegations.length === 0) {
      return 0;
    }

    let maxLevel = 0;
    for (const delegation of activeDelegations) {
      const level = await this.getDelegationChainLevel(delegation.delegateId, workflowTypeId, new Set(visited));
      maxLevel = Math.max(maxLevel, level + 1);
    }

    return maxLevel;
  }

  /**
   * 循環委任チェック
   */
  async checkCircularDelegation(delegatorId: number, delegateId: number, workflowTypeId?: number): Promise<boolean> {
    const visited = new Set<number>();

    const checkPath = async (currentId: number): Promise<boolean> => {
      if (currentId === delegatorId) {
        return true; // 循環を発見
      }

      if (visited.has(currentId)) {
        return false; // 既に訪問済み
      }

      visited.add(currentId);

      const delegations = await prisma.approval_delegates.findMany({
        where: {
          delegatorId: currentId,
          workflowTypeId: workflowTypeId || null,
          isActive: true
        }
      });

      for (const delegation of delegations) {
        if (await checkPath(delegation.delegateId)) {
          return true;
        }
      }

      return false;
    };

    return await checkPath(delegateId);
  }

  /**
   * アクティブな委任の取得
   */
  async getActiveDelegations(userId: number, workflowTypeId?: number): Promise<any[]> {
    const now = new Date();

    return await prisma.approval_delegates.findMany({
      where: {
        delegatorId: userId,
        workflowTypeId: workflowTypeId || null,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      include: {
        delegate: {
          select: { id: true, name: true, username: true }
        },
        workflow_types: {
          select: { id: true, name: true, code: true }
        }
      },
      orderBy: { startDate: 'asc' }
    });
  }

  /**
   * 実効承認者の取得（委任を考慮）
   */
  async getEffectiveApprover(originalApproverId: number, workflowTypeId?: number): Promise<number> {
    const now = new Date();

    const delegation = await prisma.approval_delegates.findFirst({
      where: {
        delegatorId: originalApproverId,
        workflowTypeId: workflowTypeId || null,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (delegation) {
      // 再帰的に委任をチェック（最大2段階）
      return await this.getEffectiveApprover(delegation.delegateId, workflowTypeId);
    }

    return originalApproverId;
  }

  /**
   * 委任履歴の取得
   */
  async getDelegationHistory(
    companyId: number,
    options: {
      page?: number;
      pageSize?: number;
      delegatorId?: number;
      delegateId?: number;
      workflowTypeId?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    const { page = 1, pageSize = 20, delegatorId, delegateId, workflowTypeId, startDate, endDate } = options;
    const skip = (page - 1) * pageSize;

    const whereClause: any = {};

    if (delegatorId) whereClause.delegatorId = delegatorId;
    if (delegateId) whereClause.delegateId = delegateId;
    if (workflowTypeId) whereClause.workflowTypeId = workflowTypeId;

    if (startDate || endDate) {
      whereClause.OR = [
        {
          AND: [
            startDate ? { endDate: { gte: startDate } } : {},
            endDate ? { startDate: { lte: endDate } } : {}
          ]
        }
      ];
    }

    // 会社所属チェック（委任者と委任先両方が同じ会社に所属）
    whereClause.AND = [
      {
        delegator: {
          companyId: companyId
        }
      },
      {
        delegate: {
          companyId: companyId
        }
      }
    ];

    const [delegations, total] = await Promise.all([
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
          },
          createdUser: {
            select: { id: true, name: true, username: true }
          }
        }
      }),
      prisma.approval_delegates.count({ where: whereClause })
    ]);

    return {
      data: delegations,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 委任の更新
   */
  async updateDelegation(
    delegationId: number,
    updates: {
      startDate?: Date;
      endDate?: Date;
      reason?: string;
      isActive?: boolean;
    },
    updatedBy: number
  ) {
    const delegation = await prisma.approval_delegates.findUnique({
      where: { id: delegationId },
      include: {
        delegator: { select: { id: true, name: true } },
        delegate: { select: { id: true, name: true } }
      }
    });

    if (!delegation) {
      throw new Error('委任が見つかりません');
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.approval_delegates.update({
        where: { id: delegationId },
        data: {
          ...updates,
          updatedAt: new Date()
        },
        include: {
          delegator: { select: { id: true, name: true, username: true } },
          delegate: { select: { id: true, name: true, username: true } },
          workflow_types: { select: { id: true, name: true, code: true } }
        }
      });

      // 監査ログ記録
      await tx.audit_logs.create({
        data: {
          userId: updatedBy,
          action: 'DELEGATION_UPDATED',
          targetType: 'APPROVAL_DELEGATION',
          targetId: delegationId,
          reason: `承認委任更新: ${delegation.delegator.name} → ${delegation.delegate.name}`
        }
      });

      return updated;
    });

    return result;
  }

  /**
   * 委任の削除（無効化）
   */
  async deleteDelegation(delegationId: number, deletedBy: number) {
    const delegation = await prisma.approval_delegates.findUnique({
      where: { id: delegationId },
      include: {
        delegator: { select: { id: true, name: true } },
        delegate: { select: { id: true, name: true } }
      }
    });

    if (!delegation) {
      throw new Error('委任が見つかりません');
    }

    await prisma.$transaction(async (tx) => {
      await tx.approval_delegates.update({
        where: { id: delegationId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      // 監査ログ記録
      await tx.audit_logs.create({
        data: {
          userId: deletedBy,
          action: 'DELEGATION_DELETED',
          targetType: 'APPROVAL_DELEGATION',
          targetId: delegationId,
          reason: `承認委任削除: ${delegation.delegator.name} → ${delegation.delegate.name}`
        }
      });
    });

    return { success: true, message: '委任が削除されました' };
  }

  /**
   * 期限切れ委任の自動無効化
   */
  async deactivateExpiredDelegations() {
    const now = new Date();

    const expired = await prisma.approval_delegates.updateMany({
      where: {
        isActive: true,
        endDate: { lt: now }
      },
      data: {
        isActive: false,
        updatedAt: now
      }
    });

    return {
      deactivatedCount: expired.count,
      timestamp: now
    };
  }
}
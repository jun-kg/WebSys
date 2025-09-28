/**
 * 自動承認サービス
 *
 * 条件に基づく自動承認機能
 * 時間ベース、金額ベース、役職ベース、カスタム条件ベースの自動承認
 */

import { prisma } from '../lib/prisma';

export interface AutoApprovalRule {
  id?: number;
  workflowTypeId: number;
  stepNumber?: number;
  ruleType: 'TIME_BASED' | 'AMOUNT_BASED' | 'ROLE_BASED' | 'CONDITION_BASED';
  ruleName: string;
  description?: string;
  conditions: any;
  autoApproveAfter?: number;
  maxAmount?: number;
  applicableRoles?: string[];
  priority?: number;
  isActive?: boolean;
}

export interface AutoApprovalRuleResult {
  success: boolean;
  ruleId: number;
  message: string;
  rule: any;
}

export interface AutoApprovalExecution {
  requestId: number;
  ruleId: number;
  ruleName: string;
  ruleType: string;
  reason: string;
  systemUserId?: number;
  metadata?: any;
}

export interface AutoApprovalResult {
  success: boolean;
  logId: number;
  message: string;
  appliedAt?: Date;
}

export interface AutoApprovalCheck {
  shouldAutoApprove: boolean;
  matchedRules: any[];
  reason?: string;
}

export class AutoApprovalService {

  /**
   * 自動承認ルールの作成
   */
  async createAutoApprovalRule(data: AutoApprovalRule): Promise<AutoApprovalRuleResult> {
    const rule = await prisma.auto_approval_rules.create({
      data: {
        workflowTypeId: data.workflowTypeId,
        stepNumber: data.stepNumber || null,
        ruleType: data.ruleType,
        ruleName: data.ruleName,
        description: data.description,
        conditions: data.conditions,
        autoApproveAfter: data.autoApproveAfter,
        maxAmount: data.maxAmount,
        applicableRoles: data.applicableRoles,
        priority: data.priority || 0,
        isActive: data.isActive !== false
      },
      include: {
        workflow_types: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    return {
      success: true,
      ruleId: rule.id,
      message: '自動承認ルールが作成されました',
      rule
    };
  }

  /**
   * 申請に対する自動承認チェック
   */
  async checkAutoApproval(requestId: number, stepNumber?: number): Promise<AutoApprovalCheck> {
    // 申請情報を取得
    const request = await prisma.workflow_requests.findUnique({
      where: { id: requestId },
      include: {
        workflow_types: true,
        requester: {
          select: { id: true, role: true, primaryDepartmentId: true }
        }
      }
    });

    if (!request) {
      return { shouldAutoApprove: false, matchedRules: [], reason: '申請が見つかりません' };
    }

    // 該当する自動承認ルールを取得
    const rules = await prisma.auto_approval_rules.findMany({
      where: {
        workflowTypeId: request.workflowTypeId,
        stepNumber: stepNumber || null,
        isActive: true
      },
      orderBy: { priority: 'desc' }
    });

    const matchedRules = [];

    for (const rule of rules) {
      const isMatch = await this.evaluateRule(rule, request);
      if (isMatch) {
        matchedRules.push(rule);
      }
    }

    return {
      shouldAutoApprove: matchedRules.length > 0,
      matchedRules,
      reason: matchedRules.length > 0
        ? `${matchedRules.length}個のルールに合致`
        : '合致するルールがありません'
    };
  }

  /**
   * ルールの評価
   */
  private async evaluateRule(rule: any, request: any): Promise<boolean> {
    switch (rule.ruleType) {
      case 'TIME_BASED':
        return this.evaluateTimeBasedRule(rule, request);

      case 'AMOUNT_BASED':
        return this.evaluateAmountBasedRule(rule, request);

      case 'ROLE_BASED':
        return this.evaluateRoleBasedRule(rule, request);

      case 'CONDITION_BASED':
        return this.evaluateConditionBasedRule(rule, request);

      default:
        return false;
    }
  }

  /**
   * 時間ベースルールの評価
   */
  private evaluateTimeBasedRule(rule: any, request: any): boolean {
    if (!rule.autoApproveAfter || !request.submittedAt) {
      return false;
    }

    const submittedTime = new Date(request.submittedAt);
    const currentTime = new Date();
    const elapsedMinutes = (currentTime.getTime() - submittedTime.getTime()) / (1000 * 60);

    return elapsedMinutes >= rule.autoApproveAfter;
  }

  /**
   * 金額ベースルールの評価
   */
  private evaluateAmountBasedRule(rule: any, request: any): boolean {
    if (!rule.maxAmount || !request.amount) {
      return false;
    }

    return Number(request.amount) <= Number(rule.maxAmount);
  }

  /**
   * 役職ベースルールの評価
   */
  private evaluateRoleBasedRule(rule: any, request: any): boolean {
    if (!rule.applicableRoles || !Array.isArray(rule.applicableRoles)) {
      return false;
    }

    return rule.applicableRoles.includes(request.requester.role);
  }

  /**
   * 条件ベースルールの評価
   */
  private evaluateConditionBasedRule(rule: any, request: any): boolean {
    const conditions = rule.conditions;

    if (!conditions || typeof conditions !== 'object') {
      return false;
    }

    // 簡単な条件評価の例（実際はより複雑な条件エンジンを実装）
    try {
      // 条件例: { "priority": "LOW", "department": [1, 2], "amount_less_than": 10000 }

      if (conditions.priority && request.priority !== conditions.priority) {
        return false;
      }

      if (conditions.department && Array.isArray(conditions.department)) {
        if (!conditions.department.includes(request.departmentId)) {
          return false;
        }
      }

      if (conditions.amount_less_than && request.amount) {
        if (Number(request.amount) >= Number(conditions.amount_less_than)) {
          return false;
        }
      }

      if (conditions.amount_greater_than && request.amount) {
        if (Number(request.amount) <= Number(conditions.amount_greater_than)) {
          return false;
        }
      }

      if (conditions.requester_role && request.requester.role !== conditions.requester_role) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('条件評価エラー:', error);
      return false;
    }
  }

  /**
   * 自動承認の実行
   */
  async executeAutoApproval(data: AutoApprovalExecution): Promise<AutoApprovalResult> {
    const result = await prisma.$transaction(async (tx) => {
      // 申請を承認済みに更新
      await tx.workflow_requests.update({
        where: { id: data.requestId },
        data: {
          status: 'APPROVED',
          completedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // 自動承認ログを作成
      const log = await tx.auto_approval_logs.create({
        data: {
          requestId: data.requestId,
          ruleId: data.ruleId,
          ruleName: data.ruleName,
          ruleType: data.ruleType,
          status: 'APPLIED',
          reason: data.reason,
          systemUserId: data.systemUserId,
          metadata: data.metadata,
          appliedAt: new Date()
        }
      });

      // 承認履歴も作成（システムユーザーとして）
      await tx.approval_history.create({
        data: {
          requestId: data.requestId,
          stepNumber: 1, // デフォルトステップ
          approverId: data.systemUserId || 1, // システムユーザーID
          action: 'AUTO_APPROVE',
          comment: `自動承認: ${data.reason}`,
          processingTime: 0,
          isNotified: false
        }
      });

      // 監査ログ記録
      await tx.audit_logs.create({
        data: {
          userId: data.systemUserId || 1,
          action: 'AUTO_APPROVAL',
          targetType: 'WORKFLOW_REQUEST',
          targetId: data.requestId,
          reason: `自動承認実行: ${data.ruleName} (${data.ruleType})`
        }
      });

      return {
        success: true,
        logId: log.id,
        message: '自動承認が実行されました',
        appliedAt: log.appliedAt
      };
    });

    return result;
  }

  /**
   * 自動承認ルール一覧取得
   */
  async getAutoApprovalRules(
    companyId: number,
    options: {
      workflowTypeId?: number;
      ruleType?: string;
      isActive?: boolean;
      page?: number;
      pageSize?: number;
    } = {}
  ) {
    const { workflowTypeId, ruleType, isActive, page = 1, pageSize = 20 } = options;
    const skip = (page - 1) * pageSize;

    const whereClause: any = {
      workflow_types: { companyId }
    };

    if (workflowTypeId) whereClause.workflowTypeId = workflowTypeId;
    if (ruleType) whereClause.ruleType = ruleType;
    if (isActive !== undefined) whereClause.isActive = isActive;

    const [rules, total] = await Promise.all([
      prisma.auto_approval_rules.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: {
          workflow_types: {
            select: { id: true, name: true, code: true }
          },
          _count: {
            select: { auto_approval_logs: true }
          }
        }
      }),
      prisma.auto_approval_rules.count({ where: whereClause })
    ]);

    return {
      data: rules,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 自動承認ログ一覧取得
   */
  async getAutoApprovalLogs(
    companyId: number,
    options: {
      requestId?: number;
      ruleId?: number;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      pageSize?: number;
    } = {}
  ) {
    const { requestId, ruleId, status, startDate, endDate, page = 1, pageSize = 20 } = options;
    const skip = (page - 1) * pageSize;

    const whereClause: any = {
      workflow_requests: { companyId }
    };

    if (requestId) whereClause.requestId = requestId;
    if (ruleId) whereClause.ruleId = ruleId;
    if (status) whereClause.status = status;

    if (startDate || endDate) {
      whereClause.triggeredAt = {};
      if (startDate) whereClause.triggeredAt.gte = startDate;
      if (endDate) whereClause.triggeredAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auto_approval_logs.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: { triggeredAt: 'desc' },
        include: {
          workflow_requests: {
            select: {
              id: true,
              requestNumber: true,
              title: true,
              status: true
            }
          },
          auto_approval_rules: {
            select: {
              id: true,
              ruleName: true,
              ruleType: true
            }
          }
        }
      }),
      prisma.auto_approval_logs.count({ where: whereClause })
    ]);

    return {
      data: logs,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 自動承認統計の取得
   */
  async getAutoApprovalStatistics(companyId: number, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const [
        totalAutoApprovals,
        autoApprovalsByType,
        autoApprovalsByStatus,
        rulesCount
      ] = await Promise.all([
        // 自動承認総数
        prisma.auto_approval_logs.count({
          where: {
            triggeredAt: { gte: startDate },
            workflow_requests: { companyId }
          }
        }),

        // タイプ別集計
        prisma.auto_approval_logs.groupBy({
          by: ['ruleType'],
          where: {
            triggeredAt: { gte: startDate },
            workflow_requests: { companyId }
          },
          _count: { ruleType: true }
        }),

        // ステータス別集計
        prisma.auto_approval_logs.groupBy({
          by: ['status'],
          where: {
            triggeredAt: { gte: startDate },
            workflow_requests: { companyId }
          },
          _count: { status: true }
        }),

        // アクティブルール数
        prisma.auto_approval_rules.count({
          where: {
            isActive: true,
            workflow_types: { companyId }
          }
        })
      ]);

      return {
        totalAutoApprovals,
        autoApprovalsByType,
        autoApprovalsByStatus,
        activeRulesCount: rulesCount,
        period: `${days}日間`,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('自動承認統計取得エラー:', error);
      throw error;
    }
  }

  /**
   * 自動承認ルールの更新
   */
  async updateAutoApprovalRule(ruleId: number, data: Partial<AutoApprovalRule>) {
    const rule = await prisma.auto_approval_rules.update({
      where: { id: ruleId },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        workflow_types: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    return {
      success: true,
      message: '自動承認ルールが更新されました',
      rule
    };
  }

  /**
   * 自動承認ルールの削除（無効化）
   */
  async deleteAutoApprovalRule(ruleId: number) {
    await prisma.auto_approval_rules.update({
      where: { id: ruleId },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      message: '自動承認ルールが削除されました'
    };
  }

  /**
   * 一括自動承認チェック（バッチ処理用）
   */
  async processPendingRequests(workflowTypeId?: number) {
    const whereClause: any = {
      status: 'PENDING'
    };

    if (workflowTypeId) {
      whereClause.workflowTypeId = workflowTypeId;
    }

    const pendingRequests = await prisma.workflow_requests.findMany({
      where: whereClause,
      include: {
        workflow_types: true,
        requester: {
          select: { id: true, role: true, primaryDepartmentId: true }
        }
      }
    });

    const results = [];

    for (const request of pendingRequests) {
      try {
        const checkResult = await this.checkAutoApproval(request.id, request.currentStep);

        if (checkResult.shouldAutoApprove && checkResult.matchedRules.length > 0) {
          const highestPriorityRule = checkResult.matchedRules[0];

          const execution = await this.executeAutoApproval({
            requestId: request.id,
            ruleId: highestPriorityRule.id,
            ruleName: highestPriorityRule.ruleName,
            ruleType: highestPriorityRule.ruleType,
            reason: `バッチ処理による自動承認: ${highestPriorityRule.ruleName}`,
            systemUserId: 1 // システムユーザー
          });

          results.push({
            requestId: request.id,
            requestNumber: request.requestNumber,
            status: 'approved',
            ruleApplied: highestPriorityRule.ruleName
          });
        }
      } catch (error) {
        console.error(`申請${request.id}の自動承認処理エラー:`, error);
        results.push({
          requestId: request.id,
          requestNumber: request.requestNumber,
          status: 'error',
          error: error.message
        });
      }
    }

    return {
      totalProcessed: results.length,
      approvedCount: results.filter(r => r.status === 'approved').length,
      errorCount: results.filter(r => r.status === 'error').length,
      results
    };
  }
}
/**
 * Data Consistency Checker for Workflow Microservices
 * ワークフローマイクロサービス用データ整合性チェッカー
 */

import { prisma } from '@core/lib/prisma';

interface ConsistencyIssue {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  count: number;
  details?: any[];
  message: string;
}

export class DataConsistencyChecker {
  /**
   * 全体的なデータ整合性検証
   */
  async validateWorkflowData(): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // 各整合性チェックを並行実行
    const [
      orphanedRequests,
      inconsistentHistory,
      invalidStatuses,
      missingApprovers
    ] = await Promise.all([
      this.findOrphanedRequests(),
      this.validateApprovalHistory(),
      this.checkInvalidStatuses(),
      this.checkMissingApprovers()
    ]);

    if (orphanedRequests.length > 0) {
      issues.push({
        type: 'ORPHANED_REQUESTS',
        severity: 'HIGH',
        count: orphanedRequests.length,
        details: orphanedRequests,
        message: `${orphanedRequests.length}件の孤立したワークフロー申請が見つかりました`
      });
    }

    if (inconsistentHistory.length > 0) {
      issues.push({
        type: 'INCONSISTENT_HISTORY',
        severity: 'MEDIUM',
        count: inconsistentHistory.length,
        details: inconsistentHistory,
        message: `${inconsistentHistory.length}件の承認履歴の不整合が見つかりました`
      });
    }

    if (invalidStatuses.length > 0) {
      issues.push({
        type: 'INVALID_STATUSES',
        severity: 'HIGH',
        count: invalidStatuses.length,
        details: invalidStatuses,
        message: `${invalidStatuses.length}件の無効なステータスが見つかりました`
      });
    }

    if (missingApprovers.length > 0) {
      issues.push({
        type: 'MISSING_APPROVERS',
        severity: 'CRITICAL',
        count: missingApprovers.length,
        details: missingApprovers,
        message: `${missingApprovers.length}件の承認者不在が見つかりました`
      });
    }

    return issues;
  }

  /**
   * 孤立したワークフロー申請の検索
   * 対応する承認履歴が存在しない申請を特定
   */
  private async findOrphanedRequests(): Promise<any[]> {
    try {
      const orphanedRequests = await prisma.$queryRaw`
        SELECT wr.id, wr.title, wr.created_at
        FROM workflow_requests wr
        LEFT JOIN approval_history ah ON wr.id = ah.request_id
        WHERE ah.request_id IS NULL
        AND wr.created_at > NOW() - INTERVAL '30 days'
      `;

      return Array.isArray(orphanedRequests) ? orphanedRequests : [];
    } catch (error) {
      console.error('Error finding orphaned requests:', error);
      return [];
    }
  }

  /**
   * 承認履歴の整合性検証
   * ステータス遷移の妥当性をチェック
   */
  private async validateApprovalHistory(): Promise<any[]> {
    try {
      const inconsistentHistory = await prisma.$queryRaw`
        SELECT ah.id, ah.request_id, ah.status, ah.created_at
        FROM approval_history ah
        WHERE ah.status NOT IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')
        OR (ah.status = 'APPROVED' AND ah.approved_at IS NULL)
        OR (ah.status = 'REJECTED' AND ah.rejected_at IS NULL)
      `;

      return Array.isArray(inconsistentHistory) ? inconsistentHistory : [];
    } catch (error) {
      console.error('Error validating approval history:', error);
      return [];
    }
  }

  /**
   * 無効なステータスのチェック
   */
  private async checkInvalidStatuses(): Promise<any[]> {
    try {
      const validStatuses = ['DRAFT', 'PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED'];

      const invalidStatuses = await prisma.$queryRaw`
        SELECT id, title, status
        FROM workflow_requests
        WHERE status NOT IN (${validStatuses.map(s => `'${s}'`).join(', ')})
      `;

      return Array.isArray(invalidStatuses) ? invalidStatuses : [];
    } catch (error) {
      console.error('Error checking invalid statuses:', error);
      return [];
    }
  }

  /**
   * 承認者不在のチェック
   * 承認待ちだが承認者が割り当てられていない申請を特定
   */
  private async checkMissingApprovers(): Promise<any[]> {
    try {
      const missingApprovers = await prisma.$queryRaw`
        SELECT wr.id, wr.title, wr.status
        FROM workflow_requests wr
        LEFT JOIN approval_assignments aa ON wr.id = aa.request_id
        WHERE wr.status IN ('PENDING', 'IN_PROGRESS')
        AND aa.request_id IS NULL
      `;

      return Array.isArray(missingApprovers) ? missingApprovers : [];
    } catch (error) {
      console.error('Error checking missing approvers:', error);
      return [];
    }
  }

  /**
   * 整合性修復の実行
   */
  async repairConsistencyIssues(issues: ConsistencyIssue[]): Promise<void> {
    for (const issue of issues) {
      try {
        switch (issue.type) {
          case 'ORPHANED_REQUESTS':
            await this.repairOrphanedRequests(issue.details || []);
            break;
          case 'INCONSISTENT_HISTORY':
            await this.repairInconsistentHistory(issue.details || []);
            break;
          case 'INVALID_STATUSES':
            await this.repairInvalidStatuses(issue.details || []);
            break;
          case 'MISSING_APPROVERS':
            await this.repairMissingApprovers(issue.details || []);
            break;
          default:
            console.warn(`Unknown issue type: ${issue.type}`);
        }
      } catch (error) {
        console.error(`Failed to repair issue ${issue.type}:`, error);
      }
    }
  }

  /**
   * 孤立した申請の修復
   */
  private async repairOrphanedRequests(requests: any[]): Promise<void> {
    for (const request of requests) {
      await prisma.approval_history.create({
        data: {
          request_id: request.id,
          status: 'PENDING',
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      console.log(`Repaired orphaned request: ${request.id}`);
    }
  }

  /**
   * 不整合な承認履歴の修復
   */
  private async repairInconsistentHistory(histories: any[]): Promise<void> {
    for (const history of histories) {
      const updateData: any = { updated_at: new Date() };

      if (history.status === 'APPROVED' && !history.approved_at) {
        updateData.approved_at = new Date();
      }
      if (history.status === 'REJECTED' && !history.rejected_at) {
        updateData.rejected_at = new Date();
      }

      await prisma.approval_history.update({
        where: { id: history.id },
        data: updateData
      });
      console.log(`Repaired inconsistent history: ${history.id}`);
    }
  }

  /**
   * 無効なステータスの修復
   */
  private async repairInvalidStatuses(requests: any[]): Promise<void> {
    for (const request of requests) {
      await prisma.workflow_requests.update({
        where: { id: request.id },
        data: {
          status: 'PENDING', // デフォルトステータスに修復
          updated_at: new Date()
        }
      });
      console.log(`Repaired invalid status for request: ${request.id}`);
    }
  }

  /**
   * 承認者不在の修復
   */
  private async repairMissingApprovers(requests: any[]): Promise<void> {
    for (const request of requests) {
      // デフォルト承認者（管理者）を割り当て
      const defaultApprover = await prisma.users.findFirst({
        where: { role: 'ADMIN', is_active: true }
      });

      if (defaultApprover) {
        await prisma.approval_assignments.create({
          data: {
            request_id: request.id,
            approver_id: defaultApprover.id,
            assigned_at: new Date(),
            is_active: true
          }
        });
        console.log(`Assigned default approver to request: ${request.id}`);
      }
    }
  }

  /**
   * 定期的な整合性チェックの実行
   */
  async runPeriodicCheck(): Promise<ConsistencyIssue[]> {
    console.log('Starting periodic data consistency check...');

    const issues = await this.validateWorkflowData();

    if (issues.length > 0) {
      console.warn(`Found ${issues.length} consistency issues`);

      // 重大度HIGH以上の問題は自動修復
      const criticalIssues = issues.filter(issue =>
        issue.severity === 'HIGH' || issue.severity === 'CRITICAL'
      );

      if (criticalIssues.length > 0) {
        console.log('Auto-repairing critical issues...');
        await this.repairConsistencyIssues(criticalIssues);
      }
    } else {
      console.log('No consistency issues found');
    }

    return issues;
  }
}
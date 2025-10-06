/**
 * Saga Pattern Implementation for Distributed Transactions
 * 分散トランザクション管理のためのSagaパターン実装
 */

export interface SagaStep {
  execute: () => Promise<any>;
  compensate: () => Promise<void>;
}

export class Saga {
  private steps: SagaStep[] = [];
  private completedSteps: SagaStep[] = [];

  /**
   * Sagaにステップを追加
   * @param execute 実行関数
   * @param compensate 補償関数（ロールバック用）
   */
  addStep(execute: () => Promise<any>, compensate: () => Promise<void>): this {
    this.steps.push({ execute, compensate });
    return this;
  }

  /**
   * 非同期で単一ステップを実行し、Sagaに追加
   * @param execute 実行関数
   * @param compensate 補償関数
   */
  async execute(execute: () => Promise<any>, compensate: () => Promise<void>): Promise<any> {
    const step = { execute, compensate };

    try {
      const result = await execute();
      this.completedSteps.push(step);
      return result;
    } catch (error) {
      // エラー発生時は即座に補償実行
      await this.compensate();
      throw error;
    }
  }

  /**
   * 全ステップを順次実行
   */
  async run(): Promise<any[]> {
    const results: any[] = [];

    try {
      for (const step of this.steps) {
        const result = await step.execute();
        this.completedSteps.push(step);
        results.push(result);
      }
      return results;
    } catch (error) {
      await this.compensate();
      throw error;
    }
  }

  /**
   * 補償処理（ロールバック）実行
   * 完了したステップを逆順で補償
   */
  async compensate(): Promise<void> {
    const compensationPromises = this.completedSteps
      .reverse()
      .map(step => step.compensate());

    await Promise.allSettled(compensationPromises);
    this.completedSteps = [];
  }
}

/**
 * ワークフロー専用Sagaオーケストレーター
 */
export class WorkflowSagaOrchestrator {
  /**
   * ワークフロー申請作成の分散トランザクション
   */
  async createWorkflowRequest(data: any): Promise<any> {
    const saga = new Saga();

    try {
      // Step 1: ワークフロー申請作成
      const request = await saga.execute(
        async () => {
          // workflow-requests サービスに委譲
          return { id: Date.now(), ...data };
        },
        async () => {
          // ロールバック: 申請削除
          console.log('Compensating: workflow request creation');
        }
      );

      // Step 2: 承認履歴初期化
      const history = await saga.execute(
        async () => {
          // approval-history サービスに委譲
          return { requestId: request.id, status: 'PENDING' };
        },
        async () => {
          // ロールバック: 承認履歴削除
          console.log('Compensating: approval history creation');
        }
      );

      // Step 3: 通知送信
      await saga.execute(
        async () => {
          // notification サービスに委譲
          console.log(`Notification sent for request ${request.id}`);
          return true;
        },
        async () => {
          // ロールバック: 通知取消（可能であれば）
          console.log('Compensating: notification sending');
        }
      );

      return request;
    } catch (error) {
      console.error('Workflow creation failed:', error);
      throw error;
    }
  }
}
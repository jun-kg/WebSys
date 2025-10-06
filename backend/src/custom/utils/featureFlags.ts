/**
 * Feature Flags for Gradual Migration
 * 段階的移行のためのフィーチャーフラグ管理
 */

interface FeatureFlags {
  useNewWorkflowTypes: boolean;      // Phase 1
  useNewWorkflowRequests: boolean;   // Phase 2
  useNewWorkflowDashboard: boolean;  // Phase 2
  useNewEmergencyApproval: boolean;  // Phase 3
  useNewDelegationApproval: boolean; // Phase 3
  useNewProxyApproval: boolean;      // Phase 3
  useNewParallelApproval: boolean;   // Phase 4
  useNewSequentialApproval: boolean; // Phase 4
  useNewAutoApproval: boolean;       // Phase 4
  fullyMigrated: boolean;            // Phase 5
}

export class WorkflowFeatureFlags {
  private flags: FeatureFlags = {
    useNewWorkflowTypes: false,
    useNewWorkflowRequests: false,
    useNewWorkflowDashboard: false,
    useNewEmergencyApproval: false,
    useNewDelegationApproval: false,
    useNewProxyApproval: false,
    useNewParallelApproval: false,
    useNewSequentialApproval: false,
    useNewAutoApproval: false,
    fullyMigrated: false
  };

  /**
   * フラグの状態を取得
   */
  getFlags(): FeatureFlags {
    return { ...this.flags };
  }

  /**
   * 特定のフラグを有効化
   */
  enableFlag(flagName: keyof FeatureFlags): void {
    this.flags[flagName] = true;
    console.log(`Feature flag enabled: ${flagName}`);
  }

  /**
   * 特定のフラグを無効化
   */
  disableFlag(flagName: keyof FeatureFlags): void {
    this.flags[flagName] = false;
    console.log(`Feature flag disabled: ${flagName}`);
  }

  /**
   * Phase別フラグ一括設定
   */
  enablePhase(phase: number): void {
    switch (phase) {
      case 1:
        this.enableFlag('useNewWorkflowTypes');
        break;
      case 2:
        this.enableFlag('useNewWorkflowTypes');
        this.enableFlag('useNewWorkflowRequests');
        this.enableFlag('useNewWorkflowDashboard');
        break;
      case 3:
        this.enableFlag('useNewWorkflowTypes');
        this.enableFlag('useNewWorkflowRequests');
        this.enableFlag('useNewWorkflowDashboard');
        this.enableFlag('useNewEmergencyApproval');
        this.enableFlag('useNewDelegationApproval');
        this.enableFlag('useNewProxyApproval');
        break;
      case 4:
        this.enableFlag('useNewWorkflowTypes');
        this.enableFlag('useNewWorkflowRequests');
        this.enableFlag('useNewWorkflowDashboard');
        this.enableFlag('useNewEmergencyApproval');
        this.enableFlag('useNewDelegationApproval');
        this.enableFlag('useNewProxyApproval');
        this.enableFlag('useNewParallelApproval');
        this.enableFlag('useNewSequentialApproval');
        this.enableFlag('useNewAutoApproval');
        break;
      case 5:
        // 全フラグ有効化
        Object.keys(this.flags).forEach(flag => {
          this.enableFlag(flag as keyof FeatureFlags);
        });
        break;
      default:
        console.warn(`Unknown phase: ${phase}`);
    }
  }

  /**
   * ワークフロータイプ処理の振り分け
   */
  shouldUseNewWorkflowTypes(): boolean {
    return this.flags.useNewWorkflowTypes || this.flags.fullyMigrated;
  }

  /**
   * ワークフロー申請処理の振り分け
   */
  shouldUseNewWorkflowRequests(): boolean {
    return this.flags.useNewWorkflowRequests || this.flags.fullyMigrated;
  }

  /**
   * ダッシュボード処理の振り分け
   */
  shouldUseNewWorkflowDashboard(): boolean {
    return this.flags.useNewWorkflowDashboard || this.flags.fullyMigrated;
  }

  /**
   * 緊急承認処理の振り分け
   */
  shouldUseNewEmergencyApproval(): boolean {
    return this.flags.useNewEmergencyApproval || this.flags.fullyMigrated;
  }

  /**
   * 承認委任処理の振り分け
   */
  shouldUseNewDelegationApproval(): boolean {
    return this.flags.useNewDelegationApproval || this.flags.fullyMigrated;
  }

  /**
   * 承認代理処理の振り分け
   */
  shouldUseNewProxyApproval(): boolean {
    return this.flags.useNewProxyApproval || this.flags.fullyMigrated;
  }

  /**
   * 並列承認処理の振り分け
   */
  shouldUseNewParallelApproval(): boolean {
    return this.flags.useNewParallelApproval || this.flags.fullyMigrated;
  }

  /**
   * 直列承認処理の振り分け
   */
  shouldUseNewSequentialApproval(): boolean {
    return this.flags.useNewSequentialApproval || this.flags.fullyMigrated;
  }

  /**
   * 自動承認処理の振り分け
   */
  shouldUseNewAutoApproval(): boolean {
    return this.flags.useNewAutoApproval || this.flags.fullyMigrated;
  }

  /**
   * 完全移行状態かチェック
   */
  isFullyMigrated(): boolean {
    return this.flags.fullyMigrated;
  }

  /**
   * 移行進捗の取得
   */
  getMigrationProgress(): { completed: number; total: number; percentage: number } {
    const totalFlags = Object.keys(this.flags).length - 1; // fullyMigratedは除く
    const enabledFlags = Object.entries(this.flags)
      .filter(([key, value]) => key !== 'fullyMigrated' && value)
      .length;

    return {
      completed: enabledFlags,
      total: totalFlags,
      percentage: Math.round((enabledFlags / totalFlags) * 100)
    };
  }

  /**
   * 環境変数からフラグを読み込み
   */
  loadFromEnvironment(): void {
    const envFlags = {
      useNewWorkflowTypes: process.env.FF_NEW_WORKFLOW_TYPES === 'true',
      useNewWorkflowRequests: process.env.FF_NEW_WORKFLOW_REQUESTS === 'true',
      useNewWorkflowDashboard: process.env.FF_NEW_WORKFLOW_DASHBOARD === 'true',
      useNewEmergencyApproval: process.env.FF_NEW_EMERGENCY_APPROVAL === 'true',
      useNewDelegationApproval: process.env.FF_NEW_DELEGATION_APPROVAL === 'true',
      useNewProxyApproval: process.env.FF_NEW_PROXY_APPROVAL === 'true',
      useNewParallelApproval: process.env.FF_NEW_PARALLEL_APPROVAL === 'true',
      useNewSequentialApproval: process.env.FF_NEW_SEQUENTIAL_APPROVAL === 'true',
      useNewAutoApproval: process.env.FF_NEW_AUTO_APPROVAL === 'true',
      fullyMigrated: process.env.FF_FULLY_MIGRATED === 'true'
    };

    this.flags = { ...this.flags, ...envFlags };
    console.log('Feature flags loaded from environment:', this.flags);
  }

  /**
   * フラグの状態をログ出力
   */
  logStatus(): void {
    const progress = this.getMigrationProgress();
    console.log('=== Feature Flags Status ===');
    console.log(`Migration Progress: ${progress.completed}/${progress.total} (${progress.percentage}%)`);
    console.log('Enabled Features:');

    Object.entries(this.flags)
      .filter(([_, enabled]) => enabled)
      .forEach(([flagName, _]) => {
        console.log(`  ✅ ${flagName}`);
      });

    console.log('Disabled Features:');
    Object.entries(this.flags)
      .filter(([_, enabled]) => !enabled)
      .forEach(([flagName, _]) => {
        console.log(`  ❌ ${flagName}`);
      });
  }
}

// シングルトンインスタンス
export const featureFlags = new WorkflowFeatureFlags();

// 起動時に環境変数から読み込み
featureFlags.loadFromEnvironment();
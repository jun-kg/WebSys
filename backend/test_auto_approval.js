// 自動承認ルール機能テスト用スクリプト
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testAutoApprovalRules() {
  try {
    console.log('=== 自動承認ルール機能テスト開始 ===');

    // 1. 管理者ログイン用のJWTトークン取得
    const loginResponse = await fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });

    if (!loginResponse.ok) {
      throw new Error('ログインに失敗しました');
    }

    const loginData = await loginResponse.json();
    const token = loginData.data.token;
    console.log('✅ ログイン成功');

    // 2. ワークフロータイプを取得（既存のものを使用）
    const workflowTypesResponse = await fetch('http://localhost:8000/api/workflow/types', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!workflowTypesResponse.ok) {
      throw new Error('ワークフロータイプの取得に失敗しました');
    }

    const workflowTypesData = await workflowTypesResponse.json();
    console.log('ワークフロータイプレスポンス:', workflowTypesData);

    // データ構造を確認してworkflowTypeIdを取得
    let workflowTypeId = 1; // デフォルト値
    if (workflowTypesData.success && workflowTypesData.data && workflowTypesData.data.data && workflowTypesData.data.data.length > 0) {
      workflowTypeId = workflowTypesData.data.data[0].id;
    }
    console.log('✅ ワークフロータイプ取得完了:', workflowTypeId);

    // 3. 自動承認ルールの作成
    const autoApprovalRule = {
      workflowTypeId: workflowTypeId,
      // stepNumber: null, // nullはバリデーションエラーになるため省略
      ruleType: 'AMOUNT_BASED',
      ruleName: 'テスト用金額ベース自動承認',
      description: '1万円以下の申請は自動承認',
      conditions: { amount_less_than: 10000 },
      maxAmount: 10000,
      priority: 10
    };

    console.log('自動承認ルール作成を試行...');
    const createRuleResponse = await fetch('http://localhost:8000/api/workflow/auto-approval-rules', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(autoApprovalRule)
    });

    if (!createRuleResponse.ok) {
      const errorText = await createRuleResponse.text();
      console.error('ルール作成レスポンス:', errorText);
      throw new Error(`自動承認ルールの作成に失敗: ${createRuleResponse.status}`);
    }

    const createRuleData = await createRuleResponse.json();
    console.log('✅ 自動承認ルール作成成功:', createRuleData);

    // 4. 作成されたルールの一覧取得
    console.log('自動承認ルール一覧取得を試行...');
    const listRulesResponse = await fetch('http://localhost:8000/api/workflow/auto-approval-rules', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!listRulesResponse.ok) {
      const errorText = await listRulesResponse.text();
      console.error('一覧取得レスポンス:', errorText);
      throw new Error(`自動承認ルール一覧の取得に失敗: ${listRulesResponse.status}`);
    }

    const listRulesData = await listRulesResponse.json();
    console.log('✅ 自動承認ルール一覧取得成功:', listRulesData);

    // 5. 統計情報の取得
    console.log('自動承認統計取得を試行...');
    const statsResponse = await fetch('http://localhost:8000/api/workflow/auto-approval/statistics', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!statsResponse.ok) {
      const errorText = await statsResponse.text();
      console.error('統計取得レスポンス:', errorText);
      throw new Error(`自動承認統計の取得に失敗: ${statsResponse.status}`);
    }

    const statsData = await statsResponse.json();
    console.log('✅ 自動承認統計取得成功:', statsData);

    console.log('=== 自動承認ルール機能テスト完了 ===');

  } catch (error) {
    console.error('❌ テストエラー:', error.message);
    console.error('スタックトレース:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testAutoApprovalRules();
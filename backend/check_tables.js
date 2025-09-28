// テーブル存在確認スクリプト
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkTables() {
  try {
    console.log('=== データベーステーブル存在確認 ===');

    // 1. auto_approval_rules テーブルのcount確認
    try {
      const autoRulesCount = await prisma.auto_approval_rules.count();
      console.log('✅ auto_approval_rules テーブル存在:', autoRulesCount, '件');
    } catch (error) {
      console.log('❌ auto_approval_rules テーブル不存在:', error.message);
    }

    // 2. auto_approval_logs テーブルのcount確認
    try {
      const autoLogsCount = await prisma.auto_approval_logs.count();
      console.log('✅ auto_approval_logs テーブル存在:', autoLogsCount, '件');
    } catch (error) {
      console.log('❌ auto_approval_logs テーブル不存在:', error.message);
    }

    // 3. 他の既存テーブルの確認
    try {
      const workflowTypesCount = await prisma.workflow_types.count();
      console.log('✅ workflow_types テーブル存在:', workflowTypesCount, '件');
    } catch (error) {
      console.log('❌ workflow_types テーブル不存在:', error.message);
    }

    // 4. 直接SQL実行でテーブル一覧取得
    try {
      const tables = await prisma.$queryRaw`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name LIKE '%approval%'
        ORDER BY table_name;
      `;
      console.log('📋 approval関連テーブル一覧:', tables);
    } catch (error) {
      console.log('❌ テーブル一覧取得エラー:', error.message);
    }

  } catch (error) {
    console.error('❌ 確認エラー:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
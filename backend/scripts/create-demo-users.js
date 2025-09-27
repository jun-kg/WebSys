#!/usr/bin/env node

/**
 * デモユーザー自動作成スクリプト
 *
 * 使用方法:
 *   node scripts/create-demo-users.js
 *
 * 作成されるユーザー:
 *   - demo_admin (ADMIN) - パスワード: demo123
 *   - demo_manager (MANAGER) - パスワード: demo123
 *   - demo_user (USER) - パスワード: demo123
 *   - demo_guest (GUEST) - パスワード: demo123
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'demo123';

const demoUsers = [
  {
    username: 'demo_admin',
    email: 'admin@demo.com',
    name: 'デモ管理者',
    role: 'ADMIN',
    companyId: 1,
    primaryDepartmentId: 1,
    employeeCode: 'DEMO001'
  },
  {
    username: 'demo_manager',
    email: 'manager@demo.com',
    name: 'デモマネージャー',
    role: 'MANAGER',
    companyId: 1,
    primaryDepartmentId: 2,
    employeeCode: 'DEMO002'
  },
  {
    username: 'demo_user',
    email: 'user@demo.com',
    name: 'デモユーザー',
    role: 'USER',
    companyId: 1,
    primaryDepartmentId: 2,
    employeeCode: 'DEMO003'
  },
  {
    username: 'demo_guest',
    email: 'guest@demo.com',
    name: 'デモゲスト',
    role: 'GUEST',
    companyId: 1,
    primaryDepartmentId: null,
    employeeCode: 'DEMO004'
  }
];

async function createDemoUsers() {
  console.log('🚀 デモユーザー作成を開始します...');

  try {
    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);

    let created = 0;
    let skipped = 0;

    for (const userData of demoUsers) {
      try {
        // 既存ユーザーをチェック
        const existingUser = await prisma.users.findFirst({
          where: {
            OR: [
              { username: userData.username },
              { email: userData.email }
            ]
          }
        });

        if (existingUser) {
          console.log(`⏭️  スキップ: ${userData.username} (既に存在)`);
          skipped++;
          continue;
        }

        // ユーザー作成
        const user = await prisma.users.create({
          data: {
            ...userData,
            password: hashedPassword,
            isFirstLogin: false, // デモユーザーは初回ログインフラグをfalse
            isActive: true,
            updatedAt: new Date()
          }
        });

        console.log(`✅ 作成: ${user.username} (${user.role}) - パスワード: ${DEMO_PASSWORD}`);
        created++;

      } catch (error) {
        console.error(`❌ 作成失敗: ${userData.username} - ${error.message}`);
      }
    }

    console.log('\\n📊 作成結果:');
    console.log(`  - 作成: ${created}名`);
    console.log(`  - スキップ: ${skipped}名`);
    console.log(`  - 合計: ${created + skipped}名`);

    if (created > 0) {
      console.log('\\n🔑 ログイン情報:');
      console.log('  パスワード: demo123 (全ユーザー共通)');
      console.log('  例: demo_admin / demo123');
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('🔧 デモユーザー自動作成スクリプト');
  console.log('=====================================');

  // 会社・部署の存在確認
  try {
    const company = await prisma.companies.findUnique({ where: { id: 1 } });
    if (!company) {
      console.error('❌ 会社ID:1 が見つかりません。先に会社データを作成してください。');
      process.exit(1);
    }

    const department = await prisma.departments.findUnique({ where: { id: 1 } });
    if (!department) {
      console.error('❌ 部署ID:1 が見つかりません。先に部署データを作成してください。');
      process.exit(1);
    }

    console.log(`✅ 会社: ${company.name}`);
    console.log(`✅ 部署確認完了\\n`);

  } catch (error) {
    console.error('❌ 事前確認でエラーが発生しました:', error);
    process.exit(1);
  }

  await createDemoUsers();

  console.log('\\n🎉 デモユーザー作成処理が完了しました！');
}

// ES Moduleとして実行
main().catch((error) => {
  console.error('❌ 致命的エラー:', error);
  process.exit(1);
});

export { createDemoUsers };
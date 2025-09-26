#!/usr/bin/env node

/**
 * データ整合性チェックスクリプト
 *
 * 目的: データベースの整合性と参照関係を確認
 * 使用方法: docker exec websys_backend_dev node scripts/data-integrity-check.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDataIntegrity() {
  console.log('🔍 データ整合性チェック開始...');
  console.log('='.repeat(60));

  let allChecksPass = true;
  const results = [];

  try {
    // 1. 基本データ存在確認
    console.log('\n📊 1. 基本データ存在確認');
    const basicDataCheck = await checkBasicDataExists();
    results.push(basicDataCheck);
    allChecksPass = allChecksPass && basicDataCheck.pass;

    // 2. 外部キー整合性確認
    console.log('\n🔗 2. 外部キー整合性確認');
    const foreignKeyCheck = await checkForeignKeyIntegrity();
    results.push(foreignKeyCheck);
    allChecksPass = allChecksPass && foreignKeyCheck.pass;

    // 3. 一意制約確認
    console.log('\n🎯 3. 一意制約確認');
    const uniqueConstraintCheck = await checkUniqueConstraints();
    results.push(uniqueConstraintCheck);
    allChecksPass = allChecksPass && uniqueConstraintCheck.pass;

    // 4. 必須フィールド確認
    console.log('\n📝 4. 必須フィールド確認');
    const requiredFieldCheck = await checkRequiredFields();
    results.push(requiredFieldCheck);
    allChecksPass = allChecksPass && requiredFieldCheck.pass;

    // 5. ビジネスロジック整合性確認
    console.log('\n💼 5. ビジネスロジック整合性確認');
    const businessLogicCheck = await checkBusinessLogicIntegrity();
    results.push(businessLogicCheck);
    allChecksPass = allChecksPass && businessLogicCheck.pass;

    // 6. 総合結果表示
    console.log('\n' + '='.repeat(60));
    displayIntegrityResults(results, allChecksPass);

    return { success: allChecksPass, results };

  } catch (error) {
    console.error('❌ 整合性チェック中にエラーが発生しました:', error.message);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

async function checkBasicDataExists() {
  const checks = [];

  // 重要テーブルの存在とデータ確認
  const tables = [
    { name: 'companies', model: prisma.companies },
    { name: 'users', model: prisma.users },
    { name: 'features', model: prisma.features },
    { name: 'departments', model: prisma.departments },
    { name: 'logs', model: prisma.logs }
  ];

  for (const table of tables) {
    try {
      const count = await table.model.count();
      const hasData = count > 0;

      checks.push({
        name: `${table.name}テーブル`,
        expected: 'データ存在',
        actual: hasData ? `${count}件` : '0件',
        pass: hasData || table.name === 'logs' // logsは空でも可
      });

      if (hasData || table.name === 'logs') {
        console.log(`  ✅ ${table.name}: ${count}件`);
      } else {
        console.log(`  ❌ ${table.name}: データが存在しません`);
      }
    } catch (error) {
      checks.push({
        name: `${table.name}テーブル`,
        expected: '正常アクセス',
        actual: `エラー: ${error.message}`,
        pass: false
      });
      console.log(`  ❌ ${table.name}: アクセスエラー - ${error.message}`);
    }
  }

  const allPass = checks.every(check => check.pass);
  return { category: '基本データ存在', pass: allPass, checks };
}

async function checkForeignKeyIntegrity() {
  const checks = [];

  // ユーザーと企業の関連確認
  try {
    const usersWithoutCompany = await prisma.users.findMany({
      where: {
        companyId: { not: null },
        companies: null
      }
    });

    const userCompanyCheck = usersWithoutCompany.length === 0;
    checks.push({
      name: 'ユーザー→企業参照',
      expected: '全ユーザーが有効な企業を参照',
      actual: userCompanyCheck ? '正常' : `${usersWithoutCompany.length}件の無効参照`,
      pass: userCompanyCheck
    });

    if (userCompanyCheck) {
      console.log('  ✅ ユーザー→企業参照: 正常');
    } else {
      console.log(`  ❌ ユーザー→企業参照: ${usersWithoutCompany.length}件の無効参照`);
    }
  } catch (error) {
    checks.push({
      name: 'ユーザー→企業参照',
      expected: '正常確認',
      actual: `エラー: ${error.message}`,
      pass: false
    });
  }

  // ユーザー部署と部署の関連確認
  try {
    const userDeptCount = await prisma.user_departments.count();
    const validUserDeptCount = await prisma.user_departments.count({
      where: {
        users: { isActive: true },
        departments: { isActive: true }
      }
    });

    const userDeptCheck = userDeptCount === validUserDeptCount;
    checks.push({
      name: 'ユーザー部署→部署参照',
      expected: '全関連が有効',
      actual: userDeptCheck ? '正常' : `${userDeptCount - validUserDeptCount}件の無効関連`,
      pass: userDeptCheck
    });

    if (userDeptCheck) {
      console.log('  ✅ ユーザー部署→部署参照: 正常');
    } else {
      console.log(`  ❌ ユーザー部署→部署参照: ${userDeptCount - validUserDeptCount}件の無効関連`);
    }
  } catch (error) {
    checks.push({
      name: 'ユーザー部署→部署参照',
      expected: '正常確認',
      actual: `エラー: ${error.message}`,
      pass: false
    });
  }

  const allPass = checks.every(check => check.pass);
  return { category: '外部キー整合性', pass: allPass, checks };
}

async function checkUniqueConstraints() {
  const checks = [];

  // 企業コードの一意性
  try {
    const companies = await prisma.companies.findMany({ select: { code: true } });
    const codes = companies.map(c => c.code);
    const uniqueCodes = [...new Set(codes)];
    const codeUniqueCheck = codes.length === uniqueCodes.length;

    checks.push({
      name: '企業コード一意性',
      expected: '重複なし',
      actual: codeUniqueCheck ? '重複なし' : `${codes.length - uniqueCodes.length}件の重複`,
      pass: codeUniqueCheck
    });

    if (codeUniqueCheck) {
      console.log('  ✅ 企業コード一意性: 重複なし');
    } else {
      console.log(`  ❌ 企業コード一意性: ${codes.length - uniqueCodes.length}件の重複`);
    }
  } catch (error) {
    checks.push({
      name: '企業コード一意性',
      expected: '正常確認',
      actual: `エラー: ${error.message}`,
      pass: false
    });
  }

  // ユーザー名の一意性
  try {
    const users = await prisma.users.findMany({ select: { username: true, email: true } });
    const usernames = users.map(u => u.username);
    const uniqueUsernames = [...new Set(usernames)];
    const usernameUniqueCheck = usernames.length === uniqueUsernames.length;

    const emails = users.map(u => u.email);
    const uniqueEmails = [...new Set(emails)];
    const emailUniqueCheck = emails.length === uniqueEmails.length;

    checks.push({
      name: 'ユーザー名一意性',
      expected: '重複なし',
      actual: usernameUniqueCheck ? '重複なし' : `${usernames.length - uniqueUsernames.length}件の重複`,
      pass: usernameUniqueCheck
    });

    checks.push({
      name: 'メールアドレス一意性',
      expected: '重複なし',
      actual: emailUniqueCheck ? '重複なし' : `${emails.length - uniqueEmails.length}件の重複`,
      pass: emailUniqueCheck
    });

    if (usernameUniqueCheck) {
      console.log('  ✅ ユーザー名一意性: 重複なし');
    } else {
      console.log(`  ❌ ユーザー名一意性: ${usernames.length - uniqueUsernames.length}件の重複`);
    }

    if (emailUniqueCheck) {
      console.log('  ✅ メールアドレス一意性: 重複なし');
    } else {
      console.log(`  ❌ メールアドレス一意性: ${emails.length - uniqueEmails.length}件の重複`);
    }
  } catch (error) {
    checks.push({
      name: 'ユーザー一意性',
      expected: '正常確認',
      actual: `エラー: ${error.message}`,
      pass: false
    });
  }

  const allPass = checks.every(check => check.pass);
  return { category: '一意制約', pass: allPass, checks };
}

async function checkRequiredFields() {
  const checks = [];

  // ユーザーの必須フィールド確認
  try {
    const usersWithMissingFields = await prisma.users.findMany({
      where: {
        OR: [
          { username: null },
          { username: '' },
          { email: null },
          { email: '' },
          { name: null },
          { name: '' },
          { password: null },
          { password: '' }
        ]
      }
    });

    const userFieldCheck = usersWithMissingFields.length === 0;
    checks.push({
      name: 'ユーザー必須フィールド',
      expected: '全フィールド入力済み',
      actual: userFieldCheck ? '正常' : `${usersWithMissingFields.length}件の不備`,
      pass: userFieldCheck
    });

    if (userFieldCheck) {
      console.log('  ✅ ユーザー必須フィールド: 正常');
    } else {
      console.log(`  ❌ ユーザー必須フィールド: ${usersWithMissingFields.length}件の不備`);
    }
  } catch (error) {
    checks.push({
      name: 'ユーザー必須フィールド',
      expected: '正常確認',
      actual: `エラー: ${error.message}`,
      pass: false
    });
  }

  // 企業の必須フィールド確認
  try {
    const companiesWithMissingFields = await prisma.companies.findMany({
      where: {
        OR: [
          { code: null },
          { code: '' },
          { name: null },
          { name: '' }
        ]
      }
    });

    const companyFieldCheck = companiesWithMissingFields.length === 0;
    checks.push({
      name: '企業必須フィールド',
      expected: '全フィールド入力済み',
      actual: companyFieldCheck ? '正常' : `${companiesWithMissingFields.length}件の不備`,
      pass: companyFieldCheck
    });

    if (companyFieldCheck) {
      console.log('  ✅ 企業必須フィールド: 正常');
    } else {
      console.log(`  ❌ 企業必須フィールド: ${companiesWithMissingFields.length}件の不備`);
    }
  } catch (error) {
    checks.push({
      name: '企業必須フィールド',
      expected: '正常確認',
      actual: `エラー: ${error.message}`,
      pass: false
    });
  }

  const allPass = checks.every(check => check.pass);
  return { category: '必須フィールド', pass: allPass, checks };
}

async function checkBusinessLogicIntegrity() {
  const checks = [];

  // アクティブユーザーの企業がアクティブか確認
  try {
    const activeUsersInInactiveCompanies = await prisma.users.findMany({
      where: {
        isActive: true,
        companies: {
          isActive: false
        }
      }
    });

    const activeUserCheck = activeUsersInInactiveCompanies.length === 0;
    checks.push({
      name: 'アクティブユーザー→アクティブ企業',
      expected: '整合性あり',
      actual: activeUserCheck ? '正常' : `${activeUsersInInactiveCompanies.length}件の不整合`,
      pass: activeUserCheck
    });

    if (activeUserCheck) {
      console.log('  ✅ アクティブユーザー→アクティブ企業: 正常');
    } else {
      console.log(`  ❌ アクティブユーザー→アクティブ企業: ${activeUsersInInactiveCompanies.length}件の不整合`);
    }
  } catch (error) {
    checks.push({
      name: 'アクティブユーザー→アクティブ企業',
      expected: '正常確認',
      actual: `エラー: ${error.message}`,
      pass: false
    });
  }

  // 管理者権限の存在確認
  try {
    const adminUsers = await prisma.users.findMany({
      where: {
        role: 'ADMIN',
        isActive: true
      }
    });

    const adminExistsCheck = adminUsers.length > 0;
    checks.push({
      name: '管理者ユーザー存在',
      expected: '最低1名の管理者',
      actual: adminExistsCheck ? `${adminUsers.length}名の管理者` : '管理者不在',
      pass: adminExistsCheck
    });

    if (adminExistsCheck) {
      console.log(`  ✅ 管理者ユーザー存在: ${adminUsers.length}名の管理者`);
    } else {
      console.log('  ❌ 管理者ユーザー存在: 管理者が存在しません');
    }
  } catch (error) {
    checks.push({
      name: '管理者ユーザー存在',
      expected: '正常確認',
      actual: `エラー: ${error.message}`,
      pass: false
    });
  }

  const allPass = checks.every(check => check.pass);
  return { category: 'ビジネスロジック整合性', pass: allPass, checks };
}

function displayIntegrityResults(results, allChecksPass) {
  console.log('\n📊 データ整合性チェック結果サマリー');
  console.log('-'.repeat(40));

  results.forEach(result => {
    const status = result.pass ? '✅' : '❌';
    const failedCount = result.checks.filter(c => !c.pass).length;
    console.log(`${status} ${result.category}: ${result.pass ? '正常' : `${failedCount}件の問題`}`);
  });

  console.log('\n' + '='.repeat(60));
  if (allChecksPass) {
    console.log('🎉 データ整合性チェック完了: すべての整合性が確認されました!');
    console.log('✅ データベースは一貫性のある状態です。');
  } else {
    console.log('⚠️ データ整合性チェック完了: 問題が検出されました。');
    console.log('🔧 上記の問題を修正してデータの整合性を保ってください。');
  }
}

// メイン実行
if (require.main === module) {
  checkDataIntegrity()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('予期しないエラー:', error);
      process.exit(1);
    });
}

module.exports = { checkDataIntegrity };
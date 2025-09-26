#!/usr/bin/env node

/**
 * 初期データ登録確認スクリプト
 *
 * 目的: 初期データが変更された際の登録確認を自動化
 * 使用方法: npm run verify-data または docker exec websys_backend_dev node scripts/verify-initial-data.js
 */

const { PrismaClient } = require('@prisma/client');

// 期待される初期データ設定
const EXPECTED_DATA = {
  companies: {
    count: 1,
    required: [
      {
        code: 'SAMPLE001',
        name: 'サンプル株式会社',
        industry: 'IT・ソフトウェア',
        contractPlan: 'STANDARD',
        isActive: true
      }
    ]
  },
  users: {
    count: 2,
    required: [
      {
        username: 'admin',
        email: 'admin@sample.co.jp',
        role: 'ADMIN',
        isActive: true
      },
      {
        username: 'user01',
        email: 'user01@sample.co.jp',
        role: 'USER',
        isActive: true
      }
    ]
  },
  features: {
    count: 5,
    required: [
      'USER_MANAGEMENT',
      'FEATURE_MANAGEMENT',
      'LOG_MONITORING',
      'PERMISSION_MANAGEMENT',
      'DASHBOARD'
    ]
  }
};

const prisma = new PrismaClient();

async function verifyInitialData() {
  console.log('🔍 初期データ登録確認開始...');
  console.log('='.repeat(50));

  let allChecksPass = true;
  const results = [];

  try {
    // 1. 企業データ確認
    console.log('\n📋 1. 企業データ確認');
    const companies = await prisma.companies.findMany();
    const companyCheck = verifyCompanies(companies);
    results.push(companyCheck);
    allChecksPass = allChecksPass && companyCheck.pass;

    // 2. ユーザーデータ確認
    console.log('\n👥 2. ユーザーデータ確認');
    const users = await prisma.users.findMany({
      include: { companies: true }
    });
    const userCheck = verifyUsers(users);
    results.push(userCheck);
    allChecksPass = allChecksPass && userCheck.pass;

    // 3. 機能データ確認
    console.log('\n⚙️ 3. 機能データ確認');
    const features = await prisma.features.findMany();
    const featureCheck = verifyFeatures(features);
    results.push(featureCheck);
    allChecksPass = allChecksPass && featureCheck.pass;

    // 4. データ関連性確認
    console.log('\n🔗 4. データ関連性確認');
    const relationCheck = await verifyDataRelations(users, companies);
    results.push(relationCheck);
    allChecksPass = allChecksPass && relationCheck.pass;

    // 5. 総合結果表示
    console.log('\n' + '='.repeat(50));
    displaySummary(results, allChecksPass);

    return { success: allChecksPass, results };

  } catch (error) {
    console.error('❌ 確認中にエラーが発生しました:', error.message);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

function verifyCompanies(companies) {
  const expected = EXPECTED_DATA.companies;
  const checks = [];

  // 件数確認
  const countCheck = companies.length === expected.count;
  checks.push({
    name: '企業数',
    expected: expected.count,
    actual: companies.length,
    pass: countCheck
  });

  if (countCheck) {
    console.log(`✅ 企業数: ${companies.length}`);
  } else {
    console.log(`❌ 企業数: 期待値=${expected.count}, 実際=${companies.length}`);
  }

  // 必須データ確認
  expected.required.forEach((expectedCompany, index) => {
    const company = companies[index];
    if (company) {
      Object.keys(expectedCompany).forEach(key => {
        const match = company[key] === expectedCompany[key];
        checks.push({
          name: `企業${index + 1}.${key}`,
          expected: expectedCompany[key],
          actual: company[key],
          pass: match
        });

        if (match) {
          console.log(`  ✅ ${key}: ${company[key]}`);
        } else {
          console.log(`  ❌ ${key}: 期待値=${expectedCompany[key]}, 実際=${company[key]}`);
        }
      });
    }
  });

  const allPass = checks.every(check => check.pass);
  return { category: '企業データ', pass: allPass, checks };
}

function verifyUsers(users) {
  const expected = EXPECTED_DATA.users;
  const checks = [];

  // 件数確認
  const countCheck = users.length === expected.count;
  checks.push({
    name: 'ユーザー数',
    expected: expected.count,
    actual: users.length,
    pass: countCheck
  });

  if (countCheck) {
    console.log(`✅ ユーザー数: ${users.length}`);
  } else {
    console.log(`❌ ユーザー数: 期待値=${expected.count}, 実際=${users.length}`);
  }

  // 必須データ確認
  expected.required.forEach((expectedUser, index) => {
    const user = users.find(u => u.username === expectedUser.username);
    if (user) {
      Object.keys(expectedUser).forEach(key => {
        const match = user[key] === expectedUser[key];
        checks.push({
          name: `ユーザー.${expectedUser.username}.${key}`,
          expected: expectedUser[key],
          actual: user[key],
          pass: match
        });

        if (match) {
          console.log(`  ✅ ${expectedUser.username}.${key}: ${user[key]}`);
        } else {
          console.log(`  ❌ ${expectedUser.username}.${key}: 期待値=${expectedUser[key]}, 実際=${user[key]}`);
        }
      });

      // パスワードハッシュ確認
      const hasPassword = user.password && user.password.length > 10;
      checks.push({
        name: `ユーザー.${expectedUser.username}.password`,
        expected: 'ハッシュ済み',
        actual: hasPassword ? 'ハッシュ済み' : '未設定',
        pass: hasPassword
      });

      if (hasPassword) {
        console.log(`  ✅ ${expectedUser.username}.password: ハッシュ済み`);
      } else {
        console.log(`  ❌ ${expectedUser.username}.password: パスワードが設定されていません`);
      }
    } else {
      console.log(`  ❌ ユーザー ${expectedUser.username} が見つかりません`);
      checks.push({
        name: `ユーザー.${expectedUser.username}`,
        expected: '存在',
        actual: '不在',
        pass: false
      });
    }
  });

  const allPass = checks.every(check => check.pass);
  return { category: 'ユーザーデータ', pass: allPass, checks };
}

function verifyFeatures(features) {
  const expected = EXPECTED_DATA.features;
  const checks = [];

  // 件数確認
  const countCheck = features.length >= expected.count;
  checks.push({
    name: '機能数',
    expected: `${expected.count}以上`,
    actual: features.length,
    pass: countCheck
  });

  if (countCheck) {
    console.log(`✅ 機能数: ${features.length}`);
  } else {
    console.log(`❌ 機能数: 期待値=${expected.count}以上, 実際=${features.length}`);
  }

  // 必須機能確認
  const featureCodes = features.map(f => f.code);
  expected.required.forEach(requiredCode => {
    const exists = featureCodes.includes(requiredCode);
    checks.push({
      name: `機能.${requiredCode}`,
      expected: '存在',
      actual: exists ? '存在' : '不在',
      pass: exists
    });

    if (exists) {
      console.log(`  ✅ ${requiredCode}: 存在`);
    } else {
      console.log(`  ❌ ${requiredCode}: 機能が見つかりません`);
    }
  });

  const allPass = checks.every(check => check.pass);
  return { category: '機能データ', pass: allPass, checks };
}

async function verifyDataRelations(users, companies) {
  const checks = [];

  // ユーザーと企業の関連確認
  users.forEach(user => {
    const hasCompany = user.companyId && user.companies;
    checks.push({
      name: `${user.username}.企業関連`,
      expected: '企業に所属',
      actual: hasCompany ? '企業に所属' : '企業未所属',
      pass: hasCompany
    });

    if (hasCompany) {
      console.log(`  ✅ ${user.username}: ${user.companies.name}に所属`);
    } else {
      console.log(`  ❌ ${user.username}: 企業に所属していません`);
    }
  });

  const allPass = checks.every(check => check.pass);
  return { category: 'データ関連性', pass: allPass, checks };
}

function displaySummary(results, allChecksPass) {
  console.log('\n📊 確認結果サマリー');
  console.log('-'.repeat(30));

  results.forEach(result => {
    const status = result.pass ? '✅' : '❌';
    const failedCount = result.checks.filter(c => !c.pass).length;
    console.log(`${status} ${result.category}: ${result.pass ? '正常' : `${failedCount}件の問題`}`);
  });

  console.log('\n' + '='.repeat(50));
  if (allChecksPass) {
    console.log('🎉 初期データ確認完了: すべてのチェックが成功しました!');
    console.log('✅ システムは正常に初期化されています。');
  } else {
    console.log('⚠️ 初期データ確認完了: 問題が検出されました。');
    console.log('🔧 上記のエラーを修正してから再度確認してください。');
  }
}

// メイン実行
if (require.main === module) {
  verifyInitialData()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('予期しないエラー:', error);
      process.exit(1);
    });
}

module.exports = { verifyInitialData, EXPECTED_DATA };
#!/usr/bin/env node

/**
 * 自動化テストスイート
 *
 * 目的: 初期データ変更時の包括的テスト自動実行
 * 使用方法: docker exec websys_backend_dev node scripts/automated-test-suite.js
 */

const { execSync } = require('child_process');
const { verifyInitialData } = require('./verify-initial-data.cjs');
const { checkDataIntegrity } = require('./data-integrity-check.cjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runAutomatedTestSuite() {
  console.log('🚀 自動化テストスイート開始...');
  console.log('='.repeat(70));

  const startTime = Date.now();
  let overallSuccess = true;
  const testResults = [];

  try {
    // 1. 環境チェック
    console.log('\n🔧 1. 環境チェック');
    const envCheck = await runEnvironmentCheck();
    testResults.push(envCheck);
    overallSuccess = overallSuccess && envCheck.success;

    // 2. データベース接続テスト
    console.log('\n🗄️ 2. データベース接続テスト');
    const dbCheck = await runDatabaseConnectionTest();
    testResults.push(dbCheck);
    overallSuccess = overallSuccess && dbCheck.success;

    // 3. 初期データ確認テスト
    console.log('\n📋 3. 初期データ確認テスト');
    const dataCheck = await runInitialDataVerification();
    testResults.push(dataCheck);
    overallSuccess = overallSuccess && dataCheck.success;

    // 4. データ整合性テスト
    console.log('\n🔗 4. データ整合性テスト');
    const integrityCheck = await runDataIntegrityTest();
    testResults.push(integrityCheck);
    overallSuccess = overallSuccess && integrityCheck.success;

    // 5. API エンドポイントテスト
    console.log('\n🌐 5. API エンドポイントテスト');
    const apiCheck = await runAPIEndpointTest();
    testResults.push(apiCheck);
    overallSuccess = overallSuccess && apiCheck.success;

    // 6. セキュリティチェック
    console.log('\n🔒 6. セキュリティチェック');
    const securityCheck = await runSecurityCheck();
    testResults.push(securityCheck);
    overallSuccess = overallSuccess && securityCheck.success;

    // 7. パフォーマンステスト
    console.log('\n⚡ 7. パフォーマンステスト');
    const performanceCheck = await runPerformanceTest();
    testResults.push(performanceCheck);
    overallSuccess = overallSuccess && performanceCheck.success;

    // 結果まとめ
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log('\n' + '='.repeat(70));
    displayTestSummary(testResults, overallSuccess, duration);

    return { success: overallSuccess, results: testResults, duration };

  } catch (error) {
    console.error('❌ テストスイート実行中にエラーが発生しました:', error.message);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

async function runEnvironmentCheck() {
  const checks = [];

  try {
    // Node.js バージョン確認
    const nodeVersion = process.version;
    checks.push({
      name: 'Node.js バージョン',
      status: 'OK',
      details: nodeVersion
    });

    // 環境変数確認
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'NODE_ENV'];
    requiredEnvVars.forEach(envVar => {
      const isSet = !!process.env[envVar];
      checks.push({
        name: `環境変数 ${envVar}`,
        status: isSet ? 'OK' : 'ERROR',
        details: isSet ? '設定済み' : '未設定'
      });
    });

    console.log('  ✅ 環境チェック完了');
    return { name: '環境チェック', success: true, checks };

  } catch (error) {
    console.log(`  ❌ 環境チェックエラー: ${error.message}`);
    return { name: '環境チェック', success: false, error: error.message, checks };
  }
}

async function runDatabaseConnectionTest() {
  const checks = [];

  try {
    // データベース接続テスト
    await prisma.$connect();
    checks.push({
      name: 'データベース接続',
      status: 'OK',
      details: 'PostgreSQL接続成功'
    });

    // テーブル存在確認
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    checks.push({
      name: 'テーブル確認',
      status: 'OK',
      details: `${tables.length}テーブル存在`
    });

    console.log(`  ✅ データベース接続テスト完了 (${tables.length}テーブル)`);
    return { name: 'データベース接続', success: true, checks };

  } catch (error) {
    console.log(`  ❌ データベース接続エラー: ${error.message}`);
    return { name: 'データベース接続', success: false, error: error.message, checks };
  }
}

async function runInitialDataVerification() {
  try {
    const result = await verifyInitialData();

    if (result.success) {
      console.log('  ✅ 初期データ確認完了');
    } else {
      console.log('  ❌ 初期データに問題があります');
    }

    return {
      name: '初期データ確認',
      success: result.success,
      details: result.results
    };

  } catch (error) {
    console.log(`  ❌ 初期データ確認エラー: ${error.message}`);
    return { name: '初期データ確認', success: false, error: error.message };
  }
}

async function runDataIntegrityTest() {
  try {
    const result = await checkDataIntegrity();

    if (result.success) {
      console.log('  ✅ データ整合性テスト完了');
    } else {
      console.log('  ❌ データ整合性に問題があります');
    }

    return {
      name: 'データ整合性',
      success: result.success,
      details: result.results
    };

  } catch (error) {
    console.log(`  ❌ データ整合性テストエラー: ${error.message}`);
    return { name: 'データ整合性', success: false, error: error.message };
  }
}

async function runAPIEndpointTest() {
  const checks = [];

  try {
    // ヘルスチェックエンドポイント
    try {
      const response = await fetch('http://localhost:8000/health');
      const healthCheck = response.ok;

      checks.push({
        name: 'ヘルスチェックAPI',
        status: healthCheck ? 'OK' : 'ERROR',
        details: healthCheck ? 'HTTP 200' : `HTTP ${response.status}`
      });
    } catch (error) {
      checks.push({
        name: 'ヘルスチェックAPI',
        status: 'ERROR',
        details: error.message
      });
    }

    // 基本的なAPIエンドポイント確認
    const endpoints = [
      { path: '/api/auth/login', method: 'POST' },
      { path: '/api/features', method: 'GET' },
      { path: '/api/companies', method: 'GET' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`http://localhost:8000${endpoint.path}`, {
          method: endpoint.method,
          headers: { 'Content-Type': 'application/json' }
        });

        // 認証エラーは期待される (401や403は正常)
        const isValidResponse = response.status < 500;

        checks.push({
          name: `${endpoint.method} ${endpoint.path}`,
          status: isValidResponse ? 'OK' : 'ERROR',
          details: `HTTP ${response.status}`
        });
      } catch (error) {
        checks.push({
          name: `${endpoint.method} ${endpoint.path}`,
          status: 'ERROR',
          details: error.message
        });
      }
    }

    const allSuccess = checks.every(check => check.status === 'OK');

    if (allSuccess) {
      console.log('  ✅ API エンドポイントテスト完了');
    } else {
      console.log('  ❌ 一部のAPIエンドポイントに問題があります');
    }

    return { name: 'API エンドポイント', success: allSuccess, checks };

  } catch (error) {
    console.log(`  ❌ API エンドポイントテストエラー: ${error.message}`);
    return { name: 'API エンドポイント', success: false, error: error.message, checks };
  }
}

async function runSecurityCheck() {
  const checks = [];

  try {
    // パスワードハッシュ化確認
    const users = await prisma.users.findMany({ select: { username: true, password: true } });

    const hashedPasswords = users.every(user =>
      user.password && user.password.length > 20 && user.password.startsWith('$')
    );

    checks.push({
      name: 'パスワードハッシュ化',
      status: hashedPasswords ? 'OK' : 'ERROR',
      details: hashedPasswords ? '全パスワードがハッシュ化済み' : '未ハッシュ化パスワード存在'
    });

    // JWT シークレット確認
    const jwtSecret = process.env.JWT_SECRET;
    const jwtSecureCheck = jwtSecret && jwtSecret !== 'your-secret-key-change-this' && jwtSecret.length >= 32;

    checks.push({
      name: 'JWT シークレット',
      status: jwtSecureCheck ? 'OK' : 'WARNING',
      details: jwtSecureCheck ? 'セキュアなシークレット設定済み' : 'デフォルトまたは短いシークレット'
    });

    // 管理者アカウント確認
    const adminUsers = await prisma.users.findMany({
      where: { role: 'ADMIN', isActive: true }
    });

    checks.push({
      name: '管理者アカウント',
      status: adminUsers.length > 0 ? 'OK' : 'ERROR',
      details: `${adminUsers.length}名のアクティブ管理者`
    });

    const allSecure = checks.every(check => check.status === 'OK' || check.status === 'WARNING');

    if (allSecure) {
      console.log('  ✅ セキュリティチェック完了');
    } else {
      console.log('  ❌ セキュリティに問題があります');
    }

    return { name: 'セキュリティ', success: allSecure, checks };

  } catch (error) {
    console.log(`  ❌ セキュリティチェックエラー: ${error.message}`);
    return { name: 'セキュリティ', success: false, error: error.message, checks };
  }
}

async function runPerformanceTest() {
  const checks = [];

  try {
    // データベースクエリパフォーマンス
    const startTime = Date.now();

    await Promise.all([
      prisma.users.findMany({ take: 100 }),
      prisma.companies.findMany({ take: 100 }),
      prisma.features.findMany({ take: 100 })
    ]);

    const queryTime = Date.now() - startTime;
    const performanceOK = queryTime < 1000; // 1秒以内

    checks.push({
      name: 'データベースクエリ',
      status: performanceOK ? 'OK' : 'WARNING',
      details: `${queryTime}ms`
    });

    // メモリ使用量
    const memUsage = process.memoryUsage();
    const memoryOK = memUsage.heapUsed < 100 * 1024 * 1024; // 100MB以内

    checks.push({
      name: 'メモリ使用量',
      status: memoryOK ? 'OK' : 'WARNING',
      details: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
    });

    console.log(`  ✅ パフォーマンステスト完了 (クエリ: ${queryTime}ms)`);
    return { name: 'パフォーマンス', success: true, checks };

  } catch (error) {
    console.log(`  ❌ パフォーマンステストエラー: ${error.message}`);
    return { name: 'パフォーマンス', success: false, error: error.message, checks };
  }
}

function displayTestSummary(testResults, overallSuccess, duration) {
  console.log('\n📊 自動化テストスイート結果サマリー');
  console.log('-'.repeat(50));

  testResults.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.name}: ${result.success ? '成功' : '失敗'}`);

    if (!result.success && result.error) {
      console.log(`   エラー: ${result.error}`);
    }
  });

  console.log('\n' + '='.repeat(70));
  console.log(`⏱️ 実行時間: ${duration.toFixed(2)}秒`);

  if (overallSuccess) {
    console.log('🎉 自動化テストスイート完了: すべてのテストが成功しました!');
    console.log('✅ システムは正常に動作しており、初期データも適切に設定されています。');
  } else {
    console.log('⚠️ 自動化テストスイート完了: 一部のテストで問題が検出されました。');
    console.log('🔧 上記の問題を修正してから本格運用を開始してください。');
  }
}

// フェッチ関数の簡易実装（Node.js 18未満の場合）
if (typeof fetch === 'undefined') {
  global.fetch = async (url, options = {}) => {
    const https = require('https');
    const http = require('http');
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const req = client.request(url, {
        method: options.method || 'GET',
        headers: options.headers || {}
      }, (res) => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage
        });
      });

      req.on('error', reject);
      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  };
}

// メイン実行
if (require.main === module) {
  runAutomatedTestSuite()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('予期しないエラー:', error);
      process.exit(1);
    });
}

module.exports = { runAutomatedTestSuite };
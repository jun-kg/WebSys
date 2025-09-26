import { prisma } from '../lib/prisma';

// テスト開始前のセットアップ
beforeAll(async () => {
  // テスト用データベースのクリーンアップ
  await cleanupDatabase();

  // テスト用データのセットアップ
  await setupTestData();
});

// テスト終了後のクリーンアップ
afterAll(async () => {
  await cleanupDatabase();
  await prisma.$disconnect();
});

// 各テスト間のクリーンアップ
afterEach(async () => {
  // テンプレート関連のテストデータをクリーンアップ
  await prisma.permission_template_features.deleteMany({
    where: {
      permission_templates: {
        name: {
          contains: 'Test'
        }
      }
    }
  });

  await prisma.permission_templates.deleteMany({
    where: {
      name: {
        contains: 'Test'
      }
    }
  });
});

async function cleanupDatabase() {
  // 関連テーブルを順序よく削除
  await prisma.permission_template_features.deleteMany();
  await prisma.permission_templates.deleteMany({
    where: {
      isPreset: false
    }
  });
}

async function setupTestData() {
  // テスト用の会社データ作成（存在しない場合のみ）
  const existingCompany = await prisma.companies.findFirst({
    where: { code: 'TEST001' }
  });

  if (!existingCompany) {
    await prisma.companies.create({
      data: {
        code: 'TEST001',
        name: 'テスト株式会社',
        nameKana: 'テストカブシキガイシャ',
        industry: 'IT・ソフトウェア',
        establishedDate: new Date('2020-01-01'),
        employeeCount: 10,
        address: 'テスト住所',
        phone: '03-0000-0000',
        email: 'test@example.com',
        contractPlan: 'BASIC',
        maxUsers: 50,
        isActive: true,
        updatedAt: new Date()
      }
    });
  }

  // テスト用機能データの確認（USER_MANAGEMENTとFEATURE_MANAGEMENTが存在することを確認）
  const features = await prisma.features.findMany();
  if (features.length === 0) {
    await prisma.features.createMany({
      data: [
        {
          code: 'USER_MANAGEMENT',
          name: 'ユーザー管理',
          description: 'ユーザー管理機能',
          category: 'ADMIN',
          urlPattern: '/users/*',
          apiPattern: '/api/users/*',
          icon: 'User',
          displayOrder: 1,
          isActive: true,
          updatedAt: new Date()
        },
        {
          code: 'FEATURE_MANAGEMENT',
          name: '機能管理',
          description: '機能管理機能',
          category: 'ADMIN',
          urlPattern: '/features/*',
          apiPattern: '/api/features/*',
          icon: 'Settings',
          displayOrder: 2,
          isActive: true,
          updatedAt: new Date()
        }
      ]
    });
  }
}
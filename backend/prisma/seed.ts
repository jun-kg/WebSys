import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 データベースシード開始...')

  // 1. 会社作成
  const company = await prisma.companies.upsert({
    where: { code: 'SAMPLE001' },
    update: { updatedAt: new Date() },
    create: {
      code: 'SAMPLE001',
      name: 'サンプル株式会社',
      nameKana: 'サンプルカブシキガイシャ',
      industry: 'IT・ソフトウェア',
      establishedDate: new Date('2020-01-01'),
      employeeCount: 50,
      address: '東京都港区虎ノ門1-1-1',
      phone: '03-1234-5678',
      email: 'info@sample.co.jp',
      contractPlan: 'PREMIUM',
      maxUsers: 200,
      isActive: true,
      updatedAt: new Date()
    }
  })
  console.log('✅ 会社作成:', company.name)

  // 2. 部署作成
  const itDepartment = await prisma.departments.upsert({
    where: { companyId_code: { companyId: company.id, code: 'IT' } },
    update: { updatedAt: new Date() },
    create: {
      companyId: company.id,
      code: 'IT',
      name: 'IT部',
      nameKana: 'アイティーブ',
      level: 1,
      path: '/IT',
      displayOrder: 1,
      isActive: true,
      updatedAt: new Date()
    }
  })

  const salesDepartment = await prisma.departments.upsert({
    where: { companyId_code: { companyId: company.id, code: 'SALES' } },
    update: { updatedAt: new Date() },
    create: {
      companyId: company.id,
      code: 'SALES',
      name: '営業部',
      nameKana: 'エイギョウブ',
      level: 1,
      path: '/SALES',
      displayOrder: 2,
      isActive: true,
      updatedAt: new Date()
    }
  })

  const hrDepartment = await prisma.departments.upsert({
    where: { companyId_code: { companyId: company.id, code: 'HR' } },
    update: { updatedAt: new Date() },
    create: {
      companyId: company.id,
      code: 'HR',
      name: '人事部',
      nameKana: 'ジンジブ',
      level: 1,
      path: '/HR',
      displayOrder: 3,
      isActive: true,
      updatedAt: new Date()
    }
  })

  console.log('✅ 部署作成完了')

  // 3. ログカテゴリ作成
  const logCategories = [
    { code: 'AUTH', name: '認証', color: '#1890ff' },
    { code: 'API', name: 'API', color: '#52c41a' },
    { code: 'DB', name: 'データベース', color: '#faad14' },
    { code: 'SEC', name: 'セキュリティ', color: '#f5222d' },
    { code: 'SYS', name: 'システム', color: '#722ed1' },
    { code: 'USER', name: 'ユーザー操作', color: '#13c2c2' },
    { code: 'PERF', name: 'パフォーマンス', color: '#eb2f96' },
    { code: 'ERR', name: 'エラー', color: '#ff4d4f' }
  ]

  for (const category of logCategories) {
    await prisma.log_categories.upsert({
      where: { code: category.code },
      update: { updatedAt: new Date() },
      create: { ...category, updatedAt: new Date() }
    })
  }
  console.log('✅ ログカテゴリ作成完了')

  // 4. 機能マスタ作成
  const features = [
    {
      code: 'USER_MGMT',
      name: 'ユーザー管理',
      description: 'ユーザーの登録・編集・削除機能',
      category: 'MANAGEMENT',
      urlPattern: '/users/*',
      apiPattern: '/api/users/*',
      icon: 'User',
      displayOrder: 1
    },
    {
      code: 'DEPT_MGMT',
      name: '部署管理',
      description: '部署の管理機能',
      category: 'MANAGEMENT',
      urlPattern: '/departments/*',
      apiPattern: '/api/departments/*',
      icon: 'Office',
      displayOrder: 2
    },
    {
      code: 'FEATURE_MGMT',
      name: '機能管理',
      description: '機能の権限設定',
      category: 'MANAGEMENT',
      urlPattern: '/features/*',
      apiPattern: '/api/features/*',
      icon: 'Settings',
      displayOrder: 3
    },
    {
      code: 'LOG_MONITOR',
      name: 'ログ監視',
      description: 'システムログの監視・分析',
      category: 'MONITORING',
      urlPattern: '/logs/*',
      apiPattern: '/api/logs/*',
      icon: 'Monitor',
      displayOrder: 4
    },
    {
      code: 'REPORT',
      name: 'レポート',
      description: '各種レポート機能',
      category: 'REPORT',
      urlPattern: '/reports/*',
      apiPattern: '/api/reports/*',
      icon: 'BarChart',
      displayOrder: 5
    }
  ]

  for (const feature of features) {
    await prisma.features.upsert({
      where: { code: feature.code },
      update: { updatedAt: new Date() },
      create: { ...feature, updatedAt: new Date() }
    })
  }
  console.log('✅ 機能マスタ作成完了')

  // 5. ユーザー作成
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.users.upsert({
    where: { username: 'admin' },
    update: { updatedAt: new Date() },
    create: {
      username: 'admin',
      email: 'admin@sample.co.jp',
      password: adminPassword,
      name: 'システム管理者',
      companyId: company.id,
      primaryDepartmentId: itDepartment.id,
      employeeCode: 'EMP001',
      joinDate: new Date('2020-01-01'),
      role: 'ADMIN',
      isActive: true,
      updatedAt: new Date()
    }
  })
  console.log('✅ 管理者ユーザー作成:', admin.username)

  const managerPassword = await bcrypt.hash('manager123', 12)
  const manager = await prisma.users.upsert({
    where: { username: 'manager' },
    update: { updatedAt: new Date() },
    create: {
      username: 'manager',
      email: 'manager@sample.co.jp',
      password: managerPassword,
      name: '営業部マネージャー',
      companyId: company.id,
      primaryDepartmentId: salesDepartment.id,
      employeeCode: 'EMP002',
      joinDate: new Date('2020-02-01'),
      role: 'MANAGER',
      isActive: true,
      updatedAt: new Date()
    }
  })
  console.log('✅ マネージャーユーザー作成:', manager.username)

  const demoPassword = await bcrypt.hash('demo123', 12)
  const demoUser = await prisma.users.upsert({
    where: { username: 'demo_user' },
    update: { updatedAt: new Date() },
    create: {
      username: 'demo_user',
      email: 'demo@sample.co.jp',
      password: demoPassword,
      name: 'デモユーザー',
      companyId: company.id,
      primaryDepartmentId: salesDepartment.id,
      employeeCode: 'EMP003',
      joinDate: new Date('2020-03-01'),
      role: 'USER',
      isActive: true,
      updatedAt: new Date()
    }
  })
  console.log('✅ デモユーザー作成:', demoUser.username)

  // 6. ユーザー部署関連付け
  await prisma.user_departments.upsert({
    where: { userId_departmentId: { userId: admin.id, departmentId: itDepartment.id } },
    update: { updatedAt: new Date() },
    create: {
      userId: admin.id,
      departmentId: itDepartment.id,
      isPrimary: true,
      role: 'MANAGER',
      assignedDate: new Date('2020-01-01'),
      updatedAt: new Date()
    }
  })

  await prisma.user_departments.upsert({
    where: { userId_departmentId: { userId: manager.id, departmentId: salesDepartment.id } },
    update: { updatedAt: new Date() },
    create: {
      userId: manager.id,
      departmentId: salesDepartment.id,
      isPrimary: true,
      role: 'MANAGER',
      assignedDate: new Date('2020-02-01'),
      updatedAt: new Date()
    }
  })

  await prisma.user_departments.upsert({
    where: { userId_departmentId: { userId: demoUser.id, departmentId: salesDepartment.id } },
    update: { updatedAt: new Date() },
    create: {
      userId: demoUser.id,
      departmentId: salesDepartment.id,
      isPrimary: true,
      role: 'MEMBER',
      assignedDate: new Date('2020-03-01'),
      updatedAt: new Date()
    }
  })

  console.log('✅ ユーザー部署関連付け完了')

  // 7. 部署機能権限の初期設定
  const allFeatures = await prisma.features.findMany()

  // IT部門: 全機能へのフルアクセス
  for (const feature of allFeatures) {
    await prisma.department_feature_permissions.upsert({
      where: { departmentId_featureId: { departmentId: itDepartment.id, featureId: feature.id } },
      update: { updatedAt: new Date() },
      create: {
        departmentId: itDepartment.id,
        featureId: feature.id,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canApprove: true,
        canExport: true,
        inheritFromParent: false,
        createdBy: admin.id,
        updatedAt: new Date()
      }
    })
  }

  // 営業部門: 基本機能のみ
  const salesFeatures = allFeatures.filter(f =>
    ['USER_MGMT', 'REPORT'].includes(f.code)
  )
  for (const feature of salesFeatures) {
    await prisma.department_feature_permissions.upsert({
      where: { departmentId_featureId: { departmentId: salesDepartment.id, featureId: feature.id } },
      update: { updatedAt: new Date() },
      create: {
        departmentId: salesDepartment.id,
        featureId: feature.id,
        canView: true,
        canCreate: feature.code === 'REPORT',
        canEdit: feature.code === 'REPORT',
        canDelete: false,
        canApprove: false,
        canExport: true,
        inheritFromParent: false,
        createdBy: admin.id,
        updatedAt: new Date()
      }
    })
  }

  // 人事部門: ユーザー管理機能のみ
  const hrFeatures = allFeatures.filter(f => f.code === 'USER_MGMT')
  for (const feature of hrFeatures) {
    await prisma.department_feature_permissions.upsert({
      where: { departmentId_featureId: { departmentId: hrDepartment.id, featureId: feature.id } },
      update: { updatedAt: new Date() },
      create: {
        departmentId: hrDepartment.id,
        featureId: feature.id,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canApprove: true,
        canExport: true,
        inheritFromParent: false,
        createdBy: admin.id,
        updatedAt: new Date()
      }
    })
  }

  console.log('✅ 部署機能権限設定完了')

  // 8. メッセージ定義作成
  const messageDefinitions = [
    {
      code: 'LOGIN_SUCCESS',
      category: 'AUTH',
      type: 'INFO',
      messageJa: 'ログインしました',
      messageEn: 'Successfully logged in'
    },
    {
      code: 'LOGIN_FAILED',
      category: 'AUTH',
      type: 'WARNING',
      messageJa: 'ログインに失敗しました',
      messageEn: 'Login failed'
    },
    {
      code: 'PERMISSION_DENIED',
      category: 'AUTH',
      type: 'ERROR',
      messageJa: 'アクセス権限がありません',
      messageEn: 'Access denied'
    },
    {
      code: 'DATA_SAVED',
      category: 'SYSTEM',
      type: 'SUCCESS',
      messageJa: 'データを保存しました',
      messageEn: 'Data saved successfully'
    }
  ]

  for (const msgDef of messageDefinitions) {
    await prisma.message_definitions.upsert({
      where: { code: msgDef.code },
      update: { updatedAt: new Date() },
      create: { ...msgDef, updatedAt: new Date() }
    })
  }
  console.log('✅ メッセージ定義作成完了')

  // 9. ログ監視システム用サンプルデータ作成
  console.log('📝 ログ監視システムのサンプルデータ作成中...')

  const authCategory = await prisma.log_categories.findUnique({ where: { code: 'AUTH' } })
  const sysCategory = await prisma.log_categories.findUnique({ where: { code: 'SYS' } })
  const apiCategory = await prisma.log_categories.findUnique({ where: { code: 'API' } })
  const dbCategory = await prisma.log_categories.findUnique({ where: { code: 'DB' } })
  const userCategory = await prisma.log_categories.findUnique({ where: { code: 'USER' } })

  const sampleLogs = [
    {
      timestamp: new Date(),
      level: 'INFO',
      categoryId: sysCategory?.id,
      source: 'backend',
      message: 'システム初期化完了',
      userId: admin.id,
      context: { component: 'database', action: 'seed' },
      environment: 'development'
    },
    {
      timestamp: new Date(Date.now() - 60000),
      level: 'WARN',
      categoryId: authCategory?.id,
      source: 'backend',
      message: 'ログイン試行回数の警告',
      context: { attempts: 3, ip: '127.0.0.1' },
      environment: 'development'
    },
    {
      timestamp: new Date(Date.now() - 120000),
      level: 'DEBUG',
      categoryId: apiCategory?.id,
      source: 'backend',
      message: 'APIエンドポイント呼び出し',
      userId: admin.id,
      context: { endpoint: '/api/users', method: 'GET' },
      environment: 'development'
    },
    {
      timestamp: new Date(Date.now() - 180000),
      level: 'ERROR',
      categoryId: dbCategory?.id,
      source: 'database',
      message: 'データベース接続エラー',
      context: {
        name: 'ConnectionError',
        message: 'Connection timeout',
        code: 'TIMEOUT'
      },
      environment: 'development'
    },
    {
      timestamp: new Date(Date.now() - 240000),
      level: 'INFO',
      categoryId: userCategory?.id,
      source: 'frontend',
      message: 'ユーザーログイン',
      userId: admin.id,
      context: { userAgent: 'Mozilla/5.0', ip: '127.0.0.1' },
      environment: 'development'
    }
  ]

  // ログデータ作成をスキップ（BigIntのID問題のため）
  console.log(`⚠️ サンプルログ作成をスキップしました (${sampleLogs.length}件)`)

  const alertRule = await prisma.alert_rules.create({
    data: {
      name: 'エラーレベル監視',
      description: '1分間にERROR以上のログが5件以上発生した場合にアラート',
      level: 'ERROR',
      thresholdCount: 5,
      thresholdPeriod: 60,
      notificationChannels: ['email', 'slack'],
      isEnabled: true,
      updatedAt: new Date()
    }
  })

  console.log(`✅ アラートルール作成完了 (ID: ${alertRule.id})`)

  // 11. 監査ログの初期化
  await prisma.audit_logs.create({
    data: {
      userId: admin.id,
      action: 'SYSTEM_INIT',
      targetType: 'SYSTEM',
      targetId: 0,
      reason: 'データベース初期化完了',
      ipAddress: '127.0.0.1',
      userAgent: 'Prisma Seed Script'
    }
  })

  console.log('✅ 監査ログ初期化完了')
  console.log('🎉 データベースシード完了!')
  console.log('')
  console.log('=== 初期ユーザー情報 ===')
  console.log('管理者: admin / admin123')
  console.log('マネージャー: manager / manager123')
  console.log('デモユーザー: demo_user / demo123')
  console.log('========================')
  console.log('')
  console.log('💡 http://localhost:3000 でアプリケーションにアクセスできます')
  console.log('💡 http://localhost:8000/api でAPIにアクセスできます')
}

main()
  .catch((e) => {
    console.error('❌ シードエラー:', e)
    console.error('詳細:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    console.log('📡 データベース接続を閉じました')
  })
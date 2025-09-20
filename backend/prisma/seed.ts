import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 データベースシード開始...')

  // 管理者ユーザー作成
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@websys.local',
      password: adminPassword,
      name: 'システム管理者',
      department: 'IT部',
      role: 'ADMIN',
      isActive: true
    }
  })
  console.log('✅ 管理者ユーザー作成:', admin.username)

  // デモユーザー作成
  const demoUsers = [
    {
      username: 'demo_user',
      email: 'demo@websys.local',
      password: await bcrypt.hash('demo123', 12),
      name: 'デモユーザー',
      department: '営業部',
      role: 'USER'
    },
    {
      username: 'guest_user',
      email: 'guest@websys.local',
      password: await bcrypt.hash('guest123', 12),
      name: 'ゲストユーザー',
      department: null,
      role: 'GUEST'
    }
  ]

  for (const userData of demoUsers) {
    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: {},
      create: userData
    })
    console.log('✅ ユーザー作成:', user.username)
  }

  // ログ監視システム用サンプルデータ作成
  console.log('📝 ログ監視システムのサンプルデータ作成中...')

  const sampleLogs = [
    {
      timestamp: new Date(),
      level: 30, // INFO
      category: 'SYS',
      source: 'backend',
      message: 'システム初期化完了',
      userId: admin.id,
      environment: 'development',
      details: { component: 'database', action: 'seed' }
    },
    {
      timestamp: new Date(Date.now() - 60000), // 1分前
      level: 40, // WARN
      category: 'AUTH',
      source: 'backend',
      message: 'ログイン試行回数の警告',
      environment: 'development',
      details: { attempts: 3, ip: '127.0.0.1' }
    },
    {
      timestamp: new Date(Date.now() - 120000), // 2分前
      level: 20, // DEBUG
      category: 'API',
      source: 'backend',
      message: 'APIエンドポイント呼び出し',
      userId: admin.id,
      environment: 'development',
      details: { endpoint: '/api/users', method: 'GET' }
    },
    {
      timestamp: new Date(Date.now() - 180000), // 3分前
      level: 50, // ERROR
      category: 'DB',
      source: 'database',
      message: 'データベース接続エラー',
      environment: 'development',
      errorInfo: {
        name: 'ConnectionError',
        message: 'Connection timeout',
        code: 'TIMEOUT'
      }
    },
    {
      timestamp: new Date(Date.now() - 240000), // 4分前
      level: 30, // INFO
      category: 'USER',
      source: 'frontend',
      message: 'ユーザーログイン',
      userId: admin.id,
      environment: 'development',
      details: { userAgent: 'Mozilla/5.0', ip: '127.0.0.1' }
    }
  ]

  for (const logData of sampleLogs) {
    await prisma.log.create({
      data: logData
    })
  }

  console.log(`✅ サンプルログ作成完了 (${sampleLogs.length}件)`)

  // アラートルール作成
  const alertRule = await prisma.alertRule.create({
    data: {
      name: 'エラーレベル監視',
      description: '1分間にERROR以上のログが5件以上発生した場合にアラート',
      level: 50, // ERROR
      thresholdCount: 5,
      thresholdPeriod: 60, // 60秒
      notificationChannels: ['email', 'slack'],
      isEnabled: true
    }
  })

  console.log(`✅ アラートルール作成完了 (ID: ${alertRule.id})`)

  console.log('🎉 データベースシード完了!')
}

main()
  .catch((e) => {
    console.error('❌ シードエラー:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
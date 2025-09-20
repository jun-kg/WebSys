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
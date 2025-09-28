// 直列承認テスト用スクリプト
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function setupSequentialApproval() {
  try {
    // 既存のルートを直列承認に変更（ユーザーID 1 -> 1 -> 1 の順序）
    const updatedRoute = await prisma.approval_routes.updateMany({
      where: {
        workflowTypeId: 1,
        stepNumber: 1
      },
      data: {
        isSequential: true,
        sequentialOrder: [1, 1, 1], // 3回の承認が必要
        currentSequenceStep: 0
      }
    });

    console.log('直列承認ルートを設定しました:', updatedRoute);

    // 確認
    const routes = await prisma.approval_routes.findMany({
      where: {
        workflowTypeId: 1,
        stepNumber: 1
      }
    });

    console.log('更新されたルート:', routes);

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupSequentialApproval();
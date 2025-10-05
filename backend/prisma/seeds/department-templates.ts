/**
 * 部署権限テンプレートシードデータ
 * Phase 3 - T015
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDepartmentTemplates() {
  console.log('🌱 Seeding department permission templates...');

  // プリセットテンプレート: ADMIN_DEPT（情報システム部）
  const adminDept = await prisma.department_permission_templates.upsert({
    where: { code: 'ADMIN_DEPT' },
    update: {},
    create: {
      name: '情報システム部権限',
      code: 'ADMIN_DEPT',
      category: 'PRESET',
      description: 'システム管理部署向けの全権限テンプレート',
      department_template_features: {
        create: [
          { featureCode: 'USER_MANAGEMENT', canView: true, canCreate: true, canEdit: true, canDelete: true },
          { featureCode: 'DEPT_MANAGEMENT', canView: true, canCreate: true, canEdit: true, canDelete: true },
          { featureCode: 'PERMISSION_MANAGEMENT', canView: true, canCreate: true, canEdit: true, canDelete: true },
          { featureCode: 'WORKFLOW_MANAGEMENT', canView: true, canCreate: true, canEdit: true, canDelete: true },
          { featureCode: 'AUDIT_LOG', canView: true, canCreate: false, canEdit: false, canDelete: false },
          { featureCode: 'LOG_MONITORING', canView: true, canCreate: false, canEdit: false, canDelete: true },
          { featureCode: 'REPORT_MANAGEMENT', canView: true, canCreate: true, canEdit: true, canDelete: true },
          { featureCode: 'SYSTEM_SETTINGS', canView: true, canCreate: true, canEdit: true, canDelete: true }
        ]
      }
    },
    include: {
      department_template_features: true
    }
  });
  console.log(`✅ ADMIN_DEPT template created with ${adminDept.department_template_features.length} features`);

  // プリセットテンプレート: SALES_DEPT（営業部）
  const salesDept = await prisma.department_permission_templates.upsert({
    where: { code: 'SALES_DEPT' },
    update: {},
    create: {
      name: '営業部権限',
      code: 'SALES_DEPT',
      category: 'PRESET',
      description: '営業部門向けの標準権限テンプレート',
      department_template_features: {
        create: [
          { featureCode: 'USER_MANAGEMENT', canView: true, canCreate: false, canEdit: false, canDelete: false },
          { featureCode: 'CUSTOMER_MANAGEMENT', canView: true, canCreate: true, canEdit: true, canDelete: false },
          { featureCode: 'QUOTATION_MANAGEMENT', canView: true, canCreate: true, canEdit: true, canDelete: false },
          { featureCode: 'ORDER_MANAGEMENT', canView: true, canCreate: true, canEdit: true, canDelete: false },
          { featureCode: 'WORKFLOW_MANAGEMENT', canView: true, canCreate: true, canEdit: false, canDelete: false },
          { featureCode: 'REPORT_MANAGEMENT', canView: true, canCreate: true, canEdit: false, canDelete: false }
        ]
      }
    },
    include: {
      department_template_features: true
    }
  });
  console.log(`✅ SALES_DEPT template created with ${salesDept.department_template_features.length} features`);

  // プリセットテンプレート: HR_DEPT（人事部）
  const hrDept = await prisma.department_permission_templates.upsert({
    where: { code: 'HR_DEPT' },
    update: {},
    create: {
      name: '人事部権限',
      code: 'HR_DEPT',
      category: 'PRESET',
      description: '人事部門向けの権限テンプレート',
      department_template_features: {
        create: [
          { featureCode: 'USER_MANAGEMENT', canView: true, canCreate: true, canEdit: true, canDelete: true },
          { featureCode: 'DEPT_MANAGEMENT', canView: true, canCreate: true, canEdit: true, canDelete: false },
          { featureCode: 'PERMISSION_MANAGEMENT', canView: true, canCreate: true, canEdit: true, canDelete: false },
          { featureCode: 'AUDIT_LOG', canView: true, canCreate: false, canEdit: false, canDelete: false },
          { featureCode: 'REPORT_MANAGEMENT', canView: true, canCreate: true, canEdit: false, canDelete: false }
        ]
      }
    },
    include: {
      department_template_features: true
    }
  });
  console.log(`✅ HR_DEPT template created with ${hrDept.department_template_features.length} features`);

  // プリセットテンプレート: FINANCE_DEPT（経理部）
  const financeDept = await prisma.department_permission_templates.upsert({
    where: { code: 'FINANCE_DEPT' },
    update: {},
    create: {
      name: '経理部権限',
      code: 'FINANCE_DEPT',
      category: 'PRESET',
      description: '経理部門向けの権限テンプレート',
      department_template_features: {
        create: [
          { featureCode: 'FINANCIAL_MANAGEMENT', canView: true, canCreate: true, canEdit: true, canDelete: false },
          { featureCode: 'WORKFLOW_MANAGEMENT', canView: true, canCreate: true, canEdit: false, canDelete: false },
          { featureCode: 'AUDIT_LOG', canView: true, canCreate: false, canEdit: false, canDelete: false },
          { featureCode: 'REPORT_MANAGEMENT', canView: true, canCreate: true, canEdit: false, canDelete: false }
        ]
      }
    },
    include: {
      department_template_features: true
    }
  });
  console.log(`✅ FINANCE_DEPT template created with ${financeDept.department_template_features.length} features`);

  // プリセットテンプレート: GENERAL_DEPT（一般部署）
  const generalDept = await prisma.department_permission_templates.upsert({
    where: { code: 'GENERAL_DEPT' },
    update: {},
    create: {
      name: '一般部署権限',
      code: 'GENERAL_DEPT',
      category: 'PRESET',
      description: '一般部署向けの最小権限テンプレート',
      department_template_features: {
        create: [
          { featureCode: 'WORKFLOW_MANAGEMENT', canView: true, canCreate: true, canEdit: false, canDelete: false },
          { featureCode: 'REPORT_MANAGEMENT', canView: true, canCreate: false, canEdit: false, canDelete: false }
        ]
      }
    },
    include: {
      department_template_features: true
    }
  });
  console.log(`✅ GENERAL_DEPT template created with ${generalDept.department_template_features.length} features`);

  console.log('✅ Department permission templates seeding completed!');
  console.log(`📊 Total templates: 5`);
  console.log(`📊 Total features configured: ${
    adminDept.department_template_features.length +
    salesDept.department_template_features.length +
    hrDept.department_template_features.length +
    financeDept.department_template_features.length +
    generalDept.department_template_features.length
  }`);
}

// スタンドアロン実行
seedDepartmentTemplates()
  .catch((error) => {
    console.error('❌ Error seeding department templates:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

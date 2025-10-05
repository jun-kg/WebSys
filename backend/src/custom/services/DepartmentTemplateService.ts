/**
 * 部署権限テンプレートサービス
 * Phase 3 - T015
 *
 * 部署作成時の権限テンプレート自動適用・提案機能を提供
 */

import { prisma } from '../../lib/prisma';

export interface TemplateFeature {
  featureCode: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface DepartmentTemplate {
  id: number;
  name: string;
  code: string;
  category: 'PRESET' | 'CUSTOM';
  description: string | null;
  isActive: boolean;
  features: TemplateFeature[];
}

export interface TemplateSuggestion {
  templateId: number;
  templateName: string;
  matchScore: number;
  reason: string;
}

export class DepartmentTemplateService {

  /**
   * 全テンプレート取得
   */
  async getAllTemplates(companyId: number): Promise<DepartmentTemplate[]> {
    const templates = await prisma.department_permission_templates.findMany({
      where: {
        OR: [
          { category: 'PRESET' },
          { companyId, category: 'CUSTOM' }
        ],
        isActive: true
      },
      include: {
        department_template_features: true
      },
      orderBy: [
        { category: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return templates.map(t => ({
      id: t.id,
      name: t.name,
      code: t.code,
      category: t.category as 'PRESET' | 'CUSTOM',
      description: t.description,
      isActive: t.isActive,
      features: t.department_template_features.map(f => ({
        featureCode: f.featureCode,
        canView: f.canView,
        canCreate: f.canCreate,
        canEdit: f.canEdit,
        canDelete: f.canDelete
      }))
    }));
  }

  /**
   * テンプレート詳細取得
   */
  async getTemplateById(templateId: number, companyId: number): Promise<DepartmentTemplate | null> {
    const template = await prisma.department_permission_templates.findFirst({
      where: {
        id: templateId,
        OR: [
          { category: 'PRESET' },
          { companyId, category: 'CUSTOM' }
        ]
      },
      include: {
        department_template_features: true
      }
    });

    if (!template) return null;

    return {
      id: template.id,
      name: template.name,
      code: template.code,
      category: template.category as 'PRESET' | 'CUSTOM',
      description: template.description,
      isActive: template.isActive,
      features: template.department_template_features.map(f => ({
        featureCode: f.featureCode,
        canView: f.canView,
        canCreate: f.canCreate,
        canEdit: f.canEdit,
        canDelete: f.canDelete
      }))
    };
  }

  /**
   * 部署名に基づくテンプレート自動提案
   *
   * アルゴリズム:
   * 1. 部署名キーワードマッチング（営業、人事、経理、システム等）
   * 2. 親部署のテンプレート継承
   * 3. 同レベル部署の統計分析
   * 4. デフォルト: GENERAL_DEPT
   */
  async suggestTemplates(departmentName: string, parentDepartmentId: number | null): Promise<TemplateSuggestion[]> {
    const suggestions: TemplateSuggestion[] = [];

    // 1. 部署名キーワードマッチング
    const keywordMatches = this.matchByKeywords(departmentName);
    suggestions.push(...keywordMatches);

    // 2. 親部署のテンプレート継承
    if (parentDepartmentId) {
      const parentSuggestion = await this.matchByParentDepartment(parentDepartmentId);
      if (parentSuggestion) {
        suggestions.push(parentSuggestion);
      }
    }

    // 3. スコアでソート（降順）
    suggestions.sort((a, b) => b.matchScore - a.matchScore);

    // スコアがない場合はGENERAL_DEPTを提案
    if (suggestions.length === 0) {
      const generalTemplate = await prisma.department_permission_templates.findUnique({
        where: { code: 'GENERAL_DEPT' }
      });

      if (generalTemplate) {
        suggestions.push({
          templateId: generalTemplate.id,
          templateName: generalTemplate.name,
          matchScore: 50,
          reason: 'デフォルト一般部署権限'
        });
      }
    }

    return suggestions.slice(0, 3); // 上位3件まで
  }

  /**
   * キーワードベースマッチング
   */
  private matchByKeywords(departmentName: string): TemplateSuggestion[] {
    const suggestions: TemplateSuggestion[] = [];

    // キーワード辞書
    const keywordDict: Record<string, { code: string; name: string; keywords: string[] }> = {
      ADMIN_DEPT: {
        code: 'ADMIN_DEPT',
        name: '情報システム部権限',
        keywords: ['システム', '情報', 'IT', 'DX', '技術', '開発', 'インフラ', 'セキュリティ']
      },
      SALES_DEPT: {
        code: 'SALES_DEPT',
        name: '営業部権限',
        keywords: ['営業', '販売', 'セールス', '顧客', '商談', '受注']
      },
      HR_DEPT: {
        code: 'HR_DEPT',
        name: '人事部権限',
        keywords: ['人事', '総務', '労務', '採用', '教育', '研修', '人材']
      },
      FINANCE_DEPT: {
        code: 'FINANCE_DEPT',
        name: '経理部権限',
        keywords: ['経理', '会計', '財務', '経営企画', '予算', '決算']
      }
    };

    for (const [code, config] of Object.entries(keywordDict)) {
      for (const keyword of config.keywords) {
        if (departmentName.includes(keyword)) {
          suggestions.push({
            templateId: 0, // 後でデータベースから取得
            templateName: config.name,
            matchScore: 90,
            reason: `部署名に「${keyword}」が含まれています`
          });
          break; // 1つマッチしたら次のテンプレートへ
        }
      }
    }

    return suggestions;
  }

  /**
   * 親部署テンプレート継承マッチング
   */
  private async matchByParentDepartment(parentDepartmentId: number): Promise<TemplateSuggestion | null> {
    const parentDept = await prisma.departments.findUnique({
      where: { id: parentDepartmentId },
      include: {
        department_permission_templates: true
      }
    });

    if (parentDept?.templateId && parentDept.department_permission_templates) {
      return {
        templateId: parentDept.templateId,
        templateName: parentDept.department_permission_templates.name,
        matchScore: 80,
        reason: `親部署「${parentDept.name}」と同じ権限を継承`
      };
    }

    return null;
  }

  /**
   * 部署へのテンプレート適用
   */
  async applyTemplateToDepartment(departmentId: number, templateId: number, companyId: number): Promise<void> {
    // テンプレート存在確認
    const template = await prisma.department_permission_templates.findFirst({
      where: {
        id: templateId,
        OR: [
          { category: 'PRESET' },
          { companyId, category: 'CUSTOM' }
        ]
      },
      include: {
        department_template_features: true
      }
    });

    if (!template) {
      throw new Error('指定されたテンプレートが見つかりません');
    }

    // 部署確認
    const department = await prisma.departments.findFirst({
      where: { id: departmentId, companyId }
    });

    if (!department) {
      throw new Error('指定された部署が見つかりません');
    }

    // トランザクションで適用
    await prisma.$transaction(async (tx) => {
      // 1. 部署にテンプレートIDを設定
      await tx.departments.update({
        where: { id: departmentId },
        data: { templateId: templateId }
      });

      // 2. 既存の部署権限を削除
      await tx.department_permissions.deleteMany({
        where: { departmentId }
      });

      // 3. テンプレートの権限を部署にコピー
      for (const feature of template.department_template_features) {
        // features テーブルから featureId を取得
        const featureRecord = await tx.features.findUnique({
          where: { code: feature.featureCode }
        });

        if (!featureRecord) {
          console.warn(`Feature code ${feature.featureCode} not found in features table`);
          continue;
        }

        await tx.department_permissions.create({
          data: {
            departmentId,
            featureId: featureRecord.id,
            canView: feature.canView,
            canCreate: feature.canCreate,
            canEdit: feature.canEdit,
            canDelete: feature.canDelete
          }
        });
      }
    });
  }

  /**
   * カスタムテンプレート作成
   */
  async createCustomTemplate(
    companyId: number,
    name: string,
    description: string | null,
    features: TemplateFeature[]
  ): Promise<DepartmentTemplate> {
    // コード生成（会社ID + タイムスタンプ）
    const code = `CUSTOM_${companyId}_${Date.now()}`;

    const template = await prisma.department_permission_templates.create({
      data: {
        companyId,
        name,
        code,
        category: 'CUSTOM',
        description,
        department_template_features: {
          create: features.map(f => ({
            featureCode: f.featureCode,
            canView: f.canView,
            canCreate: f.canCreate,
            canEdit: f.canEdit,
            canDelete: f.canDelete
          }))
        }
      },
      include: {
        department_template_features: true
      }
    });

    return {
      id: template.id,
      name: template.name,
      code: template.code,
      category: template.category as 'PRESET' | 'CUSTOM',
      description: template.description,
      isActive: template.isActive,
      features: template.department_template_features.map(f => ({
        featureCode: f.featureCode,
        canView: f.canView,
        canCreate: f.canCreate,
        canEdit: f.canEdit,
        canDelete: f.canDelete
      }))
    };
  }

  /**
   * カスタムテンプレート更新
   */
  async updateCustomTemplate(
    templateId: number,
    companyId: number,
    name: string,
    description: string | null,
    features: TemplateFeature[]
  ): Promise<DepartmentTemplate> {
    // プリセットテンプレートは編集不可
    const existing = await prisma.department_permission_templates.findFirst({
      where: { id: templateId, companyId }
    });

    if (!existing) {
      throw new Error('テンプレートが見つかりません');
    }

    if (existing.category === 'PRESET') {
      throw new Error('プリセットテンプレートは編集できません');
    }

    // トランザクションで更新
    const updated = await prisma.$transaction(async (tx) => {
      // 既存の機能権限を削除
      await tx.department_template_features.deleteMany({
        where: { templateId }
      });

      // テンプレート更新
      return await tx.department_permission_templates.update({
        where: { id: templateId },
        data: {
          name,
          description,
          department_template_features: {
            create: features.map(f => ({
              featureCode: f.featureCode,
              canView: f.canView,
              canCreate: f.canCreate,
              canEdit: f.canEdit,
              canDelete: f.canDelete
            }))
          }
        },
        include: {
          department_template_features: true
        }
      });
    });

    return {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      category: updated.category as 'PRESET' | 'CUSTOM',
      description: updated.description,
      isActive: updated.isActive,
      features: updated.department_template_features.map(f => ({
        featureCode: f.featureCode,
        canView: f.canView,
        canCreate: f.canCreate,
        canEdit: f.canEdit,
        canDelete: f.canDelete
      }))
    };
  }

  /**
   * カスタムテンプレート削除
   */
  async deleteCustomTemplate(templateId: number, companyId: number): Promise<void> {
    const template = await prisma.department_permission_templates.findFirst({
      where: { id: templateId, companyId }
    });

    if (!template) {
      throw new Error('テンプレートが見つかりません');
    }

    if (template.category === 'PRESET') {
      throw new Error('プリセットテンプレートは削除できません');
    }

    // 使用中の部署をチェック
    const usedByDepartments = await prisma.departments.count({
      where: { templateId }
    });

    if (usedByDepartments > 0) {
      throw new Error(`このテンプレートは${usedByDepartments}個の部署で使用されているため削除できません`);
    }

    // 削除実行
    await prisma.department_permission_templates.delete({
      where: { id: templateId }
    });
  }
}

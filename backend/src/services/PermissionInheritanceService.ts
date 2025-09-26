import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

interface InheritanceRule {
  departmentId: number;
  featureId: number;
  inheritType: 'ALL' | 'PARTIAL' | 'NONE';
  inheritView: boolean;
  inheritCreate: boolean;
  inheritEdit: boolean;
  inheritDelete: boolean;
  inheritApprove: boolean;
  inheritExport: boolean;
  priority?: number;
}

interface EffectivePermission {
  departmentId: number;
  featureId: number;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canExport: boolean;
  source: 'direct' | 'inherited';
  inheritedFrom?: number;
}

export class PermissionInheritanceService {
  constructor() {
    // Prismaシングルトンを使用
  }

  /**
   * 部署の権限継承ルールを作成または更新
   */
  async upsertInheritanceRule(rule: InheritanceRule): Promise<any> {
    try {
      const result = await prisma.permission_inheritance_rules.upsert({
        where: {
          departmentId_featureId: {
            departmentId: rule.departmentId,
            featureId: rule.featureId
          }
        },
        update: {
          inheritType: rule.inheritType,
          inheritView: rule.inheritView,
          inheritCreate: rule.inheritCreate,
          inheritEdit: rule.inheritEdit,
          inheritDelete: rule.inheritDelete,
          inheritApprove: rule.inheritApprove,
          inheritExport: rule.inheritExport,
          priority: rule.priority || 0,
          updatedAt: new Date()
        },
        create: {
          departmentId: rule.departmentId,
          featureId: rule.featureId,
          inheritType: rule.inheritType,
          inheritView: rule.inheritView,
          inheritCreate: rule.inheritCreate,
          inheritEdit: rule.inheritEdit,
          inheritDelete: rule.inheritDelete,
          inheritApprove: rule.inheritApprove,
          inheritExport: rule.inheritExport,
          priority: rule.priority || 0
        }
      });

      // 子部署の権限を再計算
      await this.recalculateChildPermissions(rule.departmentId);

      return result;
    } catch (error) {
      console.error('Error upserting inheritance rule:', error);
      throw error;
    }
  }

  /**
   * 部署の継承ルールを取得
   */
  async getInheritanceRules(departmentId: number): Promise<any[]> {
    try {
      return await prisma.permission_inheritance_rules.findMany({
        where: {
          departmentId,
          isActive: true
        },
        include: {
          features: true
        },
        orderBy: {
          priority: 'desc'
        }
      });
    } catch (error) {
      console.error('Error getting inheritance rules:', error);
      throw error;
    }
  }

  /**
   * 部署の実効権限を計算（継承を考慮）
   */
  async calculateEffectivePermissions(departmentId: number): Promise<EffectivePermission[]> {
    try {
      // 部署の階層パスを取得
      const department = await prisma.departments.findUnique({
        where: { id: departmentId },
        include: {
          departments: true // 親部署
        }
      });

      if (!department) {
        throw new Error('Department not found');
      }

      // 親部署チェーンを構築
      const parentChain = await this.buildParentChain(departmentId);

      // すべての機能を取得
      const features = await prisma.features.findMany({
        where: { isActive: true }
      });

      const effectivePermissions: EffectivePermission[] = [];

      for (const feature of features) {
        // 直接権限を確認
        const directPermission = await prisma.department_feature_permissions.findUnique({
          where: {
            departmentId_featureId: {
              departmentId,
              featureId: feature.id
            }
          }
        });

        if (directPermission && !directPermission.inheritFromParent) {
          // 継承を使用しない場合は直接権限のみ
          effectivePermissions.push({
            departmentId,
            featureId: feature.id,
            canView: directPermission.canView,
            canCreate: directPermission.canCreate,
            canEdit: directPermission.canEdit,
            canDelete: directPermission.canDelete,
            canApprove: directPermission.canApprove,
            canExport: directPermission.canExport,
            source: 'direct'
          });
        } else {
          // 継承を考慮した権限を計算
          const inheritedPermission = await this.calculateInheritedPermission(
            departmentId,
            feature.id,
            parentChain
          );

          if (inheritedPermission) {
            effectivePermissions.push(inheritedPermission);
          } else if (directPermission) {
            // 継承がない場合は直接権限を使用
            effectivePermissions.push({
              departmentId,
              featureId: feature.id,
              canView: directPermission.canView,
              canCreate: directPermission.canCreate,
              canEdit: directPermission.canEdit,
              canDelete: directPermission.canDelete,
              canApprove: directPermission.canApprove,
              canExport: directPermission.canExport,
              source: 'direct'
            });
          }
        }
      }

      return effectivePermissions;
    } catch (error) {
      console.error('Error calculating effective permissions:', error);
      throw error;
    }
  }

  /**
   * 親部署チェーンを構築
   */
  private async buildParentChain(departmentId: number): Promise<number[]> {
    const chain: number[] = [];
    let currentId: number | null = departmentId;

    while (currentId !== null) {
      const dept = await prisma.departments.findUnique({
        where: { id: currentId },
        select: { parentId: true }
      });

      if (dept?.parentId) {
        chain.push(dept.parentId);
        currentId = dept.parentId;
      } else {
        currentId = null;
      }
    }

    return chain;
  }

  /**
   * 継承された権限を計算
   */
  private async calculateInheritedPermission(
    departmentId: number,
    featureId: number,
    parentChain: number[]
  ): Promise<EffectivePermission | null> {
    // 継承ルールを確認
    const inheritanceRule = await prisma.permission_inheritance_rules.findUnique({
      where: {
        departmentId_featureId: {
          departmentId,
          featureId
        }
      }
    });

    // 継承タイプが NONE の場合は継承しない
    if (inheritanceRule?.inheritType === 'NONE') {
      return null;
    }

    // 親部署チェーンを辿って権限を探す
    for (const parentId of parentChain) {
      const parentPermission = await prisma.department_feature_permissions.findUnique({
        where: {
          departmentId_featureId: {
            departmentId: parentId,
            featureId
          }
        }
      });

      if (parentPermission) {
        // 継承ルールに基づいて権限を適用
        if (inheritanceRule?.inheritType === 'PARTIAL') {
          return {
            departmentId,
            featureId,
            canView: inheritanceRule.inheritView && parentPermission.canView,
            canCreate: inheritanceRule.inheritCreate && parentPermission.canCreate,
            canEdit: inheritanceRule.inheritEdit && parentPermission.canEdit,
            canDelete: inheritanceRule.inheritDelete && parentPermission.canDelete,
            canApprove: inheritanceRule.inheritApprove && parentPermission.canApprove,
            canExport: inheritanceRule.inheritExport && parentPermission.canExport,
            source: 'inherited',
            inheritedFrom: parentId
          };
        } else {
          // ALL または ルールなしの場合は全権限を継承
          return {
            departmentId,
            featureId,
            canView: parentPermission.canView,
            canCreate: parentPermission.canCreate,
            canEdit: parentPermission.canEdit,
            canDelete: parentPermission.canDelete,
            canApprove: parentPermission.canApprove,
            canExport: parentPermission.canExport,
            source: 'inherited',
            inheritedFrom: parentId
          };
        }
      }
    }

    return null;
  }

  /**
   * 子部署の権限を再計算
   */
  private async recalculateChildPermissions(departmentId: number): Promise<void> {
    try {
      // 子部署を取得
      const childDepartments = await prisma.departments.findMany({
        where: {
          parentId: departmentId,
          isActive: true
        }
      });

      for (const child of childDepartments) {
        // 継承フラグがONの権限を更新
        const permissions = await prisma.department_feature_permissions.findMany({
          where: {
            departmentId: child.id,
            inheritFromParent: true
          }
        });

        for (const permission of permissions) {
          const effectivePermissions = await this.calculateEffectivePermissions(child.id);
          const effectivePerm = effectivePermissions.find(p => p.featureId === permission.featureId);

          if (effectivePerm && effectivePerm.source === 'inherited') {
            await prisma.department_feature_permissions.update({
              where: { id: permission.id },
              data: {
                canView: effectivePerm.canView,
                canCreate: effectivePerm.canCreate,
                canEdit: effectivePerm.canEdit,
                canDelete: effectivePerm.canDelete,
                canApprove: effectivePerm.canApprove,
                canExport: effectivePerm.canExport,
                updatedAt: new Date()
              }
            });
          }
        }

        // 再帰的に子部署の権限も更新
        await this.recalculateChildPermissions(child.id);
      }
    } catch (error) {
      console.error('Error recalculating child permissions:', error);
      throw error;
    }
  }

  /**
   * 権限継承の可視化データを取得
   */
  async getInheritanceVisualization(companyId: number): Promise<any> {
    try {
      const departments = await prisma.departments.findMany({
        where: {
          companyId,
          isActive: true
        },
        include: {
          department_feature_permissions: {
            include: {
              features: true
            }
          }
        },
        orderBy: [
          { level: 'asc' },
          { displayOrder: 'asc' }
        ]
      });

      // 部署階層を構築
      const tree = this.buildDepartmentTree(departments);

      // 各部署の継承情報を追加
      for (const dept of departments) {
        const effectivePermissions = await this.calculateEffectivePermissions(dept.id);
        dept['effectivePermissions'] = effectivePermissions;
        dept['inheritanceRules'] = await this.getInheritanceRules(dept.id);
      }

      return {
        tree,
        departments
      };
    } catch (error) {
      console.error('Error getting inheritance visualization:', error);
      throw error;
    }
  }

  /**
   * 部署ツリーを構築
   */
  private buildDepartmentTree(departments: any[]): any[] {
    const map = new Map();
    const tree: any[] = [];

    // マップを作成
    departments.forEach(dept => {
      map.set(dept.id, { ...dept, children: [] });
    });

    // ツリーを構築
    departments.forEach(dept => {
      if (dept.parentId) {
        const parent = map.get(dept.parentId);
        if (parent) {
          parent.children.push(map.get(dept.id));
        }
      } else {
        tree.push(map.get(dept.id));
      }
    });

    return tree;
  }

  /**
   * 権限継承ルールの一括適用
   */
  async applyInheritanceTemplate(templateId: number, departmentIds: number[]): Promise<void> {
    try {
      // テンプレートから継承ルールを取得
      const template = await prisma.permission_templates.findUnique({
        where: { id: templateId },
        include: {
          permission_template_details: true
        }
      });

      if (!template) {
        throw new Error('Template not found');
      }

      // 各部署に継承ルールを適用
      for (const departmentId of departmentIds) {
        for (const detail of template.permission_template_details) {
          await this.upsertInheritanceRule({
            departmentId,
            featureId: detail.featureId,
            inheritType: 'ALL',
            inheritView: detail.canView,
            inheritCreate: detail.canCreate,
            inheritEdit: detail.canEdit,
            inheritDelete: detail.canDelete,
            inheritApprove: detail.canApprove,
            inheritExport: detail.canExport
          });
        }
      }
    } catch (error) {
      console.error('Error applying inheritance template:', error);
      throw error;
    }
  }
}
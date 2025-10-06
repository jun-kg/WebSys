import { Prisma } from '@prisma/client';
import { prisma } from '@core/lib/prisma';

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

        // 追加の可視化データ
        dept['inheritanceFlow'] = await this.calculateInheritanceFlow(dept.id);
        dept['permissionConflicts'] = await this.detectPermissionConflicts(dept.id);
      }

      // 継承関係のマッピング
      const inheritanceMap = await this.buildInheritanceMap(departments);

      return {
        tree,
        departments,
        inheritanceMap,
        statistics: await this.getInheritanceStatistics(companyId)
      };
    } catch (error) {
      console.error('Error getting inheritance visualization:', error);
      throw error;
    }
  }

  /**
   * 部署の継承フローを計算
   */
  private async calculateInheritanceFlow(departmentId: number): Promise<any[]> {
    const flows = [];
    const parentChain = await this.buildParentChain(departmentId);

    for (const parentId of parentChain) {
      const parentPermissions = await prisma.department_feature_permissions.findMany({
        where: { departmentId: parentId },
        include: { features: true }
      });

      for (const permission of parentPermissions) {
        const inheritanceRule = await prisma.permission_inheritance_rules.findUnique({
          where: {
            departmentId_featureId: {
              departmentId,
              featureId: permission.featureId
            }
          }
        });

        if (inheritanceRule && inheritanceRule.inheritType !== 'NONE') {
          flows.push({
            sourceId: parentId,
            targetId: departmentId,
            featureId: permission.featureId,
            featureName: permission.features.name,
            inheritType: inheritanceRule.inheritType,
            permissions: {
              canView: inheritanceRule.inheritType === 'ALL' ? permission.canView : inheritanceRule.inheritView && permission.canView,
              canCreate: inheritanceRule.inheritType === 'ALL' ? permission.canCreate : inheritanceRule.inheritCreate && permission.canCreate,
              canEdit: inheritanceRule.inheritType === 'ALL' ? permission.canEdit : inheritanceRule.inheritEdit && permission.canEdit,
              canDelete: inheritanceRule.inheritType === 'ALL' ? permission.canDelete : inheritanceRule.inheritDelete && permission.canDelete,
              canApprove: inheritanceRule.inheritType === 'ALL' ? permission.canApprove : inheritanceRule.inheritApprove && permission.canApprove,
              canExport: inheritanceRule.inheritType === 'ALL' ? permission.canExport : inheritanceRule.inheritExport && permission.canExport
            }
          });
        }
      }
    }

    return flows;
  }

  /**
   * 権限競合を検出
   */
  private async detectPermissionConflicts(departmentId: number): Promise<any[]> {
    const conflicts = [];
    const features = await prisma.features.findMany({
      where: { isActive: true }
    });

    for (const feature of features) {
      const directPermission = await prisma.department_feature_permissions.findUnique({
        where: {
          departmentId_featureId: {
            departmentId,
            featureId: feature.id
          }
        }
      });

      const inheritedPermissions = await this.getInheritedPermissionsForFeature(departmentId, feature.id);

      if (directPermission && inheritedPermissions.length > 0) {
        const hasConflict = this.checkPermissionConflict(directPermission, inheritedPermissions);

        if (hasConflict) {
          conflicts.push({
            featureId: feature.id,
            featureName: feature.name,
            directPermission,
            inheritedPermissions,
            conflictType: this.analyzeConflictType(directPermission, inheritedPermissions)
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * 特定機能の継承権限を取得
   */
  private async getInheritedPermissionsForFeature(departmentId: number, featureId: number): Promise<any[]> {
    const inheritedPermissions = [];
    const parentChain = await this.buildParentChain(departmentId);

    for (const parentId of parentChain) {
      const parentPermission = await prisma.department_feature_permissions.findUnique({
        where: {
          departmentId_featureId: {
            departmentId: parentId,
            featureId
          }
        },
        include: {
          departments: true
        }
      });

      if (parentPermission) {
        inheritedPermissions.push({
          ...parentPermission,
          sourceDepartmentName: parentPermission.departments.name
        });
      }
    }

    return inheritedPermissions;
  }

  /**
   * 権限競合をチェック
   */
  private checkPermissionConflict(direct: any, inherited: any[]): boolean {
    // 直接権限と継承権限で異なる値がある場合は競合
    for (const inh of inherited) {
      if (direct.canView !== inh.canView ||
          direct.canCreate !== inh.canCreate ||
          direct.canEdit !== inh.canEdit ||
          direct.canDelete !== inh.canDelete ||
          direct.canApprove !== inh.canApprove ||
          direct.canExport !== inh.canExport) {
        return true;
      }
    }
    return false;
  }

  /**
   * 競合タイプを分析
   */
  private analyzeConflictType(direct: any, inherited: any[]): string {
    const directTotal = this.countPermissions(direct);
    const inheritedTotal = inherited.reduce((sum, inh) => sum + this.countPermissions(inh), 0);

    if (directTotal > inheritedTotal) return 'PERMISSION_ESCALATION';
    if (directTotal < inheritedTotal) return 'PERMISSION_RESTRICTION';
    return 'PERMISSION_DIFFERENCE';
  }

  /**
   * 権限数をカウント
   */
  private countPermissions(permission: any): number {
    return [
      permission.canView,
      permission.canCreate,
      permission.canEdit,
      permission.canDelete,
      permission.canApprove,
      permission.canExport
    ].filter(Boolean).length;
  }

  /**
   * 継承マップを構築
   */
  private async buildInheritanceMap(departments: any[]): Promise<any> {
    const map = {
      nodes: [],
      links: []
    };

    // ノードを作成
    for (const dept of departments) {
      map.nodes.push({
        id: dept.id,
        name: dept.name,
        level: dept.level,
        permissionCount: dept.department_feature_permissions.length,
        inheritanceRuleCount: dept.inheritanceRules?.length || 0
      });
    }

    // 継承リンクを作成
    for (const dept of departments) {
      if (dept.parentId) {
        const inheritanceFlows = dept.inheritanceFlow || [];

        for (const flow of inheritanceFlows) {
          map.links.push({
            source: flow.sourceId,
            target: flow.targetId,
            featureId: flow.featureId,
            featureName: flow.featureName,
            inheritType: flow.inheritType,
            strength: this.calculateInheritanceStrength(flow.permissions)
          });
        }
      }
    }

    return map;
  }

  /**
   * 継承強度を計算
   */
  private calculateInheritanceStrength(permissions: any): number {
    const permissionCount = Object.values(permissions).filter(Boolean).length;
    return permissionCount / 6; // 0-1の範囲で正規化
  }

  /**
   * 継承統計を取得
   */
  private async getInheritanceStatistics(companyId: number): Promise<any> {
    const departments = await prisma.departments.count({
      where: { companyId, isActive: true }
    });

    const inheritanceRules = await prisma.permission_inheritance_rules.count({
      where: {
        departments: { companyId },
        isActive: true
      }
    });

    const rulesByType = await prisma.permission_inheritance_rules.groupBy({
      by: ['inheritType'],
      where: {
        departments: { companyId },
        isActive: true
      },
      _count: {
        inheritType: true
      }
    });

    return {
      totalDepartments: departments,
      totalInheritanceRules: inheritanceRules,
      rulesByType: rulesByType.reduce((acc, rule) => {
        acc[rule.inheritType] = rule._count.inheritType;
        return acc;
      }, {}),
      averageRulesPerDepartment: departments > 0 ? (inheritanceRules / departments).toFixed(2) : 0
    };
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
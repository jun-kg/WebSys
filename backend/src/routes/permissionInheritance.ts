import { Router, Request, Response } from 'express';
import { PermissionInheritanceService } from '../services/PermissionInheritanceService';
import { authMiddleware, requireAdmin } from '../middleware/auth';

const router = Router();
const inheritanceService = new PermissionInheritanceService();

/**
 * 権限継承ルールの取得
 */
router.get('/inheritance/rules/:departmentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const departmentId = parseInt(req.params.departmentId);

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        error: 'Department ID is required'
      });
    }

    const rules = await inheritanceService.getInheritanceRules(departmentId);

    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error('Error fetching inheritance rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inheritance rules'
    });
  }
});

/**
 * 権限継承ルールの作成/更新
 */
router.post('/inheritance/rules', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      departmentId,
      featureId,
      inheritType,
      inheritView,
      inheritCreate,
      inheritEdit,
      inheritDelete,
      inheritApprove,
      inheritExport,
      priority
    } = req.body;

    if (!departmentId || !featureId || !inheritType) {
      return res.status(400).json({
        success: false,
        error: 'Department ID, Feature ID, and Inherit Type are required'
      });
    }

    const rule = await inheritanceService.upsertInheritanceRule({
      departmentId,
      featureId,
      inheritType,
      inheritView: inheritView ?? true,
      inheritCreate: inheritCreate ?? false,
      inheritEdit: inheritEdit ?? false,
      inheritDelete: inheritDelete ?? false,
      inheritApprove: inheritApprove ?? false,
      inheritExport: inheritExport ?? false,
      priority: priority ?? 0
    });

    res.json({
      success: true,
      data: rule
    });
  } catch (error) {
    console.error('Error upserting inheritance rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upsert inheritance rule'
    });
  }
});

/**
 * 実効権限の計算
 */
router.get('/inheritance/effective/:departmentId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const departmentId = parseInt(req.params.departmentId);

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        error: 'Department ID is required'
      });
    }

    const permissions = await inheritanceService.calculateEffectivePermissions(departmentId);

    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error calculating effective permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate effective permissions'
    });
  }
});

/**
 * 権限継承の可視化データ取得
 */
router.get('/inheritance/visualization/:companyId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const companyId = parseInt(req.params.companyId);

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID is required'
      });
    }

    const visualization = await inheritanceService.getInheritanceVisualization(companyId);

    res.json({
      success: true,
      data: visualization
    });
  } catch (error) {
    console.error('Error getting inheritance visualization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get inheritance visualization'
    });
  }
});

/**
 * 権限継承テンプレートの適用
 */
router.post('/inheritance/apply-template', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { templateId, departmentIds } = req.body;

    if (!templateId || !departmentIds || !Array.isArray(departmentIds)) {
      return res.status(400).json({
        success: false,
        error: 'Template ID and Department IDs array are required'
      });
    }

    await inheritanceService.applyInheritanceTemplate(templateId, departmentIds);

    res.json({
      success: true,
      message: 'Inheritance template applied successfully'
    });
  } catch (error) {
    console.error('Error applying inheritance template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply inheritance template'
    });
  }
});

/**
 * 権限継承ルールの一括更新
 */
router.put('/inheritance/rules/bulk', authMiddleware, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { rules } = req.body;

    if (!rules || !Array.isArray(rules)) {
      return res.status(400).json({
        success: false,
        error: 'Rules array is required'
      });
    }

    const results = [];
    for (const rule of rules) {
      const result = await inheritanceService.upsertInheritanceRule(rule);
      results.push(result);
    }

    res.json({
      success: true,
      data: results,
      message: `${results.length} rules updated successfully`
    });
  } catch (error) {
    console.error('Error bulk updating inheritance rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update inheritance rules'
    });
  }
});

export default router;
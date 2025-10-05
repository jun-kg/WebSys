/**
 * 部署権限テンプレートAPI
 * Phase 3 - T015
 */

import express from 'express';
import { authMiddleware } from '../../middleware/auth';
import { checkDepartmentScope } from '../../middleware/checkDepartmentScope';
import { DepartmentTemplateService } from '../services/DepartmentTemplateService';

const router = express.Router();
const templateService = new DepartmentTemplateService();

/**
 * GET /api/department-templates
 * 全テンプレート一覧取得
 */
router.get(
  '/',
  authMiddleware,
  checkDepartmentScope({ action: 'DEPT_VIEW' }),
  async (req, res) => {
    try {
      const companyId = req.user!.companyId;
      const templates = await templateService.getAllTemplates(companyId);

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_FETCH_ERROR',
          message: 'テンプレート取得に失敗しました'
        }
      });
    }
  }
);

/**
 * GET /api/department-templates/:id
 * テンプレート詳細取得
 */
router.get(
  '/:id',
  authMiddleware,
  checkDepartmentScope({ action: 'DEPT_VIEW' }),
  async (req, res) => {
    try {
      const templateId = parseInt(req.params.id, 10);
      const companyId = req.user!.companyId;

      if (isNaN(templateId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TEMPLATE_ID',
            message: '無効なテンプレートIDです'
          }
        });
      }

      const template = await templateService.getTemplateById(templateId, companyId);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TEMPLATE_NOT_FOUND',
            message: 'テンプレートが見つかりません'
          }
        });
      }

      res.json({
        success: true,
        data: template
      });
    } catch (error) {
      console.error('Error fetching template:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_FETCH_ERROR',
          message: 'テンプレート取得に失敗しました'
        }
      });
    }
  }
);

/**
 * POST /api/department-templates/suggest
 * 部署名に基づくテンプレート提案
 */
router.post(
  '/suggest',
  authMiddleware,
  checkDepartmentScope({ action: 'DEPT_CREATE' }),
  async (req, res) => {
    try {
      const { departmentName, parentDepartmentId } = req.body;

      if (!departmentName || typeof departmentName !== 'string') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DEPARTMENT_NAME',
            message: '部署名が必要です'
          }
        });
      }

      const suggestions = await templateService.suggestTemplates(
        departmentName,
        parentDepartmentId || null
      );

      res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      console.error('Error suggesting templates:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_SUGGEST_ERROR',
          message: 'テンプレート提案に失敗しました'
        }
      });
    }
  }
);

/**
 * POST /api/department-templates/:id/apply
 * 部署へのテンプレート適用
 */
router.post(
  '/:id/apply',
  authMiddleware,
  checkDepartmentScope({ action: 'DEPT_EDIT' }),
  async (req, res) => {
    try {
      const templateId = parseInt(req.params.id, 10);
      const { departmentId } = req.body;
      const companyId = req.user!.companyId;

      if (isNaN(templateId) || !departmentId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: '無効なパラメータです'
          }
        });
      }

      await templateService.applyTemplateToDepartment(departmentId, templateId, companyId);

      res.json({
        success: true,
        message: 'テンプレートを適用しました'
      });
    } catch (error: any) {
      console.error('Error applying template:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_APPLY_ERROR',
          message: error.message || 'テンプレート適用に失敗しました'
        }
      });
    }
  }
);

/**
 * POST /api/department-templates
 * カスタムテンプレート作成
 */
router.post(
  '/',
  authMiddleware,
  checkDepartmentScope({ action: 'PERMISSION_CREATE' }),
  async (req, res) => {
    try {
      const companyId = req.user!.companyId;
      const { name, description, features } = req.body;

      if (!name || !features || !Array.isArray(features)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TEMPLATE_DATA',
            message: 'テンプレート名と機能権限が必要です'
          }
        });
      }

      const template = await templateService.createCustomTemplate(
        companyId,
        name,
        description || null,
        features
      );

      res.status(201).json({
        success: true,
        data: template
      });
    } catch (error: any) {
      console.error('Error creating template:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_CREATE_ERROR',
          message: error.message || 'テンプレート作成に失敗しました'
        }
      });
    }
  }
);

/**
 * PUT /api/department-templates/:id
 * カスタムテンプレート更新
 */
router.put(
  '/:id',
  authMiddleware,
  checkDepartmentScope({ action: 'PERMISSION_EDIT' }),
  async (req, res) => {
    try {
      const templateId = parseInt(req.params.id, 10);
      const companyId = req.user!.companyId;
      const { name, description, features } = req.body;

      if (isNaN(templateId) || !name || !features || !Array.isArray(features)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TEMPLATE_DATA',
            message: '無効なテンプレートデータです'
          }
        });
      }

      const template = await templateService.updateCustomTemplate(
        templateId,
        companyId,
        name,
        description || null,
        features
      );

      res.json({
        success: true,
        data: template
      });
    } catch (error: any) {
      console.error('Error updating template:', error);

      if (error.message.includes('編集できません')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'TEMPLATE_UPDATE_FORBIDDEN',
            message: error.message
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_UPDATE_ERROR',
          message: error.message || 'テンプレート更新に失敗しました'
        }
      });
    }
  }
);

/**
 * DELETE /api/department-templates/:id
 * カスタムテンプレート削除
 */
router.delete(
  '/:id',
  authMiddleware,
  checkDepartmentScope({ action: 'PERMISSION_DELETE' }),
  async (req, res) => {
    try {
      const templateId = parseInt(req.params.id, 10);
      const companyId = req.user!.companyId;

      if (isNaN(templateId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TEMPLATE_ID',
            message: '無効なテンプレートIDです'
          }
        });
      }

      await templateService.deleteCustomTemplate(templateId, companyId);

      res.json({
        success: true,
        message: 'テンプレートを削除しました'
      });
    } catch (error: any) {
      console.error('Error deleting template:', error);

      if (error.message.includes('削除できません')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'TEMPLATE_DELETE_FORBIDDEN',
            message: error.message
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'TEMPLATE_DELETE_ERROR',
          message: error.message || 'テンプレート削除に失敗しました'
        }
      });
    }
  }
);

export default router;

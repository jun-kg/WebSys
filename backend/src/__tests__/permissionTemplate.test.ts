import request from 'supertest';
import { app } from '../index';
import { prisma } from '../lib/prisma';
import jwt from 'jsonwebtoken';

describe('Permission Template API', () => {
  let authToken: string;
  let testCompanyId: number;
  let testUserId: number;
  let testFeatureIds: number[];

  beforeAll(async () => {
    // テスト用の認証トークンを生成
    const company = await prisma.companies.findFirst({
      where: { code: 'TEST001' }
    });
    testCompanyId = company!.id;

    // テスト用ユーザーを作成
    const user = await prisma.users.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'テストユーザー',
        companyId: testCompanyId,
        role: 'ADMIN',
        isActive: true,
        updatedAt: new Date()
      }
    });
    testUserId = user.id;

    // JWTトークンを生成
    authToken = jwt.sign(
      {
        userId: testUserId,
        username: 'testuser',
        role: 'ADMIN',
        companyId: testCompanyId
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // テスト用機能IDを取得
    const features = await prisma.features.findMany({
      take: 2
    });
    testFeatureIds = features.map(f => f.id);
  });

  afterAll(async () => {
    // テストユーザーを削除
    await prisma.users.delete({
      where: { id: testUserId }
    });
  });

  describe('GET /api/permissions/templates', () => {
    it('PT-API-001: 正常系：会社IDが有効な場合', async () => {
      const response = await request(app)
        .get('/api/permissions/templates')
        .query({ companyId: testCompanyId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('timestamp');
    });

    it('PT-API-002: 準正常系：該当データなし', async () => {
      const response = await request(app)
        .get('/api/permissions/templates')
        .query({ companyId: 999999 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toEqual([]);
    });

    it('PT-API-003: 異常系：認証なし', async () => {
      const response = await request(app)
        .get('/api/permissions/templates')
        .query({ companyId: testCompanyId })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('PT-API-004: 異常系：companyId未指定', async () => {
      const response = await request(app)
        .get('/api/permissions/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('PT-API-005: 異常系：不正なcompanyId', async () => {
      const response = await request(app)
        .get('/api/permissions/templates')
        .query({ companyId: 'abc' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/permissions/templates', () => {
    const validTemplateData = {
      companyId: 0, // テストで設定
      name: 'Test Template',
      description: 'Test Description',
      category: 'CUSTOM',
      features: [
        {
          featureId: 0, // テストで設定
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canApprove: false,
          canExport: true
        }
      ]
    };

    beforeEach(() => {
      validTemplateData.companyId = testCompanyId;
      validTemplateData.features[0].featureId = testFeatureIds[0];
    });

    it('PT-API-006: 正常系：有効なデータで作成', async () => {
      const response = await request(app)
        .post('/api/permissions/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validTemplateData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name', 'Test Template');
      expect(response.body.data).toHaveProperty('message');

      // データベースに正しく保存されているか確認
      const savedTemplate = await prisma.permission_templates.findUnique({
        where: { id: response.body.data.id },
        include: { permission_template_features: true }
      });

      expect(savedTemplate).not.toBeNull();
      expect(savedTemplate!.name).toBe('Test Template');
      expect(savedTemplate!.permission_template_features).toHaveLength(1);
    });

    it('PT-API-007: 正常系：最小限のデータで作成', async () => {
      const minimalData = {
        companyId: testCompanyId,
        name: 'Minimal Test Template',
        features: [
          {
            featureId: testFeatureIds[0],
            canView: true,
            canCreate: false,
            canEdit: false,
            canDelete: false,
            canApprove: false,
            canExport: false
          }
        ]
      };

      const response = await request(app)
        .post('/api/permissions/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(minimalData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
    });

    it('PT-API-008: 異常系：必須フィールド不足（name）', async () => {
      const invalidData = { ...validTemplateData };
      delete invalidData.name;

      const response = await request(app)
        .post('/api/permissions/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('PT-API-009: 異常系：companyId不足', async () => {
      const invalidData = { ...validTemplateData };
      delete invalidData.companyId;

      const response = await request(app)
        .post('/api/permissions/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('PT-API-010: 異常系：features不足', async () => {
      const invalidData = { ...validTemplateData };
      delete invalidData.features;

      const response = await request(app)
        .post('/api/permissions/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('PT-API-011: 異常系：不正なcompanyId', async () => {
      const invalidData = { ...validTemplateData };
      invalidData.companyId = 999999;

      const response = await request(app)
        .post('/api/permissions/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('PT-API-012: 異常系：重複名', async () => {
      // 最初のテンプレート作成
      await request(app)
        .post('/api/permissions/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validTemplateData, name: 'Duplicate Test Template' })
        .expect(201);

      // 同じ名前で再作成を試行
      const response = await request(app)
        .post('/api/permissions/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...validTemplateData, name: 'Duplicate Test Template' })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'DUPLICATE_NAME');
    });

    it('PT-API-013: 異常系：認証なし', async () => {
      const response = await request(app)
        .post('/api/permissions/templates')
        .send(validTemplateData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/permissions/templates/:templateId', () => {
    let testTemplateId: number;

    beforeEach(async () => {
      // テスト用テンプレートを作成
      const template = await prisma.permission_templates.create({
        data: {
          companyId: testCompanyId,
          name: 'Update Test Template',
          description: 'Update test description',
          category: 'CUSTOM',
          isPreset: false,
          displayOrder: 1,
          createdBy: testUserId,
          updatedBy: testUserId,
          updatedAt: new Date()
        }
      });
      testTemplateId = template.id;

      // テンプレート機能を追加
      await prisma.permission_template_features.create({
        data: {
          templateId: testTemplateId,
          featureId: testFeatureIds[0],
          canView: true,
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canApprove: false,
          canExport: false
        }
      });
    });

    it('PT-API-014: 正常系：全フィールド更新', async () => {
      const updateData = {
        name: 'Updated Test Template',
        description: 'Updated description',
        category: 'ADMIN',
        features: [
          {
            featureId: testFeatureIds[0],
            canView: true,
            canCreate: true,
            canEdit: true,
            canDelete: false,
            canApprove: false,
            canExport: true
          }
        ]
      };

      const response = await request(app)
        .put(`/api/permissions/templates/${testTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', 'Updated Test Template');

      // データベースで更新を確認
      const updatedTemplate = await prisma.permission_templates.findUnique({
        where: { id: testTemplateId },
        include: { permission_template_features: true }
      });

      expect(updatedTemplate!.name).toBe('Updated Test Template');
      expect(updatedTemplate!.description).toBe('Updated description');
      expect(updatedTemplate!.category).toBe('ADMIN');
    });

    it('PT-API-015: 正常系：部分更新', async () => {
      const updateData = {
        name: 'Partially Updated Template'
      };

      const response = await request(app)
        .put(`/api/permissions/templates/${testTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', 'Partially Updated Template');
    });

    it('PT-API-017: 異常系：存在しないテンプレート', async () => {
      const updateData = { name: 'Non-existent Template' };

      const response = await request(app)
        .put('/api/permissions/templates/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('PT-API-018: 異常系：プリセットテンプレート編集', async () => {
      // プリセットテンプレートを作成
      const presetTemplate = await prisma.permission_templates.create({
        data: {
          companyId: testCompanyId,
          name: 'Preset Test Template',
          description: 'Preset template',
          category: 'PRESET',
          isPreset: true,
          displayOrder: 1,
          createdBy: testUserId,
          updatedBy: testUserId,
          updatedAt: new Date()
        }
      });

      const updateData = { name: 'Updated Preset' };

      const response = await request(app)
        .put(`/api/permissions/templates/${presetTemplate.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'FORBIDDEN');

      // クリーンアップ
      await prisma.permission_templates.delete({
        where: { id: presetTemplate.id }
      });
    });

    it('PT-API-019: 異常系：認証なし', async () => {
      const updateData = { name: 'Unauthorized Update' };

      const response = await request(app)
        .put(`/api/permissions/templates/${testTemplateId}`)
        .send(updateData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/permissions/templates/:templateId', () => {
    let testTemplateId: number;
    let presetTemplateId: number;

    beforeEach(async () => {
      // テスト用カスタムテンプレートを作成
      const customTemplate = await prisma.permission_templates.create({
        data: {
          companyId: testCompanyId,
          name: 'Delete Test Template',
          description: 'Delete test',
          category: 'CUSTOM',
          isPreset: false,
          displayOrder: 1,
          createdBy: testUserId,
          updatedBy: testUserId,
          updatedAt: new Date()
        }
      });
      testTemplateId = customTemplate.id;

      // テスト用プリセットテンプレートを作成
      const presetTemplate = await prisma.permission_templates.create({
        data: {
          companyId: testCompanyId,
          name: 'Preset Delete Test Template',
          description: 'Preset delete test',
          category: 'PRESET',
          isPreset: true,
          displayOrder: 1,
          createdBy: testUserId,
          updatedBy: testUserId,
          updatedAt: new Date()
        }
      });
      presetTemplateId = presetTemplate.id;
    });

    it('PT-API-020: 正常系：カスタムテンプレート削除', async () => {
      const response = await request(app)
        .delete(`/api/permissions/templates/${testTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('message');

      // データベースで削除を確認（論理削除の場合）
      const deletedTemplate = await prisma.permission_templates.findUnique({
        where: { id: testTemplateId }
      });

      // 実際の削除方式に応じて確認方法を調整
      expect(deletedTemplate).toBeNull();
    });

    it('PT-API-021: 異常系：存在しないテンプレート', async () => {
      const response = await request(app)
        .delete('/api/permissions/templates/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('PT-API-022: 異常系：プリセットテンプレート削除', async () => {
      const response = await request(app)
        .delete(`/api/permissions/templates/${presetTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'FORBIDDEN');
    });

    it('PT-API-023: 異常系：認証なし', async () => {
      const response = await request(app)
        .delete(`/api/permissions/templates/${testTemplateId}`)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    afterEach(async () => {
      // テンプレートが残っている場合はクリーンアップ
      await prisma.permission_templates.deleteMany({
        where: {
          id: { in: [testTemplateId, presetTemplateId] }
        }
      });
    });
  });

  describe('POST /api/permissions/templates/:templateId/apply', () => {
    let testTemplateId: number;
    let testDepartmentId: number;

    beforeEach(async () => {
      // テスト用部署を作成
      const department = await prisma.departments.create({
        data: {
          companyId: testCompanyId,
          code: 'TEST_DEPT',
          name: 'テスト部署',
          nameKana: 'テストブショ',
          level: 1,
          path: '/TEST_DEPT',
          displayOrder: 1,
          isActive: true,
          updatedAt: new Date()
        }
      });
      testDepartmentId = department.id;

      // テスト用テンプレートを作成
      const template = await prisma.permission_templates.create({
        data: {
          companyId: testCompanyId,
          name: 'Apply Test Template',
          description: 'Apply test',
          category: 'CUSTOM',
          isPreset: false,
          displayOrder: 1,
          createdBy: testUserId,
          updatedBy: testUserId,
          updatedAt: new Date()
        }
      });
      testTemplateId = template.id;

      // テンプレート機能を作成
      await prisma.permission_template_features.create({
        data: {
          templateId: testTemplateId,
          featureId: testFeatureIds[0],
          canView: true,
          canCreate: true,
          canEdit: false,
          canDelete: false,
          canApprove: false,
          canExport: true
        }
      });
    });

    afterEach(async () => {
      // テスト用データをクリーンアップ
      await prisma.department_feature_permissions.deleteMany({
        where: { departmentId: testDepartmentId }
      });
      await prisma.departments.delete({
        where: { id: testDepartmentId }
      });
    });

    it('PT-API-024: 正常系：単一部署に適用', async () => {
      const applyData = {
        departmentIds: [testDepartmentId]
      };

      const response = await request(app)
        .post(`/api/permissions/templates/${testTemplateId}/apply`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(applyData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data).toHaveProperty('appliedDepartments', 1);

      // 権限が正しく適用されているか確認
      const appliedPermissions = await prisma.department_feature_permissions.findMany({
        where: {
          departmentId: testDepartmentId,
          featureId: testFeatureIds[0]
        }
      });

      expect(appliedPermissions).toHaveLength(1);
      expect(appliedPermissions[0].canView).toBe(true);
      expect(appliedPermissions[0].canCreate).toBe(true);
      expect(appliedPermissions[0].canExport).toBe(true);
    });

    it('PT-API-027: 異常系：存在しないテンプレート', async () => {
      const applyData = {
        departmentIds: [testDepartmentId]
      };

      const response = await request(app)
        .post('/api/permissions/templates/999999/apply')
        .set('Authorization', `Bearer ${authToken}`)
        .send(applyData)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('PT-API-028: 異常系：部署ID配列なし', async () => {
      const response = await request(app)
        .post(`/api/permissions/templates/${testTemplateId}/apply`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('PT-API-029: 異常系：空の部署ID配列', async () => {
      const applyData = {
        departmentIds: []
      };

      const response = await request(app)
        .post(`/api/permissions/templates/${testTemplateId}/apply`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(applyData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    });

    it('PT-API-030: 異常系：存在しない部署ID', async () => {
      const applyData = {
        departmentIds: [999999]
      };

      const response = await request(app)
        .post(`/api/permissions/templates/${testTemplateId}/apply`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(applyData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'INVALID_DEPARTMENTS');
    });
  });
});
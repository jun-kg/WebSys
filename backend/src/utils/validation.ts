/**
 * システム統一バリデーション定義
 *
 * データ辞書・バリデーション定義書に基づく
 * 統一されたバリデーション関数とルール定義
 */

import { body, param, query } from 'express-validator';

// ===========================================
// 基本バリデーション関数
// ===========================================

/**
 * 文字列長バリデーション
 */
export const validateLength = (value: string, min: number, max: number): boolean => {
  if (typeof value !== 'string') return false;
  return value.length >= min && value.length <= max;
};

/**
 * メールアドレスバリデーション
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && validateLength(email, 5, 254);
};

/**
 * コードバリデーション（英数字、アンダースコア、ハイフン）
 */
export const validateCode = (code: string): boolean => {
  const codeRegex = /^[a-zA-Z0-9_-]+$/;
  return codeRegex.test(code);
};

/**
 * 電話番号バリデーション
 */
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\d-+().\s]+$/;
  return phoneRegex.test(phone) && validateLength(phone, 10, 20);
};

/**
 * URLバリデーション
 */
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return validateLength(url, 1, 2048);
  } catch {
    return false;
  }
};

/**
 * 日付バリデーション（未来日付）
 */
export const validateFutureDate = (date: Date): boolean => {
  return date > new Date();
};

/**
 * 日付バリデーション（過去日付）
 */
export const validatePastDate = (date: Date): boolean => {
  return date <= new Date();
};

/**
 * 金額バリデーション
 */
export const validateAmount = (amount: number): boolean => {
  return amount >= 0 && amount <= 999999999999.99;
};

/**
 * パーセンテージバリデーション
 */
export const validatePercentage = (percentage: number): boolean => {
  return percentage >= 0 && percentage <= 100;
};

/**
 * パスワード強度バリデーション
 */
export const validatePasswordStrength = (password: string): boolean => {
  // 8文字以上、大文字・小文字・数字を含む
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// ===========================================
// enum定義
// ===========================================

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST',
  MANAGER = 'MANAGER'
}

export enum WorkflowStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED'
}

export enum ApprovalAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  RETURN = 'RETURN',
  DELEGATE = 'DELEGATE',
  SKIP = 'SKIP',
  AUTO_APPROVE = 'AUTO_APPROVE'
}

export enum Priority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum NotificationType {
  REQUEST_SUBMITTED = 'REQUEST_SUBMITTED',
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RETURNED = 'RETURNED',
  COMPLETED = 'COMPLETED',
  DEADLINE_APPROACHING = 'DEADLINE_APPROACHING',
  OVERDUE = 'OVERDUE'
}

// ===========================================
// バリデーションルール定義
// ===========================================

export const validationRules = {
  // ユーザー関連
  username: {
    required: true,
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_-]+$/,
    unique: true
  },

  email: {
    required: true,
    minLength: 5,
    maxLength: 254,
    format: 'email',
    unique: true
  },

  password: {
    required: true,
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    message: 'パスワードは8文字以上で、大文字・小文字・数字を含む必要があります'
  },

  name: {
    required: true,
    minLength: 1,
    maxLength: 50,
    trim: true
  },

  employeeCode: {
    required: false,
    minLength: 1,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9-]+$/,
    unique: true
  },

  // 組織関連
  companyCode: {
    required: true,
    minLength: 1,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_-]+$/,
    unique: 'per_system'
  },

  departmentCode: {
    required: true,
    minLength: 1,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_-]+$/,
    unique: 'per_company'
  },

  // ワークフロー関連
  requestNumber: {
    required: true,
    minLength: 10,
    maxLength: 30,
    pattern: /^[A-Z0-9-]+$/,
    unique: true,
    autoGenerate: true
  },

  title: {
    required: true,
    minLength: 1,
    maxLength: 100,
    trim: true
  },

  description: {
    required: false,
    maxLength: 2000,
    trim: true
  },

  amount: {
    required: false,
    min: 0,
    max: 999999999999.99,
    decimal: 2
  },

  // ファイル関連
  fileName: {
    required: true,
    minLength: 1,
    maxLength: 255,
    pattern: /^[^<>:"/\\|?*]+$/
  },

  fileSize: {
    required: true,
    min: 1,
    max: 1073741824, // 1GB
    type: 'integer'
  },

  mimeType: {
    required: true,
    allowedValues: [
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  }
};

// ===========================================
// エラーメッセージ定義
// ===========================================

export const errorMessages = {
  required: '{field}は必須です',
  minLength: '{field}は{min}文字以上で入力してください',
  maxLength: '{field}は{max}文字以内で入力してください',
  pattern: '{field}の形式が正しくありません',
  email: '有効なメールアドレスを入力してください',
  unique: 'この{field}は既に使用されています',
  min: '{field}は{min}以上で入力してください',
  max: '{field}は{max}以下で入力してください',
  integer: '{field}は整数で入力してください',
  decimal: '{field}は小数点以下{places}桁以内で入力してください',
  date: '{field}は有効な日付を入力してください',
  futureDate: '{field}は未来の日付を入力してください',
  pastDate: '{field}は過去の日付を入力してください',
  url: '{field}は有効なURLを入力してください',
  phone: '{field}は有効な電話番号を入力してください'
};

/**
 * エラーメッセージ生成関数
 */
export const generateErrorMessage = (
  rule: string,
  field: string,
  params?: Record<string, any>
): string => {
  let message = errorMessages[rule] || 'バリデーションエラーが発生しました';

  // パラメータ置換
  message = message.replace('{field}', field);
  if (params) {
    Object.keys(params).forEach(key => {
      message = message.replace(`{${key}}`, params[key]);
    });
  }

  return message;
};

// ===========================================
// express-validator統合
// ===========================================

/**
 * ユーザー作成バリデーション
 */
export const validateCreateUser = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('ユーザー名は3-30文字の英数字、アンダースコア、ハイフンで入力してください'),

  body('email')
    .isEmail()
    .isLength({ max: 254 })
    .normalizeEmail()
    .withMessage('有効なメールアドレスを入力してください'),

  body('password')
    .isLength({ min: 8, max: 128 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/)
    .withMessage('パスワードは8文字以上で、大文字・小文字・数字を含む必要があります'),

  body('name')
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage('氏名は1-50文字で入力してください'),

  body('employeeCode')
    .optional()
    .isLength({ max: 20 })
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage('社員番号は英数字とハイフンで入力してください')
];

/**
 * ユーザー更新バリデーション
 */
export const validateUpdateUser = [
  body('email')
    .optional()
    .isEmail()
    .isLength({ max: 254 })
    .normalizeEmail()
    .withMessage('有効なメールアドレスを入力してください'),

  body('name')
    .optional()
    .isLength({ min: 1, max: 50 })
    .trim()
    .withMessage('氏名は1-50文字で入力してください'),

  body('employeeCode')
    .optional()
    .isLength({ max: 20 })
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage('社員番号は英数字とハイフンで入力してください')
];

/**
 * 会社作成バリデーション
 */
export const validateCreateCompany = [
  body('code')
    .isLength({ min: 1, max: 20 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('会社コードは1-20文字の英数字、アンダースコア、ハイフンで入力してください'),

  body('name')
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('会社名は1-100文字で入力してください'),

  body('nameKana')
    .optional()
    .isLength({ max: 100 })
    .withMessage('会社名カナは100文字以内で入力してください'),

  body('industry')
    .optional()
    .isLength({ max: 50 })
    .withMessage('業界は50文字以内で入力してください'),

  body('phone')
    .optional()
    .matches(/^[\d-+().\s]+$/)
    .isLength({ min: 10, max: 20 })
    .withMessage('電話番号は有効な形式で入力してください'),

  body('email')
    .optional()
    .isEmail()
    .isLength({ max: 254 })
    .withMessage('有効なメールアドレスを入力してください')
];

/**
 * 部署作成バリデーション
 */
export const validateCreateDepartment = [
  body('code')
    .isLength({ min: 1, max: 20 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('部署コードは1-20文字の英数字、アンダースコア、ハイフンで入力してください'),

  body('name')
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('部署名は1-100文字で入力してください'),

  body('nameKana')
    .optional()
    .isLength({ max: 100 })
    .withMessage('部署名カナは100文字以内で入力してください'),

  body('parentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('親部署IDは1以上の整数で入力してください'),

  body('level')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('階層レベルは1-10の整数で入力してください')
];

/**
 * ワークフロータイプ作成バリデーション
 */
export const validateCreateWorkflowType = [
  body('code')
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('ワークフローコードは1-50文字の英数字、アンダースコア、ハイフンで入力してください'),

  body('name')
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('ワークフロー名は1-100文字で入力してください'),

  body('description')
    .optional()
    .isLength({ max: 2000 })
    .trim()
    .withMessage('説明は2000文字以内で入力してください'),

  body('category')
    .isIn(['EXPENSE', 'LEAVE', 'PURCHASE', 'GENERAL', 'USER_MANAGEMENT', 'DEPARTMENT_MANAGEMENT'])
    .withMessage('カテゴリは有効な値を選択してください'),

  body('formSchema')
    .isObject()
    .withMessage('フォームスキーマは有効なJSONオブジェクトで入力してください'),

  body('maxAmount')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .custom((value) => {
      const num = parseFloat(value);
      if (num < 0 || num > 999999999999.99) {
        throw new Error('金額上限は0以上、999兆円以下で入力してください');
      }
      return true;
    })
];

/**
 * ワークフロータイプ更新バリデーション
 */
export const validateUpdateWorkflowType = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('ワークフロー名は1-100文字で入力してください'),

  body('description')
    .optional()
    .isLength({ max: 2000 })
    .trim()
    .withMessage('説明は2000文字以内で入力してください'),

  body('formSchema')
    .optional()
    .isObject()
    .withMessage('フォームスキーマは有効なJSONオブジェクトで入力してください'),

  body('maxAmount')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .custom((value) => {
      const num = parseFloat(value);
      if (num < 0 || num > 999999999999.99) {
        throw new Error('金額上限は0以上、999兆円以下で入力してください');
      }
      return true;
    }),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('有効フラグはboolean値で入力してください')
];

/**
 * ワークフロー申請作成バリデーション
 */
export const validateCreateWorkflowRequest = [
  body('workflowTypeId')
    .isInt({ min: 1 })
    .withMessage('ワークフロータイプIDは1以上の整数で入力してください'),

  body('title')
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('タイトルは1-100文字で入力してください'),

  body('description')
    .optional()
    .isLength({ max: 2000 })
    .trim()
    .withMessage('説明は2000文字以内で入力してください'),

  body('formData')
    .isObject()
    .withMessage('フォームデータは有効なJSONオブジェクトで入力してください'),

  body('amount')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .custom((value) => {
      const num = parseFloat(value);
      if (num < 0 || num > 999999999999.99) {
        throw new Error('金額は0以上、999兆円以下で入力してください');
      }
      return true;
    }),

  body('priority')
    .optional()
    .isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
    .withMessage('優先度は有効な値を選択してください'),

  body('dueDate')
    .optional()
    .isISO8601()
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('期限日は未来の日付を入力してください');
      }
      return true;
    })
];

/**
 * ワークフロー申請更新バリデーション
 */
export const validateUpdateWorkflowRequest = [
  body('title')
    .optional()
    .isLength({ min: 1, max: 100 })
    .trim()
    .withMessage('タイトルは1-100文字で入力してください'),

  body('description')
    .optional()
    .isLength({ max: 2000 })
    .trim()
    .withMessage('説明は2000文字以内で入力してください'),

  body('formData')
    .optional()
    .isObject()
    .withMessage('フォームデータは有効なJSONオブジェクトで入力してください'),

  body('amount')
    .optional()
    .isDecimal({ decimal_digits: '0,2' })
    .custom((value) => {
      const num = parseFloat(value);
      if (num < 0 || num > 999999999999.99) {
        throw new Error('金額は0以上、999兆円以下で入力してください');
      }
      return true;
    }),

  body('priority')
    .optional()
    .isIn(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
    .withMessage('優先度は有効な値を選択してください'),

  body('dueDate')
    .optional()
    .isISO8601()
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('期限日は未来の日付を入力してください');
      }
      return true;
    })
];

/**
 * リスト取得クエリバリデーション
 */
export const validateListQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ページ番号は1以上の整数で指定してください'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('取得件数は1-100の整数で指定してください'),

  query('search')
    .optional()
    .isLength({ max: 100 })
    .trim()
    .withMessage('検索キーワードは100文字以内で入力してください')
];

/**
 * 承認処理バリデーション
 */
export const validateApprovalAction = [
  body('action')
    .isIn(['APPROVE', 'REJECT', 'RETURN', 'DELEGATE', 'SKIP'])
    .withMessage('承認アクションは有効な値を選択してください'),

  body('comment')
    .optional()
    .isLength({ max: 2000 })
    .trim()
    .withMessage('コメントは2000文字以内で入力してください'),

  body('delegatedTo')
    .if(body('action').equals('DELEGATE'))
    .isInt({ min: 1 })
    .withMessage('代理先ユーザーIDは1以上の整数で入力してください')
];

/**
 * 承認代理設定バリデーション
 */
export const validateCreateApprovalDelegate = [
  body('delegateId')
    .isInt({ min: 1 })
    .withMessage('代理ユーザーIDは1以上の整数で入力してください'),

  body('workflowTypeId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ワークフロータイプIDは1以上の整数で入力してください'),

  body('startDate')
    .isISO8601()
    .withMessage('開始日は有効な日付形式で入力してください'),

  body('endDate')
    .isISO8601()
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) {
        throw new Error('終了日は開始日より後の日付を入力してください');
      }
      return true;
    }),

  body('reason')
    .optional()
    .isLength({ max: 500 })
    .trim()
    .withMessage('理由は500文字以内で入力してください')
];

/**
 * ファイルアップロードバリデーション
 */
export const validateFileUpload = [
  body('fileName')
    .isLength({ min: 1, max: 255 })
    .matches(/^[^<>:"/\\|?*]+$/)
    .withMessage('ファイル名は1-255文字で、使用できない文字が含まれていません'),

  body('fileSize')
    .isInt({ min: 1, max: 1073741824 })
    .withMessage('ファイルサイズは1バイト以上、1GB以下である必要があります'),

  body('mimeType')
    .isIn([
      'image/jpeg', 'image/png', 'image/gif',
      'application/pdf', 'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ])
    .withMessage('サポートされていないファイル形式です')
];

/**
 * IDパラメータバリデーション
 */
export const validateIdParam = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('IDは1以上の整数で指定してください')
];

/**
 * ページネーションバリデーション
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ページ番号は1以上の整数で指定してください'),

  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('ページサイズは1-100の整数で指定してください'),

  query('search')
    .optional()
    .isLength({ max: 100 })
    .trim()
    .withMessage('検索キーワードは100文字以内で入力してください')
];

/**
 * 承認制御設定バリデーション
 */
export const validateApprovalControlSetting = [
  body('feature_code')
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('機能コードは1-50文字の英数字、アンダースコア、ハイフンで入力してください'),

  body('operation_code')
    .isLength({ min: 1, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('操作コードは1-50文字の英数字、アンダースコア、ハイフンで入力してください'),

  body('is_approval_enabled')
    .isBoolean()
    .withMessage('承認有効フラグはboolean値で入力してください'),

  body('workflow_type_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('ワークフロータイプIDは1以上の整数で入力してください'),

  body('conditions')
    .optional()
    .isObject()
    .withMessage('条件は有効なJSONオブジェクトで入力してください'),

  body('bypass_roles')
    .optional()
    .isArray()
    .withMessage('バイパス権限は配列で入力してください')
];

// ===========================================
// カスタムバリデーター
// ===========================================

/**
 * JSON形式バリデーション
 */
export const validateJson = (value: string): boolean => {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * 循環参照チェック（部署階層等）
 */
export const validateNoCircularReference = async (
  id: number,
  parentId: number,
  tableName: string
): Promise<boolean> => {
  // 実装は実際のデータベース構造に依存
  // ここでは基本的なチェックのみ
  return id !== parentId;
};

/**
 * 一意性チェック（スコープ付き）
 */
export const validateUniqueInScope = async (
  value: string,
  tableName: string,
  columnName: string,
  scopeColumn?: string,
  scopeValue?: any
): Promise<boolean> => {
  // 実装は実際のデータベースアクセス層に依存
  // ここでは基本的な形のみ定義
  return true; // 実際の実装では Prisma を使用
};
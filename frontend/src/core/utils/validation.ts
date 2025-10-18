/**
 * フロントエンド統一バリデーション定義
 *
 * データ辞書・バリデーション定義書に基づく
 * Vue.js / Element Plus用のバリデーション関数とルール定義
 */

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
export const validateFutureDate = (date: Date | string): boolean => {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  return targetDate > new Date();
};

/**
 * 日付バリデーション（過去日付）
 */
export const validatePastDate = (date: Date | string): boolean => {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  return targetDate <= new Date();
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

// ===========================================
// enum定義（バックエンドと同期）
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
  phone: '{field}は有効な電話番号を入力してください',
  passwordStrength: 'パスワードは8文字以上で、大文字・小文字・数字を含む必要があります'
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
// Element Plus用バリデーションルール
// ===========================================

/**
 * Element Plus Form用バリデーションルール生成
 */
export const createValidationRule = (
  fieldName: string,
  rules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    min?: number;
    max?: number;
    validator?: (value: any) => boolean;
    message?: string;
  }
) => {
  const elementRules: any[] = [];

  // 必須チェック
  if (rules.required) {
    elementRules.push({
      required: true,
      message: generateErrorMessage('required', fieldName),
      trigger: 'blur'
    });
  }

  // 文字列長チェック
  if (rules.minLength !== undefined || rules.maxLength !== undefined) {
    elementRules.push({
      min: rules.minLength || 0,
      max: rules.maxLength || 255,
      message: generateErrorMessage('minLength', fieldName, {
        min: rules.minLength,
        max: rules.maxLength
      }),
      trigger: 'blur'
    });
  }

  // パターンチェック
  if (rules.pattern) {
    elementRules.push({
      pattern: rules.pattern,
      message: rules.message || generateErrorMessage('pattern', fieldName),
      trigger: 'blur'
    });
  }

  // 数値範囲チェック
  if (rules.min !== undefined || rules.max !== undefined) {
    elementRules.push({
      type: 'number',
      min: rules.min,
      max: rules.max,
      message: generateErrorMessage('min', fieldName, {
        min: rules.min,
        max: rules.max
      }),
      trigger: 'blur'
    });
  }

  // カスタムバリデーター
  if (rules.validator) {
    elementRules.push({
      validator: (rule: any, value: any, callback: Function) => {
        if (rules.validator!(value)) {
          callback();
        } else {
          callback(new Error(rules.message || generateErrorMessage('pattern', fieldName)));
        }
      },
      trigger: 'blur'
    });
  }

  return elementRules;
};

// ===========================================
// 事前定義されたバリデーションルール
// ===========================================

/**
 * ユーザー名バリデーション
 */
export const usernameRules = createValidationRule('ユーザー名', {
  required: true,
  minLength: 3,
  maxLength: 30,
  pattern: /^[a-zA-Z0-9_-]+$/
});

/**
 * メールアドレスバリデーション
 */
export const emailRules = createValidationRule('メールアドレス', {
  required: true,
  validator: validateEmail
});

/**
 * パスワードバリデーション
 */
export const passwordRules = createValidationRule('パスワード', {
  required: true,
  minLength: 8,
  maxLength: 128,
  validator: validatePasswordStrength,
  message: errorMessages.passwordStrength
});

/**
 * 氏名バリデーション
 */
export const nameRules = createValidationRule('氏名', {
  required: true,
  minLength: 1,
  maxLength: 50
});

/**
 * 社員番号バリデーション
 */
export const employeeCodeRules = createValidationRule('社員番号', {
  maxLength: 20,
  pattern: /^[a-zA-Z0-9-]+$/
});

/**
 * 会社コードバリデーション
 */
export const companyCodeRules = createValidationRule('会社コード', {
  required: true,
  minLength: 1,
  maxLength: 20,
  pattern: /^[a-zA-Z0-9_-]+$/
});

/**
 * 部署コードバリデーション
 */
export const departmentCodeRules = createValidationRule('部署コード', {
  required: true,
  minLength: 1,
  maxLength: 20,
  pattern: /^[a-zA-Z0-9_-]+$/
});

/**
 * 電話番号バリデーション
 */
export const phoneRules = createValidationRule('電話番号', {
  validator: validatePhone
});

/**
 * URLバリデーション
 */
export const urlRules = createValidationRule('URL', {
  validator: validateUrl
});

/**
 * 金額バリデーション
 */
export const amountRules = createValidationRule('金額', {
  min: 0,
  max: 999999999999.99
});

/**
 * タイトルバリデーション
 */
export const titleRules = createValidationRule('タイトル', {
  required: true,
  minLength: 1,
  maxLength: 100
});

/**
 * 説明バリデーション
 */
export const descriptionRules = createValidationRule('説明', {
  maxLength: 2000
});

/**
 * ファイル名バリデーション
 */
export const fileNameRules = createValidationRule('ファイル名', {
  required: true,
  minLength: 1,
  maxLength: 255,
  pattern: /^[^<>:"/\\|?*]+$/
});

// ===========================================
// 条件付きバリデーション
// ===========================================

/**
 * 条件付き必須バリデーション
 */
export const conditionalRequired = (
  fieldName: string,
  condition: () => boolean
) => [
  {
    validator: (rule: any, value: any, callback: Function) => {
      if (condition() && (!value || value.trim() === '')) {
        callback(new Error(generateErrorMessage('required', fieldName)));
      } else {
        callback();
      }
    },
    trigger: 'blur'
  }
];

/**
 * 日付範囲バリデーション
 */
export const dateRangeRules = (
  startFieldName: string,
  endFieldName: string,
  startDate: Date | string,
  endDate: Date | string
) => [
  {
    validator: (rule: any, value: any, callback: Function) => {
      const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
      const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

      if (start && end && start >= end) {
        callback(new Error(`${endFieldName}は${startFieldName}より後の日付を入力してください`));
      } else {
        callback();
      }
    },
    trigger: 'blur'
  }
];

/**
 * 重複チェックバリデーション（API呼び出し）
 */
export const uniqueValidation = (
  fieldName: string,
  checkUnique: (value: string) => Promise<boolean>
) => [
  {
    validator: async (rule: any, value: any, callback: Function) => {
      if (!value) {
        callback();
        return;
      }

      try {
        const isUnique = await checkUnique(value);
        if (!isUnique) {
          callback(new Error(generateErrorMessage('unique', fieldName)));
        } else {
          callback();
        }
      } catch (error) {
        callback(new Error('重複チェック中にエラーが発生しました'));
      }
    },
    trigger: 'blur'
  }
];

// ===========================================
// フォーム全体バリデーション
// ===========================================

/**
 * ユーザー作成フォームバリデーション
 */
export const userCreateFormRules = {
  username: usernameRules,
  email: emailRules,
  password: passwordRules,
  name: nameRules,
  employeeCode: employeeCodeRules
};

/**
 * 会社作成フォームバリデーション
 */
export const companyCreateFormRules = {
  code: companyCodeRules,
  name: nameRules,
  phone: phoneRules,
  email: emailRules
};

/**
 * 部署作成フォームバリデーション
 */
export const departmentCreateFormRules = {
  code: departmentCodeRules,
  name: nameRules
};

/**
 * ワークフロー申請フォームバリデーション
 */
export const workflowRequestFormRules = {
  title: titleRules,
  description: descriptionRules,
  amount: amountRules
};

/**
 * 承認処理フォームバリデーション
 */
export const approvalActionFormRules = {
  comment: descriptionRules
};

// ===========================================
// ユーティリティ関数
// ===========================================

/**
 * フォームバリデーション実行
 */
export const validateForm = async (formRef: any): Promise<boolean> => {
  try {
    await formRef.validate();
    return true;
  } catch (error) {
    console.error('Form validation failed:', error);
    return false;
  }
};

/**
 * フィールドバリデーションクリア
 */
export const clearValidation = (formRef: any, fields?: string[]) => {
  if (fields) {
    fields.forEach(field => {
      formRef.clearValidate(field);
    });
  } else {
    formRef.clearValidate();
  }
};

/**
 * バリデーションエラー表示
 */
export const showValidationErrors = (errors: Record<string, string[]>) => {
  const errorMessages = Object.entries(errors)
    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
    .join('\n');

  // Element Plus の ElMessage を使用する場合
  // ElMessage.error(errorMessages);

  return errorMessages;
};

/**
 * ファイルタイプバリデーション
 */
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

/**
 * ファイルサイズバリデーション
 */
export const validateFileSize = (file: File, maxSize: number): boolean => {
  return file.size <= maxSize;
};

/**
 * 画像ファイルバリデーション
 */
export const validateImageFile = (file: File): { valid: boolean; message?: string } => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!validateFileType(file, allowedTypes)) {
    return {
      valid: false,
      message: 'JPEG、PNG、GIF形式のファイルのみアップロード可能です'
    };
  }

  if (!validateFileSize(file, maxSize)) {
    return {
      valid: false,
      message: 'ファイルサイズは10MB以下である必要があります'
    };
  }

  return { valid: true };
};

/**
 * ドキュメントファイルバリデーション
 */
export const validateDocumentFile = (file: File): { valid: boolean; message?: string } => {
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  const maxSize = 50 * 1024 * 1024; // 50MB

  if (!validateFileType(file, allowedTypes)) {
    return {
      valid: false,
      message: 'PDF、テキスト、Excel、Word形式のファイルのみアップロード可能です'
    };
  }

  if (!validateFileSize(file, maxSize)) {
    return {
      valid: false,
      message: 'ファイルサイズは50MB以下である必要があります'
    };
  }

  return { valid: true };
};
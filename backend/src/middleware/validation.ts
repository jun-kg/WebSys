/**
 * Input Validation & Sanitization Middleware
 * 入力検証・サニタイゼーション強化ミドルウェア
 *
 * 機能:
 * - 包括的入力検証
 * - XSS攻撃対策
 * - SQLインジェクション対策
 * - NoSQLインジェクション対策
 * - ファイルアップロード検証
 * - データサニタイゼーション
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { log, LogCategory } from '../utils/logger';

interface ValidationConfig {
  maxStringLength: number;
  maxArrayLength: number;
  maxObjectDepth: number;
  allowedMimeTypes: string[];
  maxFileSize: number;
  sanitizeHtml: boolean;
  strictMode: boolean;
}

const defaultConfig: ValidationConfig = {
  maxStringLength: 10000,      // 最大文字列長
  maxArrayLength: 1000,        // 最大配列長
  maxObjectDepth: 10,          // 最大オブジェクト深度
  allowedMimeTypes: [          // 許可されるMIMEタイプ
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json'
  ],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  sanitizeHtml: true,             // HTML サニタイゼーション
  strictMode: false               // 厳格モード
};

/**
 * 危険なパターンの検出
 */
const dangerousPatterns = [
  // SQLインジェクション
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  // NoSQLインジェクション
  /(\$where|\$regex|\$ne|\$gt|\$lt|\$in|\$nin)/gi,
  // JavaScriptインジェクション
  /(javascript:|data:text\/html|vbscript:|onload=|onerror=|onclick=)/gi,
  // パストラバーサル
  /(\.\.\/|\.\.\\|\.\.\%2f|\.\.\%5c)/gi,
  // コマンドインジェクション
  /(\||&|;|\$\(|\`|<|>)/g,
  // プロトタイプ汚染
  /(__proto__|constructor\.prototype|\.constructor\.prototype)/gi
];

/**
 * HTML文字のエスケープ
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * 文字列値の検証・サニタイゼーション
 */
function validateAndSanitizeString(
  value: string,
  config: ValidationConfig,
  path: string = ''
): { isValid: boolean; sanitized: string; error?: string } {

  // 長さチェック
  if (value.length > config.maxStringLength) {
    return {
      isValid: false,
      sanitized: value,
      error: `String too long at ${path}: ${value.length} > ${config.maxStringLength}`
    };
  }

  // 危険なパターンチェック
  for (const pattern of dangerousPatterns) {
    if (pattern.test(value)) {
      log.security('Dangerous pattern detected', {
        path,
        pattern: pattern.toString(),
        value: value.substring(0, 100)
      });

      if (config.strictMode) {
        return {
          isValid: false,
          sanitized: value,
          error: `Dangerous pattern detected at ${path}`
        };
      }
    }
  }

  // HTMLサニタイゼーション
  let sanitized = value;
  if (config.sanitizeHtml) {
    sanitized = escapeHtml(value);
  }

  // 制御文字の除去
  sanitized = sanitized.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

  return {
    isValid: true,
    sanitized
  };
}

/**
 * オブジェクトの深度チェック
 */
function getObjectDepth(obj: any, depth: number = 0): number {
  if (depth > 50) return depth; // 無限再帰防止

  if (obj && typeof obj === 'object') {
    const depths = Object.values(obj).map(value =>
      getObjectDepth(value, depth + 1)
    );
    return Math.max(depth, ...depths);
  }
  return depth;
}

/**
 * 配列の検証
 */
function validateArray(
  arr: any[],
  config: ValidationConfig,
  path: string = ''
): { isValid: boolean; sanitized: any[]; error?: string } {

  if (arr.length > config.maxArrayLength) {
    return {
      isValid: false,
      sanitized: arr,
      error: `Array too long at ${path}: ${arr.length} > ${config.maxArrayLength}`
    };
  }

  const sanitized: any[] = [];

  for (let i = 0; i < arr.length; i++) {
    const result = validateAndSanitizeValue(arr[i], config, `${path}[${i}]`);
    if (!result.isValid) {
      return result;
    }
    sanitized.push(result.sanitized);
  }

  return {
    isValid: true,
    sanitized
  };
}

/**
 * オブジェクトの検証
 */
function validateObject(
  obj: any,
  config: ValidationConfig,
  path: string = ''
): { isValid: boolean; sanitized: any; error?: string } {

  // 深度チェック
  const depth = getObjectDepth(obj);
  if (depth > config.maxObjectDepth) {
    return {
      isValid: false,
      sanitized: obj,
      error: `Object too deep at ${path}: ${depth} > ${config.maxObjectDepth}`
    };
  }

  // プロトタイプ汚染チェック
  if (obj.hasOwnProperty('__proto__') || obj.hasOwnProperty('constructor')) {
    log.security('Prototype pollution attempt detected', { path });

    if (config.strictMode) {
      return {
        isValid: false,
        sanitized: obj,
        error: `Prototype pollution attempt at ${path}`
      };
    }

    // 危険なプロパティを削除
    delete obj.__proto__;
    delete obj.constructor;
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    // キーの検証
    const keyResult = validateAndSanitizeString(key, config, `${path}.${key}`);
    if (!keyResult.isValid) {
      return {
        isValid: false,
        sanitized: obj,
        error: keyResult.error
      };
    }

    // 値の検証
    const valueResult = validateAndSanitizeValue(value, config, `${path}.${key}`);
    if (!valueResult.isValid) {
      return valueResult;
    }

    sanitized[keyResult.sanitized] = valueResult.sanitized;
  }

  return {
    isValid: true,
    sanitized
  };
}

/**
 * 値の検証・サニタイゼーション（再帰的）
 */
function validateAndSanitizeValue(
  value: any,
  config: ValidationConfig,
  path: string = ''
): { isValid: boolean; sanitized: any; error?: string } {

  if (value === null || value === undefined) {
    return { isValid: true, sanitized: value };
  }

  switch (typeof value) {
    case 'string':
      return validateAndSanitizeString(value, config, path);

    case 'number':
      // 数値の検証
      if (!isFinite(value) || value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER) {
        return {
          isValid: false,
          sanitized: value,
          error: `Invalid number at ${path}: ${value}`
        };
      }
      return { isValid: true, sanitized: value };

    case 'boolean':
      return { isValid: true, sanitized: value };

    case 'object':
      if (Array.isArray(value)) {
        return validateArray(value, config, path);
      } else {
        return validateObject(value, config, path);
      }

    default:
      if (config.strictMode) {
        return {
          isValid: false,
          sanitized: value,
          error: `Unsupported type at ${path}: ${typeof value}`
        };
      }
      return { isValid: true, sanitized: value };
  }
}

/**
 * バリデーション結果をチェックし、エラーがある場合は400レスポンスを返すミドルウェア
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'バリデーションエラーが発生しました',
      details: errors.array().map(error => ({
        field: 'param' in error ? error.param : error.type,
        message: error.msg,
        value: 'value' in error ? error.value : undefined
      }))
    });
  }

  next();
};

/**
 * ファイルアップロード検証
 */
export const validateFileUpload = (config: Partial<ValidationConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files ?
      (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) :
      [req.file];

    for (const file of files) {
      if (!file) continue;

      // ファイルサイズチェック
      if (file.size > finalConfig.maxFileSize) {
        log.security('File size limit exceeded', {
          filename: file.originalname,
          size: file.size,
          limit: finalConfig.maxFileSize
        });

        return res.status(413).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `ファイルサイズが上限を超えています: ${file.originalname}`
          }
        });
      }

      // MIMEタイプチェック
      if (!finalConfig.allowedMimeTypes.includes(file.mimetype)) {
        log.security('Invalid file type uploaded', {
          filename: file.originalname,
          mimetype: file.mimetype,
          allowed: finalConfig.allowedMimeTypes
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: `許可されていないファイル形式です: ${file.originalname}`
          }
        });
      }

      // ファイル名の検証
      const filename = file.originalname;
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        log.security('Suspicious filename detected', { filename });

        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILENAME',
            message: '不正なファイル名が検出されました'
          }
        });
      }
    }

    next();
  };
};

/**
 * JSON入力検証ミドルウェア
 */
export const validateJsonInput = (config: Partial<ValidationConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      return next();
    }

    try {
      const result = validateAndSanitizeValue(req.body, finalConfig, 'body');

      if (!result.isValid) {
        log.security('Input validation failed', {
          error: result.error,
          ip: req.ip,
          url: req.url,
          method: req.method
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'リクエストデータが不正です'
          }
        });
      }

      // サニタイズされたデータで置換
      req.body = result.sanitized;

      next();

    } catch (error) {
      log.error(LogCategory.SEC, 'Validation middleware error', error as Error);

      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_PROCESSING_ERROR',
          message: '入力検証処理中にエラーが発生しました'
        }
      });
    }
  };
};

/**
 * クエリパラメータ検証ミドルウェア
 */
export const validateQueryParams = (config: Partial<ValidationConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config };

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.query || Object.keys(req.query).length === 0) {
      return next();
    }

    try {
      const result = validateAndSanitizeValue(req.query, finalConfig, 'query');

      if (!result.isValid) {
        log.security('Query validation failed', {
          error: result.error,
          ip: req.ip,
          url: req.url,
          method: req.method
        });

        return res.status(400).json({
          success: false,
          error: {
            code: 'QUERY_VALIDATION_ERROR',
            message: 'クエリパラメータが不正です'
          }
        });
      }

      // サニタイズされたデータで置換
      req.query = result.sanitized;

      next();

    } catch (error) {
      log.error(LogCategory.SEC, 'Query validation middleware error', error as Error);

      res.status(500).json({
        success: false,
        error: {
          code: 'QUERY_VALIDATION_PROCESSING_ERROR',
          message: 'クエリ検証処理中にエラーが発生しました'
        }
      });
    }
  };
};

/**
 * 包括的入力検証ミドルウェア
 */
export const comprehensiveValidation = (config: Partial<ValidationConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config };

  return [
    validateQueryParams(finalConfig),
    validateJsonInput(finalConfig),
    validateFileUpload(finalConfig)
  ];
};

/**
 * 厳格モード検証（管理機能用）
 */
export const strictValidation = comprehensiveValidation({
  strictMode: true,
  maxStringLength: 1000,
  maxArrayLength: 100,
  maxObjectDepth: 5
});
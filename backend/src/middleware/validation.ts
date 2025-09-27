import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

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
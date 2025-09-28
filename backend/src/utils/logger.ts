/**
 * Logger Utility
 * ログ出力ユーティリティ
 *
 * 機能:
 * - 構造化ログ出力
 * - ログレベル管理
 * - パフォーマンス測定
 * - エラーコンテキスト記録
 */

export enum LogLevel {
  TRACE = 10,
  DEBUG = 20,
  INFO = 30,
  WARN = 40,
  ERROR = 50,
  FATAL = 60
}

export enum LogCategory {
  AUTH = 'AUTH',
  API = 'API',
  DB = 'DB',
  SEC = 'SEC',
  SYS = 'SYS',
  USER = 'USER',
  PERF = 'PERF',
  ERR = 'ERR',
  EMAIL = 'EMAIL',
  WORKFLOW = 'WORKFLOW',
  PERMISSION = 'PERMISSION'
}

interface LogContext {
  userId?: number;
  requestId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  duration?: number;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class Logger {
  private static instance: Logger;
  private minLevel: LogLevel;

  constructor() {
    this.minLevel = this.getLogLevel();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getLogLevel(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase();
    switch (level) {
      case 'TRACE': return LogLevel.TRACE;
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      case 'FATAL': return LogLevel.FATAL;
      default: return process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatLogEntry(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp;
    const category = `[${entry.category}]`;

    let output = `${timestamp} ${levelName.padEnd(5)} ${category.padEnd(12)} ${entry.message}`;

    if (entry.context && Object.keys(entry.context).length > 0) {
      output += ` | Context: ${JSON.stringify(entry.context)}`;
    }

    if (entry.error) {
      output += ` | Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack && this.shouldLog(LogLevel.DEBUG)) {
        output += `\n${entry.error.stack}`;
      }
    }

    return output;
  }

  private log(level: LogLevel, category: LogCategory, message: string, context?: LogContext, error?: Error): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };

    const output = this.formatLogEntry(entry);

    // コンソール出力（開発環境）
    if (process.env.NODE_ENV === 'development') {
      if (level >= LogLevel.ERROR) {
        console.error(output);
      } else if (level >= LogLevel.WARN) {
        console.warn(output);
      } else {
        console.log(output);
      }
    }

    // 本番環境では構造化ログとして出力
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(entry));
    }
  }

  // ログレベル別メソッド
  trace(category: LogCategory, message: string, context?: LogContext): void {
    this.log(LogLevel.TRACE, category, message, context);
  }

  debug(category: LogCategory, message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, category, message, context);
  }

  info(category: LogCategory, message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, category, message, context);
  }

  warn(category: LogCategory, message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, category, message, context);
  }

  error(category: LogCategory, message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, category, message, context, error);
  }

  fatal(category: LogCategory, message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.FATAL, category, message, context, error);
  }

  // 便利メソッド
  auth(message: string, context?: LogContext): void {
    this.info(LogCategory.AUTH, message, context);
  }

  api(message: string, context?: LogContext): void {
    this.info(LogCategory.API, message, context);
  }

  db(message: string, context?: LogContext): void {
    this.debug(LogCategory.DB, message, context);
  }

  security(message: string, context?: LogContext): void {
    this.warn(LogCategory.SEC, message, context);
  }

  performance(message: string, duration: number, context?: LogContext): void {
    this.info(LogCategory.PERF, message, { ...context, duration });
  }

  // パフォーマンス測定
  startTimer(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.performance(`${label} completed`, duration, { label });
    };
  }

  // リクエストログ
  request(method: string, url: string, userId?: number, context?: LogContext): void {
    this.api(`${method} ${url}`, {
      ...context,
      method,
      url,
      userId
    });
  }

  // レスポンスログ
  response(method: string, url: string, status: number, duration: number, context?: LogContext): void {
    const level = status >= 500 ? LogLevel.ERROR : status >= 400 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, LogCategory.API, `${method} ${url} ${status}`, {
      ...context,
      method,
      url,
      status,
      duration
    });
  }
}

// シングルトンインスタンス
export const logger = Logger.getInstance();

// 便利な関数エクスポート
export const log = {
  trace: (category: LogCategory, message: string, context?: LogContext) => logger.trace(category, message, context),
  debug: (category: LogCategory, message: string, context?: LogContext) => logger.debug(category, message, context),
  info: (category: LogCategory, message: string, context?: LogContext) => logger.info(category, message, context),
  warn: (category: LogCategory, message: string, context?: LogContext) => logger.warn(category, message, context),
  error: (category: LogCategory, message: string, error?: Error, context?: LogContext) => logger.error(category, message, error, context),
  fatal: (category: LogCategory, message: string, error?: Error, context?: LogContext) => logger.fatal(category, message, error, context),

  auth: (message: string, context?: LogContext) => logger.auth(message, context),
  api: (message: string, context?: LogContext) => logger.api(message, context),
  db: (message: string, context?: LogContext) => logger.db(message, context),
  security: (message: string, context?: LogContext) => logger.security(message, context),
  performance: (message: string, duration: number, context?: LogContext) => logger.performance(message, duration, context),

  startTimer: (label: string) => logger.startTimer(label),
  request: (method: string, url: string, userId?: number, context?: LogContext) => logger.request(method, url, userId, context),
  response: (method: string, url: string, status: number, duration: number, context?: LogContext) => logger.response(method, url, status, duration, context)
};
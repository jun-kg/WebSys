/**
 * MessageService - ElMessageを拡張したメッセージサービス
 * エラーコードベースのメッセージ管理システム
 */

import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import type { MessageOptions, MessageBoxOptions } from 'element-plus'
import { messageDefinitions, type MessageDefinition, type MessageType } from './messageDefinitions'

// メッセージオプション拡張
export interface MessageServiceOptions extends Partial<MessageOptions> {
  showDetail?: boolean       // 詳細メッセージを表示するか
  showCode?: boolean         // エラーコードを表示するか
  duration?: number          // 表示時間（ミリ秒）
  closable?: boolean         // 閉じるボタンを表示するか
  grouping?: boolean         // 同じメッセージをグループ化するか
  offset?: number           // 上部からのオフセット
  appendTo?: string | HTMLElement  // 追加先の要素
  showNotification?: boolean // 通知形式で表示するか
}

// デフォルトオプション
const defaultOptions: MessageServiceOptions = {
  showDetail: false,
  showCode: false,
  duration: 3000,
  closable: false,
  grouping: true,
  offset: 20,
  showNotification: false
}

/**
 * MessageServiceクラス
 * ElMessageを拡張し、エラーコードベースのメッセージ管理を提供
 */
export class MessageService {
  private static instance: MessageService
  private options: MessageServiceOptions

  private constructor(options: MessageServiceOptions = {}) {
    this.options = { ...defaultOptions, ...options }
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(options?: MessageServiceOptions): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService(options)
    }
    return MessageService.instance
  }

  /**
   * グローバルオプションを設定
   */
  setGlobalOptions(options: MessageServiceOptions): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * メッセージコードからメッセージを表示
   */
  showByCode(
    code: string,
    options?: MessageServiceOptions,
    customMessage?: string
  ): void {
    const definition = this.getMessageDefinition(code)

    if (!definition) {
      console.warn(`メッセージコード ${code} が見つかりません`)
      this.showError('E-SYS-001', options) // システムエラーとして処理
      return
    }

    const mergedOptions = { ...this.options, ...options }
    const message = this.formatMessage(definition, mergedOptions, customMessage)

    if (mergedOptions.showNotification) {
      this.showNotification(message, definition.type, mergedOptions)
    } else {
      this.showMessage(message, definition.type, mergedOptions)
    }
  }

  /**
   * エラーメッセージを表示
   */
  showError(code: string, options?: MessageServiceOptions, customMessage?: string): void {
    this.showByCode(code, { ...options, type: 'error' }, customMessage)
  }

  /**
   * 警告メッセージを表示
   */
  showWarning(code: string, options?: MessageServiceOptions, customMessage?: string): void {
    this.showByCode(code, { ...options, type: 'warning' }, customMessage)
  }

  /**
   * 情報メッセージを表示
   */
  showInfo(code: string, options?: MessageServiceOptions, customMessage?: string): void {
    this.showByCode(code, { ...options, type: 'info' }, customMessage)
  }

  /**
   * 成功メッセージを表示
   */
  showSuccess(code: string, options?: MessageServiceOptions, customMessage?: string): void {
    this.showByCode(code, { ...options, type: 'success' }, customMessage)
  }

  /**
   * 確認ダイアログを表示
   */
  async confirm(
    code: string,
    options?: MessageBoxOptions
  ): Promise<boolean> {
    const definition = this.getMessageDefinition(code)

    if (!definition) {
      console.warn(`メッセージコード ${code} が見つかりません`)
      return false
    }

    try {
      await ElMessageBox.confirm(
        definition.detail || definition.message,
        definition.message,
        {
          confirmButtonText: '確認',
          cancelButtonText: 'キャンセル',
          type: definition.type,
          ...options
        }
      )
      return true
    } catch {
      return false
    }
  }

  /**
   * カスタムメッセージを表示
   */
  showCustom(
    message: string,
    type: MessageType = 'info',
    options?: MessageServiceOptions
  ): void {
    const mergedOptions = { ...this.options, ...options }

    if (mergedOptions.showNotification) {
      this.showNotification(message, type, mergedOptions)
    } else {
      this.showMessage(message, type, mergedOptions)
    }
  }

  /**
   * 複数のメッセージを一括表示
   */
  showMultiple(codes: string[], options?: MessageServiceOptions): void {
    codes.forEach((code, index) => {
      setTimeout(() => {
        this.showByCode(code, options)
      }, index * 100) // 100ms間隔で表示
    })
  }

  /**
   * APIエラーレスポンスからメッセージを表示
   */
  showApiError(error: any, defaultCode: string = 'E-NET-004'): void {
    // APIエラーレスポンスの形式に応じて処理
    if (error.response?.data?.code) {
      // バックエンドから返されたエラーコード
      this.showByCode(error.response.data.code)
    } else if (error.response?.data?.message) {
      // カスタムエラーメッセージ
      this.showCustom(error.response.data.message, 'error')
    } else if (error.code === 'ERR_NETWORK') {
      // ネットワークエラー
      this.showError('E-NET-001')
    } else if (error.code === 'ECONNABORTED') {
      // タイムアウト
      this.showError('E-NET-003')
    } else {
      // デフォルトエラー
      this.showError(defaultCode)
    }
  }

  /**
   * バリデーションエラーを表示
   */
  showValidationErrors(errors: Record<string, string>): void {
    const messages = Object.entries(errors).map(([field, message]) => {
      return `${field}: ${message}`
    }).join('\n')

    this.showCustom(messages, 'error', {
      duration: 5000,
      closable: true
    })
  }

  // ===== プライベートメソッド =====

  /**
   * メッセージ定義を取得
   */
  private getMessageDefinition(code: string): MessageDefinition | undefined {
    return messageDefinitions[code]
  }

  /**
   * メッセージをフォーマット
   */
  private formatMessage(
    definition: MessageDefinition,
    options: MessageServiceOptions,
    customMessage?: string
  ): string {
    let message = customMessage || definition.message

    if (options.showDetail && definition.detail) {
      message += `\n${definition.detail}`
    }

    if (options.showCode) {
      message = `[${definition.code}] ${message}`
    }

    return message
  }

  /**
   * ElMessageでメッセージを表示
   */
  private showMessage(
    message: string,
    type: MessageType,
    options: MessageServiceOptions
  ): void {
    ElMessage({
      message,
      type,
      duration: options.duration,
      showClose: options.closable,
      grouping: options.grouping,
      offset: options.offset,
      appendTo: options.appendTo,
      dangerouslyUseHTMLString: false
    })
  }

  /**
   * ElNotificationで通知を表示
   */
  private showNotification(
    message: string,
    type: MessageType,
    options: MessageServiceOptions
  ): void {
    ElNotification({
      message,
      type,
      duration: options.duration,
      showClose: options.closable !== false,
      offset: options.offset,
      dangerouslyUseHTMLString: false
    })
  }

  /**
   * すべてのメッセージをクリア
   */
  clearAll(): void {
    ElMessage.closeAll()
    ElNotification.closeAll()
  }
}

// デフォルトインスタンスをエクスポート
export const messageService = MessageService.getInstance()

// 便利な関数をエクスポート
export const showMessage = (code: string, options?: MessageServiceOptions) =>
  messageService.showByCode(code, options)

export const showError = (code: string, options?: MessageServiceOptions) =>
  messageService.showError(code, options)

export const showWarning = (code: string, options?: MessageServiceOptions) =>
  messageService.showWarning(code, options)

export const showInfo = (code: string, options?: MessageServiceOptions) =>
  messageService.showInfo(code, options)

export const showSuccess = (code: string, options?: MessageServiceOptions) =>
  messageService.showSuccess(code, options)

export const showApiError = (error: any, defaultCode?: string) =>
  messageService.showApiError(error, defaultCode)

export const confirm = (code: string, options?: MessageBoxOptions) =>
  messageService.confirm(code, options)
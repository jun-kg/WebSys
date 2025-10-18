/**
 * メッセージサービスモジュール
 * エクスポート一覧
 */

// メインサービス
export {
  MessageService,
  messageService,
  showMessage,
  showError,
  showWarning,
  showInfo,
  showSuccess,
  showApiError,
  confirm
} from './MessageService'

// メッセージ定義
export {
  messageDefinitions,
  MessageCategories,
  parseMessageCode
} from './messageDefinitions'

// 型定義
export type {
  MessageDefinition,
  MessageType
} from './messageDefinitions'

export type {
  MessageServiceOptions
} from './MessageService'
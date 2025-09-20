export interface CodePreviewProps {
  /** 実行するコード */
  code: string
  /** プログラミング言語（構文ハイライト用） */
  language?: 'javascript' | 'typescript' | 'vue' | 'html' | 'css' | 'json'
  /** プレビューのタイトル */
  title?: string
  /** コンポーネントのバリアント */
  variant?: 'default' | 'preview-only' | 'code-only' | 'compact'
  /** 自動実行するか */
  autoExecute?: boolean
  /** 動的コンポーネントに渡すProps */
  componentProps?: Record<string, any>
  /** レスポンシブ対応 */
  responsive?: boolean
  /** 高さ指定 */
  height?: string
  /** テーマ設定 */
  theme?: 'light' | 'dark'
  /** 実行タイムアウト（ms） */
  executionTimeout?: number
  /** エラーハンドリング */
  onError?: (error: Error) => void
  /** 実行完了時のコールバック */
  onExecute?: (result: any) => void
}

export interface CodeExecutionResult {
  success: boolean
  result?: any
  error?: string
  executionTime?: number
}

export interface CodePreviewTab {
  id: 'preview' | 'code' | 'both'
  label: string
  icon: string
}

export interface SyntaxHighlightOptions {
  language: string
  theme: 'light' | 'dark'
  lineNumbers?: boolean
  highlightLines?: number[]
}

export interface CodePreviewEmits {
  (e: 'execute', result: CodeExecutionResult): void
  (e: 'error', error: Error): void
  (e: 'copy', code: string): void
  (e: 'tab-change', tab: string): void
}
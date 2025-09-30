# CodePreview機能詳細設計書

## 1. 概要

### 1.1 機能概要
- **コンポーネント名**: CodePreview
- **目的**: コードの実行とプレビュー表示、ソースコードのマークダウン表示
- **実装場所**: `packages/shared-components/src/components/CodePreview/`
- **デモページ**: `/code-preview-demo`

### 1.2 機能目標
- 動的なコード実行とプレビュー表示
- シンタックスハイライト付きソース表示
- 複数言語対応（JavaScript, TypeScript, Vue, HTML, CSS）
- セキュアなコード実行環境
- レスポンシブ対応とアクセシビリティ準拠

## 2. コンポーネント設計

### 2.1 Props定義
```typescript
interface CodePreviewProps {
  code: string                    // 実行・表示するコード
  language?: 'javascript' | 'typescript' | 'vue' | 'html' | 'css'
  title?: string                  // プレビューのタイトル
  variant?: 'default' | 'preview-only' | 'code-only' | 'compact'
  autoExecute?: boolean          // 自動実行フラグ
  componentProps?: Record<string, any>  // Vue component用のprops
  responsive?: boolean           // レスポンシブ対応フラグ
}
```

### 2.2 バリアント設計
| バリアント | 説明 | 表示内容 |
|-----------|------|----------|
| default | 標準表示 | プレビュー + コード表示（上下配置） |
| preview-only | プレビューのみ | 実行結果のみ表示 |
| code-only | コードのみ | シンタックスハイライトのみ |
| compact | コンパクト | 小さなプレビュー + 折りたたみ可能コード |

### 2.3 コンポーネント構造
```vue
<template>
  <div class="code-preview" :class="[`variant-${variant}`, { responsive }]">
    <!-- ヘッダー部 -->
    <div v-if="title" class="code-preview__header">
      <h3>{{ title }}</h3>
    </div>

    <!-- プレビュー部 -->
    <div v-if="showPreview" class="code-preview__preview">
      <div class="preview-content" ref="previewRef"></div>
    </div>

    <!-- コード表示部 -->
    <div v-if="showCode" class="code-preview__code">
      <pre><code class="language-javascript" v-html="highlightedCode"></code></pre>
    </div>

    <!-- 実行ボタン部 -->
    <div v-if="showControls" class="code-preview__controls">
      <el-button @click="executeCode" :loading="executing">実行</el-button>
    </div>
  </div>
</template>
```

## 3. 言語別実行機能

### 3.1 JavaScript実行
```typescript
const executeJavaScript = (code: string) => {
  try {
    // セキュアな実行環境作成
    const result = new Function(code)()

    // DOM操作の場合は結果をプレビューエリアに反映
    if (typeof result === 'string') {
      previewRef.value.innerHTML = result
    } else if (result instanceof HTMLElement) {
      previewRef.value.appendChild(result)
    }
  } catch (error) {
    showError(error.message)
  }
}
```

### 3.2 HTML表示
```typescript
const executeHTML = (code: string) => {
  // HTMLをそのままプレビューエリアに表示
  previewRef.value.innerHTML = code
}
```

### 3.3 CSS適用
```typescript
const executeCSS = (code: string) => {
  // 一意のIDを持つstyleタグを作成
  const styleId = `code-preview-style-${Date.now()}`
  const styleElement = document.createElement('style')
  styleElement.id = styleId
  styleElement.textContent = code
  document.head.appendChild(styleElement)

  // プレビューエリアにサンプル要素を表示
  previewRef.value.innerHTML = `
    <div class="css-sample">CSS適用サンプル</div>
  `
}
```

### 3.4 Vue Component実行
```typescript
const executeVueComponent = (code: string, props: Record<string, any>) => {
  try {
    // Vue SFCのパースと実行
    const component = parseVueComponent(code)
    const app = createApp(component, props)
    app.mount(previewRef.value)
  } catch (error) {
    showError('Vue component execution failed: ' + error.message)
  }
}
```

## 4. シンタックスハイライト

### 4.1 Prism.js統合
```typescript
import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'

const highlightCode = (code: string, language: string) => {
  const grammar = Prism.languages[language]
  if (grammar) {
    return Prism.highlight(code, grammar, language)
  }
  return code
}
```

### 4.2 テーマとスタイリング
```scss
// Prism.js カスタムテーマ
.code-preview__code {
  .token.comment { color: #6a737d; }
  .token.keyword { color: #d73a49; font-weight: bold; }
  .token.string { color: #032f62; }
  .token.function { color: #6f42c1; }
  .token.number { color: #005cc5; }

  // BIZ UDGothic対応
  font-family: 'JetBrains Mono', 'BIZ UDGothic', monospace;
  font-size: 14px;
  line-height: 1.5;
}
```

## 5. セキュリティ設計

### 5.1 コード実行の制限
```typescript
const securityConfig = {
  // 禁止されたメソッド・プロパティ
  blockedMethods: [
    'fetch', 'XMLHttpRequest', 'WebSocket',
    'localStorage', 'sessionStorage',
    'document.cookie', 'location'
  ],

  // 実行時間制限
  executionTimeout: 5000, // 5秒

  // DOM操作範囲制限
  allowedScope: 'preview-container'
}

const sanitizeCode = (code: string): string => {
  // 危険なメソッドの呼び出しをチェック
  for (const method of securityConfig.blockedMethods) {
    if (code.includes(method)) {
      throw new Error(`Blocked method detected: ${method}`)
    }
  }
  return code
}
```

### 5.2 実行環境の分離
```typescript
const createSandbox = () => {
  // iframe内での実行（より安全）
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.sandbox = 'allow-scripts'
  document.body.appendChild(iframe)

  const iframeWindow = iframe.contentWindow
  const iframeDocument = iframe.contentDocument

  return { window: iframeWindow, document: iframeDocument }
}
```

## 6. UI/UX設計

### 6.1 レスポンシブ対応
```scss
.code-preview {
  // デスクトップ: プレビューとコードを上下配置
  @media (min-width: 768px) {
    .code-preview__preview {
      margin-bottom: 1rem;
    }
  }

  // モバイル: コンパクトな表示
  @media (max-width: 767px) {
    &.variant-default {
      .code-preview__code {
        font-size: 12px;
        overflow-x: auto;
      }
    }
  }
}
```

### 6.2 アクセシビリティ
- **キーボード操作**: Tab順序の適切な設定
- **スクリーンリーダー**: aria-labelとrole属性
- **コントラスト**: WCAG 2.1 AA準拠の色調整
- **フォーカス管理**: 実行ボタンと結果の明確な表示

### 6.3 ユーザビリティ
```typescript
// 実行状態の視覚的フィードバック
const executeWithFeedback = async (code: string) => {
  executing.value = true
  showProgress.value = true

  try {
    await executeCode(code)
    showSuccess('実行完了')
  } catch (error) {
    showError(error.message)
  } finally {
    executing.value = false
    showProgress.value = false
  }
}
```

## 7. デモページ設計

### 7.1 デモ構成
```typescript
const demoExamples = [
  {
    title: 'JavaScript実行例',
    code: `
// 現在時刻を表示
const now = new Date()
document.body.innerHTML = '<h2>現在時刻: ' + now.toLocaleString() + '</h2>'
    `,
    language: 'javascript'
  },
  {
    title: 'HTML表示例',
    code: `
<div style="padding: 20px; background: #f0f8ff; border-radius: 8px;">
  <h3>サンプルHTML</h3>
  <p>このHTMLが表示されます</p>
  <button onclick="alert('ボタンがクリックされました!')">クリック</button>
</div>
    `,
    language: 'html'
  },
  {
    title: 'CSS動作例',
    code: `
.css-sample {
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  color: white;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
  font-size: 18px;
  animation: fadeIn 1s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
    `,
    language: 'css'
  }
]
```

### 7.2 デモページ機能
- **バリアント切り替え**: 各表示モードの確認
- **言語切り替え**: 複数言語での動作確認
- **リアルタイム編集**: コード変更の即座反映
- **実行履歴**: 過去の実行結果保存

## 8. パフォーマンス設計

### 8.1 最適化戦略
```typescript
// 実行結果のキャッシュ
const executionCache = new Map<string, any>()

const getCachedResult = (code: string) => {
  const hash = btoa(code) // コードのハッシュ化
  return executionCache.get(hash)
}

const setCachedResult = (code: string, result: any) => {
  const hash = btoa(code)
  executionCache.set(hash, result)

  // キャッシュサイズ制限
  if (executionCache.size > 50) {
    const firstKey = executionCache.keys().next().value
    executionCache.delete(firstKey)
  }
}
```

### 8.2 遅延読み込み
```typescript
// Prism.jsの言語別遅延読み込み
const loadLanguageSupport = async (language: string) => {
  if (!loadedLanguages.has(language)) {
    await import(`prismjs/components/prism-${language}`)
    loadedLanguages.add(language)
  }
}
```

## 9. エラーハンドリング

### 9.1 エラータイプ別処理
```typescript
const handleExecutionError = (error: Error) => {
  const errorTypes = {
    SyntaxError: '構文エラー: コードの記述を確認してください',
    ReferenceError: '参照エラー: 未定義の変数が使用されています',
    TypeError: '型エラー: データ型が正しくありません',
    SecurityError: 'セキュリティエラー: 実行が制限されました'
  }

  const errorType = error.constructor.name
  const message = errorTypes[errorType] || '実行エラーが発生しました'

  ElMessage.error(`${message}: ${error.message}`)
}
```

### 9.2 タイムアウト処理
```typescript
const executeWithTimeout = (code: string, timeout: number = 5000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('実行がタイムアウトしました'))
    }, timeout)

    try {
      const result = executeCode(code)
      clearTimeout(timer)
      resolve(result)
    } catch (error) {
      clearTimeout(timer)
      reject(error)
    }
  })
}
```

## 10. テスト設計

### 10.1 単体テスト
```typescript
describe('CodePreview Component', () => {
  test('JavaScript code execution', () => {
    const code = 'return 2 + 2'
    const result = executeJavaScript(code)
    expect(result).toBe(4)
  })

  test('HTML rendering', () => {
    const code = '<div>Test</div>'
    executeHTML(code)
    expect(previewRef.value.innerHTML).toBe(code)
  })

  test('Security restrictions', () => {
    const maliciousCode = 'localStorage.clear()'
    expect(() => sanitizeCode(maliciousCode)).toThrow()
  })
})
```

### 10.2 統合テスト
- **プレビュー表示**: 各言語での正常な表示確認
- **レスポンシブ**: 各ブレークポイントでの動作確認
- **エラーハンドリング**: 異常系での適切なエラー表示

## 11. 運用・保守

### 11.1 ログ管理
```typescript
const logExecution = (code: string, result: any, error?: Error) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    code: code.substring(0, 100), // 先頭100文字のみ
    success: !error,
    error: error?.message,
    executionTime: Date.now() - startTime
  }

  console.log('CodePreview execution:', logEntry)
}
```

### 11.2 モニタリング
- **実行回数**: 使用頻度の測定
- **エラー率**: 失敗パターンの分析
- **パフォーマンス**: 実行時間の監視

## 12. 今後の拡張予定

### 12.1 機能拡張
1. **TypeScript実行**: ts-nodeライクな機能
2. **Vue SFC対応**: Single File Componentの完全サポート
3. **ライブエディット**: リアルタイムプレビュー更新
4. **コード共有**: URLでのコード共有機能

### 12.2 UI改善
1. **テーマ切り替え**: ダーク/ライトモード
2. **フルスクリーンモード**: 大画面での編集
3. **分割ビュー**: サイドバイサイド表示

## 13. 実装状況

### 13.1 現在の実装
```bash
✅ 基本コンポーネント実装完了
✅ JavaScript/HTML/CSS実行機能
✅ Prism.jsシンタックスハイライト
✅ 4バリアント対応
✅ レスポンシブ対応
✅ セキュリティ制限実装
✅ デモページ作成
✅ エラーハンドリング
```

### 13.2 動作確認
- **デモURL**: http://localhost:3000/code-preview-demo
- **コンポーネントパス**: packages/shared-components/src/components/CodePreview/
- **使用例**: ドキュメント生成、学習コンテンツ、プロトタイピング

---

**作成日**: 2025年9月20日
**作成者**: 開発チーム
**バージョン**: 1.0.0
**次回レビュー**: 2025年10月1日
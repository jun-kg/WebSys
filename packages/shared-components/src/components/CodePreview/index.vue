<template>
  <div class="code-preview" :class="computedClasses">
    <!-- タブ切り替え -->
    <div class="code-preview__tabs">
      <div
        class="code-preview__tab"
        :class="{ 'is-active': activeTab === 'preview' }"
        @click="activeTab = 'preview'"
      >
        <el-icon><View /></el-icon>
        プレビュー
      </div>
      <div
        class="code-preview__tab"
        :class="{ 'is-active': activeTab === 'code' }"
        @click="activeTab = 'code'"
      >
        <el-icon><Document /></el-icon>
        ソースコード
      </div>
      <div
        class="code-preview__tab"
        :class="{ 'is-active': activeTab === 'both' }"
        @click="activeTab = 'both'"
        v-if="variant === 'default'"
      >
        <el-icon><Grid /></el-icon>
        両方表示
      </div>
    </div>

    <!-- コンテンツエリア -->
    <div class="code-preview__content">
      <!-- プレビューエリア -->
      <div
        v-show="activeTab === 'preview' || activeTab === 'both'"
        class="code-preview__preview"
        :class="{ 'code-preview__preview--split': activeTab === 'both' }"
      >
        <div class="code-preview__preview-header" v-if="title">
          <h4>{{ title }}</h4>
          <div class="code-preview__actions">
            <el-button
              size="small"
              @click="executeCode"
              :loading="isExecuting"
            >
              <el-icon><Refresh /></el-icon>
              再実行
            </el-button>
            <el-button
              size="small"
              @click="copyCode"
            >
              <el-icon><DocumentCopy /></el-icon>
              コピー
            </el-button>
          </div>
        </div>

        <!-- 動的コンポーネント実行エリア -->
        <div class="code-preview__execution" ref="executionArea">
          <component
            :is="dynamicComponent"
            v-if="dynamicComponent"
            v-bind="componentProps"
            @error="handleExecutionError"
          />
          <div v-else-if="executionError" class="code-preview__error">
            <el-alert
              title="実行エラー"
              :description="executionError"
              type="error"
              show-icon
              :closable="false"
            />
          </div>
          <div v-else-if="!code" class="code-preview__placeholder">
            <el-empty description="コードが設定されていません" />
          </div>
        </div>
      </div>

      <!-- コードエリア -->
      <div
        v-show="activeTab === 'code' || activeTab === 'both'"
        class="code-preview__code"
        :class="{ 'code-preview__code--split': activeTab === 'both' }"
      >
        <div class="code-preview__code-header">
          <span class="code-preview__language">{{ language }}</span>
          <el-button
            size="small"
            text
            @click="copyCode"
          >
            <el-icon><DocumentCopy /></el-icon>
          </el-button>
        </div>

        <!-- 構文ハイライト表示 -->
        <pre class="code-preview__source"><code
          :class="`language-${language}`"
          v-html="highlightedCode"
        ></code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, defineAsyncComponent } from 'vue'
import { ElMessage } from 'element-plus'
import { View, Document, Grid, Refresh, DocumentCopy } from '@element-plus/icons-vue'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'

export interface CodePreviewProps {
  code: string                    // 実行するコード
  language?: string               // 言語（javascript, typescript, vue等）
  title?: string                  // プレビュータイトル
  variant?: 'default' | 'preview-only' | 'code-only' | 'compact'
  autoExecute?: boolean           // 自動実行するか
  componentProps?: Record<string, any>  // 動的コンポーネントに渡すProps
  responsive?: boolean            // レスポンシブ対応
  height?: string                 // 高さ指定
}

const props = withDefaults(defineProps<CodePreviewProps>(), {
  language: 'javascript',
  variant: 'default',
  autoExecute: true,
  responsive: true,
  height: 'auto'
})

// State
const activeTab = ref<'preview' | 'code' | 'both'>('preview')
const isExecuting = ref(false)
const executionError = ref<string>('')
const dynamicComponent = ref<any>(null)
const executionArea = ref<HTMLElement>()

// Computed
const computedClasses = computed(() => ({
  [`code-preview--${props.variant}`]: true,
  'code-preview--responsive': props.responsive
}))

const highlightedCode = computed(() => {
  if (!props.code) return ''

  try {
    return Prism.highlight(
      props.code,
      Prism.languages[props.language] || Prism.languages.javascript,
      props.language
    )
  } catch (error) {
    console.warn('Syntax highlighting failed:', error)
    return props.code
  }
})

// Methods
const executeCode = async () => {
  if (!props.code) return

  isExecuting.value = true
  executionError.value = ''

  try {
    // Vue SFCの場合
    if (props.language === 'vue' || props.code.includes('<template>')) {
      await executeVueComponent()
    }
    // JavaScriptの場合
    else if (props.language === 'javascript' || props.language === 'typescript') {
      await executeJavaScript()
    }
    // HTMLの場合
    else if (props.language === 'html') {
      executeHTML()
    }
  } catch (error) {
    executionError.value = error instanceof Error ? error.message : 'コード実行中にエラーが発生しました'
  } finally {
    isExecuting.value = false
  }
}

const executeVueComponent = async () => {
  try {
    // 動的にVueコンポーネントを作成
    const componentDefinition = new Function('return ' + props.code)()
    dynamicComponent.value = defineAsyncComponent(() =>
      Promise.resolve(componentDefinition)
    )
  } catch (error) {
    // SFC形式の場合は簡易パース
    const templateMatch = props.code.match(/<template>([\s\S]*?)<\/template>/)
    const scriptMatch = props.code.match(/<script(?:\s+setup)?[^>]*>([\s\S]*?)<\/script>/)
    const styleMatch = props.code.match(/<style[^>]*>([\s\S]*?)<\/style>/)

    if (templateMatch) {
      const template = templateMatch[1].trim()
      const script = scriptMatch ? scriptMatch[1] : ''

      // 簡易コンポーネント作成
      dynamicComponent.value = {
        template,
        setup() {
          try {
            const setupFn = new Function(script)
            return setupFn()
          } catch (e) {
            return {}
          }
        }
      }
    }
  }
}

const executeJavaScript = async () => {
  try {
    // JavaScript実行（DOM操作の場合）
    const func = new Function('element', props.code)
    if (executionArea.value) {
      func(executionArea.value)
    }
  } catch (error) {
    throw new Error(`JavaScript実行エラー: ${error}`)
  }
}

const executeHTML = () => {
  if (executionArea.value) {
    executionArea.value.innerHTML = props.code
  }
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(props.code)
    ElMessage.success('コードをクリップボードにコピーしました')
  } catch (error) {
    ElMessage.error('コピーに失敗しました')
  }
}

const handleExecutionError = (error: any) => {
  executionError.value = error.message || 'コンポーネントでエラーが発生しました'
}

// Watchers
watch(() => props.code, () => {
  if (props.autoExecute) {
    executeCode()
  }
}, { immediate: true })

// 初期タブ設定
watch(() => props.variant, (newVariant) => {
  if (newVariant === 'preview-only') {
    activeTab.value = 'preview'
  } else if (newVariant === 'code-only') {
    activeTab.value = 'code'
  }
}, { immediate: true })

// Lifecycle
onMounted(() => {
  if (props.autoExecute && props.code) {
    executeCode()
  }
})
</script>

<style scoped>
.code-preview {
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
}

.code-preview--responsive {
  width: 100%;
}

.code-preview--compact {
  border: none;
  border-radius: 4px;
}

/* タブエリア */
.code-preview__tabs {
  display: flex;
  background: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
}

.code-preview__tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  cursor: pointer;
  color: #606266;
  font-size: 14px;
  transition: all 0.3s;
  border-bottom: 2px solid transparent;
}

.code-preview__tab:hover {
  color: #409eff;
  background: #ecf5ff;
}

.code-preview__tab.is-active {
  color: #409eff;
  border-bottom-color: #409eff;
  background: #ffffff;
}

/* コンテンツエリア */
.code-preview__content {
  display: flex;
  min-height: 200px;
}

.code-preview--compact .code-preview__content {
  min-height: 150px;
}

/* プレビューエリア */
.code-preview__preview {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.code-preview__preview--split {
  border-right: 1px solid #dcdfe6;
}

.code-preview__preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

.code-preview__preview-header h4 {
  margin: 0;
  font-size: 14px;
  color: #303133;
}

.code-preview__actions {
  display: flex;
  gap: 8px;
}

.code-preview__execution {
  flex: 1;
  padding: 16px;
  overflow: auto;
}

.code-preview__error .el-alert {
  margin: 0;
}

.code-preview__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 120px;
}

/* コードエリア */
.code-preview__code {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #2d3748;
}

.code-preview__code--split {
  flex: 1;
}

.code-preview__code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #1a202c;
  color: #a0aec0;
  font-size: 12px;
}

.code-preview__language {
  font-weight: 500;
  text-transform: uppercase;
}

.code-preview__source {
  flex: 1;
  margin: 0;
  padding: 16px;
  overflow: auto;
  background: #2d3748;
  color: #e2e8f0;
  font-family: 'Fira Code', 'SF Mono', Monaco, 'Inconsolata', 'Roboto Mono', 'Source Code Pro', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.code-preview__source code {
  background: none;
  padding: 0;
  border-radius: 0;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .code-preview__content {
    flex-direction: column;
  }

  .code-preview__preview--split {
    border-right: none;
    border-bottom: 1px solid #dcdfe6;
  }

  .code-preview__tabs {
    overflow-x: auto;
    white-space: nowrap;
  }

  .code-preview__tab {
    flex-shrink: 0;
  }
}

/* バリアント別スタイル */
.code-preview--preview-only .code-preview__tabs {
  display: none;
}

.code-preview--code-only .code-preview__tabs {
  display: none;
}

.code-preview--compact .code-preview__tabs {
  padding: 0;
}

.code-preview--compact .code-preview__tab {
  padding: 8px 12px;
  font-size: 12px;
}
</style>
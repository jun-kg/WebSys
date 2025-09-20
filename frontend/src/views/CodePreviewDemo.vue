<template>
  <div class="code-preview-demo">
    <h1>CodePreview コンポーネントデモ</h1>

    <section class="demo-section">
      <h2>1. JavaScript実行例</h2>
      <div class="simple-code-preview">
        <div class="preview-area" id="js-demo1">
          <!-- JavaScript実行結果がここに表示される -->
        </div>
        <el-button @click="executeJSDemo1" type="primary" style="margin: 10px 0;">
          実行
        </el-button>
        <div class="code-area">
          <div class="code-header">
            <span>コード</span>
            <el-button @click="copyCode(jsDemo1Code)" size="small" type="text">
              <el-icon><DocumentCopy /></el-icon>
              コピー
            </el-button>
          </div>
          <pre><code class="language-javascript">{{ jsDemo1Code }}</code></pre>
        </div>
      </div>
    </section>

    <section class="demo-section">
      <h2>2. HTML表示例</h2>
      <div class="simple-code-preview">
        <div class="preview-area" v-html="htmlDemo"></div>
        <div class="code-area">
          <div class="code-header">
            <span>コード</span>
            <el-button @click="copyCode(htmlDemo)" size="small" type="text">
              <el-icon><DocumentCopy /></el-icon>
              コピー
            </el-button>
          </div>
          <pre><code class="language-html">{{ htmlDemo }}</code></pre>
        </div>
      </div>
    </section>

    <section class="demo-section">
      <h2>3. インタラクティブカウンター</h2>
      <div class="simple-code-preview">
        <div class="preview-area" style="text-align: center; padding: 20px;">
          <h3>カウンター: {{ demoCounter }}</h3>
          <el-button @click="demoCounter++" type="primary" style="margin: 4px;">+1</el-button>
          <el-button @click="demoCounter--" type="danger" style="margin: 4px;">-1</el-button>
          <el-button @click="demoCounter = 0" style="margin: 4px;">リセット</el-button>
        </div>
        <div class="code-area">
          <div class="code-header">
            <span>コード</span>
            <el-button @click="copyCode(counterCode)" size="small" type="text">
              <el-icon><DocumentCopy /></el-icon>
              コピー
            </el-button>
          </div>
          <pre><code class="language-javascript">{{ counterCode }}</code></pre>
        </div>
      </div>
    </section>

    <section class="demo-section">
      <h2>4. CSS アニメーション例</h2>
      <div class="simple-code-preview">
        <div class="preview-area" style="text-align: center; padding: 20px;">
          <button
            class="animated-button"
            @click="animateButton"
            :class="{ 'animate-pulse': isAnimating }"
          >
            アニメーションボタン
          </button>
        </div>
        <div class="code-area">
          <div class="code-header">
            <span>コード</span>
            <el-button @click="copyCode(cssAnimationCode)" size="small" type="text">
              <el-icon><DocumentCopy /></el-icon>
              コピー
            </el-button>
          </div>
          <pre><code class="language-css">{{ cssAnimationCode }}</code></pre>
        </div>
      </div>
    </section>

    <section class="demo-section">
      <h2>5. TypeScript型定義例</h2>
      <div class="simple-code-preview">
        <div class="code-area">
          <div class="code-header">
            <span>コード</span>
            <el-button @click="copyCode(typescriptCode)" size="small" type="text">
              <el-icon><DocumentCopy /></el-icon>
              コピー
            </el-button>
          </div>
          <pre><code class="language-typescript">{{ typescriptCode }}</code></pre>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { DocumentCopy } from '@element-plus/icons-vue'
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-markup'

// デモ用リアクティブデータ
const demoCounter = ref(0)
const isAnimating = ref(false)

// JavaScript実行例のコード
const jsDemo1Code = `// 動的にリストを生成する例
const container = document.createElement('div')
container.style.cssText = 'padding: 20px; background: #f5f7fa; border-radius: 8px;'

const title = document.createElement('h3')
title.textContent = '動的生成リスト'
title.style.cssText = 'margin: 0 0 16px 0; color: #303133;'

const list = document.createElement('ul')
list.style.cssText = 'margin: 0; padding: 0; list-style: none;'

const items = ['Vue.js', 'React', 'Angular', 'Svelte']
items.forEach((item, index) => {
  const li = document.createElement('li')
  li.style.cssText = \`
    padding: 8px 12px;
    margin: 4px 0;
    background: #409eff;
    color: white;
    border-radius: 4px;
    animation: fadeIn 0.3s ease \${index * 0.1}s both;
  \`
  li.textContent = item
  list.appendChild(li)
})

// CSS アニメーション
const style = document.createElement('style')
style.textContent = \`
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
\`
document.head.appendChild(style)

container.appendChild(title)
container.appendChild(list)

// 実行
const targetElement = document.getElementById('js-demo1')
if (targetElement) {
  targetElement.innerHTML = ''
  targetElement.appendChild(container)
}`

// HTML表示例
const htmlDemo = `<div style="
  max-width: 300px;
  padding: 20px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  margin: 0 auto;
">
  <h3 style="margin: 0 0 12px 0;">レスポンシブカード</h3>
  <p style="margin: 0 0 16px 0; opacity: 0.9;">
    このカードはレスポンシブデザインに対応しており、
    様々なデバイスサイズで適切に表示されます。
  </p>
  <button style="
    padding: 8px 16px;
    background: rgba(255,255,255,0.2);
    color: white;
    border: 1px solid rgba(255,255,255,0.3);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s;
  "
  onmouseover="this.style.background='rgba(255,255,255,0.3)'"
  onmouseout="this.style.background='rgba(255,255,255,0.2)'"
  >
    詳細を見る
  </button>
</div>`

// カウンターのコード例
const counterCode = `// Vue 3 Composition API カウンター例
import { ref } from 'vue'

export default {
  setup() {
    const counter = ref(0)

    const increment = () => counter.value++
    const decrement = () => counter.value--
    const reset = () => counter.value = 0

    return {
      counter,
      increment,
      decrement,
      reset
    }
  },
  template: \`
    <div style="text-align: center; padding: 20px;">
      <h3>カウンター: {{ counter }}</h3>
      <button @click="increment">+1</button>
      <button @click="decrement">-1</button>
      <button @click="reset">リセット</button>
    </div>
  \`
}`

// CSS アニメーションコード
const cssAnimationCode = `.animated-button {
  padding: 12px 24px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
}

.animated-button:hover {
  background: #66b1ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
}

.animate-pulse {
  animation: pulse 1s ease-in-out;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.7);
  }
  70% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(64, 158, 255, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
  }
}`

// TypeScript型定義例
const typescriptCode = `interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user' | 'guest'
  profile?: {
    avatar?: string
    bio?: string
    socialLinks?: Record<string, string>
  }
  permissions: Permission[]
  createdAt: Date
  lastActiveAt: Date | null
}

interface Permission {
  resource: string
  actions: ('create' | 'read' | 'update' | 'delete')[]
  conditions?: Record<string, any>
}

type UserRole = User['role']
type UserWithoutId = Omit<User, 'id' | 'createdAt'>
type CreateUserInput = Pick<User, 'name' | 'email' | 'role'>

class UserService {
  private users: Map<number, User> = new Map()

  async createUser(input: CreateUserInput): Promise<User> {
    const user: User = {
      id: Date.now(),
      ...input,
      permissions: this.getDefaultPermissions(input.role),
      createdAt: new Date(),
      lastActiveAt: null
    }

    this.users.set(user.id, user)
    return user
  }

  private getDefaultPermissions(role: UserRole): Permission[] {
    const permissionMap: Record<UserRole, Permission[]> = {
      admin: [{ resource: '*', actions: ['create', 'read', 'update', 'delete'] }],
      user: [{ resource: 'profile', actions: ['read', 'update'] }],
      guest: [{ resource: 'profile', actions: ['read'] }]
    }

    return permissionMap[role] || []
  }
}`

// Methods
const executeJSDemo1 = () => {
  try {
    eval(jsDemo1Code)
  } catch (error) {
    ElMessage.error('コード実行でエラーが発生しました: ' + error)
  }
}

const copyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code)
    ElMessage.success('コードをクリップボードにコピーしました')
  } catch (error) {
    ElMessage.error('コピーに失敗しました')
  }
}

const animateButton = () => {
  isAnimating.value = true
  setTimeout(() => {
    isAnimating.value = false
  }, 1000)
}

// シンタックスハイライトを適用
const applySyntaxHighlighting = () => {
  nextTick(() => {
    Prism.highlightAll()
  })
}

// コンポーネントマウント時にシンタックスハイライトを適用
onMounted(() => {
  applySyntaxHighlighting()
})
</script>

<style scoped>
.code-preview-demo {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.code-preview-demo h1 {
  color: #303133;
  margin-bottom: 32px;
  text-align: center;
}

.demo-section {
  margin-bottom: 48px;
}

.demo-section h2 {
  color: #606266;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e4e7ed;
}

.simple-code-preview {
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
}

.preview-area {
  min-height: 150px;
  padding: 20px;
  background: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

.code-area {
  background: #2d3748;
  padding: 0;
  overflow-x: auto;
}

/* Prism.jsのテーマを上書き */
.code-area pre[class*="language-"] {
  background: transparent;
  margin: 0;
  padding: 20px;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #1a202c;
  border-bottom: 1px solid #4a5568;
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 500;
}

.code-area pre {
  margin: 0;
  padding: 20px;
  color: #e2e8f0;
  font-family: 'Fira Code', 'SF Mono', Monaco, 'Inconsolata', 'Roboto Mono', 'Source Code Pro', monospace;
  font-size: 13px;
  line-height: 1.5;
}

.code-area code {
  background: none;
  padding: 0;
  border-radius: 0;
  color: inherit;
}

/* アニメーション用スタイル */
.animated-button {
  padding: 12px 24px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s ease;
}

.animated-button:hover {
  background: #66b1ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
}

.animate-pulse {
  animation: pulse 1s ease-in-out;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.7);
  }
  70% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(64, 158, 255, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
  }
}

@media (max-width: 768px) {
  .code-preview-demo {
    padding: 16px;
  }

  .demo-section {
    margin-bottom: 32px;
  }

  .code-area {
    padding: 16px;
  }

  .code-area pre {
    font-size: 12px;
  }
}
</style>
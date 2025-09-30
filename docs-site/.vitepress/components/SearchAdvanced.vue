<template>
  <div class="search-advanced">
    <div class="search-header">
      <h2 class="widget-title">
        🔍 高度検索
      </h2>
      <p class="search-description">
        全文検索・フィルタリング・ファジーマッチに対応した高度検索機能
      </p>
    </div>

    <!-- メイン検索入力 -->
    <div class="search-main">
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="ドキュメントを検索... (例: 認証, Vue.js, API)"
        @input="handleSearch"
        @keydown.enter="executeSearch"
      />
      <button
        class="search-button"
        @click="executeSearch"
        :disabled="!searchQuery.trim()"
      >
        検索
      </button>
    </div>

    <!-- 検索フィルター -->
    <div class="search-filters">
      <div class="filter-group">
        <label class="filter-label">カテゴリ</label>
        <div class="filter-options">
          <button
            v-for="category in categories"
            :key="category.id"
            class="filter-tag"
            :class="{ active: selectedCategories.includes(category.id) }"
            @click="toggleCategory(category.id)"
          >
            {{ category.name }}
          </button>
        </div>
      </div>

      <div class="filter-group">
        <label class="filter-label">難易度</label>
        <div class="filter-options">
          <button
            v-for="level in difficultyLevels"
            :key="level.id"
            class="filter-tag"
            :class="{ active: selectedDifficulty.includes(level.id) }"
            @click="toggleDifficulty(level.id)"
          >
            {{ level.name }}
          </button>
        </div>
      </div>

      <div class="filter-group">
        <label class="filter-label">言語</label>
        <div class="filter-options">
          <button
            v-for="lang in languages"
            :key="lang.id"
            class="filter-tag"
            :class="{ active: selectedLanguages.includes(lang.id) }"
            @click="toggleLanguage(lang.id)"
          >
            {{ lang.name }}
          </button>
        </div>
      </div>
    </div>

    <!-- 検索オプション -->
    <div class="search-options">
      <label class="checkbox-option">
        <input
          v-model="searchOptions.fuzzy"
          type="checkbox"
        />
        <span class="checkmark"></span>
        ファジー検索 (あいまい検索)
      </label>
      <label class="checkbox-option">
        <input
          v-model="searchOptions.wholeWord"
          type="checkbox"
        />
        <span class="checkmark"></span>
        完全単語一致
      </label>
      <label class="checkbox-option">
        <input
          v-model="searchOptions.caseSensitive"
          type="checkbox"
        />
        <span class="checkmark"></span>
        大文字小文字を区別
      </label>
    </div>

    <!-- 検索結果 -->
    <div v-if="isSearching" class="search-loading">
      <div class="loading-spinner"></div>
      <p>検索中...</p>
    </div>

    <div v-else-if="searchResults.length > 0" class="search-results">
      <div class="results-header">
        <h3>検索結果 ({{ searchResults.length }}件)</h3>
        <div class="results-sort">
          <label>並び順:</label>
          <select v-model="sortBy" @change="sortResults">
            <option value="relevance">関連度</option>
            <option value="title">タイトル</option>
            <option value="date">更新日</option>
            <option value="category">カテゴリ</option>
          </select>
        </div>
      </div>

      <div class="results-list">
        <div
          v-for="result in paginatedResults"
          :key="result.id"
          class="result-item"
          @click="navigateToDocument(result)"
        >
          <div class="result-header">
            <h4 class="result-title" v-html="highlightText(result.title)"></h4>
            <span class="result-category">{{ result.category }}</span>
          </div>
          <p class="result-excerpt" v-html="highlightText(result.excerpt)"></p>
          <div class="result-meta">
            <span class="result-path">{{ result.path }}</span>
            <span class="result-date">{{ formatDate(result.lastModified) }}</span>
            <span class="result-score">関連度: {{ Math.round(result.score * 100) }}%</span>
          </div>
        </div>
      </div>

      <!-- ページネーション -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          class="pagination-button"
          :disabled="currentPage <= 1"
          @click="changePage(currentPage - 1)"
        >
          前へ
        </button>
        <span class="pagination-info">
          {{ currentPage }} / {{ totalPages }} ページ
        </span>
        <button
          class="pagination-button"
          :disabled="currentPage >= totalPages"
          @click="changePage(currentPage + 1)"
        >
          次へ
        </button>
      </div>
    </div>

    <div v-else-if="hasSearched && searchResults.length === 0" class="no-results">
      <div class="no-results-icon">🔍</div>
      <h3>検索結果が見つかりませんでした</h3>
      <p>検索キーワードを変更するか、フィルターを調整してお試しください。</p>
      <div class="search-suggestions">
        <h4>検索のヒント:</h4>
        <ul>
          <li>異なるキーワードを試してみてください</li>
          <li>ファジー検索を有効にしてみてください</li>
          <li>フィルターを外してみてください</li>
          <li>英語での検索も試してみてください</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vitepress'
import MiniSearch from 'minisearch'

// 型定義
interface SearchResult {
  id: string
  title: string
  content: string
  excerpt: string
  path: string
  category: string
  tags: string[]
  lastModified: string
  score: number
}

interface SearchOptions {
  fuzzy: boolean
  wholeWord: boolean
  caseSensitive: boolean
}

interface Category {
  id: string
  name: string
}

interface DifficultyLevel {
  id: string
  name: string
}

interface Language {
  id: string
  name: string
}

// リアクティブデータ
const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])
const isSearching = ref(false)
const hasSearched = ref(false)
const currentPage = ref(1)
const resultsPerPage = ref(10)
const sortBy = ref('relevance')

const selectedCategories = ref<string[]>([])
const selectedDifficulty = ref<string[]>([])
const selectedLanguages = ref<string[]>([])

const searchOptions = ref<SearchOptions>({
  fuzzy: true,
  wholeWord: false,
  caseSensitive: false
})

// フィルターオプション
const categories = ref<Category[]>([
  { id: 'system', name: 'システム管理' },
  { id: 'user', name: 'ユーザー管理' },
  { id: 'log', name: 'ログ管理' },
  { id: 'feature', name: '機能管理' },
  { id: 'report', name: 'レポート' },
  { id: 'dashboard', name: 'ダッシュボード' },
  { id: 'auth', name: '認証・認可' },
  { id: 'api', name: 'API' },
  { id: 'ui', name: 'UI・UX' },
  { id: 'architecture', name: 'アーキテクチャ' }
])

const difficultyLevels = ref<DifficultyLevel[]>([
  { id: 'beginner', name: '初級' },
  { id: 'intermediate', name: '中級' },
  { id: 'advanced', name: '上級' },
  { id: 'expert', name: 'エキスパート' }
])

const languages = ref<Language[]>([
  { id: 'ja', name: '日本語' },
  { id: 'en', name: 'English' }
])

// 検索エンジン
const miniSearch = ref<MiniSearch | null>(null)
const router = useRouter()

// 計算プロパティ
const totalPages = computed(() => Math.ceil(searchResults.value.length / resultsPerPage.value))

const paginatedResults = computed(() => {
  const start = (currentPage.value - 1) * resultsPerPage.value
  const end = start + resultsPerPage.value
  return searchResults.value.slice(start, end)
})

// メソッド
const initializeSearch = async () => {
  try {
    // MiniSearchインスタンス作成
    miniSearch.value = new MiniSearch({
      fields: ['title', 'content', 'tags', 'category'],
      storeFields: ['title', 'content', 'path', 'category', 'tags', 'lastModified'],
      searchOptions: {
        boost: { title: 2, tags: 1.5, category: 1.2 },
        fuzzy: 0.2,
        prefix: true
      }
    })

    // ダミーデータ（実際は外部ファイルから読み込み）
    const documents = await loadDocuments()
    miniSearch.value.addAll(documents)
  } catch (error) {
    console.error('Search initialization failed:', error)
  }
}

const loadDocuments = async (): Promise<any[]> => {
  // 実際の実装では、docs/ディレクトリのMarkdownファイルを解析
  return [
    {
      id: '1',
      title: 'WebSys システム概要',
      content: 'Vue.js 3とElement Plusを使用したエンタープライズシステム...',
      path: '/docs/overview',
      category: 'システム管理',
      tags: ['vue.js', 'element-plus', 'overview'],
      lastModified: '2025-09-30T10:00:00Z'
    },
    {
      id: '2',
      title: '認証システム設計書',
      content: 'JWT認証とRBAC権限管理システムの詳細設計...',
      path: '/docs/auth',
      category: '認証・認可',
      tags: ['jwt', 'rbac', 'authentication'],
      lastModified: '2025-09-29T15:30:00Z'
    },
    {
      id: '3',
      title: 'API仕様書',
      content: 'RESTful APIの仕様とエンドポイント一覧...',
      path: '/docs/api',
      category: 'API',
      tags: ['api', 'rest', 'endpoints'],
      lastModified: '2025-09-28T09:15:00Z'
    }
    // 他のドキュメント...
  ]
}

const handleSearch = () => {
  // デバウンス処理（300ms）
  if (searchQuery.value.length >= 2) {
    setTimeout(() => {
      executeSearch()
    }, 300)
  }
}

const executeSearch = async () => {
  if (!miniSearch.value || !searchQuery.value.trim()) return

  isSearching.value = true
  hasSearched.value = true
  currentPage.value = 1

  try {
    const searchTerms = searchQuery.value.trim()
    const options = {
      fuzzy: searchOptions.value.fuzzy ? 0.2 : false,
      prefix: true,
      boost: { title: 2, tags: 1.5, category: 1.2 }
    }

    let results = miniSearch.value.search(searchTerms, options)

    // フィルター適用
    results = applyFilters(results)

    // 結果の整形
    searchResults.value = results.map(result => ({
      ...result,
      excerpt: generateExcerpt(result.content, searchTerms),
      score: result.score || 0
    }))

    // ソート適用
    sortResults()

  } catch (error) {
    console.error('Search failed:', error)
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

const applyFilters = (results: any[]) => {
  return results.filter(result => {
    // カテゴリフィルター
    if (selectedCategories.value.length > 0) {
      const categoryMatch = selectedCategories.value.some(cat =>
        categories.value.find(c => c.id === cat)?.name === result.category
      )
      if (!categoryMatch) return false
    }

    // 言語フィルター
    if (selectedLanguages.value.length > 0) {
      // パスから言語を判定（簡易実装）
      const isJapanese = !result.path.includes('/en/')
      const hasJapanese = selectedLanguages.value.includes('ja')
      const hasEnglish = selectedLanguages.value.includes('en')

      if (isJapanese && !hasJapanese) return false
      if (!isJapanese && !hasEnglish) return false
    }

    return true
  })
}

const generateExcerpt = (content: string, searchTerms: string): string => {
  const terms = searchTerms.toLowerCase().split(/\s+/)
  const sentences = content.split(/[.。]/g)

  // 検索語を含む文を探す
  const matchingSentence = sentences.find(sentence =>
    terms.some(term => sentence.toLowerCase().includes(term))
  )

  const excerpt = matchingSentence || sentences[0] || content.substring(0, 150)
  return excerpt.length > 150 ? excerpt.substring(0, 150) + '...' : excerpt
}

const highlightText = (text: string): string => {
  if (!searchQuery.value.trim()) return text

  const terms = searchQuery.value.trim().split(/\s+/)
  let highlightedText = text

  terms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi')
    highlightedText = highlightedText.replace(regex, '<mark>$1</mark>')
  })

  return highlightedText
}

const sortResults = () => {
  const sorted = [...searchResults.value].sort((a, b) => {
    switch (sortBy.value) {
      case 'title':
        return a.title.localeCompare(b.title)
      case 'date':
        return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
      case 'category':
        return a.category.localeCompare(b.category)
      case 'relevance':
      default:
        return b.score - a.score
    }
  })
  searchResults.value = sorted
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const changePage = (page: number) => {
  currentPage.value = page
}

const navigateToDocument = (result: SearchResult) => {
  router.go(result.path)
}

// フィルタートグル関数
const toggleCategory = (categoryId: string) => {
  const index = selectedCategories.value.indexOf(categoryId)
  if (index > -1) {
    selectedCategories.value.splice(index, 1)
  } else {
    selectedCategories.value.push(categoryId)
  }
  if (hasSearched.value) executeSearch()
}

const toggleDifficulty = (difficultyId: string) => {
  const index = selectedDifficulty.value.indexOf(difficultyId)
  if (index > -1) {
    selectedDifficulty.value.splice(index, 1)
  } else {
    selectedDifficulty.value.push(difficultyId)
  }
  if (hasSearched.value) executeSearch()
}

const toggleLanguage = (languageId: string) => {
  const index = selectedLanguages.value.indexOf(languageId)
  if (index > -1) {
    selectedLanguages.value.splice(index, 1)
  } else {
    selectedLanguages.value.push(languageId)
  }
  if (hasSearched.value) executeSearch()
}

// ライフサイクル
onMounted(() => {
  initializeSearch()
})

// ウォッチャー
watch(searchOptions, () => {
  if (hasSearched.value) executeSearch()
}, { deep: true })
</script>

<style scoped>
/* 検索コンポーネントスタイル */
.search-advanced {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--websys-border-radius-lg);
  padding: var(--websys-spacing-xl);
  margin-bottom: var(--websys-spacing-xl);
}

.search-header {
  margin-bottom: var(--websys-spacing-lg);
}

.search-description {
  color: var(--vp-c-text-2);
  margin-top: var(--websys-spacing-sm);
}

.search-main {
  display: flex;
  gap: var(--websys-spacing-sm);
  margin-bottom: var(--websys-spacing-lg);
}

.search-input {
  flex: 1;
  padding: var(--websys-spacing-md);
  border: 2px solid var(--vp-c-border);
  border-radius: var(--websys-border-radius);
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}

.search-button {
  padding: var(--websys-spacing-md) var(--websys-spacing-lg);
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  border-radius: var(--websys-border-radius);
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.search-button:hover:not(:disabled) {
  background: var(--vp-c-brand-2);
}

.search-button:disabled {
  background: var(--vp-c-border);
  cursor: not-allowed;
}

.search-filters {
  margin-bottom: var(--websys-spacing-lg);
}

.filter-group {
  margin-bottom: var(--websys-spacing-md);
}

.filter-label {
  display: block;
  font-weight: 600;
  margin-bottom: var(--websys-spacing-sm);
  color: var(--vp-c-text-1);
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--websys-spacing-sm);
}

.filter-tag {
  padding: var(--websys-spacing-xs) var(--websys-spacing-sm);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--websys-border-radius-sm);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-tag:hover {
  background: var(--vp-c-brand-soft);
  color: white;
}

.filter-tag.active {
  background: var(--vp-c-brand-1);
  color: white;
  border-color: var(--vp-c-brand-1);
}

.search-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--websys-spacing-lg);
  margin-bottom: var(--websys-spacing-lg);
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: var(--websys-spacing-sm);
  cursor: pointer;
  font-size: 0.9rem;
}

.checkbox-option input[type="checkbox"] {
  margin: 0;
}

.search-loading {
  text-align: center;
  padding: var(--websys-spacing-xl);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--vp-c-border);
  border-top: 4px solid var(--vp-c-brand-1);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--websys-spacing-md);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.search-results {
  margin-top: var(--websys-spacing-lg);
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--websys-spacing-lg);
  padding-bottom: var(--websys-spacing-md);
  border-bottom: 1px solid var(--vp-c-border);
}

.results-sort {
  display: flex;
  align-items: center;
  gap: var(--websys-spacing-sm);
}

.results-sort select {
  padding: var(--websys-spacing-xs) var(--websys-spacing-sm);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--websys-border-radius-sm);
  background: var(--vp-c-bg);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: var(--websys-spacing-md);
}

.result-item {
  padding: var(--websys-spacing-lg);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--websys-border-radius);
  cursor: pointer;
  transition: all 0.3s ease;
}

.result-item:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: var(--websys-shadow-md);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--websys-spacing-sm);
}

.result-title {
  margin: 0;
  font-size: 1.1rem;
  color: var(--vp-c-brand-1);
}

.result-category {
  padding: var(--websys-spacing-xs) var(--websys-spacing-sm);
  background: var(--vp-c-bg-soft);
  border-radius: var(--websys-border-radius-sm);
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

.result-excerpt {
  color: var(--vp-c-text-2);
  margin-bottom: var(--websys-spacing-sm);
  line-height: 1.5;
}

.result-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}

.result-path {
  font-family: var(--vp-font-family-mono);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--websys-spacing-md);
  margin-top: var(--websys-spacing-lg);
  padding-top: var(--websys-spacing-lg);
  border-top: 1px solid var(--vp-c-border);
}

.pagination-button {
  padding: var(--websys-spacing-sm) var(--websys-spacing-md);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--websys-border-radius);
  cursor: pointer;
  transition: all 0.3s ease;
}

.pagination-button:hover:not(:disabled) {
  background: var(--vp-c-brand-soft);
  color: white;
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.no-results {
  text-align: center;
  padding: var(--websys-spacing-2xl);
}

.no-results-icon {
  font-size: 3rem;
  margin-bottom: var(--websys-spacing-md);
}

.search-suggestions {
  text-align: left;
  margin-top: var(--websys-spacing-lg);
  padding: var(--websys-spacing-lg);
  background: var(--vp-c-bg-soft);
  border-radius: var(--websys-border-radius);
}

.search-suggestions ul {
  margin: var(--websys-spacing-sm) 0;
  padding-left: var(--websys-spacing-lg);
}

.search-suggestions li {
  margin-bottom: var(--websys-spacing-xs);
}

/* ハイライト */
:deep(mark) {
  background-color: var(--websys-warning);
  color: var(--vp-c-text-1);
  padding: 0.1em 0.2em;
  border-radius: 2px;
}

/* レスポンシブ */
@media (max-width: 768px) {
  .search-main {
    flex-direction: column;
  }

  .results-header {
    flex-direction: column;
    gap: var(--websys-spacing-md);
    align-items: stretch;
  }

  .result-header {
    flex-direction: column;
    gap: var(--websys-spacing-sm);
  }

  .result-meta {
    flex-direction: column;
    gap: var(--websys-spacing-xs);
    align-items: flex-start;
  }

  .search-options {
    flex-direction: column;
    gap: var(--websys-spacing-sm);
  }
}
</style>
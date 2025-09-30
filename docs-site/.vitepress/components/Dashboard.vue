<template>
  <div class="dashboard-container">
    <!-- 統計ウィジェット -->
    <StatsWidget
      :stats="projectStats"
      class="dashboard-widget"
    />

    <!-- カテゴリグリッド -->
    <CategoryGrid
      :categories="documentCategories"
      class="dashboard-widget"
      @category-select="handleCategorySelect"
    />

    <!-- 最近の更新 -->
    <RecentUpdates
      :updates="recentUpdates"
      class="dashboard-widget"
    />

    <!-- クイックアクセス -->
    <QuickAccess
      :quick-links="quickAccessLinks"
      :user-preferences="userPreferences"
      class="dashboard-widget"
    />

    <!-- 品質スコア -->
    <QualityScore
      :scores="qualityScores"
      class="dashboard-widget"
    />

    <!-- プロジェクト進捗 -->
    <ProjectProgress
      :progress="projectProgress"
      class="dashboard-widget"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vitepress'
import StatsWidget from './StatsWidget.vue'
import CategoryGrid from './CategoryGrid.vue'
import RecentUpdates from './RecentUpdates.vue'
import QuickAccess from './QuickAccess.vue'
import QualityScore from './QualityScore.vue'
import ProjectProgress from './ProjectProgress.vue'

// 型定義
interface ProjectStats {
  totalDocs: number
  categories: number
  lastUpdate: string
  qualityScore: number
  completionRate: number
  contributors: number
}

interface DocumentCategory {
  id: string
  name: string
  description: string
  icon: string
  docCount: number
  completionRate: number
  color: string
  path: string
}

interface RecentUpdate {
  id: string
  title: string
  type: 'created' | 'updated' | 'deleted'
  path: string
  author: string
  date: string
  summary: string
}

interface QuickLink {
  id: string
  title: string
  description: string
  icon: string
  path: string
  category: string
}

interface UserPreference {
  frequentlyAccessed: string[]
  bookmarks: string[]
  recentSearches: string[]
}

interface QualityScores {
  overall: number
  documentation: number
  codeQuality: number
  accessibility: number
  performance: number
  security: number
}

interface ProjectProgress {
  phases: {
    name: string
    status: 'completed' | 'in-progress' | 'pending'
    completion: number
    description: string
  }[]
  milestones: {
    name: string
    date: string
    status: 'completed' | 'upcoming' | 'overdue'
  }[]
}

// リアクティブデータ
const router = useRouter()

const projectStats = ref<ProjectStats>({
  totalDocs: 112,
  categories: 10,
  lastUpdate: '2025-09-30',
  qualityScore: 95,
  completionRate: 87,
  contributors: 5
})

const documentCategories = ref<DocumentCategory[]>([
  {
    id: 'system',
    name: 'システム管理',
    description: 'システム概要・アーキテクチャ・設計書',
    icon: '🏗️',
    docCount: 18,
    completionRate: 95,
    color: '#3eaf7c',
    path: '/docs/system/'
  },
  {
    id: 'user',
    name: 'ユーザー管理',
    description: '認証・権限・ユーザー設定',
    icon: '👥',
    docCount: 15,
    completionRate: 90,
    color: '#42b883',
    path: '/docs/user/'
  },
  {
    id: 'api',
    name: 'API仕様',
    description: 'RESTful API・エンドポイント仕様',
    icon: '🔌',
    docCount: 22,
    completionRate: 85,
    color: '#ff6b6b',
    path: '/docs/api/'
  },
  {
    id: 'ui',
    name: 'UI・UX',
    description: 'コンポーネント・デザインガイド',
    icon: '🎨',
    docCount: 20,
    completionRate: 88,
    color: '#ffa726',
    path: '/docs/ui/'
  },
  {
    id: 'development',
    name: '開発ガイド',
    description: '環境構築・開発フロー・デプロイ',
    icon: '⚙️',
    docCount: 12,
    completionRate: 92,
    color: '#66bb6a',
    path: '/docs/development/'
  },
  {
    id: 'testing',
    name: 'テスト',
    description: '単体試験・統合試験・品質保証',
    icon: '🧪',
    docCount: 8,
    completionRate: 100,
    color: '#42a5f5',
    path: '/docs/testing/'
  },
  {
    id: 'deployment',
    name: 'デプロイ・運用',
    description: 'インフラ・モニタリング・保守',
    icon: '🚀',
    docCount: 10,
    completionRate: 80,
    color: '#ab47bc',
    path: '/docs/deployment/'
  },
  {
    id: 'troubleshooting',
    name: 'トラブルシューティング',
    description: '問題解決・FAQ・サポート',
    icon: '🔧',
    docCount: 7,
    completionRate: 75,
    color: '#ef5350',
    path: '/docs/troubleshooting/'
  }
])

const recentUpdates = ref<RecentUpdate[]>([
  {
    id: '1',
    title: 'Phase3実装計画・技術仕様書',
    type: 'created',
    path: '/docs/76-Phase3実装計画・技術仕様書',
    author: 'Claude',
    date: '2025-09-30T22:55:00Z',
    summary: 'インタラクティブサイト・国際化・AI分析の実装計画'
  },
  {
    id: '2',
    title: 'Phase2実装完了・高度品質保証基盤稼働レポート',
    type: 'created',
    path: '/docs/75-Phase2実装完了・高度品質保証基盤稼働レポート',
    author: 'Claude',
    date: '2025-09-30T22:50:00Z',
    summary: '継続的品質保証基盤の完全稼働実現'
  },
  {
    id: '3',
    title: 'Phase1実装完了・次期展開計画書',
    type: 'updated',
    path: '/docs/74-Phase1実装完了・次期展開計画書',
    author: 'Claude',
    date: '2025-09-30T22:30:00Z',
    summary: 'Phase1完全成功と次期Phase展開計画'
  },
  {
    id: '4',
    title: 'MASTER_REFERENCE.md',
    type: 'updated',
    path: '/docs/MASTER_REFERENCE',
    author: 'Claude',
    date: '2025-09-30T21:00:00Z',
    summary: '技術仕様統一とナビゲーション改善'
  },
  {
    id: '5',
    title: 'CI/CD品質保証ワークフロー',
    type: 'created',
    path: '/.github/workflows/docs-quality.yml',
    author: 'Claude',
    date: '2025-09-30T20:45:00Z',
    summary: '自動品質チェック・レポート生成の実装'
  }
])

const quickAccessLinks = ref<QuickLink[]>([
  {
    id: '1',
    title: '環境構築ガイド',
    description: 'Docker環境セットアップ',
    icon: '🐳',
    path: '/docs/setup',
    category: '開発'
  },
  {
    id: '2',
    title: 'API仕様書',
    description: 'RESTful APIリファレンス',
    icon: '📋',
    path: '/docs/api',
    category: '仕様'
  },
  {
    id: '3',
    title: 'コンポーネント一覧',
    description: 'Vue.jsコンポーネント',
    icon: '🧩',
    path: '/docs/components',
    category: 'UI'
  },
  {
    id: '4',
    title: 'トラブルシューティング',
    description: '問題解決・FAQ',
    icon: '🆘',
    path: '/docs/troubleshooting',
    category: 'サポート'
  },
  {
    id: '5',
    title: 'デプロイ手順',
    description: '本番環境への展開',
    icon: '🚀',
    path: '/docs/deployment',
    category: '運用'
  },
  {
    id: '6',
    title: '品質保証ガイド',
    description: 'テスト・品質管理',
    icon: '✅',
    path: '/docs/quality',
    category: '品質'
  }
])

const userPreferences = ref<UserPreference>({
  frequentlyAccessed: [
    '/docs/api',
    '/docs/components',
    '/docs/setup'
  ],
  bookmarks: [
    '/docs/troubleshooting',
    '/docs/deployment'
  ],
  recentSearches: [
    'Vue.js',
    '認証',
    'API'
  ]
})

const qualityScores = ref<QualityScores>({
  overall: 95,
  documentation: 95,
  codeQuality: 92,
  accessibility: 88,
  performance: 90,
  security: 97
})

const projectProgress = ref<ProjectProgress>({
  phases: [
    {
      name: 'Phase1: ドキュメント基盤',
      status: 'completed',
      completion: 100,
      description: 'マスタードキュメント・品質保証基盤'
    },
    {
      name: 'Phase2: 継続的品質保証',
      status: 'completed',
      completion: 100,
      description: 'AI分析・自動化・CI/CD統合'
    },
    {
      name: 'Phase3: インタラクティブサイト',
      status: 'in-progress',
      completion: 15,
      description: '検索・多言語・ダッシュボード'
    }
  ],
  milestones: [
    {
      name: 'Phase3基盤構築',
      date: '2025-10-01',
      status: 'upcoming'
    },
    {
      name: '国際化対応完了',
      date: '2025-10-07',
      status: 'upcoming'
    },
    {
      name: 'AI高度分析実装',
      date: '2025-10-14',
      status: 'upcoming'
    },
    {
      name: 'Phase3完全稼働',
      date: '2025-10-21',
      status: 'upcoming'
    }
  ]
})

// 計算プロパティ
const overallProgress = computed(() => {
  const totalPhases = projectProgress.value.phases.length
  const completedPhases = projectProgress.value.phases.filter(p => p.status === 'completed').length
  const inProgressCompletion = projectProgress.value.phases
    .filter(p => p.status === 'in-progress')
    .reduce((sum, p) => sum + p.completion, 0) / 100

  return Math.round(((completedPhases + inProgressCompletion) / totalPhases) * 100)
})

// メソッド
const handleCategorySelect = (category: DocumentCategory) => {
  router.go(category.path)
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getUpdateIcon = (type: 'created' | 'updated' | 'deleted'): string => {
  switch (type) {
    case 'created': return '🆕'
    case 'updated': return '📝'
    case 'deleted': return '🗑️'
    default: return '📄'
  }
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed': return 'var(--websys-success)'
    case 'in-progress': return 'var(--websys-warning)'
    case 'pending': return 'var(--websys-gray-400)'
    case 'overdue': return 'var(--websys-accent)'
    default: return 'var(--websys-gray-400)'
  }
}

// ライフサイクル
onMounted(() => {
  // ダッシュボードデータの初期化
  console.log('Dashboard mounted')
})
</script>

<style scoped>
.dashboard-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--websys-spacing-lg);
  padding: var(--websys-spacing-xl);
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-widget {
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--websys-border-radius-lg);
  padding: var(--websys-spacing-lg);
  box-shadow: var(--websys-shadow);
  transition: all 0.3s ease;
  animation: fadeInUp 0.6s ease-out;
}

.dashboard-widget:hover {
  box-shadow: var(--websys-shadow-lg);
  transform: translateY(-2px);
}

/* レスポンシブ調整 */
@media (max-width: 768px) {
  .dashboard-container {
    grid-template-columns: 1fr;
    padding: var(--websys-spacing-md);
    gap: var(--websys-spacing-md);
  }
}

/* 大画面での調整 */
@media (min-width: 1200px) {
  .dashboard-container {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 印刷対応 */
@media print {
  .dashboard-container {
    display: block;
  }

  .dashboard-widget {
    break-inside: avoid;
    margin-bottom: var(--websys-spacing-lg);
    box-shadow: none;
    border: 1px solid #000;
  }
}
</style>
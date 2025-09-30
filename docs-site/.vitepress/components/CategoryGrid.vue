<template>
  <div class="category-widget">
    <h3 class="widget-title">
      📚 ドキュメントカテゴリ
    </h3>

    <div class="category-grid">
      <a
        v-for="category in categories"
        :key="category.id"
        :href="category.path"
        class="category-card"
        @click.prevent="handleCategoryClick(category)"
      >
        <div class="category-header">
          <span class="category-icon">{{ category.icon }}</span>
          <div class="category-meta">
            <span class="doc-count">{{ category.docCount }}件</span>
            <div
              class="completion-indicator"
              :style="{ backgroundColor: getCompletionColor(category.completionRate) }"
            ></div>
          </div>
        </div>

        <h4 class="category-title">{{ category.name }}</h4>
        <p class="category-description">{{ category.description }}</p>

        <div class="category-progress">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{
                width: `${category.completionRate}%`,
                backgroundColor: category.color
              }"
            ></div>
          </div>
          <span class="progress-text">{{ category.completionRate }}% 完了</span>
        </div>

        <div class="category-footer">
          <span class="category-status">
            {{ getStatusText(category.completionRate) }}
          </span>
          <span class="view-link">詳細を見る →</span>
        </div>
      </a>
    </div>

    <div class="category-summary">
      <div class="summary-stats">
        <div class="summary-item">
          <span class="summary-value">{{ totalDocs }}</span>
          <span class="summary-label">総ドキュメント</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">{{ averageCompletion }}%</span>
          <span class="summary-label">平均完成度</span>
        </div>
        <div class="summary-item">
          <span class="summary-value">{{ highestCategory }}</span>
          <span class="summary-label">最高完成度</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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

interface Props {
  categories: DocumentCategory[]
}

interface Emits {
  (e: 'category-select', category: DocumentCategory): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 計算プロパティ
const totalDocs = computed(() => {
  return props.categories.reduce((sum, category) => sum + category.docCount, 0)
})

const averageCompletion = computed(() => {
  const total = props.categories.reduce((sum, category) => sum + category.completionRate, 0)
  return Math.round(total / props.categories.length)
})

const highestCategory = computed(() => {
  const highest = props.categories.reduce((max, category) =>
    category.completionRate > max.completionRate ? category : max
  )
  return highest.name
})

// メソッド
const handleCategoryClick = (category: DocumentCategory) => {
  emit('category-select', category)
}

const getCompletionColor = (rate: number): string => {
  if (rate >= 90) return 'var(--websys-success)'
  if (rate >= 70) return 'var(--websys-warning)'
  return 'var(--websys-accent)'
}

const getStatusText = (rate: number): string => {
  if (rate >= 95) return '完成'
  if (rate >= 80) return '高進捗'
  if (rate >= 50) return '進行中'
  return '準備中'
}
</script>

<style scoped>
.category-widget {
  grid-column: span 2;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--websys-spacing-md);
  margin-bottom: var(--websys-spacing-lg);
}

.category-card {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--websys-border-radius);
  padding: var(--websys-spacing-lg);
  text-decoration: none;
  color: var(--vp-c-text-1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  display: block;
}

.category-card:hover {
  background: var(--vp-c-bg-elv);
  box-shadow: var(--websys-shadow-md);
  transform: translateY(-2px);
  border-color: var(--vp-c-border-hover);
}

.category-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--vp-c-brand-1);
  transform: scaleY(0);
  transition: transform 0.3s ease;
}

.category-card:hover::before {
  transform: scaleY(1);
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--websys-spacing-md);
}

.category-icon {
  font-size: 2.5rem;
  line-height: 1;
}

.category-meta {
  display: flex;
  align-items: center;
  gap: var(--websys-spacing-sm);
}

.doc-count {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  font-weight: 500;
}

.completion-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.category-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 var(--websys-spacing-sm) 0;
  color: var(--vp-c-text-1);
}

.category-description {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  margin: 0 0 var(--websys-spacing-md) 0;
  line-height: 1.4;
}

.category-progress {
  margin-bottom: var(--websys-spacing-md);
}

.progress-bar {
  height: 6px;
  background: var(--vp-c-bg-elv);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: var(--websys-spacing-xs);
}

.progress-fill {
  height: 100%;
  transition: width 0.8s ease-in-out;
  border-radius: 3px;
}

.progress-text {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}

.category-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.category-status {
  font-size: 0.8rem;
  font-weight: 600;
  padding: var(--websys-spacing-xs) var(--websys-spacing-sm);
  background: var(--vp-c-bg-elv);
  border-radius: var(--websys-border-radius-sm);
  color: var(--vp-c-text-2);
}

.view-link {
  font-size: 0.8rem;
  color: var(--vp-c-brand-1);
  font-weight: 500;
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.category-card:hover .view-link {
  opacity: 1;
}

.category-summary {
  padding-top: var(--websys-spacing-lg);
  border-top: 1px solid var(--vp-c-border);
}

.summary-stats {
  display: flex;
  justify-content: space-around;
  gap: var(--websys-spacing-md);
}

.summary-item {
  text-align: center;
  flex: 1;
}

.summary-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  margin-bottom: var(--websys-spacing-xs);
}

.summary-label {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

/* レスポンシブ調整 */
@media (max-width: 1024px) {
  .category-widget {
    grid-column: span 1;
  }
}

@media (max-width: 768px) {
  .category-grid {
    grid-template-columns: 1fr;
  }

  .summary-stats {
    flex-direction: column;
    gap: var(--websys-spacing-sm);
  }

  .category-footer {
    flex-direction: column;
    gap: var(--websys-spacing-sm);
    align-items: stretch;
  }

  .view-link {
    text-align: center;
  }
}

/* ダークモード対応 */
html.dark .category-card {
  background: var(--vp-c-bg-alt);
}

html.dark .category-card:hover {
  background: var(--vp-c-bg-elv);
}

/* アニメーション */
.category-card {
  animation: fadeInUp 0.6s ease-out forwards;
}

.category-card:nth-child(2) { animation-delay: 0.1s; }
.category-card:nth-child(3) { animation-delay: 0.2s; }
.category-card:nth-child(4) { animation-delay: 0.3s; }
.category-card:nth-child(5) { animation-delay: 0.4s; }
.category-card:nth-child(6) { animation-delay: 0.5s; }
.category-card:nth-child(7) { animation-delay: 0.6s; }
.category-card:nth-child(8) { animation-delay: 0.7s; }

/* 印刷対応 */
@media print {
  .category-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .category-card {
    break-inside: avoid;
    box-shadow: none;
    border: 1px solid #000;
  }

  .category-card:hover {
    transform: none;
  }
}
</style>
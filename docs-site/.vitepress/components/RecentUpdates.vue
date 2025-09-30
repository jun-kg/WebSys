<template>
  <div class="recent-updates-widget">
    <h3 class="widget-title">
      🕒 最近の更新
    </h3>

    <div class="updates-list">
      <div
        v-for="update in updates"
        :key="update.id"
        class="update-item"
        @click="navigateToUpdate(update)"
      >
        <div class="update-icon">
          {{ getUpdateIcon(update.type) }}
        </div>

        <div class="update-content">
          <div class="update-header">
            <h4 class="update-title">{{ update.title }}</h4>
            <span
              class="update-type"
              :class="update.type"
            >
              {{ getUpdateTypeText(update.type) }}
            </span>
          </div>

          <p class="update-summary">{{ update.summary }}</p>

          <div class="update-meta">
            <span class="update-author">
              👤 {{ update.author }}
            </span>
            <span class="update-date">
              📅 {{ formatDate(update.date) }}
            </span>
            <span class="update-path">
              📁 {{ update.path }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="updates-footer">
      <button
        class="view-all-button"
        @click="viewAllUpdates"
      >
        すべての更新を見る
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vitepress'

interface RecentUpdate {
  id: string
  title: string
  type: 'created' | 'updated' | 'deleted'
  path: string
  author: string
  date: string
  summary: string
}

interface Props {
  updates: RecentUpdate[]
}

const props = defineProps<Props>()
const router = useRouter()

// メソッド
const getUpdateIcon = (type: 'created' | 'updated' | 'deleted'): string => {
  switch (type) {
    case 'created': return '🆕'
    case 'updated': return '📝'
    case 'deleted': return '🗑️'
    default: return '📄'
  }
}

const getUpdateTypeText = (type: 'created' | 'updated' | 'deleted'): string => {
  switch (type) {
    case 'created': return '新規作成'
    case 'updated': return '更新'
    case 'deleted': return '削除'
    default: return '変更'
  }
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 1) {
    return '今日'
  } else if (diffDays === 2) {
    return '昨日'
  } else if (diffDays <= 7) {
    return `${diffDays - 1}日前`
  } else {
    return date.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric'
    })
  }
}

const navigateToUpdate = (update: RecentUpdate) => {
  router.go(update.path)
}

const viewAllUpdates = () => {
  router.go('/updates')
}
</script>

<style scoped>
.recent-updates-widget {
  max-height: 600px;
  display: flex;
  flex-direction: column;
}

.updates-list {
  flex: 1;
  overflow-y: auto;
  margin-bottom: var(--websys-spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--websys-spacing-sm);
}

.update-item {
  display: flex;
  gap: var(--websys-spacing-md);
  padding: var(--websys-spacing-md);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--websys-border-radius);
  background: var(--vp-c-bg-soft);
  cursor: pointer;
  transition: all 0.3s ease;
}

.update-item:hover {
  background: var(--vp-c-bg-elv);
  border-color: var(--vp-c-brand-1);
  box-shadow: var(--websys-shadow);
  transform: translateX(4px);
}

.update-icon {
  font-size: 1.5rem;
  line-height: 1;
  flex-shrink: 0;
  width: 2rem;
  text-align: center;
}

.update-content {
  flex: 1;
  min-width: 0;
}

.update-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--websys-spacing-sm);
  margin-bottom: var(--websys-spacing-xs);
}

.update-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.update-type {
  font-size: 0.7rem;
  padding: var(--websys-spacing-xs) var(--websys-spacing-sm);
  border-radius: var(--websys-border-radius-sm);
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.update-type.created {
  background: var(--websys-success);
  color: white;
}

.update-type.updated {
  background: var(--websys-info);
  color: white;
}

.update-type.deleted {
  background: var(--websys-accent);
  color: white;
}

.update-summary {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  margin: 0 0 var(--websys-spacing-sm) 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.update-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--websys-spacing-sm);
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
}

.update-meta > span {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.update-path {
  font-family: var(--vp-font-family-mono);
  background: var(--vp-c-bg);
  padding: 0.1rem 0.3rem;
  border-radius: 2px;
  border: 1px solid var(--vp-c-border);
}

.updates-footer {
  border-top: 1px solid var(--vp-c-border);
  padding-top: var(--websys-spacing-md);
  text-align: center;
}

.view-all-button {
  padding: var(--websys-spacing-sm) var(--websys-spacing-lg);
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  border-radius: var(--websys-border-radius);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.view-all-button:hover {
  background: var(--vp-c-brand-2);
  transform: translateY(-1px);
  box-shadow: var(--websys-shadow);
}

/* カスタムスクロールバー */
.updates-list::-webkit-scrollbar {
  width: 6px;
}

.updates-list::-webkit-scrollbar-track {
  background: var(--vp-c-bg-soft);
  border-radius: 3px;
}

.updates-list::-webkit-scrollbar-thumb {
  background: var(--vp-c-border);
  border-radius: 3px;
}

.updates-list::-webkit-scrollbar-thumb:hover {
  background: var(--vp-c-brand-1);
}

/* レスポンシブ調整 */
@media (max-width: 768px) {
  .update-item {
    flex-direction: column;
    gap: var(--websys-spacing-sm);
  }

  .update-icon {
    align-self: flex-start;
    width: auto;
  }

  .update-header {
    flex-direction: column;
    gap: var(--websys-spacing-xs);
    align-items: stretch;
  }

  .update-meta {
    flex-direction: column;
    gap: var(--websys-spacing-xs);
  }

  .update-meta > span {
    font-size: 0.75rem;
  }
}

/* アニメーション */
.update-item {
  animation: slideInLeft 0.4s ease-out forwards;
}

.update-item:nth-child(2) { animation-delay: 0.1s; }
.update-item:nth-child(3) { animation-delay: 0.2s; }
.update-item:nth-child(4) { animation-delay: 0.3s; }
.update-item:nth-child(5) { animation-delay: 0.4s; }

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 印刷対応 */
@media print {
  .updates-list {
    max-height: none;
    overflow: visible;
  }

  .update-item {
    break-inside: avoid;
    box-shadow: none;
    border: 1px solid #000;
  }

  .update-item:hover {
    transform: none;
  }

  .updates-footer {
    display: none;
  }
}
</style>
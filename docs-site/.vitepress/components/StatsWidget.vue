<template>
  <div class="stats-widget">
    <h3 class="widget-title">
      📊 プロジェクト統計
    </h3>

    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-value">{{ stats.totalDocs }}</span>
        <span class="stat-label">総ドキュメント数</span>
      </div>

      <div class="stat-item">
        <span class="stat-value">{{ stats.categories }}</span>
        <span class="stat-label">カテゴリ数</span>
      </div>

      <div class="stat-item">
        <span class="stat-value">{{ stats.qualityScore }}%</span>
        <span class="stat-label">品質スコア</span>
      </div>

      <div class="stat-item">
        <span class="stat-value">{{ stats.completionRate }}%</span>
        <span class="stat-label">完成度</span>
      </div>

      <div class="stat-item">
        <span class="stat-value">{{ stats.contributors }}</span>
        <span class="stat-label">貢献者数</span>
      </div>

      <div class="stat-item">
        <span class="stat-value">{{ formattedLastUpdate }}</span>
        <span class="stat-label">最終更新</span>
      </div>
    </div>

    <!-- 品質スコアの詳細表示 -->
    <div class="quality-breakdown">
      <h4>品質内訳</h4>
      <div class="quality-bars">
        <div class="quality-bar">
          <span class="quality-label">ドキュメント品質</span>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: '95%', backgroundColor: 'var(--websys-success)' }"
            ></div>
          </div>
          <span class="quality-value">95%</span>
        </div>

        <div class="quality-bar">
          <span class="quality-label">アクセシビリティ</span>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: '88%', backgroundColor: 'var(--websys-info)' }"
            ></div>
          </div>
          <span class="quality-value">88%</span>
        </div>

        <div class="quality-bar">
          <span class="quality-label">コード品質</span>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: '92%', backgroundColor: 'var(--websys-warning)' }"
            ></div>
          </div>
          <span class="quality-value">92%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface ProjectStats {
  totalDocs: number
  categories: number
  lastUpdate: string
  qualityScore: number
  completionRate: number
  contributors: number
}

interface Props {
  stats: ProjectStats
}

const props = defineProps<Props>()

const formattedLastUpdate = computed(() => {
  const date = new Date(props.stats.lastUpdate)
  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric'
  })
})
</script>

<style scoped>
.stats-widget {
  min-height: 300px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--websys-spacing-md);
  margin-bottom: var(--websys-spacing-lg);
}

.stat-item {
  text-align: center;
  padding: var(--websys-spacing-md);
  background: var(--vp-c-bg-soft);
  border-radius: var(--websys-border-radius);
  border: 1px solid var(--vp-c-border);
  transition: all 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--websys-shadow);
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  display: block;
  margin-bottom: var(--websys-spacing-xs);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.quality-breakdown {
  margin-top: var(--websys-spacing-lg);
  padding-top: var(--websys-spacing-lg);
  border-top: 1px solid var(--vp-c-border);
}

.quality-breakdown h4 {
  margin: 0 0 var(--websys-spacing-md) 0;
  font-size: 1rem;
  color: var(--vp-c-text-1);
}

.quality-bars {
  display: flex;
  flex-direction: column;
  gap: var(--websys-spacing-sm);
}

.quality-bar {
  display: flex;
  align-items: center;
  gap: var(--websys-spacing-sm);
}

.quality-label {
  min-width: 120px;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--vp-c-bg-soft);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.8s ease-in-out;
  border-radius: 4px;
}

.quality-value {
  min-width: 35px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  text-align: right;
}

/* レスポンシブ調整 */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .quality-bar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--websys-spacing-xs);
  }

  .quality-label {
    min-width: auto;
  }

  .quality-value {
    text-align: left;
  }
}
</style>
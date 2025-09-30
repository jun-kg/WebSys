<template>
  <div class="quality-score-widget">
    <h3 class="widget-title">
      ✅ 品質スコア
    </h3>

    <div class="overall-score">
      <div class="score-circle">
        <svg class="score-svg" viewBox="0 0 100 100">
          <circle
            class="score-bg"
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="var(--vp-c-border)"
            stroke-width="8"
          />
          <circle
            class="score-fill"
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="var(--websys-success)"
            stroke-width="8"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="circumference - (scores.overall / 100) * circumference"
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div class="score-text">
          <span class="score-value">{{ scores.overall }}</span>
          <span class="score-unit">%</span>
        </div>
      </div>
      <p class="score-label">総合品質スコア</p>
    </div>

    <div class="score-breakdown">
      <div
        v-for="(score, key) in detailScores"
        :key="key"
        class="score-item"
      >
        <div class="score-info">
          <span class="score-name">{{ getScoreName(key) }}</span>
          <span class="score-percentage">{{ score }}%</span>
        </div>
        <div class="score-bar">
          <div
            class="score-progress"
            :style="{
              width: `${score}%`,
              backgroundColor: getScoreColor(score)
            }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface QualityScores {
  overall: number
  documentation: number
  codeQuality: number
  accessibility: number
  performance: number
  security: number
}

interface Props {
  scores: QualityScores
}

const props = defineProps<Props>()

const circumference = computed(() => 2 * Math.PI * 40)

const detailScores = computed(() => {
  const { overall, ...details } = props.scores
  return details
})

const getScoreName = (key: string): string => {
  const names: Record<string, string> = {
    documentation: 'ドキュメント品質',
    codeQuality: 'コード品質',
    accessibility: 'アクセシビリティ',
    performance: 'パフォーマンス',
    security: 'セキュリティ'
  }
  return names[key] || key
}

const getScoreColor = (score: number): string => {
  if (score >= 90) return 'var(--websys-success)'
  if (score >= 70) return 'var(--websys-warning)'
  return 'var(--websys-accent)'
}
</script>

<style scoped>
.quality-score-widget {
  text-align: center;
}

.overall-score {
  margin-bottom: var(--websys-spacing-lg);
}

.score-circle {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto var(--websys-spacing-md);
}

.score-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.score-fill {
  transition: stroke-dashoffset 1s ease-in-out;
}

.score-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.score-unit {
  font-size: 1rem;
  color: var(--vp-c-text-2);
}

.score-label {
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
  margin: 0;
}

.score-breakdown {
  display: flex;
  flex-direction: column;
  gap: var(--websys-spacing-sm);
}

.score-item {
  text-align: left;
}

.score-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--websys-spacing-xs);
}

.score-name {
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}

.score-percentage {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.score-bar {
  height: 6px;
  background: var(--vp-c-bg-soft);
  border-radius: 3px;
  overflow: hidden;
}

.score-progress {
  height: 100%;
  transition: width 0.8s ease-in-out;
  border-radius: 3px;
}
</style>
<template>
  <div class="project-progress-widget">
    <h3 class="widget-title">
      🚀 プロジェクト進捗
    </h3>

    <div class="progress-phases">
      <div
        v-for="(phase, index) in progress.phases"
        :key="index"
        class="phase-item"
        :class="phase.status"
      >
        <div class="phase-indicator">
          <div class="phase-icon">
            {{ getPhaseIcon(phase.status) }}
          </div>
          <div
            v-if="index < progress.phases.length - 1"
            class="phase-connector"
            :class="{ active: phase.status === 'completed' }"
          ></div>
        </div>

        <div class="phase-content">
          <h4 class="phase-name">{{ phase.name }}</h4>
          <p class="phase-description">{{ phase.description }}</p>
          <div class="phase-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{
                  width: `${phase.completion}%`,
                  backgroundColor: getStatusColor(phase.status)
                }"
              ></div>
            </div>
            <span class="progress-text">{{ phase.completion }}%</span>
          </div>
        </div>
      </div>
    </div>

    <div class="milestones">
      <h4 class="milestones-title">📅 マイルストーン</h4>
      <div class="milestones-list">
        <div
          v-for="milestone in progress.milestones"
          :key="milestone.name"
          class="milestone-item"
          :class="milestone.status"
        >
          <span class="milestone-icon">
            {{ getMilestoneIcon(milestone.status) }}
          </span>
          <div class="milestone-info">
            <span class="milestone-name">{{ milestone.name }}</span>
            <span class="milestone-date">{{ formatDate(milestone.date) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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

interface Props {
  progress: ProjectProgress
}

const props = defineProps<Props>()

const getPhaseIcon = (status: string): string => {
  switch (status) {
    case 'completed': return '✅'
    case 'in-progress': return '🔄'
    case 'pending': return '⏳'
    default: return '❓'
  }
}

const getMilestoneIcon = (status: string): string => {
  switch (status) {
    case 'completed': return '🎯'
    case 'upcoming': return '📅'
    case 'overdue': return '⚠️'
    default: return '📌'
  }
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed': return 'var(--websys-success)'
    case 'in-progress': return 'var(--websys-warning)'
    case 'pending': return 'var(--websys-gray-400)'
    default: return 'var(--websys-gray-400)'
  }
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric'
  })
}
</script>

<style scoped>
.project-progress-widget {
  grid-column: span 2;
}

.progress-phases {
  margin-bottom: var(--websys-spacing-lg);
}

.phase-item {
  display: flex;
  gap: var(--websys-spacing-md);
  margin-bottom: var(--websys-spacing-lg);
}

.phase-item:last-child {
  margin-bottom: 0;
}

.phase-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.phase-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--vp-c-bg-soft);
  border: 2px solid var(--vp-c-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  margin-bottom: var(--websys-spacing-xs);
  transition: all 0.3s ease;
}

.phase-item.completed .phase-icon {
  background: var(--websys-success);
  border-color: var(--websys-success);
  color: white;
}

.phase-item.in-progress .phase-icon {
  background: var(--websys-warning);
  border-color: var(--websys-warning);
  color: white;
  animation: pulse 2s infinite;
}

.phase-connector {
  width: 2px;
  height: 40px;
  background: var(--vp-c-border);
  transition: background-color 0.3s ease;
}

.phase-connector.active {
  background: var(--websys-success);
}

.phase-content {
  flex: 1;
  min-width: 0;
}

.phase-name {
  margin: 0 0 var(--websys-spacing-xs) 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.phase-description {
  margin: 0 0 var(--websys-spacing-sm) 0;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  line-height: 1.4;
}

.phase-progress {
  display: flex;
  align-items: center;
  gap: var(--websys-spacing-sm);
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

.progress-text {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  min-width: 35px;
}

.milestones {
  border-top: 1px solid var(--vp-c-border);
  padding-top: var(--websys-spacing-lg);
}

.milestones-title {
  margin: 0 0 var(--websys-spacing-md) 0;
  font-size: 1rem;
  color: var(--vp-c-text-1);
}

.milestones-list {
  display: flex;
  flex-direction: column;
  gap: var(--websys-spacing-sm);
}

.milestone-item {
  display: flex;
  align-items: center;
  gap: var(--websys-spacing-sm);
  padding: var(--websys-spacing-sm);
  background: var(--vp-c-bg-soft);
  border-radius: var(--websys-border-radius);
  border-left: 4px solid var(--vp-c-border);
}

.milestone-item.completed {
  border-left-color: var(--websys-success);
}

.milestone-item.upcoming {
  border-left-color: var(--websys-info);
}

.milestone-item.overdue {
  border-left-color: var(--websys-accent);
}

.milestone-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.milestone-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  flex: 1;
}

.milestone-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.milestone-date {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
}

/* アニメーション */
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

/* レスポンシブ調整 */
@media (max-width: 1024px) {
  .project-progress-widget {
    grid-column: span 1;
  }
}

@media (max-width: 768px) {
  .phase-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--websys-spacing-sm);
  }

  .phase-indicator {
    flex-direction: row;
    align-items: center;
    width: 100%;
  }

  .phase-connector {
    width: 100px;
    height: 2px;
    margin-left: var(--websys-spacing-sm);
  }

  .milestone-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--websys-spacing-xs);
  }

  .milestone-info {
    flex-direction: row;
    gap: var(--websys-spacing-sm);
    align-items: center;
  }
}
</style>
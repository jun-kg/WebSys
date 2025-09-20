<template>
  <div :class="progressWrapperClasses">
    <div v-if="showText && textInside === false" :class="labelClasses">
      <slot name="label">
        {{ label }}
      </slot>
    </div>

    <el-progress
      :class="progressClasses"
      :percentage="percentage"
      :type="type"
      :stroke-width="computedStrokeWidth"
      :text-inside="textInside"
      :status="status"
      :color="color"
      :width="computedWidth"
      :show-text="showText"
      :stroke-linecap="strokeLinecap"
      :format="format"
      v-bind="$attrs"
    >
      <template v-if="$slots.default" #default="scope">
        <slot :percentage="scope.percentage" />
      </template>
    </el-progress>

    <div v-if="description" :class="descriptionClasses">
      <slot name="description">
        {{ description }}
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { ElProgress } from 'element-plus'
import { useResponsive } from '../../composables/useResponsive'

type ProgressType = 'line' | 'circle' | 'dashboard'
type ProgressStatus = 'success' | 'exception' | 'warning' | ''
type StrokeLinecap = 'butt' | 'round' | 'square'

interface CommonProgressProps {
  percentage: number
  type?: ProgressType
  strokeWidth?: number
  textInside?: boolean
  status?: ProgressStatus
  color?: string | Array<string | { color: string; percentage: number }> | ((percentage: number) => string)
  width?: number
  showText?: boolean
  strokeLinecap?: StrokeLinecap
  format?: (percentage: number) => string
  label?: string
  description?: string
  responsive?: boolean
  touchOptimized?: boolean
  variant?: 'default' | 'minimal' | 'status' | 'animated'
  size?: 'small' | 'default' | 'large'
}

const props = withDefaults(defineProps<CommonProgressProps>(), {
  type: 'line',
  strokeWidth: 6,
  textInside: false,
  status: '',
  width: 126,
  showText: true,
  strokeLinecap: 'round',
  responsive: true,
  touchOptimized: true,
  variant: 'default',
  size: 'default'
})

const { isMobile, isTablet } = useResponsive()

const computedStrokeWidth = computed(() => {
  if (props.responsive) {
    if (isMobile.value) {
      if (props.size === 'small') return 4
      if (props.size === 'large') return 8
      return 6
    }
    if (isTablet.value && props.size === 'small') {
      return 5
    }
  }
  return props.strokeWidth
})

const computedWidth = computed(() => {
  if (props.type === 'circle' || props.type === 'dashboard') {
    if (props.responsive) {
      if (isMobile.value) {
        if (props.size === 'small') return 80
        if (props.size === 'large') return 120
        return 100
      }
      if (isTablet.value) {
        if (props.size === 'small') return 90
        if (props.size === 'large') return 140
        return 110
      }
    }
  }
  return props.width
})

const progressWrapperClasses = computed(() => [
  'common-progress-wrapper',
  `common-progress-wrapper--${props.variant}`,
  `common-progress-wrapper--${props.size}`,
  {
    'common-progress-wrapper--responsive': props.responsive,
    'common-progress-wrapper--mobile': isMobile.value,
    'common-progress-wrapper--tablet': isTablet.value,
    'common-progress-wrapper--touch-optimized': props.touchOptimized
  }
])

const progressClasses = computed(() => [
  'common-progress',
  {
    'common-progress--mobile': isMobile.value,
    'common-progress--animated': props.variant === 'animated'
  }
])

const labelClasses = computed(() => [
  'common-progress__label',
  {
    'common-progress__label--mobile': isMobile.value
  }
])

const descriptionClasses = computed(() => [
  'common-progress__description',
  {
    'common-progress__description--mobile': isMobile.value
  }
])
</script>

<style scoped>
.common-progress-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.common-progress-wrapper--responsive {
  transition: all 0.3s ease;
}

.common-progress-wrapper--mobile {
  gap: 6px;
}

.common-progress-wrapper--touch-optimized {
  min-height: 44px;
  justify-content: center;
}

.common-progress-wrapper--minimal {
  gap: 4px;
}

.common-progress-wrapper--status {
  padding: 12px;
  background: var(--el-fill-color-extra-light);
  border-radius: 8px;
  border-left: 4px solid var(--el-color-primary);
}

.common-progress-wrapper--status.common-progress-wrapper--mobile {
  padding: 8px;
  border-radius: 6px;
  border-left-width: 3px;
}

.common-progress {
  width: 100%;
}

.common-progress--mobile :deep(.el-progress__text) {
  font-size: 13px;
}

.common-progress--animated :deep(.el-progress-bar__outer) {
  background: linear-gradient(
    90deg,
    var(--el-fill-color-light) 25%,
    transparent 25%,
    transparent 50%,
    var(--el-fill-color-light) 50%,
    var(--el-fill-color-light) 75%,
    transparent 75%
  );
  background-size: 20px 20px;
  animation: progress-stripes 1s linear infinite;
}

.common-progress--animated :deep(.el-progress-bar__inner) {
  background: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.15) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0.15) 75%,
    transparent 75%
  );
  background-size: 20px 20px;
  animation: progress-stripes 1s linear infinite reverse;
}

.common-progress__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}

.common-progress__label--mobile {
  font-size: 13px;
}

.common-progress-wrapper--small .common-progress__label {
  font-size: 12px;
}

.common-progress-wrapper--large .common-progress__label {
  font-size: 16px;
}

.common-progress__description {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.3;
  margin-top: 2px;
}

.common-progress__description--mobile {
  font-size: 11px;
}

.common-progress-wrapper--small .common-progress__description {
  font-size: 11px;
}

.common-progress-wrapper--large .common-progress__description {
  font-size: 13px;
}

/* Circle and Dashboard specific styles */
.common-progress :deep(.el-progress--circle),
.common-progress :deep(.el-progress--dashboard) {
  display: flex;
  justify-content: center;
}

.common-progress :deep(.el-progress--circle .el-progress__text),
.common-progress :deep(.el-progress--dashboard .el-progress__text) {
  font-weight: 600;
}

.common-progress--mobile :deep(.el-progress--circle .el-progress__text),
.common-progress--mobile :deep(.el-progress--dashboard .el-progress__text) {
  font-size: 14px;
}

/* Status color customizations */
.common-progress-wrapper--status.status-success {
  border-left-color: var(--el-color-success);
}

.common-progress-wrapper--status.status-warning {
  border-left-color: var(--el-color-warning);
}

.common-progress-wrapper--status.status-error {
  border-left-color: var(--el-color-danger);
}

/* Animations */
@keyframes progress-stripes {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 20px 0;
  }
}

/* Mobile optimizations */
@media (max-width: 576px) {
  .common-progress-wrapper {
    gap: 4px;
  }

  .common-progress-wrapper--status {
    padding: 6px;
  }

  .common-progress :deep(.el-progress-bar) {
    padding-right: 0;
  }

  .common-progress :deep(.el-progress__text) {
    margin-left: 8px;
  }
}

/* Touch device optimizations */
@media (hover: none) {
  .common-progress-wrapper--touch-optimized {
    min-height: 48px;
  }

  .common-progress-wrapper--touch-optimized .common-progress__label {
    font-size: 15px;
  }
}

/* High resolution display optimizations */
@media (min-width: 1200px) {
  .common-progress-wrapper--large .common-progress__label {
    font-size: 18px;
  }

  .common-progress-wrapper--large .common-progress__description {
    font-size: 14px;
  }
}
</style>
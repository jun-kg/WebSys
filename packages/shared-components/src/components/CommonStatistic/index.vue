<template>
  <div :class="statisticClasses">
    <div v-if="title" :class="titleClasses">
      <slot name="title">
        {{ title }}
      </slot>
    </div>

    <div :class="valueClasses">
      <slot name="prefix">
        <span v-if="prefix" class="statistic-prefix">{{ prefix }}</span>
      </slot>

      <span :class="numberClasses">
        <slot name="formatter" :value="value">
          {{ formattedValue }}
        </slot>
      </span>

      <slot name="suffix">
        <span v-if="suffix" class="statistic-suffix">{{ suffix }}</span>
      </slot>
    </div>

    <div v-if="$slots.extra || extra" :class="extraClasses">
      <slot name="extra">
        {{ extra }}
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useResponsive } from '../../composables/useResponsive'

interface CommonStatisticProps {
  title?: string
  value?: number | string
  precision?: number
  prefix?: string
  suffix?: string
  extra?: string
  valueStyle?: object
  formatter?: (value: number | string) => string
  responsive?: boolean
  variant?: 'default' | 'card' | 'highlight' | 'compact'
  size?: 'small' | 'default' | 'large'
  touchOptimized?: boolean
}

const props = withDefaults(defineProps<CommonStatisticProps>(), {
  precision: 0,
  responsive: true,
  variant: 'default',
  size: 'default',
  touchOptimized: true
})

const { isMobile, isTablet } = useResponsive()

const formattedValue = computed(() => {
  if (props.formatter) {
    return props.formatter(props.value ?? 0)
  }

  if (typeof props.value === 'number') {
    return props.value.toFixed(props.precision)
  }

  return props.value?.toString() ?? '0'
})

const computedSize = computed(() => {
  if (props.responsive) {
    if (isMobile.value) {
      return props.size === 'large' ? 'default' : 'small'
    }
    if (isTablet.value && props.size === 'small') {
      return 'default'
    }
  }
  return props.size
})

const statisticClasses = computed(() => [
  'common-statistic',
  `common-statistic--${props.variant}`,
  `common-statistic--${computedSize.value}`,
  {
    'common-statistic--responsive': props.responsive,
    'common-statistic--mobile': isMobile.value,
    'common-statistic--tablet': isTablet.value,
    'common-statistic--touch-optimized': props.touchOptimized
  }
])

const titleClasses = computed(() => [
  'common-statistic__title',
  {
    'common-statistic__title--mobile': isMobile.value
  }
])

const valueClasses = computed(() => [
  'common-statistic__value',
  {
    'common-statistic__value--mobile': isMobile.value,
    'common-statistic__value--tablet': isTablet.value
  }
])

const numberClasses = computed(() => [
  'common-statistic__number',
  {
    'common-statistic__number--mobile': isMobile.value
  }
])

const extraClasses = computed(() => [
  'common-statistic__extra',
  {
    'common-statistic__extra--mobile': isMobile.value
  }
])
</script>

<style scoped>
.common-statistic {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 16px;
  transition: all 0.3s ease;
}

.common-statistic--responsive {
  width: 100%;
}

.common-statistic--mobile {
  padding: 12px 8px;
}

.common-statistic--touch-optimized {
  min-height: 44px;
  justify-content: center;
}

.common-statistic--card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.common-statistic--highlight {
  background: linear-gradient(135deg, var(--el-color-primary-light-9), var(--el-color-primary-light-8));
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}

.common-statistic--highlight::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--el-color-primary);
}

.common-statistic--compact {
  padding: 8px 12px;
  flex-direction: row;
  align-items: center;
  text-align: left;
  gap: 12px;
}

.common-statistic--compact .common-statistic__title {
  margin-bottom: 0;
  flex-shrink: 0;
}

.common-statistic--compact .common-statistic__value {
  margin: 0;
}

.common-statistic__title {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
  font-weight: 500;
  line-height: 1.4;
}

.common-statistic__title--mobile {
  font-size: 13px;
  margin-bottom: 6px;
}

.common-statistic--small .common-statistic__title {
  font-size: 12px;
}

.common-statistic--large .common-statistic__title {
  font-size: 16px;
}

.common-statistic__value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  margin: 8px 0;
  flex-wrap: wrap;
}

.common-statistic__value--mobile {
  margin: 4px 0;
  gap: 2px;
}

.common-statistic--compact .common-statistic__value {
  margin: 0;
}

.common-statistic__number {
  font-size: 32px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.common-statistic__number--mobile {
  font-size: 24px;
}

.common-statistic--small .common-statistic__number {
  font-size: 24px;
}

.common-statistic--small.common-statistic--mobile .common-statistic__number {
  font-size: 18px;
}

.common-statistic--large .common-statistic__number {
  font-size: 40px;
}

.common-statistic--large.common-statistic--mobile .common-statistic__number {
  font-size: 28px;
}

.common-statistic--compact .common-statistic__number {
  font-size: 20px;
}

.common-statistic--compact.common-statistic--mobile .common-statistic__number {
  font-size: 16px;
}

.statistic-prefix,
.statistic-suffix {
  font-size: 16px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.common-statistic--mobile .statistic-prefix,
.common-statistic--mobile .statistic-suffix {
  font-size: 14px;
}

.common-statistic--small .statistic-prefix,
.common-statistic--small .statistic-suffix {
  font-size: 14px;
}

.common-statistic--large .statistic-prefix,
.common-statistic--large .statistic-suffix {
  font-size: 20px;
}

.common-statistic__extra {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  margin-top: 4px;
  line-height: 1.3;
}

.common-statistic__extra--mobile {
  font-size: 11px;
  margin-top: 2px;
}

.common-statistic--highlight .common-statistic__number {
  color: var(--el-color-primary);
  font-weight: 700;
}

.common-statistic--highlight .common-statistic__title {
  color: var(--el-color-primary-dark-2);
  font-weight: 600;
}

@media (max-width: 576px) {
  .common-statistic {
    padding: 8px 4px;
  }

  .common-statistic--card {
    border-radius: 6px;
  }

  .common-statistic--highlight {
    border-radius: 8px;
  }
}

@media (min-width: 1200px) {
  .common-statistic--large .common-statistic__number {
    font-size: 48px;
  }

  .common-statistic--large .common-statistic__title {
    font-size: 18px;
  }
}

@media (hover: hover) {
  .common-statistic--card:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    transform: translateY(-1px);
  }

  .common-statistic--highlight:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  }
}
</style>
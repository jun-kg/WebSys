<template>
  <el-row
    :class="rowClasses"
    :gutter="computedGutter"
    :type="type"
    :justify="computedJustify"
    :align="computedAlign"
    :tag="tag"
    v-bind="$attrs"
  >
    <slot />
  </el-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElRow } from 'element-plus'
import { useResponsive } from '../../composables/useResponsive'

interface CommonRowProps {
  gutter?: number
  type?: 'flex'
  justify?: 'start' | 'end' | 'center' | 'space-around' | 'space-between' | 'space-evenly'
  align?: 'top' | 'middle' | 'bottom'
  tag?: string
  responsive?: boolean
  mobileStack?: boolean
  mobileGutter?: number
  tabletGutter?: number
  touchOptimized?: boolean
}

const props = withDefaults(defineProps<CommonRowProps>(), {
  gutter: 20,
  type: 'flex',
  justify: 'start',
  align: 'top',
  tag: 'div',
  responsive: true,
  mobileStack: true,
  mobileGutter: 12,
  tabletGutter: 16,
  touchOptimized: true
})

const { isMobile, isTablet } = useResponsive()

const computedGutter = computed(() => {
  if (props.responsive) {
    if (isMobile.value) {
      return props.mobileGutter
    }
    if (isTablet.value) {
      return props.tabletGutter
    }
  }
  return props.gutter
})

const computedJustify = computed(() => {
  if (props.mobileStack && isMobile.value) {
    return 'start'
  }
  return props.justify
})

const computedAlign = computed(() => {
  if (props.mobileStack && isMobile.value) {
    return 'top'
  }
  return props.align
})

const rowClasses = computed(() => [
  'common-row',
  {
    'common-row--responsive': props.responsive,
    'common-row--mobile': isMobile.value,
    'common-row--tablet': isTablet.value,
    'common-row--mobile-stack': props.mobileStack && isMobile.value,
    'common-row--touch-optimized': props.touchOptimized
  }
])
</script>

<style scoped>
.common-row {
  width: 100%;
  box-sizing: border-box;
}

.common-row--responsive {
  transition: all 0.3s ease;
}

.common-row--mobile-stack {
  flex-direction: column;
}

.common-row--mobile-stack :deep(.el-col) {
  width: 100% !important;
  margin-bottom: 12px;
}

.common-row--mobile-stack :deep(.el-col:last-child) {
  margin-bottom: 0;
}

.common-row--touch-optimized :deep(.el-col) {
  min-height: 44px;
  display: flex;
  align-items: center;
}

.common-row--mobile {
  padding: 0 8px;
}

.common-row--tablet {
  padding: 0 4px;
}

@media (max-width: 576px) {
  .common-row--mobile {
    margin: 0 -8px;
  }
}

@media (min-width: 1200px) {
  .common-row {
    max-width: 1200px;
    margin: 0 auto;
  }
}
</style>
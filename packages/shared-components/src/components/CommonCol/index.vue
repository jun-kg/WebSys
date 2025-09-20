<template>
  <el-col
    :class="colClasses"
    :span="computedSpan"
    :offset="computedOffset"
    :push="computedPush"
    :pull="computedPull"
    :xs="computedXs"
    :sm="computedSm"
    :md="computedMd"
    :lg="computedLg"
    :xl="computedXl"
    :tag="tag"
    v-bind="$attrs"
  >
    <slot />
  </el-col>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElCol } from 'element-plus'
import { useResponsive } from '../../composables/useResponsive'

interface ResponsiveConfig {
  span?: number
  offset?: number
  push?: number
  pull?: number
}

interface CommonColProps {
  span?: number
  offset?: number
  push?: number
  pull?: number
  xs?: number | ResponsiveConfig
  sm?: number | ResponsiveConfig
  md?: number | ResponsiveConfig
  lg?: number | ResponsiveConfig
  xl?: number | ResponsiveConfig
  tag?: string
  responsive?: boolean
  mobileFullWidth?: boolean
  touchOptimized?: boolean
  autoStack?: boolean
}

const props = withDefaults(defineProps<CommonColProps>(), {
  span: 24,
  offset: 0,
  push: 0,
  pull: 0,
  tag: 'div',
  responsive: true,
  mobileFullWidth: true,
  touchOptimized: true,
  autoStack: false
})

const { isMobile, isTablet, currentBreakpoint } = useResponsive()

const computedSpan = computed(() => {
  if (props.responsive && props.mobileFullWidth && isMobile.value) {
    return 24
  }
  if (props.autoStack && isMobile.value) {
    return 24
  }
  return props.span
})

const computedOffset = computed(() => {
  if (props.responsive && isMobile.value) {
    return 0
  }
  return props.offset
})

const computedPush = computed(() => {
  if (props.responsive && isMobile.value) {
    return 0
  }
  return props.push
})

const computedPull = computed(() => {
  if (props.responsive && isMobile.value) {
    return 0
  }
  return props.pull
})

const computedXs = computed(() => {
  if (props.xs !== undefined) return props.xs
  if (props.mobileFullWidth) return 24
  return undefined
})

const computedSm = computed(() => {
  if (props.sm !== undefined) return props.sm
  if (props.autoStack && currentBreakpoint.value === 'sm') {
    return props.span > 12 ? 24 : props.span
  }
  return undefined
})

const computedMd = computed(() => {
  return props.md
})

const computedLg = computed(() => {
  return props.lg
})

const computedXl = computed(() => {
  return props.xl
})

const colClasses = computed(() => [
  'common-col',
  {
    'common-col--responsive': props.responsive,
    'common-col--mobile': isMobile.value,
    'common-col--tablet': isTablet.value,
    'common-col--mobile-full': props.mobileFullWidth && isMobile.value,
    'common-col--touch-optimized': props.touchOptimized,
    'common-col--auto-stack': props.autoStack
  }
])
</script>

<style scoped>
.common-col {
  box-sizing: border-box;
  transition: all 0.3s ease;
}

.common-col--responsive {
  min-height: auto;
}

.common-col--mobile-full {
  width: 100% !important;
  flex: none !important;
}

.common-col--touch-optimized {
  min-height: 44px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.common-col--mobile {
  padding: 8px 0;
}

.common-col--tablet {
  padding: 4px 0;
}

.common-col--auto-stack {
  transition: width 0.3s ease, flex 0.3s ease;
}

@media (max-width: 576px) {
  .common-col--mobile {
    margin-bottom: 8px;
  }

  .common-col--mobile:last-child {
    margin-bottom: 0;
  }
}

@media (min-width: 576px) and (max-width: 767px) {
  .common-col--auto-stack {
    flex-basis: 50%;
    max-width: 50%;
  }
}

@media (min-width: 768px) and (max-width: 991px) {
  .common-col--auto-stack {
    flex-basis: 33.333%;
    max-width: 33.333%;
  }
}

@media (min-width: 992px) {
  .common-col--auto-stack {
    flex-basis: auto;
    max-width: none;
  }
}
</style>
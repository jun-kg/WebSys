<template>
  <el-card
    :class="cardClasses"
    :shadow="shadow"
    :body-style="computedBodyStyle"
    v-bind="$attrs"
  >
    <template v-if="$slots.header" #header>
      <div :class="headerClasses">
        <slot name="header" />
      </div>
    </template>

    <div :class="contentClasses">
      <slot />
    </div>

    <template v-if="$slots.footer">
      <div :class="footerClasses">
        <slot name="footer" />
      </div>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { ElCard } from 'element-plus'
import { useResponsive } from '../../composables/useResponsive'

interface CommonCardProps {
  shadow?: 'always' | 'hover' | 'never'
  responsive?: boolean
  mobileFullWidth?: boolean
  compactMobile?: boolean
  touchOptimized?: boolean
  variant?: 'default' | 'stat' | 'action' | 'info'
  bodyStyle?: CSSProperties
}

const props = withDefaults(defineProps<CommonCardProps>(), {
  shadow: 'hover',
  responsive: true,
  mobileFullWidth: false,
  compactMobile: true,
  touchOptimized: true,
  variant: 'default'
})

const { isMobile, isTablet } = useResponsive()

const cardClasses = computed(() => [
  'common-card',
  `common-card--${props.variant}`,
  {
    'common-card--responsive': props.responsive,
    'common-card--mobile-full': props.mobileFullWidth && isMobile.value,
    'common-card--compact-mobile': props.compactMobile && isMobile.value,
    'common-card--touch-optimized': props.touchOptimized
  }
])

const headerClasses = computed(() => [
  'common-card__header',
  {
    'common-card__header--mobile': isMobile.value
  }
])

const contentClasses = computed(() => [
  'common-card__content',
  {
    'common-card__content--mobile': isMobile.value,
    'common-card__content--tablet': isTablet.value
  }
])

const footerClasses = computed(() => [
  'common-card__footer',
  {
    'common-card__footer--mobile': isMobile.value
  }
])

const computedBodyStyle = computed(() => {
  const baseStyle: CSSProperties = {
    padding: isMobile.value && props.compactMobile ? '12px' : '20px',
    ...props.bodyStyle
  }

  if (props.touchOptimized && isMobile.value) {
    baseStyle.minHeight = '44px'
  }

  return baseStyle
})
</script>

<style scoped>
.common-card {
  transition: all 0.3s ease;
  border-radius: 8px;
}

.common-card--responsive {
  width: 100%;
}

.common-card--mobile-full {
  margin: 0 -16px;
  border-radius: 0;
  border-left: none;
  border-right: none;
}

.common-card--compact-mobile {
  margin-bottom: 12px;
}

.common-card--touch-optimized {
  min-height: 44px;
}

.common-card--stat .common-card__content {
  text-align: center;
}

.common-card--action {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.common-card--action:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.common-card--action:active {
  transform: translateY(0);
}

.common-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
}

.common-card__header--mobile {
  font-size: 14px;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.common-card__content--mobile {
  font-size: 14px;
  line-height: 1.5;
}

.common-card__content--tablet {
  font-size: 15px;
}

.common-card__footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.common-card__footer--mobile {
  flex-direction: column;
  gap: 8px;
}

@media (max-width: 576px) {
  .common-card {
    border-radius: 6px;
  }

  .common-card__header {
    padding-bottom: 8px;
  }
}

@media (min-width: 1200px) {
  .common-card--stat .common-card__content {
    font-size: 18px;
  }
}
</style>
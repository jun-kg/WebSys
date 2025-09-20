<template>
  <el-tag
    :class="tagClasses"
    :type="computedType"
    :size="computedSize"
    :closable="closable"
    :disable-transitions="disableTransitions"
    :hit="hit"
    :color="color"
    :effect="effect"
    :round="round"
    v-bind="$attrs"
    @close="handleClose"
    @click="handleClick"
  >
    <slot />
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElTag } from 'element-plus'
import { useResponsive } from '../../composables/useResponsive'

interface CommonTagProps {
  type?: 'success' | 'info' | 'warning' | 'danger' | ''
  size?: 'large' | 'default' | 'small'
  closable?: boolean
  disableTransitions?: boolean
  hit?: boolean
  color?: string
  effect?: 'dark' | 'light' | 'plain'
  round?: boolean
  responsive?: boolean
  touchOptimized?: boolean
  variant?: 'default' | 'status' | 'category' | 'action'
}

const props = withDefaults(defineProps<CommonTagProps>(), {
  type: '',
  size: 'default',
  closable: false,
  disableTransitions: false,
  hit: false,
  effect: 'light',
  round: false,
  responsive: true,
  touchOptimized: true,
  variant: 'default'
})

const emit = defineEmits<{
  close: [event: Event]
  click: [event: Event]
}>()

const { isMobile, isTablet } = useResponsive()

const computedType = computed(() => {
  if (props.variant === 'status') {
    return props.type
  }
  return props.type
})

const computedSize = computed(() => {
  if (props.responsive) {
    if (isMobile.value && props.touchOptimized) {
      return props.size === 'small' ? 'default' : 'large'
    }
    if (isTablet.value) {
      return props.size === 'small' ? 'default' : props.size
    }
  }
  return props.size
})

const tagClasses = computed(() => [
  'common-tag',
  `common-tag--${props.variant}`,
  {
    'common-tag--responsive': props.responsive,
    'common-tag--mobile': isMobile.value,
    'common-tag--tablet': isTablet.value,
    'common-tag--touch-optimized': props.touchOptimized,
    'common-tag--clickable': props.variant === 'action'
  }
])

const handleClose = (event: Event) => {
  emit('close', event)
}

const handleClick = (event: Event) => {
  emit('click', event)
}
</script>

<style scoped>
.common-tag {
  transition: all 0.2s ease;
  border-radius: 4px;
  font-weight: 500;
}

.common-tag--responsive {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.common-tag--mobile {
  font-size: 13px;
  padding: 4px 8px;
  border-radius: 6px;
}

.common-tag--tablet {
  font-size: 14px;
}

.common-tag--touch-optimized {
  min-height: 32px;
  min-width: 32px;
}

.common-tag--touch-optimized.common-tag--mobile {
  min-height: 36px;
  min-width: 36px;
  padding: 6px 12px;
}

.common-tag--status {
  font-weight: 600;
  letter-spacing: 0.02em;
}

.common-tag--category {
  border-radius: 16px;
  padding: 2px 12px;
}

.common-tag--category.common-tag--mobile {
  border-radius: 18px;
  padding: 6px 16px;
}

.common-tag--action {
  cursor: pointer;
  user-select: none;
  position: relative;
  overflow: hidden;
}

.common-tag--action:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.common-tag--action:active {
  transform: translateY(0);
}

.common-tag--action::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.3s ease, height 0.3s ease;
}

.common-tag--action:active::before {
  width: 100px;
  height: 100px;
}

.common-tag--clickable {
  transition: all 0.2s ease;
}

@media (max-width: 576px) {
  .common-tag {
    font-size: 12px;
  }

  .common-tag--status {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
}

@media (min-width: 1200px) {
  .common-tag--category {
    font-size: 15px;
  }
}

:deep(.el-tag__close) {
  transition: all 0.2s ease;
}

:deep(.el-tag__close):hover {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 50%;
}
</style>
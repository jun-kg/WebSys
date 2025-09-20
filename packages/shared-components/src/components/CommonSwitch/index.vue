<template>
  <el-switch
    :class="switchClasses"
    :model-value="modelValue"
    :disabled="disabled"
    :loading="loading"
    :size="computedSize"
    :width="computedWidth"
    :inline-prompt="inlinePrompt"
    :active-icon="activeIcon"
    :inactive-icon="inactiveIcon"
    :active-text="activeText"
    :inactive-text="inactiveText"
    :active-color="activeColor"
    :inactive-color="inactiveColor"
    :active-value="activeValue"
    :inactive-value="inactiveValue"
    :name="name"
    :validate-event="validateEvent"
    :before-change="beforeChange"
    v-bind="$attrs"
    @update:model-value="handleChange"
    @change="handleChange"
  >
    <template v-if="$slots.default">
      <slot />
    </template>
  </el-switch>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { ElSwitch } from 'element-plus'
import { useResponsive } from '../../composables/useResponsive'

type SwitchSize = 'large' | 'default' | 'small'

interface CommonSwitchProps {
  modelValue?: boolean | string | number
  disabled?: boolean
  loading?: boolean
  size?: SwitchSize
  width?: number | string
  inlinePrompt?: boolean
  activeIcon?: string
  inactiveIcon?: string
  activeText?: string
  inactiveText?: string
  activeColor?: string
  inactiveColor?: string
  activeValue?: boolean | string | number
  inactiveValue?: boolean | string | number
  name?: string
  validateEvent?: boolean
  beforeChange?: () => boolean | Promise<boolean>
  responsive?: boolean
  touchOptimized?: boolean
  variant?: 'default' | 'large' | 'compact' | 'pill'
}

const props = withDefaults(defineProps<CommonSwitchProps>(), {
  disabled: false,
  loading: false,
  size: 'default',
  inlinePrompt: false,
  activeValue: true,
  inactiveValue: false,
  validateEvent: true,
  responsive: true,
  touchOptimized: true,
  variant: 'default'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean | string | number]
  change: [value: boolean | string | number]
}>()

const { isMobile, isTablet } = useResponsive()

const computedSize = computed((): SwitchSize => {
  if (props.responsive && props.touchOptimized) {
    if (isMobile.value) {
      return props.size === 'small' ? 'default' : 'large'
    }
    if (isTablet.value && props.size === 'small') {
      return 'default'
    }
  }
  return props.size
})

const computedWidth = computed(() => {
  if (props.width) return props.width

  if (props.responsive) {
    if (props.variant === 'large') {
      return isMobile.value ? 60 : 80
    }
    if (props.variant === 'compact') {
      return isMobile.value ? 40 : 50
    }
    if (props.touchOptimized && isMobile.value) {
      return 50
    }
  }

  return undefined
})

const switchClasses = computed(() => [
  'common-switch',
  `common-switch--${props.variant}`,
  {
    'common-switch--responsive': props.responsive,
    'common-switch--mobile': isMobile.value,
    'common-switch--tablet': isTablet.value,
    'common-switch--touch-optimized': props.touchOptimized
  }
])

const handleChange = (value: boolean | string | number) => {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped>
.common-switch {
  transition: all 0.3s ease;
}

.common-switch--responsive {
  display: inline-flex;
  align-items: center;
}

.common-switch--touch-optimized {
  min-height: 44px;
}

.common-switch--touch-optimized.common-switch--mobile {
  min-height: 48px;
}

.common-switch--large :deep(.el-switch__core) {
  min-width: 80px;
  height: 32px;
  border-radius: 16px;
}

.common-switch--large.common-switch--mobile :deep(.el-switch__core) {
  min-width: 60px;
  height: 28px;
  border-radius: 14px;
}

.common-switch--compact :deep(.el-switch__core) {
  min-width: 50px;
  height: 22px;
  border-radius: 11px;
}

.common-switch--compact.common-switch--mobile :deep(.el-switch__core) {
  min-width: 40px;
  height: 20px;
  border-radius: 10px;
}

.common-switch--pill :deep(.el-switch__core) {
  border-radius: 20px;
}

/* Touch optimizations */
.common-switch--touch-optimized :deep(.el-switch__core) {
  position: relative;
}

.common-switch--touch-optimized :deep(.el-switch__core::before) {
  content: '';
  position: absolute;
  top: -8px;
  left: -8px;
  right: -8px;
  bottom: -8px;
  border-radius: inherit;
}

.common-switch--touch-optimized.common-switch--mobile :deep(.el-switch__core::before) {
  top: -12px;
  left: -12px;
  right: -12px;
  bottom: -12px;
}

/* Button styling */
.common-switch :deep(.el-switch__action) {
  transition: all 0.3s ease;
}

.common-switch--large :deep(.el-switch__action) {
  width: 28px;
  height: 28px;
}

.common-switch--large.common-switch--mobile :deep(.el-switch__action) {
  width: 24px;
  height: 24px;
}

.common-switch--compact :deep(.el-switch__action) {
  width: 18px;
  height: 18px;
}

.common-switch--compact.common-switch--mobile :deep(.el-switch__action) {
  width: 16px;
  height: 16px;
}

/* Text styling */
.common-switch :deep(.el-switch__label) {
  font-size: 14px;
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.common-switch--mobile :deep(.el-switch__label) {
  font-size: 15px;
}

.common-switch--compact :deep(.el-switch__label) {
  font-size: 13px;
}

.common-switch--compact.common-switch--mobile :deep(.el-switch__label) {
  font-size: 14px;
}

/* Icon styling */
.common-switch :deep(.el-switch__icon) {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Loading state */
.common-switch :deep(.el-switch.is-loading .el-switch__action) {
  pointer-events: none;
}

.common-switch :deep(.el-switch.is-loading .el-loading-spinner) {
  top: 50%;
  margin-top: -7px;
}

.common-switch--large :deep(.el-switch.is-loading .el-loading-spinner) {
  margin-top: -8px;
}

.common-switch--compact :deep(.el-switch.is-loading .el-loading-spinner) {
  margin-top: -6px;
}

/* Disabled state */
.common-switch :deep(.el-switch.is-disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}

.common-switch :deep(.el-switch.is-disabled .el-switch__core),
.common-switch :deep(.el-switch.is-disabled .el-switch__label) {
  cursor: not-allowed;
}

/* Focus states */
.common-switch :deep(.el-switch__input:focus-visible + .el-switch__core) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: 2px;
}

/* Active state animations */
.common-switch :deep(.el-switch__core) {
  transition: border-color 0.3s ease, background-color 0.3s ease;
}

.common-switch :deep(.el-switch__action) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .common-switch :deep(.el-switch__core) {
    border: 2px solid var(--el-border-color);
  }

  .common-switch :deep(.el-switch.is-checked .el-switch__core) {
    border-color: var(--el-color-primary);
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .common-switch :deep(.el-switch__core),
  .common-switch :deep(.el-switch__action) {
    transition: none;
  }
}

/* Dark mode optimizations */
@media (prefers-color-scheme: dark) {
  .common-switch :deep(.el-switch__action) {
    background-color: var(--el-bg-color);
    border: 1px solid var(--el-border-color-light);
  }
}
</style>
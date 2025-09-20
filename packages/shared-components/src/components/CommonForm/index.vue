<template>
  <el-form
    :class="formClasses"
    :model="model"
    :rules="rules"
    :inline="computedInline"
    :label-position="computedLabelPosition"
    :label-width="computedLabelWidth"
    :label-suffix="labelSuffix"
    :hide-required-asterisk="hideRequiredAsterisk"
    :show-message="showMessage"
    :inline-message="inlineMessage"
    :status-icon="statusIcon"
    :validate-on-rule-change="validateOnRuleChange"
    :size="computedSize"
    :disabled="disabled"
    v-bind="$attrs"
    @validate="handleValidate"
  >
    <slot />
  </el-form>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { ElForm } from 'element-plus'
import type { FormRules } from 'element-plus'
import { useResponsive } from '../../composables/useResponsive'

type FormSize = 'large' | 'default' | 'small'
type LabelPosition = 'left' | 'right' | 'top'

interface CommonFormProps {
  model?: Record<string, any>
  rules?: FormRules
  inline?: boolean
  labelPosition?: LabelPosition
  labelWidth?: string | number
  labelSuffix?: string
  hideRequiredAsterisk?: boolean
  showMessage?: boolean
  inlineMessage?: boolean
  statusIcon?: boolean
  validateOnRuleChange?: boolean
  size?: FormSize
  disabled?: boolean
  responsive?: boolean
  mobileStack?: boolean
  touchOptimized?: boolean
  variant?: 'default' | 'compact' | 'card' | 'inline'
}

const props = withDefaults(defineProps<CommonFormProps>(), {
  inline: false,
  labelPosition: 'right',
  labelWidth: 'auto',
  labelSuffix: '',
  hideRequiredAsterisk: false,
  showMessage: true,
  inlineMessage: false,
  statusIcon: false,
  validateOnRuleChange: true,
  size: 'default',
  disabled: false,
  responsive: true,
  mobileStack: true,
  touchOptimized: true,
  variant: 'default'
})

const emit = defineEmits<{
  validate: [prop: string, isValid: boolean, message: string]
}>()

const { isMobile, isTablet } = useResponsive()

const computedInline = computed(() => {
  if (props.responsive && props.mobileStack && isMobile.value) {
    return false
  }
  return props.inline
})

const computedLabelPosition = computed((): LabelPosition => {
  if (props.responsive) {
    if (isMobile.value) {
      return 'top'
    }
    if (isTablet.value && props.labelPosition === 'right') {
      return 'top'
    }
  }
  return props.labelPosition
})

const computedLabelWidth = computed(() => {
  if (props.responsive) {
    if (isMobile.value) {
      return 'auto'
    }
    if (isTablet.value) {
      return typeof props.labelWidth === 'number'
        ? Math.min(props.labelWidth, 120) + 'px'
        : props.labelWidth
    }
  }
  return props.labelWidth
})

const computedSize = computed((): FormSize => {
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

const formClasses = computed(() => [
  'common-form',
  `common-form--${props.variant}`,
  {
    'common-form--responsive': props.responsive,
    'common-form--mobile': isMobile.value,
    'common-form--tablet': isTablet.value,
    'common-form--mobile-stack': props.mobileStack && isMobile.value,
    'common-form--touch-optimized': props.touchOptimized
  }
])

const handleValidate = (prop: string, isValid: boolean, message: string) => {
  emit('validate', prop, isValid, message)
}
</script>

<style scoped>
.common-form {
  width: 100%;
  transition: all 0.3s ease;
}

.common-form--responsive {
  display: flex;
  flex-direction: column;
}

.common-form--mobile {
  padding: 0 8px;
}

.common-form--tablet {
  padding: 0 4px;
}

.common-form--mobile-stack {
  gap: 16px;
}

.common-form--mobile-stack :deep(.el-form-item) {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
}

.common-form--mobile-stack :deep(.el-form-item__label) {
  margin-bottom: 8px;
  padding: 0;
  text-align: left !important;
  line-height: 1.4;
}

.common-form--mobile-stack :deep(.el-form-item__content) {
  margin-left: 0 !important;
}

.common-form--touch-optimized :deep(.el-form-item) {
  min-height: 44px;
  display: flex;
  align-items: center;
}

.common-form--touch-optimized :deep(.el-form-item__content) {
  min-height: 44px;
  display: flex;
  align-items: center;
}

.common-form--compact :deep(.el-form-item) {
  margin-bottom: 16px;
}

.common-form--compact.common-form--mobile :deep(.el-form-item) {
  margin-bottom: 12px;
}

.common-form--card {
  background: var(--el-bg-color);
  padding: 24px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.common-form--card.common-form--mobile {
  padding: 16px;
  border-radius: 6px;
  margin: 0 -8px;
  border-left: none;
  border-right: none;
}

.common-form--inline :deep(.el-form-item) {
  margin-right: 16px;
  margin-bottom: 0;
}

.common-form--inline.common-form--mobile :deep(.el-form-item) {
  margin-right: 0;
  margin-bottom: 12px;
  width: 100%;
}

/* Label styling */
.common-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}

.common-form--mobile :deep(.el-form-item__label) {
  font-size: 14px;
  font-weight: 600;
}

.common-form--tablet :deep(.el-form-item__label) {
  font-size: 15px;
}

/* Error message styling */
.common-form :deep(.el-form-item__error) {
  font-size: 12px;
  line-height: 1.3;
  margin-top: 4px;
}

.common-form--mobile :deep(.el-form-item__error) {
  font-size: 11px;
  margin-top: 6px;
}

/* Input spacing */
.common-form :deep(.el-form-item__content) {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.common-form--mobile :deep(.el-form-item__content) {
  gap: 6px;
}

/* Inline form responsive behavior */
@media (max-width: 576px) {
  .common-form--inline {
    display: flex !important;
    flex-direction: column !important;
  }

  .common-form--inline :deep(.el-form-item) {
    width: 100% !important;
    margin-right: 0 !important;
  }
}

@media (min-width: 577px) and (max-width: 768px) {
  .common-form--inline :deep(.el-form-item) {
    flex: 1;
    min-width: 200px;
  }
}

/* Touch device optimizations */
@media (hover: none) {
  .common-form--touch-optimized :deep(.el-input),
  .common-form--touch-optimized :deep(.el-select),
  .common-form--touch-optimized :deep(.el-button) {
    min-height: 48px;
  }
}

/* High resolution display optimizations */
@media (min-width: 1200px) {
  .common-form--card {
    padding: 32px;
  }
}

/* Focus states for accessibility */
.common-form :deep(.el-form-item.is-error) {
  animation: shake 0.3s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}
</style>
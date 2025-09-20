<template>
  <el-form-item
    :class="formItemClasses"
    :label="label"
    :label-width="computedLabelWidth"
    :prop="prop"
    :required="computedRequired"
    :rules="rules"
    :error="error"
    :show-message="showMessage"
    :inline-message="inlineMessage"
    :size="computedSize"
    v-bind="$attrs"
  >
    <template v-if="$slots.label" #label="scope">
      <slot name="label" v-bind="scope" />
    </template>

    <template v-if="$slots.error" #error="scope">
      <slot name="error" v-bind="scope" />
    </template>

    <div :class="contentClasses">
      <div v-if="description" :class="descriptionClasses">
        <slot name="description">
          {{ description }}
        </slot>
      </div>

      <div class="form-item-input">
        <slot />
      </div>

      <div v-if="hint" :class="hintClasses">
        <slot name="hint">
          {{ hint }}
        </slot>
      </div>
    </div>
  </el-form-item>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { ElFormItem } from 'element-plus'
import type { FormItemRule } from 'element-plus'
import { useResponsive } from '../../composables/useResponsive'

type FormItemSize = 'large' | 'default' | 'small'

interface CommonFormItemProps {
  label?: string
  labelWidth?: string | number
  prop?: string
  required?: boolean
  rules?: FormItemRule | FormItemRule[]
  error?: string
  showMessage?: boolean
  inlineMessage?: boolean
  size?: FormItemSize
  description?: string
  hint?: string
  responsive?: boolean
  touchOptimized?: boolean
  variant?: 'default' | 'compact' | 'floating' | 'stacked'
}

const props = withDefaults(defineProps<CommonFormItemProps>(), {
  required: false,
  showMessage: true,
  inlineMessage: false,
  size: 'default',
  responsive: true,
  touchOptimized: true,
  variant: 'default'
})

const { isMobile, isTablet } = useResponsive()

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

const computedRequired = computed(() => {
  if (props.required !== undefined) {
    return props.required
  }

  // Auto-detect required from rules
  if (props.rules) {
    const rulesArray = Array.isArray(props.rules) ? props.rules : [props.rules]
    return rulesArray.some(rule => rule.required === true)
  }

  return false
})

const computedSize = computed((): FormItemSize => {
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

const formItemClasses = computed(() => [
  'common-form-item',
  `common-form-item--${props.variant}`,
  {
    'common-form-item--responsive': props.responsive,
    'common-form-item--mobile': isMobile.value,
    'common-form-item--tablet': isTablet.value,
    'common-form-item--touch-optimized': props.touchOptimized,
    'common-form-item--has-description': !!props.description,
    'common-form-item--has-hint': !!props.hint
  }
])

const contentClasses = computed(() => [
  'common-form-item__content',
  {
    'common-form-item__content--mobile': isMobile.value,
    'common-form-item__content--stacked': props.variant === 'stacked' || isMobile.value
  }
])

const descriptionClasses = computed(() => [
  'common-form-item__description',
  {
    'common-form-item__description--mobile': isMobile.value
  }
])

const hintClasses = computed(() => [
  'common-form-item__hint',
  {
    'common-form-item__hint--mobile': isMobile.value
  }
])
</script>

<style scoped>
.common-form-item {
  margin-bottom: 24px;
  transition: all 0.3s ease;
}

.common-form-item--responsive {
  width: 100%;
}

.common-form-item--mobile {
  margin-bottom: 20px;
}

.common-form-item--touch-optimized {
  min-height: 44px;
}

.common-form-item--compact {
  margin-bottom: 16px;
}

.common-form-item--compact.common-form-item--mobile {
  margin-bottom: 12px;
}

.common-form-item--floating {
  position: relative;
  margin-bottom: 32px;
}

.common-form-item--floating :deep(.el-form-item__label) {
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
  transition: all 0.2s ease;
  pointer-events: none;
  color: var(--el-text-color-placeholder);
  background: var(--el-bg-color);
  padding: 0 4px;
  font-size: 14px;
}

.common-form-item--floating :deep(.el-input.is-focus) + .el-form-item__label,
.common-form-item--floating :deep(.el-input:not(.is-empty)) + .el-form-item__label {
  top: 0;
  font-size: 12px;
  color: var(--el-color-primary);
}

.common-form-item--stacked {
  display: flex;
  flex-direction: column;
}

.common-form-item--stacked :deep(.el-form-item__label) {
  margin-bottom: 8px;
  text-align: left !important;
}

.common-form-item--stacked :deep(.el-form-item__content) {
  margin-left: 0 !important;
}

.common-form-item__content {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.common-form-item__content--mobile {
  gap: 8px;
}

.common-form-item__content--stacked {
  gap: 6px;
}

.form-item-input {
  width: 100%;
  position: relative;
}

.common-form-item__description {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
  margin-bottom: 8px;
  order: -1;
}

.common-form-item__description--mobile {
  font-size: 12px;
  margin-bottom: 6px;
}

.common-form-item__hint {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  line-height: 1.3;
  margin-top: 4px;
}

.common-form-item__hint--mobile {
  font-size: 11px;
  margin-top: 6px;
}

/* Label styling overrides */
.common-form-item :deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}

.common-form-item--mobile :deep(.el-form-item__label) {
  font-size: 14px;
  font-weight: 600;
}

.common-form-item--tablet :deep(.el-form-item__label) {
  font-size: 15px;
}

/* Required asterisk styling */
.common-form-item :deep(.el-form-item__label-wrap .el-form-item__label:before) {
  content: '*';
  color: var(--el-color-danger);
  margin-right: 4px;
}

/* Error state styling */
.common-form-item :deep(.el-form-item.is-error .el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}

.common-form-item :deep(.el-form-item.is-error .el-form-item__label) {
  color: var(--el-color-danger);
}

.common-form-item :deep(.el-form-item__error) {
  font-size: 12px;
  color: var(--el-color-danger);
  line-height: 1.3;
  margin-top: 4px;
  padding: 2px 0;
}

.common-form-item--mobile :deep(.el-form-item__error) {
  font-size: 11px;
  margin-top: 6px;
}

/* Success state styling */
.common-form-item :deep(.el-form-item.is-success .el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-success) inset;
}

/* Focus state styling */
.common-form-item :deep(.el-input.is-focus .el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

/* Touch optimizations */
@media (hover: none) {
  .common-form-item--touch-optimized :deep(.el-input),
  .common-form-item--touch-optimized :deep(.el-select),
  .common-form-item--touch-optimized :deep(.el-button) {
    min-height: 48px;
  }

  .common-form-item--touch-optimized :deep(.el-form-item__label) {
    font-size: 15px;
  }
}

/* Responsive breakpoints */
@media (max-width: 576px) {
  .common-form-item {
    margin-bottom: 16px;
  }

  .common-form-item--floating {
    margin-bottom: 24px;
  }
}

@media (min-width: 1200px) {
  .common-form-item {
    margin-bottom: 28px;
  }

  .common-form-item--compact {
    margin-bottom: 20px;
  }
}

/* Animation for validation */
.common-form-item :deep(.el-form-item.is-error) {
  animation: error-shake 0.3s ease-in-out;
}

@keyframes error-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}

/* Loading state */
.common-form-item :deep(.el-form-item.is-validating .el-input__wrapper) {
  position: relative;
}

.common-form-item :deep(.el-form-item.is-validating .el-input__wrapper::after) {
  content: '';
  position: absolute;
  top: 50%;
  right: 8px;
  width: 16px;
  height: 16px;
  border: 2px solid var(--el-color-primary);
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: translateY(-50%) rotate(0deg); }
  100% { transform: translateY(-50%) rotate(360deg); }
}
</style>
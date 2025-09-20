<template>
  <el-input
    :class="inputClasses"
    :type="computedType"
    :model-value="modelValue"
    :placeholder="placeholder"
    :clearable="clearable"
    :show-password="showPassword"
    :show-word-limit="showWordLimit"
    :disabled="disabled"
    :readonly="readonly"
    :size="computedSize"
    :prefix-icon="prefixIcon"
    :suffix-icon="suffixIcon"
    :rows="rows"
    :autosize="autosize"
    :autocomplete="autocomplete"
    :name="name"
    :max="max"
    :min="min"
    :step="step"
    :resize="resize"
    :autofocus="autofocus"
    :form="form"
    :label="label"
    :tabindex="tabindex"
    :validate-event="validateEvent"
    :input-style="computedInputStyle"
    v-bind="$attrs"
    @input="handleInput"
    @change="handleChange"
    @focus="handleFocus"
    @blur="handleBlur"
    @clear="handleClear"
    @keydown="handleKeydown"
    @keyup="handleKeyup"
  >
    <template v-if="$slots.prefix" #prefix>
      <slot name="prefix" />
    </template>

    <template v-if="$slots.suffix" #suffix>
      <slot name="suffix" />
    </template>

    <template v-if="$slots.prepend" #prepend>
      <slot name="prepend" />
    </template>

    <template v-if="$slots.append" #append>
      <slot name="append" />
    </template>
  </el-input>
</template>

<script setup lang="ts">
import { computed, type PropType, type CSSProperties } from 'vue'
import { ElInput } from 'element-plus'
import { useResponsive } from '../../composables/useResponsive'

type InputType = 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search' | 'textarea'
type InputSize = 'large' | 'default' | 'small'
type ResizeType = 'none' | 'both' | 'horizontal' | 'vertical'

interface CommonInputProps {
  modelValue?: string | number
  type?: InputType
  placeholder?: string
  clearable?: boolean
  showPassword?: boolean
  showWordLimit?: boolean
  disabled?: boolean
  readonly?: boolean
  size?: InputSize
  prefixIcon?: string
  suffixIcon?: string
  rows?: number
  autosize?: boolean | { minRows?: number; maxRows?: number }
  autocomplete?: string
  name?: string
  max?: number
  min?: number
  step?: number
  resize?: ResizeType
  autofocus?: boolean
  form?: string
  label?: string
  tabindex?: string | number
  validateEvent?: boolean
  inputStyle?: CSSProperties
  responsive?: boolean
  touchOptimized?: boolean
  variant?: 'default' | 'search' | 'secure' | 'numeric'
}

const props = withDefaults(defineProps<CommonInputProps>(), {
  type: 'text',
  clearable: false,
  showPassword: false,
  showWordLimit: false,
  disabled: false,
  readonly: false,
  size: 'default',
  rows: 2,
  autosize: false,
  autocomplete: 'off',
  step: 1,
  resize: 'vertical',
  autofocus: false,
  validateEvent: true,
  responsive: true,
  touchOptimized: true,
  variant: 'default'
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  input: [value: string | number]
  change: [value: string | number]
  focus: [event: FocusEvent]
  blur: [event: FocusEvent]
  clear: []
  keydown: [event: KeyboardEvent]
  keyup: [event: KeyboardEvent]
}>()

const { isMobile, isTablet } = useResponsive()

const computedType = computed((): InputType => {
  if (props.variant === 'search') return 'search'
  if (props.variant === 'secure') return 'password'
  if (props.variant === 'numeric') return 'number'
  return props.type
})

const computedSize = computed((): InputSize => {
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

const computedInputStyle = computed((): CSSProperties => {
  const baseStyle: CSSProperties = {
    ...props.inputStyle
  }

  if (props.responsive && props.touchOptimized) {
    if (isMobile.value) {
      baseStyle.fontSize = '16px' // Prevent zoom on iOS
      baseStyle.minHeight = '44px'
    }
    if (isTablet.value) {
      baseStyle.fontSize = '15px'
      baseStyle.minHeight = '40px'
    }
  }

  return baseStyle
})

const inputClasses = computed(() => [
  'common-input',
  `common-input--${props.variant}`,
  {
    'common-input--responsive': props.responsive,
    'common-input--mobile': isMobile.value,
    'common-input--tablet': isTablet.value,
    'common-input--touch-optimized': props.touchOptimized
  }
])

const handleInput = (value: string | number) => {
  emit('update:modelValue', value)
  emit('input', value)
}

const handleChange = (value: string | number) => {
  emit('change', value)
}

const handleFocus = (event: FocusEvent) => {
  emit('focus', event)
}

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}

const handleClear = () => {
  emit('clear')
}

const handleKeydown = (event: KeyboardEvent) => {
  emit('keydown', event)
}

const handleKeyup = (event: KeyboardEvent) => {
  emit('keyup', event)
}
</script>

<style scoped>
.common-input {
  width: 100%;
  transition: all 0.3s ease;
}

.common-input--responsive {
  display: block;
}

.common-input--mobile {
  font-size: 16px; /* Prevent zoom on iOS */
}

.common-input--tablet {
  font-size: 15px;
}

.common-input--touch-optimized :deep(.el-input__wrapper) {
  min-height: 44px;
  padding: 8px 12px;
}

.common-input--touch-optimized.common-input--mobile :deep(.el-input__wrapper) {
  min-height: 48px;
  padding: 12px 16px;
}

.common-input--search :deep(.el-input__wrapper) {
  border-radius: 20px;
  background-color: var(--el-fill-color-light);
  border: 1px solid transparent;
}

.common-input--search :deep(.el-input__wrapper:hover) {
  background-color: var(--el-fill-color);
}

.common-input--search :deep(.el-input__wrapper.is-focus) {
  background-color: var(--el-bg-color);
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary);
}

.common-input--secure :deep(.el-input__wrapper) {
  border: 2px solid var(--el-border-color);
}

.common-input--secure :deep(.el-input__wrapper.is-focus) {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px rgba(var(--el-color-primary-rgb), 0.2);
}

.common-input--numeric :deep(.el-input__inner) {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* Icon styling */
.common-input :deep(.el-input__prefix),
.common-input :deep(.el-input__suffix) {
  display: flex;
  align-items: center;
  color: var(--el-text-color-placeholder);
}

.common-input--mobile :deep(.el-input__prefix),
.common-input--mobile :deep(.el-input__suffix) {
  font-size: 18px;
}

/* Clear button styling */
.common-input :deep(.el-input__clear) {
  color: var(--el-text-color-placeholder);
  transition: color 0.3s ease;
}

.common-input :deep(.el-input__clear:hover) {
  color: var(--el-text-color-secondary);
}

.common-input--touch-optimized :deep(.el-input__clear) {
  width: 20px;
  height: 20px;
}

.common-input--touch-optimized.common-input--mobile :deep(.el-input__clear) {
  width: 24px;
  height: 24px;
}

/* Password visibility toggle */
.common-input :deep(.el-input__password) {
  color: var(--el-text-color-placeholder);
  cursor: pointer;
  transition: color 0.3s ease;
}

.common-input :deep(.el-input__password:hover) {
  color: var(--el-text-color-secondary);
}

.common-input--touch-optimized :deep(.el-input__password) {
  width: 20px;
  height: 20px;
}

.common-input--touch-optimized.common-input--mobile :deep(.el-input__password) {
  width: 24px;
  height: 24px;
}

/* Word limit styling */
.common-input :deep(.el-input__count) {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.common-input--mobile :deep(.el-input__count) {
  font-size: 11px;
}

/* Prepend/Append styling */
.common-input :deep(.el-input-group__prepend),
.common-input :deep(.el-input-group__append) {
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  border-color: var(--el-border-color);
}

.common-input--touch-optimized :deep(.el-input-group__prepend),
.common-input--touch-optimized :deep(.el-input-group__append) {
  min-height: 44px;
  padding: 8px 12px;
}

.common-input--touch-optimized.common-input--mobile :deep(.el-input-group__prepend),
.common-input--touch-optimized.common-input--mobile :deep(.el-input-group__append) {
  min-height: 48px;
  padding: 12px 16px;
}

/* Focus states */
.common-input :deep(.el-input__wrapper.is-focus) {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary);
}

/* Error state */
.common-input :deep(.el-input__wrapper.is-error) {
  border-color: var(--el-color-danger);
  box-shadow: 0 0 0 1px var(--el-color-danger);
}

/* Disabled state */
.common-input :deep(.el-input.is-disabled .el-input__wrapper) {
  background-color: var(--el-disabled-bg-color);
  border-color: var(--el-disabled-border-color);
  color: var(--el-disabled-text-color);
  cursor: not-allowed;
}

/* Textarea specific styles */
.common-input :deep(.el-textarea__inner) {
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
}

.common-input--touch-optimized :deep(.el-textarea__inner) {
  min-height: 88px; /* 2 lines * 44px */
  padding: 12px;
}

.common-input--touch-optimized.common-input--mobile :deep(.el-textarea__inner) {
  min-height: 96px; /* 2 lines * 48px */
  padding: 16px;
  font-size: 16px;
}

/* Responsive breakpoints */
@media (max-width: 576px) {
  .common-input--search :deep(.el-input__wrapper) {
    border-radius: 16px;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .common-input :deep(.el-input__wrapper) {
    border: 2px solid var(--el-border-color);
  }

  .common-input :deep(.el-input__wrapper.is-focus) {
    border: 2px solid var(--el-color-primary);
  }
}

/* Dark mode optimizations */
@media (prefers-color-scheme: dark) {
  .common-input--search :deep(.el-input__wrapper) {
    background-color: var(--el-fill-color-darker);
  }
}
</style>
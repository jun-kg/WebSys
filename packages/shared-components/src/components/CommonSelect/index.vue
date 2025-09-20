<template>
  <el-select
    :class="selectClasses"
    :model-value="modelValue"
    :multiple="multiple"
    :disabled="disabled"
    :value-key="valueKey"
    :size="computedSize"
    :clearable="clearable"
    :collapse-tags="collapseTags"
    :collapse-tags-tooltip="collapseTagsTooltip"
    :multiple-limit="multipleLimit"
    :name="name"
    :autocomplete="autocomplete"
    :placeholder="placeholder"
    :filterable="filterable"
    :allow-create="allowCreate"
    :filter-method="filterMethod"
    :remote="remote"
    :remote-method="remoteMethod"
    :remote-show-suffix="remoteShowSuffix"
    :loading="loading"
    :loading-text="loadingText"
    :no-match-text="noMatchText"
    :no-data-text="noDataText"
    :popper-class="computedPopperClass"
    :reserve-keyword="reserveKeyword"
    :default-first-option="defaultFirstOption"
    :popper-append-to-body="popperAppendToBody"
    :automatic-dropdown="automaticDropdown"
    :clear-icon="clearIcon"
    :fit-input-width="fitInputWidth"
    :suffix-icon="suffixIcon"
    :tag-type="tagType"
    :validate-event="validateEvent"
    :placement="placement"
    v-bind="$attrs"
    @change="handleChange"
    @visible-change="handleVisibleChange"
    @remove-tag="handleRemoveTag"
    @clear="handleClear"
    @blur="handleBlur"
    @focus="handleFocus"
  >
    <slot />
  </el-select>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { ElSelect } from 'element-plus'
import { useResponsive } from '../../composables/useResponsive'

type SelectSize = 'large' | 'default' | 'small'
type TagType = 'success' | 'info' | 'warning' | 'danger'
type Placement = 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end'

interface CommonSelectProps {
  modelValue?: any
  multiple?: boolean
  disabled?: boolean
  valueKey?: string
  size?: SelectSize
  clearable?: boolean
  collapseTags?: boolean
  collapseTagsTooltip?: boolean
  multipleLimit?: number
  name?: string
  autocomplete?: string
  placeholder?: string
  filterable?: boolean
  allowCreate?: boolean
  filterMethod?: (query: string) => void
  remote?: boolean
  remoteMethod?: (query: string) => void
  remoteShowSuffix?: boolean
  loading?: boolean
  loadingText?: string
  noMatchText?: string
  noDataText?: string
  popperClass?: string
  reserveKeyword?: boolean
  defaultFirstOption?: boolean
  popperAppendToBody?: boolean
  automaticDropdown?: boolean
  clearIcon?: string
  fitInputWidth?: boolean
  suffixIcon?: string
  tagType?: TagType
  validateEvent?: boolean
  placement?: Placement
  responsive?: boolean
  touchOptimized?: boolean
  variant?: 'default' | 'searchable' | 'tags' | 'compact'
}

const props = withDefaults(defineProps<CommonSelectProps>(), {
  multiple: false,
  disabled: false,
  valueKey: 'value',
  size: 'default',
  clearable: false,
  collapseTags: false,
  collapseTagsTooltip: false,
  multipleLimit: 0,
  autocomplete: 'off',
  placeholder: '選択してください',
  filterable: false,
  allowCreate: false,
  remote: false,
  remoteShowSuffix: false,
  loading: false,
  loadingText: '読み込み中',
  noMatchText: '一致するデータがありません',
  noDataText: 'データがありません',
  reserveKeyword: true,
  defaultFirstOption: false,
  popperAppendToBody: true,
  automaticDropdown: false,
  fitInputWidth: false,
  validateEvent: true,
  placement: 'bottom-start',
  responsive: true,
  touchOptimized: true,
  variant: 'default'
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
  change: [value: any]
  'visible-change': [visible: boolean]
  'remove-tag': [tag: any]
  clear: []
  blur: [event: FocusEvent]
  focus: [event: FocusEvent]
}>()

const { isMobile, isTablet } = useResponsive()

const computedSize = computed((): SelectSize => {
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

const computedPopperClass = computed(() => {
  const classes = ['common-select-dropdown']

  if (props.popperClass) {
    classes.push(props.popperClass)
  }

  if (props.responsive) {
    if (isMobile.value) {
      classes.push('common-select-dropdown--mobile')
    }
    if (isTablet.value) {
      classes.push('common-select-dropdown--tablet')
    }
  }

  if (props.touchOptimized) {
    classes.push('common-select-dropdown--touch-optimized')
  }

  classes.push(`common-select-dropdown--${props.variant}`)

  return classes.join(' ')
})

const selectClasses = computed(() => [
  'common-select',
  `common-select--${props.variant}`,
  {
    'common-select--responsive': props.responsive,
    'common-select--mobile': isMobile.value,
    'common-select--tablet': isTablet.value,
    'common-select--touch-optimized': props.touchOptimized
  }
])

const handleChange = (value: any) => {
  emit('update:modelValue', value)
  emit('change', value)
}

const handleVisibleChange = (visible: boolean) => {
  emit('visible-change', visible)
}

const handleRemoveTag = (tag: any) => {
  emit('remove-tag', tag)
}

const handleClear = () => {
  emit('clear')
}

const handleBlur = (event: FocusEvent) => {
  emit('blur', event)
}

const handleFocus = (event: FocusEvent) => {
  emit('focus', event)
}
</script>

<style scoped>
.common-select {
  width: 100%;
  transition: all 0.3s ease;
}

.common-select--responsive {
  display: block;
}

.common-select--mobile {
  font-size: 16px; /* Prevent zoom on iOS */
}

.common-select--tablet {
  font-size: 15px;
}

.common-select--touch-optimized :deep(.el-select__wrapper) {
  min-height: 44px;
  padding: 8px 12px;
}

.common-select--touch-optimized.common-select--mobile :deep(.el-select__wrapper) {
  min-height: 48px;
  padding: 12px 16px;
}

.common-select--searchable {
  position: relative;
}

.common-select--searchable :deep(.el-select__wrapper) {
  border-radius: 20px;
  background-color: var(--el-fill-color-light);
  border: 1px solid transparent;
}

.common-select--searchable :deep(.el-select__wrapper:hover) {
  background-color: var(--el-fill-color);
}

.common-select--searchable :deep(.el-select__wrapper.is-focus) {
  background-color: var(--el-bg-color);
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary);
}

.common-select--tags :deep(.el-select__wrapper) {
  min-height: 44px;
  padding: 4px 8px;
}

.common-select--tags.common-select--mobile :deep(.el-select__wrapper) {
  min-height: 48px;
  padding: 6px 12px;
}

.common-select--compact :deep(.el-select__wrapper) {
  min-height: 32px;
  padding: 4px 8px;
}

.common-select--compact.common-select--mobile :deep(.el-select__wrapper) {
  min-height: 40px;
  padding: 8px 12px;
}

/* Icon styling */
.common-select :deep(.el-select__caret) {
  color: var(--el-text-color-placeholder);
  transition: transform 0.3s ease, color 0.3s ease;
}

.common-select :deep(.el-select__caret.is-reverse) {
  transform: rotate(180deg);
}

.common-select--touch-optimized :deep(.el-select__caret) {
  width: 20px;
  height: 20px;
}

.common-select--touch-optimized.common-select--mobile :deep(.el-select__caret) {
  width: 24px;
  height: 24px;
}

/* Clear button styling */
.common-select :deep(.el-select__clear) {
  color: var(--el-text-color-placeholder);
  transition: color 0.3s ease;
}

.common-select :deep(.el-select__clear:hover) {
  color: var(--el-text-color-secondary);
}

.common-select--touch-optimized :deep(.el-select__clear) {
  width: 20px;
  height: 20px;
}

.common-select--touch-optimized.common-select--mobile :deep(.el-select__clear) {
  width: 24px;
  height: 24px;
}

/* Tag styling for multiple select */
.common-select :deep(.el-tag) {
  margin: 2px 4px 2px 0;
  max-width: calc(100% - 12px);
}

.common-select--touch-optimized :deep(.el-tag) {
  min-height: 28px;
  padding: 4px 8px;
  font-size: 13px;
}

.common-select--touch-optimized.common-select--mobile :deep(.el-tag) {
  min-height: 32px;
  padding: 6px 12px;
  font-size: 14px;
}

/* Input styling */
.common-select :deep(.el-select__input) {
  color: var(--el-text-color-primary);
}

.common-select--mobile :deep(.el-select__input) {
  font-size: 16px; /* Prevent zoom on iOS */
}

/* Placeholder styling */
.common-select :deep(.el-select__placeholder) {
  color: var(--el-text-color-placeholder);
}

/* Loading state */
.common-select :deep(.el-select__loading-icon) {
  color: var(--el-color-primary);
}

/* Focus states */
.common-select :deep(.el-select__wrapper.is-focus) {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary);
}

/* Error state */
.common-select :deep(.el-select__wrapper.is-error) {
  border-color: var(--el-color-danger);
  box-shadow: 0 0 0 1px var(--el-color-danger);
}

/* Disabled state */
.common-select :deep(.el-select.is-disabled .el-select__wrapper) {
  background-color: var(--el-disabled-bg-color);
  border-color: var(--el-disabled-border-color);
  color: var(--el-disabled-text-color);
  cursor: not-allowed;
}

/* Responsive breakpoints */
@media (max-width: 576px) {
  .common-select--searchable :deep(.el-select__wrapper) {
    border-radius: 16px;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .common-select :deep(.el-select__wrapper) {
    border: 2px solid var(--el-border-color);
  }

  .common-select :deep(.el-select__wrapper.is-focus) {
    border: 2px solid var(--el-color-primary);
  }
}
</style>

<!-- Global styles for dropdown -->
<style>
.common-select-dropdown {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid var(--el-border-color-light);
}

.common-select-dropdown--mobile {
  border-radius: 6px;
  max-height: 60vh;
}

.common-select-dropdown--tablet {
  max-height: 50vh;
}

.common-select-dropdown--touch-optimized .el-select-dropdown__item {
  min-height: 44px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
}

.common-select-dropdown--touch-optimized.common-select-dropdown--mobile .el-select-dropdown__item {
  min-height: 48px;
  padding: 12px 16px;
  font-size: 16px;
}

.common-select-dropdown--searchable {
  border-radius: 12px;
}

.common-select-dropdown--searchable.common-select-dropdown--mobile {
  border-radius: 8px;
}

.common-select-dropdown--tags .el-select-dropdown__item {
  padding: 6px 12px;
}

.common-select-dropdown--compact .el-select-dropdown__item {
  min-height: 32px;
  padding: 4px 8px;
  font-size: 13px;
}

.common-select-dropdown--compact.common-select-dropdown--mobile .el-select-dropdown__item {
  min-height: 40px;
  padding: 8px 12px;
  font-size: 14px;
}

/* Loading state in dropdown */
.common-select-dropdown .el-select-dropdown__loading {
  text-align: center;
  padding: 20px;
  color: var(--el-text-color-secondary);
}

/* Empty state in dropdown */
.common-select-dropdown .el-select-dropdown__empty {
  text-align: center;
  padding: 20px;
  color: var(--el-text-color-placeholder);
}

/* Hover states */
.common-select-dropdown .el-select-dropdown__item:hover {
  background-color: var(--el-fill-color-light);
}

.common-select-dropdown .el-select-dropdown__item.selected {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 600;
}

/* Responsive dropdown positioning for mobile */
@media (max-width: 576px) {
  .common-select-dropdown--mobile {
    position: fixed !important;
    left: 16px !important;
    right: 16px !important;
    width: auto !important;
    max-width: none !important;
  }
}
</style>
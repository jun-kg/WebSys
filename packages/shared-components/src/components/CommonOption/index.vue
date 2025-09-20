<template>
  <el-option
    :class="optionClasses"
    :value="value"
    :label="label"
    :disabled="disabled"
    v-bind="$attrs"
  >
    <div :class="contentClasses">
      <div v-if="$slots.icon || icon" :class="iconClasses">
        <slot name="icon">
          <component :is="icon" v-if="icon" />
        </slot>
      </div>

      <div :class="textClasses">
        <div :class="labelClasses">
          <slot name="label">
            {{ label }}
          </slot>
        </div>

        <div v-if="description || $slots.description" :class="descriptionClasses">
          <slot name="description">
            {{ description }}
          </slot>
        </div>
      </div>

      <div v-if="$slots.suffix || badge" :class="suffixClasses">
        <slot name="suffix">
          <span v-if="badge" :class="badgeClasses">{{ badge }}</span>
        </slot>
      </div>
    </div>
  </el-option>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { ElOption } from 'element-plus'
import { useResponsive } from '../../composables/useResponsive'

interface CommonOptionProps {
  value: any
  label?: string
  disabled?: boolean
  description?: string
  icon?: Component | string
  badge?: string | number
  responsive?: boolean
  touchOptimized?: boolean
  variant?: 'default' | 'rich' | 'simple' | 'compact'
}

const props = withDefaults(defineProps<CommonOptionProps>(), {
  disabled: false,
  responsive: true,
  touchOptimized: true,
  variant: 'default'
})

const { isMobile, isTablet } = useResponsive()

const optionClasses = computed(() => [
  'common-option',
  `common-option--${props.variant}`,
  {
    'common-option--responsive': props.responsive,
    'common-option--mobile': isMobile.value,
    'common-option--tablet': isTablet.value,
    'common-option--touch-optimized': props.touchOptimized,
    'common-option--has-icon': !!(props.icon || props.$slots?.icon),
    'common-option--has-description': !!(props.description || props.$slots?.description),
    'common-option--has-badge': !!(props.badge || props.$slots?.suffix)
  }
])

const contentClasses = computed(() => [
  'common-option__content',
  {
    'common-option__content--mobile': isMobile.value,
    'common-option__content--rich': props.variant === 'rich' || props.description
  }
])

const iconClasses = computed(() => [
  'common-option__icon',
  {
    'common-option__icon--mobile': isMobile.value
  }
])

const textClasses = computed(() => [
  'common-option__text',
  {
    'common-option__text--mobile': isMobile.value
  }
])

const labelClasses = computed(() => [
  'common-option__label',
  {
    'common-option__label--mobile': isMobile.value
  }
])

const descriptionClasses = computed(() => [
  'common-option__description',
  {
    'common-option__description--mobile': isMobile.value
  }
])

const suffixClasses = computed(() => [
  'common-option__suffix',
  {
    'common-option__suffix--mobile': isMobile.value
  }
])

const badgeClasses = computed(() => [
  'common-option__badge',
  {
    'common-option__badge--mobile': isMobile.value
  }
])
</script>

<style scoped>
.common-option {
  transition: all 0.3s ease;
}

.common-option--responsive {
  width: 100%;
}

.common-option--touch-optimized {
  min-height: 44px;
}

.common-option--touch-optimized.common-option--mobile {
  min-height: 48px;
}

.common-option--compact {
  min-height: 32px;
}

.common-option--compact.common-option--mobile {
  min-height: 36px;
}

.common-option__content {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 2px 0;
}

.common-option__content--mobile {
  gap: 12px;
  padding: 4px 0;
}

.common-option__content--rich {
  align-items: flex-start;
  padding: 4px 0;
}

.common-option__content--rich.common-option__content--mobile {
  padding: 8px 0;
}

.common-option__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  color: var(--el-text-color-secondary);
}

.common-option__icon--mobile {
  width: 24px;
  height: 24px;
}

.common-option--compact .common-option__icon {
  width: 16px;
  height: 16px;
}

.common-option--compact.common-option--mobile .common-option__icon {
  width: 20px;
  height: 20px;
}

.common-option__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.common-option__text--mobile {
  gap: 4px;
}

.common-option__label {
  font-size: 14px;
  color: var(--el-text-color-primary);
  line-height: 1.4;
  word-break: break-word;
}

.common-option__label--mobile {
  font-size: 16px;
}

.common-option--compact .common-option__label {
  font-size: 13px;
}

.common-option--compact.common-option--mobile .common-option__label {
  font-size: 14px;
}

.common-option__description {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.3;
  margin-top: 2px;
  word-break: break-word;
}

.common-option__description--mobile {
  font-size: 13px;
  margin-top: 4px;
}

.common-option--compact .common-option__description {
  font-size: 11px;
}

.common-option--compact.common-option--mobile .common-option__description {
  font-size: 12px;
}

.common-option__suffix {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: auto;
}

.common-option__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: 500;
  background-color: var(--el-color-primary);
  color: var(--el-color-white);
  border-radius: 10px;
  line-height: 1;
}

.common-option__badge--mobile {
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  font-size: 12px;
  border-radius: 12px;
}

.common-option--compact .common-option__badge {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 10px;
  border-radius: 8px;
}

.common-option--compact.common-option--mobile .common-option__badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
  border-radius: 10px;
}

/* Hover states */
.common-option :deep(.el-select-dropdown__item:hover) .common-option__icon {
  color: var(--el-color-primary);
}

.common-option :deep(.el-select-dropdown__item:hover) .common-option__label {
  color: var(--el-color-primary);
}

/* Selected states */
.common-option :deep(.el-select-dropdown__item.selected) .common-option__icon {
  color: var(--el-color-primary);
}

.common-option :deep(.el-select-dropdown__item.selected) .common-option__label {
  color: var(--el-color-primary);
  font-weight: 600;
}

.common-option :deep(.el-select-dropdown__item.selected) .common-option__badge {
  background-color: var(--el-color-primary-dark-2);
}

/* Disabled states */
.common-option :deep(.el-select-dropdown__item.is-disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}

.common-option :deep(.el-select-dropdown__item.is-disabled) .common-option__icon,
.common-option :deep(.el-select-dropdown__item.is-disabled) .common-option__label,
.common-option :deep(.el-select-dropdown__item.is-disabled) .common-option__description {
  color: var(--el-text-color-disabled);
}

.common-option :deep(.el-select-dropdown__item.is-disabled) .common-option__badge {
  background-color: var(--el-text-color-disabled);
}

/* Variant specific styles */
.common-option--simple .common-option__content {
  padding: 0;
}

.common-option--simple .common-option__label {
  font-size: 13px;
}

.common-option--simple.common-option--mobile .common-option__label {
  font-size: 15px;
}

.common-option--rich {
  min-height: 60px;
}

.common-option--rich.common-option--mobile {
  min-height: 72px;
}

.common-option--rich .common-option__icon {
  width: 32px;
  height: 32px;
  align-self: flex-start;
  margin-top: 4px;
}

.common-option--rich.common-option--mobile .common-option__icon {
  width: 40px;
  height: 40px;
  margin-top: 8px;
}

.common-option--rich .common-option__label {
  font-size: 15px;
  font-weight: 500;
}

.common-option--rich.common-option--mobile .common-option__label {
  font-size: 17px;
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .common-option {
    transition: none;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .common-option__badge {
    border: 1px solid var(--el-color-primary-dark-2);
  }
}

/* Focus management */
.common-option :deep(.el-select-dropdown__item:focus-visible) {
  outline: 2px solid var(--el-color-primary);
  outline-offset: -2px;
}
</style>
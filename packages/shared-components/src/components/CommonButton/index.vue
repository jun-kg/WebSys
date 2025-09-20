<template>
  <el-button
    :type="elementVariant"
    :size="size"
    :loading="loading"
    :disabled="disabled"
    :class="buttonClasses"
    v-bind="$attrs"
    @click="handleClick"
  >
    <template v-if="$slots.prefix" #icon>
      <slot name="prefix" />
    </template>
    <slot />
  </el-button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElButton } from 'element-plus'
import { useResponsive } from '../../composables/useResponsive'

interface Props {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  size?: 'small' | 'medium' | 'large'
  loading?: boolean
  disabled?: boolean
  responsive?: boolean
  touchOptimized?: boolean
  fullWidthMobile?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'medium',
  loading: false,
  disabled: false,
  responsive: false,
  touchOptimized: true,
  fullWidthMobile: false
})

const emit = defineEmits<{
  'on-click': [event: MouseEvent]
}>()

const { isMobile } = useResponsive()

const elementVariant = computed(() => {
  const variantMap = {
    primary: 'primary',
    secondary: 'default',
    success: 'success',
    warning: 'warning',
    danger: 'danger'
  }
  return variantMap[props.variant]
})

const buttonClasses = computed(() => [
  'common-button',
  {
    'common-button--responsive': props.responsive,
    'common-button--touch-optimized': props.touchOptimized,
    'common-button--full-width-mobile': props.fullWidthMobile && isMobile.value
  }
])

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('on-click', event)
  }
}
</script>

<style scoped>
.common-button {
  font-family: inherit; /* UDゴシック継承 */
  transition: all 0.3s ease;
}

.common-button--touch-optimized {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
}

.common-button--full-width-mobile {
  width: 100%;
}

@media (max-width: 768px) {
  .common-button--responsive {
    font-size: 16px; /* モバイルで読みやすいサイズ */
    padding: 12px 16px;
  }

  .common-button--touch-optimized {
    min-height: 48px; /* モバイルではより大きく */
    font-size: 16px;
  }
}

/* アクセシビリティ対応 */
.common-button:focus {
  outline: 2px solid #409eff;
  outline-offset: 2px;
}

.common-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
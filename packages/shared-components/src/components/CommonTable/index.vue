<template>
  <div :class="tableWrapperClasses">
    <el-table
      v-if="!isMobile || mobileLayout === 'table'"
      :class="tableClasses"
      :data="data"
      :stripe="stripe"
      :border="border"
      :size="computedSize"
      :empty-text="emptyText"
      v-bind="$attrs"
      @selection-change="handleSelectionChange"
    >
      <slot />
    </el-table>

    <div v-else-if="mobileLayout === 'cards'" class="mobile-card-layout">
      <div
        v-for="(item, index) in data"
        :key="mobileKeyField ? item[mobileKeyField] : index"
        class="mobile-card-item"
        @click="handleRowClick(item, index)"
      >
        <slot name="mobile-card" :row="item" :index="index">
          <div class="mobile-card-default">
            <div
              v-for="column in mobileColumns"
              :key="column.prop"
              class="mobile-card-field"
            >
              <span class="mobile-card-label">{{ column.label }}</span>
              <span class="mobile-card-value">
                <slot :name="column.prop" :row="item" :index="index">
                  {{ item[column.prop] }}
                </slot>
              </span>
            </div>
          </div>
        </slot>
      </div>
    </div>

    <div v-else-if="mobileLayout === 'list'" class="mobile-list-layout">
      <div
        v-for="(item, index) in data"
        :key="mobileKeyField ? item[mobileKeyField] : index"
        class="mobile-list-item"
        @click="handleRowClick(item, index)"
      >
        <slot name="mobile-list" :row="item" :index="index">
          <div class="mobile-list-default">
            <div class="mobile-list-primary">
              {{ item[mobilePrimaryField] }}
            </div>
            <div class="mobile-list-secondary">
              {{ item[mobileSecondaryField] }}
            </div>
          </div>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { ElTable } from 'element-plus'
import { useResponsive } from '../../composables/useResponsive'

interface MobileColumn {
  prop: string
  label: string
}

interface CommonTableProps {
  data: any[]
  stripe?: boolean
  border?: boolean
  size?: 'large' | 'default' | 'small'
  emptyText?: string
  mobileLayout?: 'table' | 'cards' | 'list'
  mobileKeyField?: string
  mobilePrimaryField?: string
  mobileSecondaryField?: string
  mobileColumns?: MobileColumn[]
  touchOptimized?: boolean
  responsive?: boolean
}

const props = withDefaults(defineProps<CommonTableProps>(), {
  stripe: false,
  border: true,
  size: 'default',
  emptyText: 'データがありません',
  mobileLayout: 'cards',
  mobileKeyField: 'id',
  mobilePrimaryField: 'name',
  mobileSecondaryField: 'description',
  mobileColumns: () => [],
  touchOptimized: true,
  responsive: true
})

const emit = defineEmits<{
  'selection-change': [selection: any[]]
  'row-click': [row: any, index: number]
}>()

const { isMobile, isTablet } = useResponsive()

const computedSize = computed(() => {
  if (props.touchOptimized && isMobile.value) {
    return 'large'
  }
  return props.size
})

const tableWrapperClasses = computed(() => [
  'common-table-wrapper',
  {
    'common-table-wrapper--responsive': props.responsive,
    'common-table-wrapper--mobile': isMobile.value,
    'common-table-wrapper--tablet': isTablet.value,
    'common-table-wrapper--touch-optimized': props.touchOptimized
  }
])

const tableClasses = computed(() => [
  'common-table',
  {
    'common-table--mobile': isMobile.value,
    'common-table--touch-optimized': props.touchOptimized
  }
])

const handleSelectionChange = (selection: any[]) => {
  emit('selection-change', selection)
}

const handleRowClick = (row: any, index: number) => {
  emit('row-click', row, index)
}
</script>

<style scoped>
.common-table-wrapper {
  width: 100%;
  overflow: hidden;
}

.common-table-wrapper--responsive {
  border-radius: 8px;
  border: 1px solid var(--el-border-color);
}

.common-table-wrapper--mobile {
  border-radius: 6px;
  margin: 0 -8px;
}

.common-table {
  width: 100%;
}

.common-table--touch-optimized :deep(.el-table__row) {
  height: auto;
  min-height: 44px;
}

.common-table--touch-optimized :deep(.el-table__cell) {
  padding: 12px 8px;
}

.common-table--mobile {
  font-size: 14px;
}

.common-table--mobile :deep(.el-table__header) {
  font-size: 13px;
  font-weight: 600;
}

.mobile-card-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px;
}

.mobile-card-item {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;
  display: flex;
  align-items: center;
}

.mobile-card-item:hover {
  background: var(--el-fill-color-light);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.mobile-card-item:active {
  transform: translateY(0);
}

.mobile-card-default {
  width: 100%;
}

.mobile-card-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.mobile-card-field:last-child {
  margin-bottom: 0;
}

.mobile-card-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
  min-width: 80px;
}

.mobile-card-value {
  font-size: 14px;
  color: var(--el-text-color-primary);
  text-align: right;
  flex: 1;
  margin-left: 12px;
}

.mobile-list-layout {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: var(--el-border-color-lighter);
  border-radius: 8px;
  overflow: hidden;
}

.mobile-list-item {
  background: var(--el-bg-color);
  padding: 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  min-height: 44px;
  display: flex;
  align-items: center;
}

.mobile-list-item:hover {
  background: var(--el-fill-color-light);
}

.mobile-list-item:active {
  background: var(--el-fill-color);
}

.mobile-list-default {
  width: 100%;
}

.mobile-list-primary {
  font-size: 15px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.mobile-list-secondary {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

@media (max-width: 576px) {
  .mobile-card-layout {
    margin: 0 -16px;
    padding: 16px;
    gap: 16px;
  }

  .mobile-card-item {
    border-radius: 6px;
  }

  .mobile-list-layout {
    margin: 0 -16px;
    border-radius: 0;
  }
}

@media (min-width: 768px) and (max-width: 991px) {
  .common-table-wrapper--tablet .mobile-card-layout {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}
</style>
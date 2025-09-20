<template>
  <el-table-column
    :class="columnClasses"
    :prop="prop"
    :label="label"
    :width="computedWidth"
    :min-width="computedMinWidth"
    :fixed="fixed"
    :render-header="renderHeader"
    :sortable="sortable"
    :sort-method="sortMethod"
    :sort-by="sortBy"
    :sort-orders="sortOrders"
    :resizable="resizable"
    :formatter="formatter"
    :show-overflow-tooltip="computedShowOverflowTooltip"
    :align="computedAlign"
    :header-align="computedHeaderAlign"
    :class-name="className"
    :label-class-name="labelClassName"
    :selectable="selectable"
    :reserve-selection="reserveSelection"
    :filters="filters"
    :filter-placement="filterPlacement"
    :filter-multiple="filterMultiple"
    :filter-method="filterMethod"
    :filtered-value="filteredValue"
    v-bind="$attrs"
  >
    <template v-if="$slots.default" #default="scope">
      <slot :row="scope.row" :column="scope.column" :$index="scope.$index" />
    </template>

    <template v-if="$slots.header" #header="scope">
      <slot name="header" :column="scope.column" :$index="scope.$index" />
    </template>
  </el-table-column>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { ElTableColumn } from 'element-plus'
import { useResponsive } from '../../composables/useResponsive'

type ColumnAlign = 'left' | 'center' | 'right'
type ColumnFixed = true | 'left' | 'right'
type SortOrder = 'ascending' | 'descending'

interface Filter {
  text: string
  value: any
}

interface CommonTableColumnProps {
  prop?: string
  label?: string
  width?: string | number
  minWidth?: string | number
  fixed?: ColumnFixed
  renderHeader?: (args: { column: any; $index: number }) => any
  sortable?: boolean | string
  sortMethod?: (a: any, b: any) => number
  sortBy?: string | string[] | ((row: any, index: number) => string)
  sortOrders?: SortOrder[]
  resizable?: boolean
  formatter?: (row: any, column: any, cellValue: any, index: number) => any
  showOverflowTooltip?: boolean
  align?: ColumnAlign
  headerAlign?: ColumnAlign
  className?: string
  labelClassName?: string
  selectable?: (row: any, index: number) => boolean
  reserveSelection?: boolean
  filters?: Filter[]
  filterPlacement?: string
  filterMultiple?: boolean
  filterMethod?: (value: any, row: any, column: any) => boolean
  filteredValue?: any[]
  responsive?: boolean
  mobileHidden?: boolean
  mobileWidth?: string | number
  tabletWidth?: string | number
  touchOptimized?: boolean
  variant?: 'default' | 'action' | 'status' | 'number'
}

const props = withDefaults(defineProps<CommonTableColumnProps>(), {
  responsive: true,
  mobileHidden: false,
  touchOptimized: true,
  variant: 'default',
  resizable: true,
  showOverflowTooltip: true,
  align: 'left'
})

const { isMobile, isTablet } = useResponsive()

const computedWidth = computed(() => {
  if (props.responsive) {
    if (isMobile.value && props.mobileWidth) {
      return props.mobileWidth
    }
    if (isTablet.value && props.tabletWidth) {
      return props.tabletWidth
    }
  }
  return props.width
})

const computedMinWidth = computed(() => {
  if (props.responsive) {
    if (isMobile.value) {
      // モバイルでは最小幅を小さくして表示領域を確保
      if (props.variant === 'action') return '80px'
      if (props.variant === 'status') return '60px'
      if (props.variant === 'number') return '70px'
      return '100px'
    }
    if (isTablet.value) {
      if (props.variant === 'action') return '100px'
      if (props.variant === 'status') return '80px'
      if (props.variant === 'number') return '90px'
      return '120px'
    }
  }
  return props.minWidth
})

const computedAlign = computed(() => {
  if (props.responsive && isMobile.value) {
    // モバイルでは中央揃えがタッチしやすい
    if (props.variant === 'action' || props.variant === 'status') {
      return 'center'
    }
    if (props.variant === 'number') {
      return 'right'
    }
  }
  return props.align
})

const computedHeaderAlign = computed(() => {
  if (props.headerAlign) return props.headerAlign
  return computedAlign.value
})

const computedShowOverflowTooltip = computed(() => {
  if (props.responsive && isMobile.value) {
    // モバイルでは常にツールチップを表示
    return true
  }
  return props.showOverflowTooltip
})

const columnClasses = computed(() => [
  'common-table-column',
  `common-table-column--${props.variant}`,
  {
    'common-table-column--responsive': props.responsive,
    'common-table-column--mobile': isMobile.value,
    'common-table-column--tablet': isTablet.value,
    'common-table-column--mobile-hidden': props.mobileHidden && isMobile.value,
    'common-table-column--touch-optimized': props.touchOptimized
  }
])
</script>

<style scoped>
.common-table-column {
  transition: all 0.3s ease;
}

.common-table-column--mobile-hidden {
  display: none !important;
}

.common-table-column--touch-optimized :deep(.cell) {
  padding: 12px 8px;
  min-height: 44px;
  display: flex;
  align-items: center;
}

.common-table-column--mobile :deep(.cell) {
  padding: 8px 4px;
  font-size: 13px;
  line-height: 1.4;
}

.common-table-column--tablet :deep(.cell) {
  padding: 10px 6px;
  font-size: 14px;
}

.common-table-column--action :deep(.cell) {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.common-table-column--action.common-table-column--mobile :deep(.cell) {
  gap: 4px;
  padding: 6px 2px;
}

.common-table-column--status :deep(.cell) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.common-table-column--number :deep(.cell) {
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.common-table-column--number.common-table-column--mobile :deep(.cell) {
  font-size: 12px;
}

/* Header styles */
.common-table-column :deep(.el-table__header .cell) {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.common-table-column--mobile :deep(.el-table__header .cell) {
  font-size: 12px;
  padding: 6px 4px;
}

.common-table-column--tablet :deep(.el-table__header .cell) {
  font-size: 13px;
  padding: 8px 6px;
}

/* Action column specific styles */
.common-table-column--action :deep(.el-button) {
  margin: 0;
}

.common-table-column--action.common-table-column--mobile :deep(.el-button) {
  font-size: 11px;
  padding: 4px 8px;
  min-height: 28px;
}

.common-table-column--action.common-table-column--touch-optimized :deep(.el-button) {
  min-height: 32px;
  min-width: 32px;
}

/* Status column specific styles */
.common-table-column--status :deep(.el-tag) {
  margin: 0;
}

.common-table-column--status.common-table-column--mobile :deep(.el-tag) {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

/* Number column specific styles */
.common-table-column--number :deep(.cell) {
  font-family: var(--el-font-family-mono, 'SF Mono', Monaco, 'Roboto Mono', monospace);
}

/* Responsive breakpoints */
@media (max-width: 576px) {
  .common-table-column :deep(.cell) {
    word-break: break-all;
    line-height: 1.3;
  }

  .common-table-column--action :deep(.cell) {
    flex-direction: column;
    gap: 2px;
  }
}

@media (min-width: 768px) and (max-width: 991px) {
  .common-table-column--action :deep(.cell) {
    gap: 6px;
  }
}

@media (min-width: 1200px) {
  .common-table-column :deep(.cell) {
    padding: 14px 10px;
  }

  .common-table-column--number :deep(.cell) {
    font-size: 15px;
  }
}

/* Sorting indicators */
.common-table-column :deep(.caret-wrapper) {
  width: 20px;
}

.common-table-column--mobile :deep(.caret-wrapper) {
  width: 16px;
}

/* Selection column optimizations */
.common-table-column :deep(.el-checkbox) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.common-table-column--touch-optimized :deep(.el-checkbox__input) {
  transform: scale(1.2);
}

.common-table-column--mobile :deep(.el-checkbox__input) {
  transform: scale(1.1);
}
</style>
<template>
  <div class="virtual-scroller" ref="containerRef">
    <div
      class="virtual-scroller-content"
      :style="{ height: totalHeight + 'px' }"
    >
      <div
        class="virtual-scroller-viewport"
        :style="{
          transform: `translateY(${offsetY}px)`
        }"
      >
        <div
          v-for="item in visibleItems"
          :key="getItemKey(item)"
          class="virtual-scroller-item"
          :style="{ height: itemHeight + 'px' }"
        >
          <slot :item="item.data" :index="item.index" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watchEffect } from 'vue'

interface Props {
  items: any[]
  itemHeight: number
  containerHeight?: number
  overscan?: number
  keyField?: string
}

const props = withDefaults(defineProps<Props>(), {
  containerHeight: 400,
  overscan: 5,
  keyField: 'id'
})

const containerRef = ref<HTMLElement>()
const scrollTop = ref(0)

// 計算プロパティ
const totalHeight = computed(() => props.items.length * props.itemHeight)

const startIndex = computed(() =>
  Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.overscan)
)

const endIndex = computed(() =>
  Math.min(
    props.items.length - 1,
    Math.floor((scrollTop.value + props.containerHeight) / props.itemHeight) + props.overscan
  )
)

const visibleItems = computed(() => {
  const items = []
  for (let i = startIndex.value; i <= endIndex.value; i++) {
    if (props.items[i]) {
      items.push({
        index: i,
        data: props.items[i]
      })
    }
  }
  return items
})

const offsetY = computed(() => startIndex.value * props.itemHeight)

// メソッド
const getItemKey = (item: any) => {
  if (props.keyField && item.data[props.keyField]) {
    return item.data[props.keyField]
  }
  return item.index
}

const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop
}

// ライフサイクル
onMounted(() => {
  if (containerRef.value) {
    containerRef.value.addEventListener('scroll', handleScroll)
  }
})

onUnmounted(() => {
  if (containerRef.value) {
    containerRef.value.removeEventListener('scroll', handleScroll)
  }
})

// 監視
watchEffect(() => {
  if (containerRef.value) {
    containerRef.value.style.height = props.containerHeight + 'px'
  }
})
</script>

<style scoped>
.virtual-scroller {
  overflow-y: auto;
  overflow-x: hidden;
}

.virtual-scroller-content {
  position: relative;
}

.virtual-scroller-viewport {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.virtual-scroller-item {
  box-sizing: border-box;
}
</style>
<template>
  <div class="lazy-image-container" :style="containerStyle">
    <img
      v-if="loaded || !enableLazyLoading"
      :src="src"
      :alt="alt"
      :class="['lazy-image', { 'loaded': loaded }]"
      @load="onImageLoad"
      @error="onImageError"
    />
    <div
      v-else
      ref="placeholderRef"
      class="lazy-placeholder"
      :style="placeholderStyle"
    >
      <div class="loading-spinner" v-if="loading">
        <div class="spinner"></div>
      </div>
      <div class="error-message" v-if="error">
        <el-icon><Picture /></el-icon>
        <span>画像の読み込みに失敗しました</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Picture } from '@element-plus/icons-vue'
import { useMobileOptimizer } from '@/utils/mobileOptimizer'

interface Props {
  src: string
  alt?: string
  width?: number | string
  height?: number | string
  enableLazyLoading?: boolean
  placeholder?: string
  errorFallback?: string
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  enableLazyLoading: true,
  placeholder: '#f5f7fa'
})

const { registerLazyElement } = useMobileOptimizer()

const placeholderRef = ref<HTMLElement>()
const loaded = ref(false)
const loading = ref(false)
const error = ref(false)
let observer: IntersectionObserver | null = null

const containerStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width || 'auto',
  height: typeof props.height === 'number' ? `${props.height}px` : props.height || 'auto',
  position: 'relative',
  overflow: 'hidden'
}))

const placeholderStyle = computed(() => ({
  width: '100%',
  height: '100%',
  backgroundColor: props.placeholder,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100px'
}))

const loadImage = () => {
  if (loaded.value || loading.value) return

  loading.value = true
  error.value = false

  const img = new Image()

  img.onload = () => {
    loading.value = false
    loaded.value = true
  }

  img.onerror = () => {
    loading.value = false
    error.value = true

    if (props.errorFallback) {
      // エラー時のフォールバック画像
      const fallbackImg = new Image()
      fallbackImg.onload = () => {
        loaded.value = true
      }
      fallbackImg.src = props.errorFallback
    }
  }

  img.src = props.src
}

const onImageLoad = () => {
  loaded.value = true
  loading.value = false
}

const onImageError = () => {
  error.value = true
  loading.value = false
}

const setupIntersectionObserver = () => {
  if (!props.enableLazyLoading || !placeholderRef.value) return

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadImage()
          if (observer) {
            observer.unobserve(entry.target)
          }
        }
      })
    },
    {
      rootMargin: '50px',
      threshold: 0.1
    }
  )

  observer.observe(placeholderRef.value)
}

onMounted(() => {
  if (props.enableLazyLoading) {
    // モバイル最適化版の遅延読み込み
    if (placeholderRef.value) {
      registerLazyElement(placeholderRef.value)
      setupIntersectionObserver()
    }
  } else {
    // 即座に読み込み
    loadImage()
  }
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})
</script>

<style scoped>
.lazy-image-container {
  background-color: #f5f7fa;
  border-radius: 4px;
}

.lazy-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s ease-in-out;
}

.lazy-image.loaded {
  opacity: 1;
}

.lazy-placeholder {
  border-radius: 4px;
  color: #909399;
}

.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e4e7ed;
  border-top: 2px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.error-message .el-icon {
  font-size: 24px;
  color: #f56c6c;
}

/* モバイル用最適化 */
@media (max-width: 768px) {
  .lazy-image-container {
    /* モバイルでは軽量化のためアニメーションを削減 */
  }

  .lazy-image {
    transition: none; /* モバイルではトランジション無効 */
  }

  .spinner {
    width: 20px;
    height: 20px;
  }
}

/* 省電力モード対応 */
@media (prefers-reduced-motion: reduce) {
  .lazy-image {
    transition: none;
  }

  .spinner {
    animation: none;
  }
}
</style>
<template>
  <div class="page-header">
    <!-- パンくずリスト -->
    <el-breadcrumb v-if="breadcrumbs.length > 0" separator="/" class="breadcrumb">
      <el-breadcrumb-item
        v-for="(item, index) in breadcrumbs"
        :key="index"
        :to="item.to"
      >
        {{ item.label }}
      </el-breadcrumb-item>
    </el-breadcrumb>

    <!-- タイトル行 -->
    <div class="title-row">
      <div class="title-left">
        <!-- 戻るボタン -->
        <el-button
          v-if="showBack"
          class="back-button"
          text
          @click="handleBack"
        >
          <el-icon><ArrowLeft /></el-icon>
          戻る
        </el-button>

        <!-- タイトル -->
        <h1 class="page-title">
          <el-icon v-if="icon" class="title-icon">
            <component :is="icon" />
          </el-icon>
          {{ title }}
        </h1>
      </div>

      <!-- アクションボタン -->
      <div class="title-right">
        <slot name="actions"></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

export interface Breadcrumb {
  label: string
  to?: string | { path: string }
}

export interface PageHeaderProps {
  title: string
  breadcrumbs?: Breadcrumb[]
  showBack?: boolean
  backTo?: string | { path: string }
  icon?: any
}

const props = withDefaults(defineProps<PageHeaderProps>(), {
  breadcrumbs: () => [],
  showBack: false,
  backTo: undefined,
  icon: undefined
})

const emit = defineEmits<{
  back: []
}>()

const router = useRouter()

const handleBack = () => {
  emit('back')

  // backToが指定されていれば、そのパスに遷移
  if (props.backTo) {
    router.push(props.backTo)
  } else {
    // 未指定の場合はブラウザの履歴を戻る
    router.back()
  }
}
</script>

<style scoped>
.page-header {
  margin-bottom: 20px;
}

.breadcrumb {
  margin-bottom: 12px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-button {
  font-size: 14px;
  padding: 8px 12px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #303133;
}

.title-icon {
  font-size: 28px;
}

.title-right {
  display: flex;
  gap: 8px;
}

/* モバイル対応 */
@media (max-width: 767px) {
  .page-title {
    font-size: 20px;
  }

  .title-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .title-right {
    width: 100%;
    justify-content: flex-end;
  }

  .back-button {
    font-size: 13px;
    padding: 6px 10px;
  }
}
</style>

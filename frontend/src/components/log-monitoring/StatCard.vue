<template>
  <el-card
    :body-style="{ padding: '20px' }"
    shadow="hover"
    class="stat-card"
    @click="$emit('click')"
  >
    <el-statistic
      :value="stat.value"
      :title="stat.title"
      :precision="0"
    >
      <template #prefix>
        <el-icon :style="{ color: stat.color }">
          <component :is="stat.icon" />
        </el-icon>
      </template>
    </el-statistic>
  </el-card>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

interface StatData {
  key: string
  title: string
  value: number
  icon: Component
  color: string
  type?: string
}

interface Props {
  stat: StatData
}

defineProps<Props>()

defineEmits<{
  'click': []
}>()
</script>

<style scoped>
.stat-card {
  cursor: pointer;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}
</style>
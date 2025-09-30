<template>
  <div class="quick-access-widget">
    <h3 class="widget-title">
      ⚡ クイックアクセス
    </h3>

    <div class="quick-links">
      <a
        v-for="link in quickLinks"
        :key="link.id"
        :href="link.path"
        class="quick-link"
        @click.prevent="navigateToLink(link)"
      >
        <span class="link-icon">{{ link.icon }}</span>
        <div class="link-content">
          <h4 class="link-title">{{ link.title }}</h4>
          <p class="link-description">{{ link.description }}</p>
          <span class="link-category">{{ link.category }}</span>
        </div>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vitepress'

interface QuickLink {
  id: string
  title: string
  description: string
  icon: string
  path: string
  category: string
}

interface UserPreference {
  frequentlyAccessed: string[]
  bookmarks: string[]
  recentSearches: string[]
}

interface Props {
  quickLinks: QuickLink[]
  userPreferences: UserPreference
}

const props = defineProps<Props>()
const router = useRouter()

const navigateToLink = (link: QuickLink) => {
  router.go(link.path)
}
</script>

<style scoped>
.quick-access-widget {
  min-height: 400px;
}

.quick-links {
  display: flex;
  flex-direction: column;
  gap: var(--websys-spacing-sm);
}

.quick-link {
  display: flex;
  align-items: center;
  gap: var(--websys-spacing-md);
  padding: var(--websys-spacing-md);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-border);
  border-radius: var(--websys-border-radius);
  text-decoration: none;
  color: var(--vp-c-text-1);
  transition: all 0.3s ease;
}

.quick-link:hover {
  background: var(--vp-c-bg-elv);
  border-color: var(--vp-c-brand-1);
  box-shadow: var(--websys-shadow);
  transform: translateY(-1px);
}

.link-icon {
  font-size: 1.8rem;
  flex-shrink: 0;
}

.link-content {
  flex: 1;
  min-width: 0;
}

.link-title {
  margin: 0 0 var(--websys-spacing-xs) 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.link-description {
  margin: 0 0 var(--websys-spacing-xs) 0;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  line-height: 1.3;
}

.link-category {
  font-size: 0.7rem;
  padding: var(--websys-spacing-xs) var(--websys-spacing-sm);
  background: var(--vp-c-brand-soft);
  color: white;
  border-radius: var(--websys-border-radius-sm);
}
</style>
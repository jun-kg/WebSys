import { computed, ref } from 'vue'

// ウィンドウサイズの監視（簡易版）
const windowWidth = ref(window?.innerWidth || 1024)
const windowHeight = ref(window?.innerHeight || 768)

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    windowWidth.value = window.innerWidth
    windowHeight.value = window.innerHeight
  })
}

export function useResponsive() {
  const width = computed(() => windowWidth.value)
  const height = computed(() => windowHeight.value)

  const isMobile = computed(() => width.value < 768)
  const isTablet = computed(() => width.value >= 768 && width.value < 992)
  const isDesktop = computed(() => width.value >= 992)

  const currentBreakpoint = computed(() => {
    if (width.value < 576) return 'xs'
    if (width.value < 768) return 'sm'
    if (width.value < 992) return 'md'
    if (width.value < 1200) return 'lg'
    if (width.value < 1920) return 'xl'
    return 'xxl'
  })

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    currentBreakpoint
  }
}
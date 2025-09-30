import { App } from 'vue'
import DefaultTheme from 'vitepress/theme'
import './custom.css'

// カスタムコンポーネントのインポート
import Dashboard from '../components/Dashboard.vue'
import SearchAdvanced from '../components/SearchAdvanced.vue'
import CategoryGrid from '../components/CategoryGrid.vue'
import StatsWidget from '../components/StatsWidget.vue'
import RecentUpdates from '../components/RecentUpdates.vue'
import QuickAccess from '../components/QuickAccess.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }: { app: App }) {
    // グローバルコンポーネント登録
    app.component('Dashboard', Dashboard)
    app.component('SearchAdvanced', SearchAdvanced)
    app.component('CategoryGrid', CategoryGrid)
    app.component('StatsWidget', StatsWidget)
    app.component('RecentUpdates', RecentUpdates)
    app.component('QuickAccess', QuickAccess)
  }
}
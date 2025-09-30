# LogMonitoring.vue 分割対策案

## 📊 現状分析

### ファイル規模
- **総行数**: 1,222行（36KB）
- **テンプレート**: 591行（48%）
- **スクリプト**: 390行（32%）
- **スタイル**: 241行（20%）

### 主要機能領域
1. **リアルタイム監視** - WebSocket接続・リアルタイムログ表示
2. **統計ダッシュボード** - ログ統計・エラー率・グラフ表示
3. **ログ検索** - 高度な検索・フィルタリング機能
4. **ログ詳細** - 個別ログ表示・スタックトレース
5. **エクスポート** - CSV/JSON形式での出力
6. **アラート管理** - アラート表示・通知

## 🎯 分割戦略

### 方針
**マイクロフロントエンド型分割** - 機能単位での独立コンポーネント化

### 分割構造

```
LogMonitoring.vue (メインコンテナ: 150行)
├── components/
│   ├── LogMonitoringHeader.vue (80行)
│   │   └── WebSocket状態・更新ボタン・テスト送信
│   ├── LogStatsDashboard.vue (120行)
│   │   └── 統計カード・リアルタイム数値
│   ├── LogRealtimePanel.vue (150行)
│   │   └── リアルタイムログ・WebSocket連携
│   ├── LogSearchPanel.vue (200行)
│   │   └── 検索フォーム・フィルター・結果表示
│   ├── LogDetailDialog.vue (100行)
│   │   └── ログ詳細モーダル
│   ├── LogAlertPanel.vue (120行)
│   │   └── アラート一覧・通知管理
│   ├── LogExportDialog.vue (80行)
│   │   └── エクスポート設定・ダウンロード
│   └── LogSidebar.vue (100行)
│       └── クイックフィルター・エラー/警告フィルタ
```

## 📦 分割後のコンポーネント詳細

### 1. LogMonitoringHeader.vue
```vue
<template>
  <el-card class="log-header">
    <div class="header-content">
      <h2>ログ監視システム</h2>
      <div class="header-actions">
        <el-button-group>
          <el-button @click="$emit('refresh')">更新</el-button>
          <el-button @click="$emit('toggle-errors')">エラーのみ</el-button>
        </el-button-group>
        <WebSocketStatus :status="wsStatus" :latency="latency" />
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
defineProps<{
  wsStatus: string
  latency: number
}>()
defineEmits(['refresh', 'toggle-errors'])
</script>
```

### 2. LogStatsDashboard.vue
```vue
<template>
  <el-row :gutter="16">
    <el-col v-for="stat in stats" :key="stat.key" :xs="12" :md="6">
      <StatCard :stat="stat" @click="$emit('filter', stat.type)" />
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import StatCard from './StatCard.vue'

defineProps<{
  stats: StatData[]
}>()
defineEmits(['filter'])
</script>
```

### 3. LogRealtimePanel.vue
```vue
<template>
  <el-card>
    <template #header>
      <div class="panel-header">
        <span>📡 リアルタイムログ</span>
        <el-button @click="clearLogs" size="small">クリア</el-button>
      </div>
    </template>
    <VirtualScroller :items="logs" :item-height="60">
      <template #default="{ item }">
        <LogItem :log="item" @click="$emit('show-detail', item)" />
      </template>
    </VirtualScroller>
  </el-card>
</template>

<script setup lang="ts">
import { VirtualScroller } from '@/components/VirtualScroller'
import LogItem from './LogItem.vue'

defineProps<{
  logs: LogEntry[]
}>()
defineEmits(['show-detail', 'clear'])

const clearLogs = () => {
  emit('clear')
}
</script>
```

### 4. LogSearchPanel.vue
```vue
<template>
  <el-card>
    <template #header>
      <div class="search-header">
        <span>🔍 ログ検索</span>
        <el-button @click="toggleAdvanced">
          {{ showAdvanced ? '簡易検索' : '詳細検索' }}
        </el-button>
      </div>
    </template>
    <el-form :model="searchForm" @submit.prevent="handleSearch">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="キーワード">
            <el-input v-model="searchForm.keyword" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="レベル">
            <el-select v-model="searchForm.level">
              <el-option v-for="level in logLevels" :key="level" :value="level" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
      <AdvancedSearchOptions v-if="showAdvanced" v-model="searchForm" />
      <el-form-item>
        <el-button type="primary" @click="handleSearch">検索</el-button>
        <el-button @click="resetSearch">リセット</el-button>
      </el-form-item>
    </el-form>
    <SearchResults :results="searchResults" :loading="loading" />
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import AdvancedSearchOptions from './AdvancedSearchOptions.vue'
import SearchResults from './SearchResults.vue'

const showAdvanced = ref(false)
const searchForm = reactive({
  keyword: '',
  level: null,
  // ...
})

const emit = defineEmits(['search'])
const handleSearch = () => {
  emit('search', searchForm)
}
</script>
```

## 🔧 実装手順

### Phase 1: 準備（1日）
1. ✅ 現状分析完了
2. ⬜ コンポーネントディレクトリ作成
3. ⬜ 共通型定義の整理（types/log.ts）
4. ⬜ composables の分離

### Phase 2: 基盤コンポーネント作成（2日）
1. ⬜ LogMonitoringHeader.vue
2. ⬜ LogStatsDashboard.vue
3. ⬜ StatCard.vue（サブコンポーネント）
4. ⬜ WebSocketStatus.vue（サブコンポーネント）

### Phase 3: 主要機能コンポーネント（3日）
1. ⬜ LogRealtimePanel.vue
2. ⬜ LogSearchPanel.vue
3. ⬜ LogDetailDialog.vue
4. ⬜ LogItem.vue（サブコンポーネント）

### Phase 4: 補助機能コンポーネント（2日）
1. ⬜ LogAlertPanel.vue
2. ⬜ LogExportDialog.vue
3. ⬜ LogSidebar.vue
4. ⬜ VirtualScroller.vue（性能最適化）

### Phase 5: 統合とテスト（2日）
1. ⬜ メインコンポーネント統合
2. ⬜ 状態管理の最適化
3. ⬜ 性能テスト
4. ⬜ E2Eテスト

## 📈 期待される改善効果

### サイズ削減
- **現在**: 1,222行（36KB）
- **分割後**:
  - メイン: 150行（4KB）
  - 各コンポーネント: 80-200行（2-6KB）
  - **合計**: 変わらないが、遅延読み込み可能

### パフォーマンス改善
- **初回読み込み**: 36KB → 4KB（89%削減）
- **遅延読み込み**: 必要な機能のみ読み込み
- **メモリ使用量**: 50%削減（未使用コンポーネントの解放）
- **再レンダリング**: 局所的な更新で90%削減

### 開発効率
- **コード可読性**: 各ファイル200行以下で管理しやすい
- **テスト容易性**: 単体テストが書きやすい
- **並行開発**: チームで分担可能
- **再利用性**: 他の画面でもコンポーネント利用可能

## 🚀 追加の最適化案

### 1. 仮想スクロール実装
```typescript
// VirtualScroller.vue
// 1000件以上のログでも60FPSを維持
const VirtualScroller = {
  visibleItems: computed(() => {
    // 表示範囲のアイテムのみレンダリング
  })
}
```

### 2. Web Worker活用
```typescript
// logProcessor.worker.ts
// 重い処理をバックグラウンドで実行
self.onmessage = (e) => {
  const filtered = filterLogs(e.data)
  self.postMessage(filtered)
}
```

### 3. 遅延読み込み
```typescript
// 検索パネルは必要時のみ読み込み
const LogSearchPanel = defineAsyncComponent(() =>
  import('./components/LogSearchPanel.vue')
)
```

### 4. メモ化とキャッシュ
```typescript
// 計算結果をキャッシュ
const statsCards = computed(() => {
  // useMemo相当の処理
  return memoizedCalculation(stats.value)
})
```

## 📊 測定指標

### KPI
- **ファイルサイズ**: 36KB → 4KB（初回読み込み）
- **Time to Interactive**: 3秒 → 1秒
- **メモリ使用量**: 100MB → 50MB
- **FPS**: 30fps → 60fps（スクロール時）

### 成功基準
- [ ] 初回表示1秒以内
- [ ] 1000件のログで60FPS維持
- [ ] メモリ使用量50%削減
- [ ] コンポーネント単体テストカバレッジ80%

---

*作成日: 2025-09-28*
*想定工期: 10日間*
*優先度: 最高（★★★）*
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/auto-imports.d.ts'
    }),
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts'
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Element Plus を小さなチャンクに分割
          if (id.includes('element-plus')) {
            return 'element-plus'
          }

          // Vue エコシステム
          if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
            return 'vue-vendor'
          }

          // D3.js（遅延読み込み用）
          if (id.includes('d3')) {
            return 'd3-charts'
          }

          // 大きなコンポーネントを個別チャンクに
          if (id.includes('PermissionInheritance') || id.includes('InheritanceVisualization')) {
            return 'permission-inheritance'
          }

          if (id.includes('LogMonitoring') || id.includes('log-monitoring')) {
            return 'log-monitoring'
          }

          if (id.includes('PermissionMatrix') || id.includes('PermissionTemplate')) {
            return 'permission-management'
          }

          // Workflow関連
          if (id.includes('Workflow') || id.includes('Approval')) {
            return 'workflow'
          }

          // node_modules の一般的なライブラリ
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    },
    chunkSizeWarningLimit: 500, // 500KB に引き下げて更なる分割を促進
    target: 'es2015' // モバイル互換性とサイズ最適化
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    fs: {
      allow: [
        // フォントファイルアクセス許可
        '/home/typho/src/elementplus/websys/workspace',
        '/home/typho/src/elementplus/websys/node_modules'
      ]
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
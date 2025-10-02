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
          // モバイル専用軽量バンドル
          if (id.includes('mobileOptimizer')) {
            return 'mobile-core'
          }
          // Element Plus を機能別に細分化
          if (id.includes('element-plus')) {
            // 基本コンポーネント（常に必要）
            if (id.includes('/button/') || id.includes('/input/') || id.includes('/form/') ||
                id.includes('/loading/') || id.includes('/message/') || id.includes('/notification/')) {
              return 'element-core'
            }
            // ナビゲーション関連
            if (id.includes('/menu/') || id.includes('/breadcrumb/') || id.includes('/steps/') ||
                id.includes('/tabs/') || id.includes('/dropdown/')) {
              return 'element-nav'
            }
            // データ表示関連
            if (id.includes('/table/') || id.includes('/pagination/') || id.includes('/tree/') ||
                id.includes('/descriptions/') || id.includes('/card/')) {
              return 'element-data'
            }
            // ダイアログ・フィードバック関連
            if (id.includes('/dialog/') || id.includes('/drawer/') || id.includes('/popover/') ||
                id.includes('/tooltip/') || id.includes('/popconfirm/')) {
              return 'element-feedback'
            }
            // 複雑なコンポーネント（遅延読み込み）
            if (id.includes('/date-picker/') || id.includes('/time-picker/') || id.includes('/select/') ||
                id.includes('/cascader/') || id.includes('/transfer/') || id.includes('/upload/')) {
              return 'element-complex'
            }
            // その他のElement Plus
            return 'element-others'
          }

          // Vue エコシステムを更に細分化
          if (id.includes('vue-router')) {
            return 'vue-router'
          }
          if (id.includes('pinia')) {
            return 'vue-pinia'
          }
          if (id.includes('/vue/') || id.includes('@vue/')) {
            return 'vue-core'
          }

          // D3.js を機能別に分割
          if (id.includes('d3')) {
            if (id.includes('d3-selection') || id.includes('d3-scale') || id.includes('d3-axis')) {
              return 'd3-core'
            }
            if (id.includes('d3-hierarchy') || id.includes('d3-force') || id.includes('d3-zoom')) {
              return 'd3-layout'
            }
            return 'd3-utils'
          }

          // マイクロサービス型コンポーネント分割（より細かく）
          if (id.includes('PermissionInheritance') || id.includes('InheritanceVisualization')) {
            return 'micro-inheritance'
          }

          if (id.includes('LogMonitoring') || id.includes('log-monitoring')) {
            if (id.includes('LogSearch') || id.includes('LogFilter')) {
              return 'micro-log-search'
            }
            if (id.includes('LogStats') || id.includes('LogChart')) {
              return 'micro-log-stats'
            }
            return 'micro-log-core'
          }

          if (id.includes('PermissionMatrix') || id.includes('PermissionTemplate')) {
            return 'micro-permission'
          }

          // Workflow関連を機能別分割
          if (id.includes('Workflow')) {
            if (id.includes('Dashboard') || id.includes('Statistics')) {
              return 'micro-workflow-dash'
            }
            return 'micro-workflow-core'
          }

          if (id.includes('Approval')) {
            return 'micro-approval'
          }

          // ユーティリティライブラリ
          if (id.includes('lodash') || id.includes('moment') || id.includes('date-fns')) {
            return 'lib-utils'
          }

          if (id.includes('axios') || id.includes('fetch')) {
            return 'lib-http'
          }

          // その他のnode_modules
          if (id.includes('node_modules')) {
            // サイズが大きなライブラリは個別分割
            if (id.includes('echarts') || id.includes('chart.js')) {
              return 'lib-charts'
            }
            if (id.includes('crypto') || id.includes('buffer')) {
              return 'lib-crypto'
            }
            return 'vendor'
          }
        }
      }
    },
    chunkSizeWarningLimit: 200, // 200KB に引き下げ、モバイル向け軽量化
    target: 'es2020', // モダンブラウザ最適化
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // console.log削除
        drop_debugger: true, // debugger削除
        pure_funcs: ['console.log', 'console.info'], // 特定関数削除
        reduce_vars: true,
        reduce_funcs: true,
        keep_infinity: true,
        toplevel: true
      },
      mangle: {
        toplevel: true,
        safari10: true
      },
      format: {
        comments: false // コメント削除
      }
    },
    cssCodeSplit: true, // CSS分割
    sourcemap: false, // SourceMap無効でサイズ削減
    assetsInlineLimit: 4096, // 4KB以下のアセットはインライン化
    reportCompressedSize: true, // 圧縮サイズレポート
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    fs: {
      allow: [
        "/app",
        // フォントファイルアクセス許可（拡張）
        '/home/typho/src/elementplus/websys/workspace',
        '/home/typho/src/elementplus/websys/node_modules',
        '/home/typho/src/elementplus/websys/node_modules/@fontsource',
        '/home/typho/src/elementplus/websys/node_modules/@fontsource/biz-udgothic',
        '/home/typho/src/elementplus/websys/node_modules/@fontsource/biz-udpgothic',
        // 全体的なnode_modulesアクセス許可
        '/home/typho/src/elementplus/websys'
      ]
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        timeout: 10000,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err)
            // フォールバック処理
            if (!res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({
                error: 'Backend service unavailable',
                message: 'バックエンドサービスに接続できません'
              }))
            }
          })
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`[Proxy] ${req.method} ${req.url}`)
          })
        }
      }
    }
  }
})
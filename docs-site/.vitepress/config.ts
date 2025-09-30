import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'WebSys Documentation Hub',
  description: 'Interactive documentation for WebSys project with advanced search and multilingual support',

  // 多言語対応設定
  locales: {
    root: {
      label: '日本語',
      lang: 'ja-JP',
      dir: 'pages/ja',
      title: 'WebSys ドキュメントハブ',
      description: 'WebSysプロジェクトのインタラクティブドキュメント - 高度検索・多言語対応'
    },
    en: {
      label: 'English',
      lang: 'en-US',
      dir: 'pages/en',
      title: 'WebSys Documentation Hub',
      description: 'Interactive documentation for WebSys project with advanced features'
    }
  },

  // テーマ設定
  themeConfig: {
    logo: '/logo.svg',

    // 日本語版ナビゲーション
    nav: [
      { text: 'ホーム', link: '/' },
      { text: 'ダッシュボード', link: '/dashboard' },
      { text: 'ドキュメント', link: '/docs/' },
      { text: '検索', link: '/search' },
      { text: 'API', link: '/api/' }
    ],

    // サイドバー設定
    sidebar: {
      '/docs/': [
        {
          text: 'システム概要',
          items: [
            { text: 'プロジェクト概要', link: '/docs/overview' },
            { text: '技術スタック', link: '/docs/tech-stack' },
            { text: 'アーキテクチャ', link: '/docs/architecture' }
          ]
        },
        {
          text: '開発ガイド',
          items: [
            { text: '環境構築', link: '/docs/setup' },
            { text: '開発フロー', link: '/docs/development' },
            { text: 'デプロイ', link: '/docs/deployment' }
          ]
        },
        {
          text: '機能仕様',
          items: [
            { text: '認証システム', link: '/docs/auth' },
            { text: 'ユーザー管理', link: '/docs/user-management' },
            { text: '権限管理', link: '/docs/permissions' }
          ]
        }
      ]
    },

    // 検索設定
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '検索',
                buttonAriaLabel: 'ドキュメントを検索'
              },
              modal: {
                displayDetails: '詳細を表示',
                resetButtonTitle: 'リセット',
                backButtonTitle: '戻る',
                noResultsText: '結果が見つかりません',
                footer: {
                  selectText: '選択',
                  navigateText: '移動',
                  closeText: '閉じる'
                }
              }
            }
          }
        }
      }
    },

    // ソーシャルリンク
    socialLinks: [
      { icon: 'github', link: 'https://github.com/websys/docs' }
    ],

    // フッター設定
    footer: {
      message: 'WebSys Documentation - Built with VitePress',
      copyright: 'Copyright © 2025 WebSys Project'
    },

    // 編集リンク
    editLink: {
      pattern: 'https://github.com/websys/docs/edit/main/docs/:path',
      text: 'このページを編集'
    },

    // 最終更新日
    lastUpdated: {
      text: '最終更新',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    }
  },

  // Vite設定
  vite: {
    ssr: {
      noExternal: ['vue-chartjs', 'chart.js']
    },
    optimizeDeps: {
      include: ['vue', 'vue-i18n', '@vueuse/core', 'minisearch', 'fuse.js']
    }
  },

  // Markdown設定
  markdown: {
    lineNumbers: true,
    config: (md) => {
      // カスタムMarkdownプラグインをここに追加
    }
  },

  // ヘッド設定
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ],

  // PWA設定（将来的に追加可能）
  cleanUrls: true,

  // サイトマップ生成
  sitemap: {
    hostname: 'https://websys-docs.example.com'
  }
})
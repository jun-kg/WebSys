#!/usr/bin/env node

/**
 * 共通コンポーネント使用チェッカー
 * Element Plus の直接使用を検出し、共通コンポーネントの使用を強制する
 */

const fs = require('fs')
const path = require('path')
const glob = require('glob')

// 設定
const CONFIG = {
  // チェック対象ディレクトリ
  targetDirs: [
    'workspace/frontend/src',
    'templates/frontend-vue/src'
  ],

  // チェック対象ファイル拡張子
  extensions: ['vue', 'ts', 'js'],

  // 禁止されたコンポーネント（Element Plus直接使用）
  forbiddenComponents: [
    'ElButton', 'ElInput', 'ElSelect', 'ElTable', 'ElCard',
    'ElForm', 'ElFormItem', 'ElMenu', 'ElMenuItem', 'ElSubMenu',
    'ElBreadcrumb', 'ElBreadcrumbItem', 'ElDialog', 'ElDrawer',
    'ElMessage', 'ElNotification', 'ElMessageBox', 'ElTabs',
    'ElTabPane', 'ElTag', 'ElBadge', 'ElAvatar', 'ElTooltip',
    'ElPopover', 'ElPagination'
  ],

  // 例外的に許可されたコンポーネント
  allowedComponents: [
    'ElContainer', 'ElHeader', 'ElMain', 'ElFooter', 'ElAside',
    'ElRow', 'ElCol', 'ElScrollbar', 'ElDivider', 'ElSkeleton',
    'ElIcon', 'ElImage', 'ElProgress', 'ElWatermark', 'ElAffix', 'ElBackTop'
  ],

  // 共通コンポーネントのマッピング
  componentMapping: {
    'ElButton': 'CommonButton',
    'ElInput': 'CommonInput',
    'ElSelect': 'CommonSelect',
    'ElTable': 'CommonTable',
    'ElCard': 'CommonCard',
    'ElForm': 'CommonForm',
    'ElMenu': 'CommonMenu',
    'ElBreadcrumb': 'CommonBreadcrumb',
    'ElDialog': 'CommonDialog',
    'ElTabs': 'CommonTabs',
    'ElTag': 'CommonTag'
  }
}

// 結果格納
const results = {
  violations: [],
  summary: {
    totalFiles: 0,
    violatedFiles: 0,
    totalViolations: 0,
    commonComponentUsage: 0,
    elementPlusUsage: 0
  }
}

/**
 * ファイル内容を解析してコンポーネント使用状況をチェック
 */
function analyzeFile(filePath, content) {
  const violations = []
  const lines = content.split('\n')

  lines.forEach((line, lineNumber) => {
    // import文のチェック
    const importMatch = line.match(/import\s*\{([^}]+)\}\s*from\s*['"`]element-plus['"`]/)
    if (importMatch) {
      const imports = importMatch[1].split(',').map(s => s.trim())

      imports.forEach(importName => {
        if (CONFIG.forbiddenComponents.includes(importName)) {
          violations.push({
            type: 'forbidden_import',
            component: importName,
            line: lineNumber + 1,
            content: line.trim(),
            suggestion: CONFIG.componentMapping[importName] || `Common${importName.slice(2)}`,
            message: `${importName} の直接使用は禁止されています。${CONFIG.componentMapping[importName] || `Common${importName.slice(2)}`} を使用してください。`
          })
        }
      })
    }

    // テンプレート内でのコンポーネント使用チェック
    CONFIG.forbiddenComponents.forEach(component => {
      const kebabCase = component.replace(/([A-Z])/g, '-$1').toLowerCase().slice(1)
      const regex = new RegExp(`<${kebabCase}[\\s>]`, 'gi')

      if (regex.test(line)) {
        violations.push({
          type: 'forbidden_template_usage',
          component: component,
          line: lineNumber + 1,
          content: line.trim(),
          suggestion: CONFIG.componentMapping[component] || `Common${component.slice(2)}`,
          message: `テンプレート内での ${component} (${kebabCase}) の使用は禁止されています。`
        })
      }
    })

    // 共通コンポーネントの使用をカウント
    if (line.includes('@company/shared-components')) {
      results.summary.commonComponentUsage++
    }

    // Element Plus の使用をカウント
    if (line.includes('element-plus') && !line.includes('@company/shared-components')) {
      results.summary.elementPlusUsage++
    }
  })

  return violations
}

/**
 * ディレクトリを再帰的にスキャン
 */
function scanDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.warn(`⚠️  ディレクトリが存在しません: ${dirPath}`)
    return
  }

  const pattern = `${dirPath}/**/*.{${CONFIG.extensions.join(',')}}`
  const files = glob.sync(pattern)

  files.forEach(filePath => {
    results.summary.totalFiles++

    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const violations = analyzeFile(filePath, content)

      if (violations.length > 0) {
        results.summary.violatedFiles++
        results.summary.totalViolations += violations.length

        results.violations.push({
          file: filePath,
          violations: violations
        })
      }
    } catch (error) {
      console.error(`❌ ファイル読み込みエラー: ${filePath}`, error.message)
    }
  })
}

/**
 * 結果をフォーマットして出力
 */
function printResults() {
  console.log('\n' + '='.repeat(60))
  console.log('🔍 共通コンポーネント使用チェック結果')
  console.log('='.repeat(60))

  // サマリー情報
  console.log('\n📊 統計情報:')
  console.log(`  総ファイル数: ${results.summary.totalFiles}`)
  console.log(`  違反ファイル数: ${results.summary.violatedFiles}`)
  console.log(`  総違反数: ${results.summary.totalViolations}`)

  // 使用率計算
  const totalUsage = results.summary.commonComponentUsage + results.summary.elementPlusUsage
  const complianceRate = totalUsage > 0
    ? Math.round((results.summary.commonComponentUsage / totalUsage) * 100)
    : 100

  console.log(`  共通コンポーネント使用率: ${complianceRate}%`)

  // 違反詳細
  if (results.violations.length > 0) {
    console.log('\n❌ 違反詳細:')

    results.violations.forEach(fileViolation => {
      console.log(`\n📄 ${fileViolation.file}`)

      fileViolation.violations.forEach(violation => {
        console.log(`  ${violation.line}行目: ${violation.message}`)
        console.log(`    現在: ${violation.content}`)
        console.log(`    推奨: ${violation.suggestion} を使用`)
      })
    })

    console.log('\n💡 修正方法:')
    console.log('1. Element Plus コンポーネントのimportを削除')
    console.log('2. @company/shared-components から対応するコンポーネントをimport')
    console.log('3. テンプレート内のコンポーネント名を変更')
    console.log('\n例:')
    console.log('  ❌ import { ElButton } from "element-plus"')
    console.log('  ✅ import { CommonButton } from "@company/shared-components"')

  } else {
    console.log('\n✅ 違反は検出されませんでした！')
  }

  // 終了コード
  const exitCode = results.violations.length > 0 ? 1 : 0

  console.log('\n' + '='.repeat(60))
  console.log(`チェック完了 (終了コード: ${exitCode})`)

  return exitCode
}

/**
 * JSONレポート出力
 */
function generateJsonReport() {
  const reportPath = 'component-usage-report.json'
  const report = {
    timestamp: new Date().toISOString(),
    summary: results.summary,
    violations: results.violations,
    config: CONFIG
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📋 詳細レポート: ${reportPath}`)
}

/**
 * HTML レポート生成
 */
function generateHtmlReport() {
  const htmlContent = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>共通コンポーネント使用チェック結果</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
        .metric { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 6px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #409eff; }
        .violation { border-left: 4px solid #f56c6c; margin: 10px 0; padding: 10px; background: #fef0f0; }
        .file-path { font-weight: bold; color: #303133; }
        .violation-detail { margin: 5px 0; font-family: monospace; background: #f9f9f9; padding: 8px; }
        .suggestion { color: #67c23a; font-weight: bold; }
        .compliance-rate { font-size: 18px; padding: 10px; text-align: center; border-radius: 6px; }
        .good { background: #f0f9ff; color: #409eff; }
        .warning { background: #fdf6ec; color: #e6a23c; }
        .error { background: #fef0f0; color: #f56c6c; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 共通コンポーネント使用チェック結果</h1>
        <p>実行日時: ${new Date().toLocaleString('ja-JP')}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <div class="metric-value">${results.summary.totalFiles}</div>
            <div>総ファイル数</div>
        </div>
        <div class="metric">
            <div class="metric-value">${results.summary.violatedFiles}</div>
            <div>違反ファイル数</div>
        </div>
        <div class="metric">
            <div class="metric-value">${results.summary.totalViolations}</div>
            <div>総違反数</div>
        </div>
    </div>

    <div class="compliance-rate ${complianceRate >= 90 ? 'good' : complianceRate >= 70 ? 'warning' : 'error'}">
        共通コンポーネント使用率: ${complianceRate}%
    </div>

    <h2>違反詳細</h2>
    ${results.violations.length === 0 ? '<p>✅ 違反は検出されませんでした！</p>' : ''}
    ${results.violations.map(fileViolation => `
        <div class="violation">
            <div class="file-path">📄 ${fileViolation.file}</div>
            ${fileViolation.violations.map(v => `
                <div class="violation-detail">
                    <strong>${v.line}行目:</strong> ${v.message}<br>
                    現在: <code>${v.content}</code><br>
                    推奨: <span class="suggestion">${v.suggestion}</span>
                </div>
            `).join('')}
        </div>
    `).join('')}
</body>
</html>
  `

  const reportPath = 'component-usage-report.html'
  fs.writeFileSync(reportPath, htmlContent)
  console.log(`🌐 HTMLレポート: ${reportPath}`)
}

/**
 * メイン実行関数
 */
function main() {
  const args = process.argv.slice(2)
  const options = {
    json: args.includes('--json'),
    html: args.includes('--html'),
    strict: args.includes('--strict')
  }

  console.log('🚀 共通コンポーネント使用チェック開始...')

  // 各ディレクトリをスキャン
  CONFIG.targetDirs.forEach(dir => {
    console.log(`📁 スキャン中: ${dir}`)
    scanDirectory(dir)
  })

  // 結果出力
  const exitCode = printResults()

  // レポート生成
  if (options.json) {
    generateJsonReport()
  }

  if (options.html) {
    generateHtmlReport()
  }

  // 厳格モードでの終了
  if (options.strict && exitCode !== 0) {
    process.exit(exitCode)
  }
}

// スクリプトが直接実行された場合
if (require.main === module) {
  main()
}

module.exports = {
  analyzeFile,
  scanDirectory,
  CONFIG,
  results
}
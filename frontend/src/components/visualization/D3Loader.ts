/**
 * D3.js Dynamic Loader
 * D3.js動的インポート管理
 *
 * 機能:
 * - 必要な時のみD3.jsをロード（遅延読み込み）
 * - メモリ効率の最適化
 * - 初期バンドルサイズの削減
 */

import type { VisualizationNode, D3Selection, VisualizationConfig } from './VisualizationTypes'

// D3モジュールの型定義（動的インポート用）
type D3Module = typeof import('d3')

// D3インスタンスキャッシュ
let d3Instance: D3Module | null = null

/**
 * D3.jsの動的ロード
 * 初回のみロードし、以降はキャッシュを使用
 */
export async function loadD3(): Promise<D3Module> {
  if (d3Instance) {
    return d3Instance
  }

  console.log('[D3Loader] Loading D3.js dynamically...')

  try {
    d3Instance = await import('d3')
    console.log('[D3Loader] D3.js loaded successfully')
    return d3Instance
  } catch (error) {
    console.error('[D3Loader] Failed to load D3.js:', error)
    throw new Error('D3.jsの読み込みに失敗しました')
  }
}

/**
 * SVGの初期化（D3使用）
 */
export async function initializeSVG(
  container: HTMLElement,
  width: number,
  height: number
): Promise<D3Selection> {
  const d3 = await loadD3()

  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)

  // ズーム機能を追加
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.1, 3])
    .on('zoom', (event) => {
      if (g) {
        g.attr('transform', event.transform)
      }
    })

  svg.call(zoom)
  const g = svg.append('g')

  return { svg, g, zoom }
}

/**
 * D3セレクションクリア
 */
export async function clearD3Selection(container: HTMLElement): Promise<void> {
  const d3 = await loadD3()
  d3.select(container).selectAll('*').remove()
}

/**
 * ズームコントロール追加
 */
export async function addZoomControls(
  svg: any,
  zoom: any
): Promise<void> {
  const d3 = await loadD3()

  const controls = svg.append('g')
    .attr('class', 'zoom-controls')
    .attr('transform', 'translate(20, 20)')

  // Zoom in button
  controls.append('circle')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', 20)
    .attr('fill', '#fff')
    .attr('stroke', '#ddd')
    .style('cursor', 'pointer')
    .on('click', () => {
      svg.transition().call(zoom.scaleBy, 1.5)
    })

  controls.append('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '0.3em')
    .text('+')
    .style('font-size', '16px')
    .style('font-weight', 'bold')
    .style('pointer-events', 'none')

  // Zoom out button
  controls.append('circle')
    .attr('cx', 0)
    .attr('cy', 50)
    .attr('r', 20)
    .attr('fill', '#fff')
    .attr('stroke', '#ddd')
    .style('cursor', 'pointer')
    .on('click', () => {
      svg.transition().call(zoom.scaleBy, 0.67)
    })

  controls.append('text')
    .attr('x', 0)
    .attr('y', 50)
    .attr('text-anchor', 'middle')
    .attr('dy', '0.3em')
    .text('−')
    .style('font-size', '16px')
    .style('font-weight', 'bold')
    .style('pointer-events', 'none')

  // Reset button
  controls.append('circle')
    .attr('cx', 0)
    .attr('cy', 100)
    .attr('r', 20)
    .attr('fill', '#fff')
    .attr('stroke', '#ddd')
    .style('cursor', 'pointer')
    .on('click', () => {
      svg.transition().call(zoom.transform, d3.zoomIdentity)
    })

  controls.append('text')
    .attr('x', 0)
    .attr('y', 100)
    .attr('text-anchor', 'middle')
    .attr('dy', '0.3em')
    .text('○')
    .style('font-size', '12px')
    .style('font-weight', 'bold')
    .style('pointer-events', 'none')
}

/**
 * SVGをPNGとしてエクスポート
 */
export async function exportSVGToPNG(
  svg: any,
  filename: string = `inheritance-visualization-${Date.now()}.png`
): Promise<void> {
  if (!svg) {
    throw new Error('SVG要素が見つかりません')
  }

  return new Promise((resolve, reject) => {
    try {
      const svgElement = svg.node()!
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')!

      const svgString = new XMLSerializer().serializeToString(svgElement)
      const img = new Image()

      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        context.drawImage(img, 0, 0)

        canvas.toBlob(blob => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            a.click()
            URL.revokeObjectURL(url)
            resolve()
          } else {
            reject(new Error('Blob作成に失敗しました'))
          }
        })
      }

      img.onerror = () => {
        reject(new Error('画像の読み込みに失敗しました'))
      }

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)))
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * D3インスタンスの解放
 * メモリリーク防止
 */
export function releaseD3Instance(): void {
  d3Instance = null
  console.log('[D3Loader] D3.js instance released')
}
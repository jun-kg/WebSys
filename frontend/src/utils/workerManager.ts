/**
 * WebWorker Manager
 * WebWorker管理ユーティリティ
 *
 * 機能:
 * - WebWorkerの生成・管理・終了
 * - Promise-basedインターフェース
 * - リクエストID管理
 * - エラーハンドリング
 */

import type { Department, VisualizationNode } from '@/components/visualization/VisualizationTypes'

interface WorkerRequest {
  type: string
  data: any
  resolve: (value: any) => void
  reject: (error: Error) => void
}

class VisualizationWorkerManager {
  private worker: Worker | null = null
  private pendingRequests = new Map<string, WorkerRequest>()
  private requestCounter = 0

  /**
   * WebWorkerの初期化
   */
  private async ensureWorker(): Promise<Worker> {
    if (this.worker) {
      return this.worker
    }

    try {
      // Viteでの動的インポート対応
      this.worker = new Worker(
        new URL('../workers/visualizationWorker.ts', import.meta.url),
        { type: 'module' }
      )

      this.worker.addEventListener('message', this.handleWorkerMessage.bind(this))
      this.worker.addEventListener('error', this.handleWorkerError.bind(this))

      console.log('[WorkerManager] Visualization worker initialized')
      return this.worker
    } catch (error) {
      console.error('[WorkerManager] Failed to initialize worker:', error)
      throw new Error('WebWorkerの初期化に失敗しました')
    }
  }

  /**
   * WebWorkerからのメッセージ処理
   */
  private handleWorkerMessage(event: MessageEvent) {
    const { type, data, requestId } = event.data

    const request = this.pendingRequests.get(requestId)
    if (!request) {
      console.warn(`[WorkerManager] Unknown request ID: ${requestId}`)
      return
    }

    this.pendingRequests.delete(requestId)

    if (type === 'ERROR') {
      request.reject(new Error(data.error))
    } else {
      request.resolve(data)
    }
  }

  /**
   * WebWorkerエラー処理
   */
  private handleWorkerError(error: ErrorEvent) {
    console.error('[WorkerManager] Worker error:', error)

    // すべてのペンディングリクエストをエラーで終了
    this.pendingRequests.forEach(request => {
      request.reject(new Error('WebWorkerでエラーが発生しました'))
    })
    this.pendingRequests.clear()
  }

  /**
   * WebWorkerにメッセージを送信（Promise-based）
   */
  private async sendMessage(type: string, data: any): Promise<any> {
    const worker = await this.ensureWorker()
    const requestId = `req_${++this.requestCounter}_${Date.now()}`

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { type, data, resolve, reject })

      worker.postMessage({
        type,
        data,
        requestId
      })

      // タイムアウト設定（30秒）
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId)
          reject(new Error('WebWorker処理がタイムアウトしました'))
        }
      }, 30000)
    })
  }

  /**
   * ツリーデータ構築
   */
  async buildTreeData(departments: Department[], selectedFeature?: number): Promise<VisualizationNode[]> {
    console.log(`[WorkerManager] Building tree data with ${departments.length} departments`)

    return this.sendMessage('BUILD_TREE', {
      departments,
      selectedFeature
    })
  }

  /**
   * フローデータ構築
   */
  async buildFlowData(departments: Department[], selectedFeature?: number): Promise<VisualizationNode[]> {
    console.log(`[WorkerManager] Building flow data with feature ${selectedFeature}`)

    return this.sendMessage('BUILD_FLOW', {
      departments,
      selectedFeature
    })
  }

  /**
   * マトリクスデータ構築
   */
  async buildMatrixData(departments: Department[], selectedFeature?: number): Promise<any> {
    console.log(`[WorkerManager] Building matrix data`)

    return this.sendMessage('BUILD_MATRIX', {
      departments,
      selectedFeature
    })
  }

  /**
   * 有効権限計算
   */
  async calculateInheritance(departmentId: number, departments: Department[]): Promise<any[]> {
    console.log(`[WorkerManager] Calculating inheritance for department ${departmentId}`)

    return this.sendMessage('CALCULATE_INHERITANCE', {
      departmentId,
      departments
    })
  }

  /**
   * WebWorkerの終了
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      console.log('[WorkerManager] Worker terminated')
    }

    // すべてのペンディングリクエストをキャンセル
    this.pendingRequests.forEach(request => {
      request.reject(new Error('WebWorkerが終了されました'))
    })
    this.pendingRequests.clear()
  }

  /**
   * ペンディングリクエスト数の取得
   */
  get pendingRequestCount(): number {
    return this.pendingRequests.size
  }

  /**
   * WebWorkerの状態確認
   */
  get isWorkerActive(): boolean {
    return this.worker !== null
  }
}

// シングルトンインスタンス
let workerManager: VisualizationWorkerManager | null = null

/**
 * WorkerManagerのシングルトンインスタンス取得
 */
export function getWorkerManager(): VisualizationWorkerManager {
  if (!workerManager) {
    workerManager = new VisualizationWorkerManager()
  }
  return workerManager
}

/**
 * アプリケーション終了時のクリーンアップ
 */
export function cleanupWorker(): void {
  if (workerManager) {
    workerManager.terminate()
    workerManager = null
  }
}

// ページのunload時に自動クリーンアップ
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupWorker)
}
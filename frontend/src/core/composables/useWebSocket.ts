/**
 * WebSocket リアルタイム通信 Composable
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'
import { ElMessage, ElNotification } from 'element-plus'
import { useAuthStore } from '@custom/stores/auth'
import type { LogEntry } from '@/types/log'

interface WebSocketMessage {
  type: string
  data: any
  timestamp: number
}

interface AlertMessage {
  level: 'info' | 'warning' | 'error' | 'critical'
  message: string
  logEntry?: LogEntry
  details?: any
}

export const useWebSocket = () => {
  const authStore = useAuthStore()

  // 状態管理
  const socket = ref<Socket | null>(null)
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const connectionError = ref<string | null>(null)
  const lastPing = ref<number>(0)

  // リアルタイムデータ
  const newLogs = ref<LogEntry[]>([])
  const alerts = ref<AlertMessage[]>([])
  const onlineUsers = ref<number>(0)

  // computed
  const connectionStatus = computed(() => {
    if (isConnecting.value) return 'connecting'
    if (isConnected.value) return 'connected'
    if (connectionError.value) return 'error'
    return 'disconnected'
  })

  const latency = computed(() => {
    return lastPing.value > 0 ? Date.now() - lastPing.value : 0
  })

  /**
   * WebSocket接続
   */
  const connect = () => {
    if (socket.value?.connected) return

    const token = authStore.token
    if (!token) {
      connectionError.value = 'Authentication token not found'
      return
    }

    isConnecting.value = true
    connectionError.value = null

    try {
      socket.value = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000', {
        auth: { token },
        transports: ['websocket'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      })

      setupEventHandlers()
    } catch (error: any) {
      console.error('WebSocket connection error:', error)
      connectionError.value = error.message
      isConnecting.value = false
    }
  }

  /**
   * イベントハンドラー設定
   */
  const setupEventHandlers = () => {
    if (!socket.value) return

    // 接続イベント
    socket.value.on('connect', () => {
      console.log('WebSocket connected:', socket.value?.id)
      isConnected.value = true
      isConnecting.value = false
      connectionError.value = null

      ElMessage.success('リアルタイム監視が開始されました')
    })

    // 認証完了
    socket.value.on('connected', (data) => {
      console.log('WebSocket authenticated:', data)
      ElNotification({
        title: 'WebSocket接続',
        message: data.message,
        type: 'success',
        duration: 3000
      })
    })

    // 新しいログ受信
    socket.value.on('new-log', (message: WebSocketMessage) => {
      const logEntry = message.data as LogEntry
      newLogs.value.unshift(logEntry)

      // 最新50件のみ保持
      if (newLogs.value.length > 50) {
        newLogs.value = newLogs.value.slice(0, 50)
      }

      console.log('New log received:', logEntry)
    })

    // 統計更新
    socket.value.on('stats-update', (message: WebSocketMessage) => {
      console.log('Stats update:', message.data)
      // 統計データを更新（親コンポーネントで処理）
    })

    // アラート受信
    socket.value.on('alert', (message: WebSocketMessage) => {
      const alert = message.data as AlertMessage
      alerts.value.unshift(alert)

      // 最新20件のみ保持
      if (alerts.value.length > 20) {
        alerts.value = alerts.value.slice(0, 20)
      }

      // UI通知表示
      const notificationType =
        alert.level === 'critical' ? 'error' :
        alert.level === 'error' ? 'error' :
        alert.level === 'warning' ? 'warning' : 'info'

      ElNotification({
        title: `${alert.level.toUpperCase()} Alert`,
        message: alert.message,
        type: notificationType,
        duration: alert.level === 'critical' ? 0 : 8000, // クリティカルは手動で閉じる
        showClose: true
      })

      console.log('Alert received:', alert)
    })

    // システム通知
    socket.value.on('system-notification', (message: WebSocketMessage) => {
      const notification = message.data
      ElNotification({
        title: notification.title,
        message: notification.message,
        type: notification.type === 'warning' ? 'warning' : 'info',
        duration: notification.duration || 5000
      })
    })

    // Pong受信
    socket.value.on('pong', (data) => {
      lastPing.value = data.timestamp
    })

    // 接続切断
    socket.value.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      isConnected.value = false

      if (reason === 'io server disconnect') {
        ElMessage.warning('サーバーから切断されました')
      }
    })

    // 再接続
    socket.value.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts')
      ElMessage.success('リアルタイム監視が再接続されました')
    })

    // 再接続エラー
    socket.value.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error)
      connectionError.value = 'Reconnection failed'
    })

    // 認証エラー
    socket.value.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      isConnecting.value = false

      if (error.message?.includes('Authentication')) {
        connectionError.value = 'Authentication failed'
        ElMessage.error('WebSocket認証に失敗しました')
      } else {
        connectionError.value = error.message
        ElMessage.error('WebSocket接続に失敗しました')
      }
    })
  }

  /**
   * WebSocket切断
   */
  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect()
      socket.value = null
    }
    isConnected.value = false
    isConnecting.value = false
    connectionError.value = null
  }

  /**
   * ルーム参加
   */
  const joinRoom = (room: string) => {
    if (socket.value?.connected) {
      socket.value.emit('join-room', room)
    }
  }

  /**
   * ルーム退出
   */
  const leaveRoom = (room: string) => {
    if (socket.value?.connected) {
      socket.value.emit('leave-room', room)
    }
  }

  /**
   * ハートビート送信
   */
  const ping = () => {
    if (socket.value?.connected) {
      socket.value.emit('ping')
    }
  }

  /**
   * ログクリア
   */
  const clearLogs = () => {
    newLogs.value = []
  }

  /**
   * アラートクリア
   */
  const clearAlerts = () => {
    alerts.value = []
  }

  /**
   * 特定レベル以上のアラートを削除
   */
  const dismissAlert = (index: number) => {
    alerts.value.splice(index, 1)
  }

  // 自動接続（認証済みの場合）
  onMounted(() => {
    if (authStore.isAuthenticated) {
      connect()
    }
  })

  // クリーンアップ
  onUnmounted(() => {
    disconnect()
  })

  return {
    // 状態
    isConnected: readonly(isConnected),
    isConnecting: readonly(isConnecting),
    connectionError: readonly(connectionError),
    connectionStatus,
    latency,

    // データ
    newLogs: readonly(newLogs),
    alerts: readonly(alerts),
    onlineUsers: readonly(onlineUsers),

    // メソッド
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    ping,
    clearLogs,
    clearAlerts,
    dismissAlert
  }
}

// 定期的なハートビート送信
export const useWebSocketHeartbeat = (webSocket: ReturnType<typeof useWebSocket>, interval = 30000) => {
  let heartbeatInterval: number | null = null

  const startHeartbeat = () => {
    if (heartbeatInterval) return

    heartbeatInterval = window.setInterval(() => {
      if (webSocket.isConnected.value) {
        webSocket.ping()
      }
    }, interval)
  }

  const stopHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
  }

  onMounted(startHeartbeat)
  onUnmounted(stopHeartbeat)

  return {
    startHeartbeat,
    stopHeartbeat
  }
}
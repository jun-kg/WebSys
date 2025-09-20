/**
 * WebSocket リアルタイム通信サービス
 */

import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import jwt from 'jsonwebtoken'
import type { LogEntry } from '../types/log.js'

export interface AuthenticatedSocket {
  id: string
  userId: number
  username: string
  role: string
}

export class WebSocketService {
  private io: SocketIOServer
  private authenticatedSockets: Map<string, AuthenticatedSocket> = new Map()

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      path: '/socket.io/'
    })

    this.setupMiddleware()
    this.setupEventHandlers()
  }

  /**
   * JWT認証ミドルウェア
   */
  private setupMiddleware() {
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '')

        if (!token) {
          console.log('WebSocket: No token provided')
          return next(new Error('Authentication error: No token provided'))
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any

        // 認証されたソケット情報を保存
        this.authenticatedSockets.set(socket.id, {
          id: socket.id,
          userId: decoded.userId,
          username: decoded.username,
          role: decoded.role
        })

        console.log(`WebSocket: User ${decoded.username} connected (${socket.id})`)
        next()
      } catch (error) {
        console.error('WebSocket Authentication error:', error)
        next(new Error('Authentication error: Invalid token'))
      }
    })
  }

  /**
   * イベントハンドラー設定
   */
  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const authSocket = this.authenticatedSockets.get(socket.id)
      if (!authSocket) return

      console.log(`WebSocket: ${authSocket.username} connected`)

      // ログ監視ルームに参加
      socket.join('log-monitoring')

      // クライアントイベント処理
      socket.on('join-room', (room: string) => {
        socket.join(room)
        console.log(`User ${authSocket.username} joined room: ${room}`)
      })

      socket.on('leave-room', (room: string) => {
        socket.leave(room)
        console.log(`User ${authSocket.username} left room: ${room}`)
      })

      // 接続切断処理
      socket.on('disconnect', (reason) => {
        console.log(`WebSocket: ${authSocket.username} disconnected (${reason})`)
        this.authenticatedSockets.delete(socket.id)
      })

      // ハートビート
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() })
      })

      // 初期接続完了通知
      socket.emit('connected', {
        message: 'WebSocket接続が確立されました',
        userId: authSocket.userId,
        username: authSocket.username
      })
    })
  }

  /**
   * 新しいログをリアルタイム配信
   */
  public broadcastNewLog(log: LogEntry) {
    this.io.to('log-monitoring').emit('new-log', {
      type: 'new-log',
      data: log,
      timestamp: Date.now()
    })
  }

  /**
   * ログ統計更新をリアルタイム配信
   */
  public broadcastStatsUpdate(stats: any) {
    this.io.to('log-monitoring').emit('stats-update', {
      type: 'stats-update',
      data: stats,
      timestamp: Date.now()
    })
  }

  /**
   * 緊急アラートを配信
   */
  public broadcastAlert(alert: {
    level: 'info' | 'warning' | 'error' | 'critical'
    message: string
    logEntry?: LogEntry
    details?: any
  }) {
    this.io.to('log-monitoring').emit('alert', {
      type: 'alert',
      data: alert,
      timestamp: Date.now()
    })

    console.log(`Alert broadcasted: [${alert.level.toUpperCase()}] ${alert.message}`)
  }

  /**
   * 特定ユーザーにメッセージ送信
   */
  public sendToUser(userId: number, event: string, data: any) {
    const targetSocket = Array.from(this.authenticatedSockets.values())
      .find(socket => socket.userId === userId)

    if (targetSocket) {
      this.io.to(targetSocket.id).emit(event, data)
    }
  }

  /**
   * システム通知を全ユーザーに送信
   */
  public broadcastSystemNotification(notification: {
    type: 'maintenance' | 'update' | 'warning' | 'info'
    title: string
    message: string
    duration?: number
  }) {
    this.io.emit('system-notification', {
      type: 'system-notification',
      data: notification,
      timestamp: Date.now()
    })
  }

  /**
   * 接続状況取得
   */
  public getConnectionStats() {
    return {
      totalConnections: this.authenticatedSockets.size,
      connectedUsers: Array.from(this.authenticatedSockets.values()).map(socket => ({
        userId: socket.userId,
        username: socket.username,
        role: socket.role,
        socketId: socket.id
      }))
    }
  }

  /**
   * WebSocketサーバー停止
   */
  public close() {
    this.io.close()
    this.authenticatedSockets.clear()
    console.log('WebSocket server closed')
  }
}

// シングルトンインスタンス
let webSocketService: WebSocketService | null = null

export const initializeWebSocketService = (httpServer: HTTPServer): WebSocketService => {
  if (!webSocketService) {
    webSocketService = new WebSocketService(httpServer)
  }
  return webSocketService
}

export const getWebSocketService = (): WebSocketService | null => {
  return webSocketService
}
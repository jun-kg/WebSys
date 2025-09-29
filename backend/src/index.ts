import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { applySecurity } from './middleware/security'
import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import companyRoutes from './routes/companies'
import departmentRoutes from './routes/departments'
import featureRoutes from './routes/features'
import permissionRoutes from './routes/permissions/index'
import logRoutes from './routes/logs'
import alertRuleRoutes from './routes/alertRules'
import notificationRoutes from './routes/notifications'
import statisticsRoutes from './routes/statistics'
import permissionInheritanceRoutes from './routes/permissionInheritance'
import reportRoutes from './routes/reports'
import healthRoutes from './routes/health'
import workflowRoutes from './routes/workflow/index'
import approvalRoutes from './routes/approval.js'
import { errorHandler } from './middleware/errorHandler.js'
import { initializeWebSocketService } from './services/WebSocketService.js'
import { SystemHealthService } from './services/SystemHealthService.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 8000

// WebSocketサービス初期化
const webSocketService = initializeWebSocketService(httpServer)

// セキュリティミドルウェア適用（最優先）
applySecurity(app, {
  corsOrigins: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003"
  ]
})

// 基本ミドルウェア
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(morgan('combined')) // より詳細なログ出力

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    websocket: {
      connections: webSocketService.getConnectionStats().totalConnections
    }
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/companies', companyRoutes)
app.use('/api/departments', departmentRoutes)
app.use('/api/features', featureRoutes)
app.use('/api/permissions', permissionRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/alert-rules', alertRuleRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/statistics', statisticsRoutes)
app.use('/api/permissions', permissionInheritanceRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/workflow', workflowRoutes)
app.use('/api/approval', approvalRoutes)
app.use('/api', healthRoutes)

// WebSocket接続状況API
app.get('/api/websocket/status', (req, res) => {
  res.json(webSocketService.getConnectionStats())
})

// Error handling middleware
app.use(errorHandler)

// Start server with WebSocket support
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  console.log(`WebSocket server is ready`)

  // システムヘルス監視を開始
  const healthService = SystemHealthService.getInstance()
  healthService.startRealTimeMonitoring(30000) // 30秒間隔
})

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')

  // ヘルス監視を停止
  const healthService = SystemHealthService.getInstance()
  healthService.stopRealTimeMonitoring()

  webSocketService.close()
  httpServer.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')

  // ヘルス監視を停止
  const healthService = SystemHealthService.getInstance()
  healthService.stopRealTimeMonitoring()

  webSocketService.close()
  httpServer.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })
})

// Export app for testing
export { app }
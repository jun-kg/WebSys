import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { createServer } from 'http'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import logRoutes from './routes/logs.js'
import alertRuleRoutes from './routes/alertRules.js'
import notificationRoutes from './routes/notifications.js'
import { errorHandler } from './middleware/errorHandler.js'
import { initializeWebSocketService } from './services/WebSocketService.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 8000

// WebSocketサービス初期化
const webSocketService = initializeWebSocketService(httpServer)

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003"
  ],
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

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
app.use('/api/logs', logRoutes)
app.use('/api/alert-rules', alertRuleRoutes)
app.use('/api/notifications', notificationRoutes)

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
})

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  webSocketService.close()
  httpServer.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  webSocketService.close()
  httpServer.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })
})
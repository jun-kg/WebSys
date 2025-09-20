import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

interface JwtPayload {
  userId: number
  username: string
  role: string
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.header('Authorization')
  console.log('認証ヘッダー:', authHeader)

  const token = authHeader?.replace('Bearer ', '')
  console.log('トークン:', token ? token.substring(0, 20) + '...' : 'なし')

  if (!token) {
    console.log('トークンが見つかりません')
    return res.status(401).json({ message: '認証トークンが必要です' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
    console.log('トークン検証成功:', decoded.username)
    req.user = decoded
    next()
  } catch (error) {
    console.log('トークン検証失敗:', error)
    res.status(401).json({ message: '無効なトークンです' })
  }
}

export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: '認証が必要です' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'アクセス権限がありません' })
    }

    next()
  }
}
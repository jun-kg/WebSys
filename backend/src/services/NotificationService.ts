/**
 * 通知サービス
 * 外部サービスへの通知送信を管理
 */

import axios from 'axios'
import nodemailer from 'nodemailer'
import { PrismaClient } from '@prisma/client'
import type { LogEntry } from '../types/log'

export interface NotificationConfig {
  slack?: {
    webhookUrl: string
    channel?: string
    username?: string
    iconEmoji?: string
  }
  email?: {
    smtp: {
      host: string
      port: number
      secure: boolean
      auth: {
        user: string
        pass: string
      }
    }
    from: string
    to: string[]
  }
  teams?: {
    webhookUrl: string
  }
}

export interface NotificationMessage {
  title: string
  message: string
  level: 'info' | 'warning' | 'error' | 'critical'
  details?: Record<string, any>
  logEntry?: LogEntry
  timestamp?: string
}

export class NotificationService {
  private prisma: PrismaClient
  private emailTransporter: nodemailer.Transporter | null = null
  private config: NotificationConfig = {}

  constructor() {
    this.prisma = new PrismaClient()
    this.loadConfiguration()
  }

  /**
   * 設定の読み込み
   */
  private async loadConfiguration() {
    try {
      // 環境変数から設定を読み込み
      if (process.env.SLACK_WEBHOOK_URL) {
        this.config.slack = {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL,
          username: process.env.SLACK_USERNAME || 'Log Monitor',
          iconEmoji: process.env.SLACK_ICON || ':warning:'
        }
      }

      if (process.env.SMTP_HOST) {
        this.config.email = {
          smtp: {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER || '',
              pass: process.env.SMTP_PASS || ''
            }
          },
          from: process.env.EMAIL_FROM || 'noreply@logmonitor.com',
          to: (process.env.EMAIL_TO || '').split(',').filter(Boolean)
        }

        // Emailトランスポーター設定
        if (this.config.email) {
          this.emailTransporter = nodemailer.createTransporter(this.config.email.smtp)
        }
      }

      if (process.env.TEAMS_WEBHOOK_URL) {
        this.config.teams = {
          webhookUrl: process.env.TEAMS_WEBHOOK_URL
        }
      }

      console.log('通知設定を読み込みました:', {
        slack: !!this.config.slack,
        email: !!this.config.email,
        teams: !!this.config.teams
      })
    } catch (error) {
      console.error('通知設定の読み込みエラー:', error)
    }
  }

  /**
   * 通知送信
   */
  async send(
    message: NotificationMessage,
    channels: ('slack' | 'email' | 'teams')[] = ['slack', 'email']
  ): Promise<void> {
    const promises: Promise<void>[] = []

    if (channels.includes('slack') && this.config.slack) {
      promises.push(this.sendSlackNotification(message))
    }

    if (channels.includes('email') && this.config.email) {
      promises.push(this.sendEmailNotification(message))
    }

    if (channels.includes('teams') && this.config.teams) {
      promises.push(this.sendTeamsNotification(message))
    }

    await Promise.allSettled(promises)
  }

  /**
   * Slack通知送信
   */
  private async sendSlackNotification(message: NotificationMessage): Promise<void> {
    if (!this.config.slack?.webhookUrl) {
      console.log('Slack設定が見つかりません')
      return
    }

    try {
      const color = this.getSlackColor(message.level)
      const emoji = this.getSlackEmoji(message.level)

      const payload = {
        channel: this.config.slack.channel,
        username: this.config.slack.username,
        icon_emoji: emoji,
        attachments: [
          {
            color,
            title: message.title,
            text: message.message,
            fields: this.formatSlackFields(message),
            footer: 'Log Monitor',
            ts: Math.floor(new Date(message.timestamp || new Date()).getTime() / 1000)
          }
        ]
      }

      await axios.post(this.config.slack.webhookUrl, payload)
      console.log('Slack通知を送信しました')
    } catch (error) {
      console.error('Slack通知送信エラー:', error)
    }
  }

  /**
   * Email通知送信
   */
  private async sendEmailNotification(message: NotificationMessage): Promise<void> {
    if (!this.emailTransporter || !this.config.email?.to.length) {
      console.log('Email設定が見つかりません')
      return
    }

    try {
      const htmlContent = this.formatEmailHtml(message)

      const mailOptions = {
        from: this.config.email.from,
        to: this.config.email.to.join(','),
        subject: `[${message.level.toUpperCase()}] ${message.title}`,
        text: message.message,
        html: htmlContent
      }

      await this.emailTransporter.sendMail(mailOptions)
      console.log('Email通知を送信しました')
    } catch (error) {
      console.error('Email通知送信エラー:', error)
    }
  }

  /**
   * Teams通知送信
   */
  private async sendTeamsNotification(message: NotificationMessage): Promise<void> {
    if (!this.config.teams?.webhookUrl) {
      console.log('Teams設定が見つかりません')
      return
    }

    try {
      const color = this.getTeamsColor(message.level)

      const payload = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: color,
        summary: message.title,
        sections: [
          {
            activityTitle: message.title,
            activitySubtitle: new Date(message.timestamp || new Date()).toLocaleString(),
            activityImage: this.getTeamsIcon(message.level),
            text: message.message,
            facts: this.formatTeamsFacts(message)
          }
        ]
      }

      await axios.post(this.config.teams.webhookUrl, payload)
      console.log('Teams通知を送信しました')
    } catch (error) {
      console.error('Teams通知送信エラー:', error)
    }
  }

  /**
   * Slackカラー取得
   */
  private getSlackColor(level: string): string {
    const colors: Record<string, string> = {
      info: '#36a64f',
      warning: '#ff9800',
      error: '#f44336',
      critical: '#d32f2f'
    }
    return colors[level] || '#808080'
  }

  /**
   * Slack絵文字取得
   */
  private getSlackEmoji(level: string): string {
    const emojis: Record<string, string> = {
      info: ':information_source:',
      warning: ':warning:',
      error: ':x:',
      critical: ':rotating_light:'
    }
    return emojis[level] || ':bell:'
  }

  /**
   * Teamsカラー取得
   */
  private getTeamsColor(level: string): string {
    const colors: Record<string, string> = {
      info: '36a64f',
      warning: 'ff9800',
      error: 'f44336',
      critical: 'd32f2f'
    }
    return colors[level] || '808080'
  }

  /**
   * Teamsアイコン取得
   */
  private getTeamsIcon(level: string): string {
    // Teams用のアイコンURL（実際の環境では適切なアイコンURLを設定）
    const baseUrl = 'https://example.com/icons/'
    const icons: Record<string, string> = {
      info: 'info.png',
      warning: 'warning.png',
      error: 'error.png',
      critical: 'critical.png'
    }
    return baseUrl + (icons[level] || 'default.png')
  }

  /**
   * Slackフィールドフォーマット
   */
  private formatSlackFields(message: NotificationMessage): any[] {
    const fields = []

    if (message.details) {
      Object.entries(message.details).forEach(([key, value]) => {
        fields.push({
          title: key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value),
          short: true
        })
      })
    }

    if (message.logEntry) {
      fields.push(
        {
          title: 'カテゴリ',
          value: message.logEntry.category,
          short: true
        },
        {
          title: 'ソース',
          value: message.logEntry.source,
          short: true
        }
      )
    }

    return fields
  }

  /**
   * Teamsファクトフォーマット
   */
  private formatTeamsFacts(message: NotificationMessage): any[] {
    const facts = []

    if (message.details) {
      Object.entries(message.details).forEach(([key, value]) => {
        facts.push({
          name: key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value)
        })
      })
    }

    if (message.logEntry) {
      facts.push(
        {
          name: 'カテゴリ',
          value: message.logEntry.category
        },
        {
          name: 'ソース',
          value: message.logEntry.source
        }
      )
    }

    return facts
  }

  /**
   * EmailHTMLフォーマット
   */
  private formatEmailHtml(message: NotificationMessage): string {
    const levelColors: Record<string, string> = {
      info: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      critical: '#d32f2f'
    }

    const color = levelColors[message.level] || '#333'

    let detailsHtml = ''
    if (message.details) {
      detailsHtml = '<h3>詳細情報</h3><ul>'
      Object.entries(message.details).forEach(([key, value]) => {
        detailsHtml += `<li><strong>${key}:</strong> ${
          typeof value === 'object' ? JSON.stringify(value) : value
        }</li>`
      })
      detailsHtml += '</ul>'
    }

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background-color: ${color};
            color: white;
            padding: 20px;
            border-radius: 5px 5px 0 0;
        }
        .content {
            background-color: #f9f9f9;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 0 0 5px 5px;
        }
        .level {
            display: inline-block;
            padding: 5px 10px;
            background-color: white;
            color: ${color};
            border-radius: 3px;
            font-weight: bold;
            text-transform: uppercase;
        }
        h2 {
            margin-top: 0;
        }
        ul {
            background-color: white;
            padding: 15px 30px;
            border-radius: 3px;
        }
        li {
            margin: 10px 0;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <span class="level">${message.level}</span>
        <h2>${message.title}</h2>
    </div>
    <div class="content">
        <p>${message.message}</p>
        ${detailsHtml}
        <div class="footer">
            <p>送信日時: ${new Date(message.timestamp || new Date()).toLocaleString('ja-JP')}</p>
            <p>Log Monitoring System</p>
        </div>
    </div>
</body>
</html>`
  }

  /**
   * 通知設定更新
   */
  async updateConfiguration(config: Partial<NotificationConfig>): Promise<void> {
    this.config = { ...this.config, ...config }

    // Emailトランスポーター再設定
    if (config.email?.smtp) {
      this.emailTransporter = nodemailer.createTransporter(config.email.smtp)
    }

    console.log('通知設定を更新しました')
  }

  /**
   * 通知テスト送信
   */
  async testNotification(channel: 'slack' | 'email' | 'teams'): Promise<boolean> {
    try {
      const testMessage: NotificationMessage = {
        title: '通知テスト',
        message: 'これはログ監視システムからのテスト通知です。',
        level: 'info',
        timestamp: new Date().toISOString(),
        details: {
          テスト項目: 'テスト値',
          システム: 'Log Monitor'
        }
      }

      await this.send(testMessage, [channel])
      return true
    } catch (error) {
      console.error(`${channel}通知テストエラー:`, error)
      return false
    }
  }
}

// シングルトンインスタンス
let notificationService: NotificationService | null = null

export const getNotificationService = (): NotificationService => {
  if (!notificationService) {
    notificationService = new NotificationService()
  }
  return notificationService
}
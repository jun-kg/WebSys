/**
 * Email Utility
 * メール送信ユーティリティ
 *
 * 機能:
 * - パスワードリセットメール送信
 * - アカウント認証メール送信
 * - 通知メール送信
 */

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private config: EmailConfig;
  private fromAddress: string;

  constructor() {
    this.config = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      }
    };

    this.fromAddress = process.env.FROM_EMAIL || 'noreply@websys.local';
  }

  /**
   * パスワードリセットメール送信
   */
  async sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

    const template = this.getPasswordResetTemplate(userName, resetUrl);

    return await this.sendEmail(email, template);
  }

  /**
   * アカウント認証メール送信
   */
  async sendVerificationEmail(email: string, verificationToken: string, userName: string): Promise<boolean> {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/verify?token=${verificationToken}`;

    const template = this.getVerificationTemplate(userName, verificationUrl);

    return await this.sendEmail(email, template);
  }

  /**
   * 通知メール送信
   */
  async sendNotificationEmail(email: string, subject: string, message: string): Promise<boolean> {
    const template: EmailTemplate = {
      subject,
      html: this.getNotificationHtml(subject, message),
      text: message
    };

    return await this.sendEmail(email, template);
  }

  /**
   * メール送信実行
   */
  private async sendEmail(to: string, template: EmailTemplate): Promise<boolean> {
    try {
      // 開発環境ではコンソール出力のみ
      if (process.env.NODE_ENV === 'development') {
        console.log('\n=== EMAIL SIMULATION ===');
        console.log(`To: ${to}`);
        console.log(`From: ${this.fromAddress}`);
        console.log(`Subject: ${template.subject}`);
        console.log(`Text: ${template.text}`);
        console.log('========================\n');
        return true;
      }

      // 本番環境での実際のメール送信
      // nodemailer等のライブラリを使用する場合はここに実装
      /*
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransporter(this.config);

      const mailOptions = {
        from: this.fromAddress,
        to,
        subject: template.subject,
        text: template.text,
        html: template.html
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
      */

      console.log(`[EmailService] Would send email to ${to} in production environment`);
      return true;

    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  /**
   * パスワードリセットメールテンプレート
   */
  private getPasswordResetTemplate(userName: string, resetUrl: string): EmailTemplate {
    const subject = '【社内システム】パスワードリセット';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${subject}</title>
        <style>
          body { font-family: 'BIZ UDGothic', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #409EFF; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #409EFF; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>パスワードリセット</h1>
          </div>
          <div class="content">
            <p>${userName} 様</p>
            <p>パスワードリセットのリクエストを受け付けました。</p>
            <p>下記ボタンをクリックして、新しいパスワードを設定してください。</p>
            <p><a href="${resetUrl}" class="button">パスワードをリセット</a></p>
            <p>このリンクは24時間で有効期限が切れます。</p>
            <p>もしこのメールに心当たりがない場合は、このメールを無視してください。</p>
          </div>
          <div class="footer">
            <p>このメールは自動送信です。返信はできません。</p>
            <p>社内システム管理者</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
${userName} 様

パスワードリセットのリクエストを受け付けました。

下記URLにアクセスして、新しいパスワードを設定してください。
${resetUrl}

このリンクは24時間で有効期限が切れます。
もしこのメールに心当たりがない場合は、このメールを無視してください。

社内システム管理者
    `;

    return { subject, html, text };
  }

  /**
   * アカウント認証メールテンプレート
   */
  private getVerificationTemplate(userName: string, verificationUrl: string): EmailTemplate {
    const subject = '【社内システム】アカウント認証';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${subject}</title>
        <style>
          body { font-family: 'BIZ UDGothic', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #67C23A; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #67C23A; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>アカウント認証</h1>
          </div>
          <div class="content">
            <p>${userName} 様</p>
            <p>社内システムへのご登録ありがとうございます。</p>
            <p>下記ボタンをクリックして、アカウントの認証を完了してください。</p>
            <p><a href="${verificationUrl}" class="button">アカウントを認証</a></p>
            <p>認証が完了すると、システムをご利用いただけます。</p>
          </div>
          <div class="footer">
            <p>このメールは自動送信です。返信はできません。</p>
            <p>社内システム管理者</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
${userName} 様

社内システムへのご登録ありがとうございます。

下記URLにアクセスして、アカウントの認証を完了してください。
${verificationUrl}

認証が完了すると、システムをご利用いただけます。

社内システム管理者
    `;

    return { subject, html, text };
  }

  /**
   * 通知メールHTMLテンプレート
   */
  private getNotificationHtml(subject: string, message: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${subject}</title>
        <style>
          body { font-family: 'BIZ UDGothic', sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #E6A23C; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${subject}</h1>
          </div>
          <div class="content">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <div class="footer">
            <p>このメールは自動送信です。返信はできません。</p>
            <p>社内システム管理者</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// シングルトンインスタンス
export const emailService = new EmailService();
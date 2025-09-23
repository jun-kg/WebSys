/**
 * メッセージコード定義
 * ドキュメント: docs/01_機能設計書/11_メッセージ管理/メッセージコード定義書.md
 */

export type MessageType = 'error' | 'warning' | 'info' | 'success'

export interface MessageDefinition {
  code: string
  message: string
  detail?: string
  type: MessageType
}

// メッセージ定義マップ
export const messageDefinitions: Record<string, MessageDefinition> = {
  // ===== 認証関連 (AUTH) =====
  // エラー
  'E-AUTH-001': {
    code: 'E-AUTH-001',
    message: 'ログインに失敗しました',
    detail: 'ユーザー名またはパスワードが正しくありません',
    type: 'error'
  },
  'E-AUTH-002': {
    code: 'E-AUTH-002',
    message: 'セッションが無効です',
    detail: 'セッションの有効期限が切れています。再度ログインしてください',
    type: 'error'
  },
  'E-AUTH-003': {
    code: 'E-AUTH-003',
    message: '認証トークンが見つかりません',
    detail: '認証情報が確認できません。ログインしてください',
    type: 'error'
  },
  'E-AUTH-004': {
    code: 'E-AUTH-004',
    message: '認証トークンが無効です',
    detail: '不正な認証情報です。再度ログインしてください',
    type: 'error'
  },
  'E-AUTH-005': {
    code: 'E-AUTH-005',
    message: 'アカウントがロックされています',
    detail: '複数回のログイン失敗によりアカウントがロックされました',
    type: 'error'
  },
  'E-AUTH-006': {
    code: 'E-AUTH-006',
    message: 'パスワードの有効期限が切れています',
    detail: 'セキュリティのため、パスワードを更新してください',
    type: 'error'
  },

  // 警告
  'W-AUTH-001': {
    code: 'W-AUTH-001',
    message: 'セッションがまもなく期限切れです',
    detail: '5分後にセッションが切れます。作業を保存してください',
    type: 'warning'
  },
  'W-AUTH-002': {
    code: 'W-AUTH-002',
    message: 'パスワードの有効期限が近づいています',
    detail: 'パスワードの有効期限まであと7日です',
    type: 'warning'
  },
  'W-AUTH-003': {
    code: 'W-AUTH-003',
    message: '別の場所からログインされました',
    detail: '他の端末からログインが検出されました',
    type: 'warning'
  },

  // 成功
  'S-AUTH-001': {
    code: 'S-AUTH-001',
    message: 'ログインに成功しました',
    detail: 'ダッシュボードへ移動します',
    type: 'success'
  },
  'S-AUTH-002': {
    code: 'S-AUTH-002',
    message: 'ログアウトしました',
    detail: '正常にログアウトしました',
    type: 'success'
  },
  'S-AUTH-003': {
    code: 'S-AUTH-003',
    message: 'パスワードを更新しました',
    detail: 'パスワードの変更が完了しました',
    type: 'success'
  },

  // ===== ユーザー管理 (USER) =====
  // エラー
  'E-USER-001': {
    code: 'E-USER-001',
    message: 'ユーザーの作成に失敗しました',
    detail: 'ユーザー情報の登録中にエラーが発生しました',
    type: 'error'
  },
  'E-USER-002': {
    code: 'E-USER-002',
    message: 'ユーザーが見つかりません',
    detail: '指定されたユーザーは存在しません',
    type: 'error'
  },
  'E-USER-003': {
    code: 'E-USER-003',
    message: 'ユーザー名が既に使用されています',
    detail: '別のユーザー名を指定してください',
    type: 'error'
  },
  'E-USER-004': {
    code: 'E-USER-004',
    message: 'メールアドレスが既に登録されています',
    detail: 'このメールアドレスは既に使用されています',
    type: 'error'
  },
  'E-USER-005': {
    code: 'E-USER-005',
    message: 'ユーザーの更新に失敗しました',
    detail: 'ユーザー情報の更新中にエラーが発生しました',
    type: 'error'
  },
  'E-USER-006': {
    code: 'E-USER-006',
    message: 'ユーザーの削除に失敗しました',
    detail: 'ユーザーの削除中にエラーが発生しました',
    type: 'error'
  },

  // 警告
  'W-USER-001': {
    code: 'W-USER-001',
    message: '弱いパスワードです',
    detail: 'より強力なパスワードの使用を推奨します',
    type: 'warning'
  },
  'W-USER-002': {
    code: 'W-USER-002',
    message: 'プロフィールが未完成です',
    detail: 'プロフィール情報を完成させてください',
    type: 'warning'
  },

  // 成功
  'S-USER-001': {
    code: 'S-USER-001',
    message: 'ユーザーを作成しました',
    detail: '新規ユーザーの登録が完了しました',
    type: 'success'
  },
  'S-USER-002': {
    code: 'S-USER-002',
    message: 'ユーザー情報を更新しました',
    detail: 'ユーザー情報の変更を保存しました',
    type: 'success'
  },
  'S-USER-003': {
    code: 'S-USER-003',
    message: 'ユーザーを削除しました',
    detail: 'ユーザーの削除が完了しました',
    type: 'success'
  },
  'S-USER-004': {
    code: 'S-USER-004',
    message: 'ユーザー一覧を取得しました',
    detail: 'ユーザー情報の読み込みが完了しました',
    type: 'success'
  },

  // ===== データ操作 (DATA) =====
  // エラー
  'E-DATA-001': {
    code: 'E-DATA-001',
    message: 'データの保存に失敗しました',
    detail: 'データベースへの保存中にエラーが発生しました',
    type: 'error'
  },
  'E-DATA-002': {
    code: 'E-DATA-002',
    message: 'データの取得に失敗しました',
    detail: 'データの読み込み中にエラーが発生しました',
    type: 'error'
  },
  'E-DATA-003': {
    code: 'E-DATA-003',
    message: 'データの更新に失敗しました',
    detail: 'データの更新中にエラーが発生しました',
    type: 'error'
  },
  'E-DATA-004': {
    code: 'E-DATA-004',
    message: 'データの削除に失敗しました',
    detail: 'データの削除中にエラーが発生しました',
    type: 'error'
  },
  'E-DATA-005': {
    code: 'E-DATA-005',
    message: 'データが見つかりません',
    detail: '指定されたデータは存在しません',
    type: 'error'
  },
  'E-DATA-006': {
    code: 'E-DATA-006',
    message: 'データが重複しています',
    detail: '同じデータが既に存在します',
    type: 'error'
  },

  // 情報
  'I-DATA-001': {
    code: 'I-DATA-001',
    message: 'データを読み込んでいます',
    detail: 'しばらくお待ちください',
    type: 'info'
  },
  'I-DATA-002': {
    code: 'I-DATA-002',
    message: 'データを処理しています',
    detail: '処理が完了するまでお待ちください',
    type: 'info'
  },

  // 成功
  'S-DATA-001': {
    code: 'S-DATA-001',
    message: 'データを保存しました',
    detail: 'データの保存が完了しました',
    type: 'success'
  },
  'S-DATA-002': {
    code: 'S-DATA-002',
    message: 'データを更新しました',
    detail: 'データの更新が完了しました',
    type: 'success'
  },
  'S-DATA-003': {
    code: 'S-DATA-003',
    message: 'データを削除しました',
    detail: 'データの削除が完了しました',
    type: 'success'
  },

  // ===== ネットワーク (NET) =====
  // エラー
  'E-NET-001': {
    code: 'E-NET-001',
    message: 'ネットワークエラーが発生しました',
    detail: 'インターネット接続を確認してください',
    type: 'error'
  },
  'E-NET-002': {
    code: 'E-NET-002',
    message: 'サーバーに接続できません',
    detail: 'サーバーが応答していません',
    type: 'error'
  },
  'E-NET-003': {
    code: 'E-NET-003',
    message: 'リクエストがタイムアウトしました',
    detail: '通信がタイムアウトしました。再試行してください',
    type: 'error'
  },
  'E-NET-004': {
    code: 'E-NET-004',
    message: 'APIエラーが発生しました',
    detail: 'APIの呼び出し中にエラーが発生しました',
    type: 'error'
  },
  'E-NET-005': {
    code: 'E-NET-005',
    message: 'レスポンスの形式が不正です',
    detail: 'サーバーからの応答が正しくありません',
    type: 'error'
  },

  // 警告
  'W-NET-001': {
    code: 'W-NET-001',
    message: '接続が不安定です',
    detail: 'ネットワークの状態が不安定です',
    type: 'warning'
  },
  'W-NET-002': {
    code: 'W-NET-002',
    message: '応答が遅延しています',
    detail: 'サーバーの応答に時間がかかっています',
    type: 'warning'
  },

  // ===== 入力検証 (VALID) =====
  // エラー
  'E-VALID-001': {
    code: 'E-VALID-001',
    message: '必須項目が入力されていません',
    detail: '必須フィールドをすべて入力してください',
    type: 'error'
  },
  'E-VALID-002': {
    code: 'E-VALID-002',
    message: '入力形式が正しくありません',
    detail: '指定された形式で入力してください',
    type: 'error'
  },
  'E-VALID-003': {
    code: 'E-VALID-003',
    message: '文字数制限を超えています',
    detail: '文字数を制限内に収めてください',
    type: 'error'
  },
  'E-VALID-004': {
    code: 'E-VALID-004',
    message: '無効な値が入力されました',
    detail: '有効な値を入力してください',
    type: 'error'
  },
  'E-VALID-005': {
    code: 'E-VALID-005',
    message: 'メールアドレスの形式が正しくありません',
    detail: '正しいメールアドレスを入力してください',
    type: 'error'
  },
  'E-VALID-006': {
    code: 'E-VALID-006',
    message: '日付の形式が正しくありません',
    detail: 'YYYY-MM-DD形式で入力してください',
    type: 'error'
  },
  'E-VALID-007': {
    code: 'E-VALID-007',
    message: '数値以外が入力されています',
    detail: '数値のみ入力してください',
    type: 'error'
  },

  // 警告
  'W-VALID-001': {
    code: 'W-VALID-001',
    message: '推奨される形式と異なります',
    detail: '推奨形式での入力をお勧めします',
    type: 'warning'
  },
  'W-VALID-002': {
    code: 'W-VALID-002',
    message: '文字数が少なすぎます',
    detail: 'より詳細な情報の入力を推奨します',
    type: 'warning'
  },

  // ===== システム (SYS) =====
  // エラー
  'E-SYS-001': {
    code: 'E-SYS-001',
    message: 'システムエラーが発生しました',
    detail: '予期しないエラーが発生しました。管理者に連絡してください',
    type: 'error'
  },
  'E-SYS-002': {
    code: 'E-SYS-002',
    message: 'メンテナンス中です',
    detail: 'システムメンテナンス中です。しばらくお待ちください',
    type: 'error'
  },
  'E-SYS-003': {
    code: 'E-SYS-003',
    message: 'サービスが利用できません',
    detail: 'サービスが一時的に利用できません',
    type: 'error'
  },
  'E-SYS-004': {
    code: 'E-SYS-004',
    message: '設定の読み込みに失敗しました',
    detail: 'システム設定の読み込みエラーです',
    type: 'error'
  },

  // 情報
  'I-SYS-001': {
    code: 'I-SYS-001',
    message: 'システムを初期化しています',
    detail: 'システムの起動処理中です',
    type: 'info'
  },
  'I-SYS-002': {
    code: 'I-SYS-002',
    message: 'メンテナンスを予定しています',
    detail: '定期メンテナンスの予定があります',
    type: 'info'
  },

  // 成功
  'S-SYS-001': {
    code: 'S-SYS-001',
    message: 'システムが正常に起動しました',
    detail: 'すべてのサービスが利用可能です',
    type: 'success'
  },
  'S-SYS-002': {
    code: 'S-SYS-002',
    message: '設定を更新しました',
    detail: 'システム設定の変更が完了しました',
    type: 'success'
  },

  // ===== ファイル操作 (FILE) =====
  // エラー
  'E-FILE-001': {
    code: 'E-FILE-001',
    message: 'ファイルのアップロードに失敗しました',
    detail: 'ファイルの送信中にエラーが発生しました',
    type: 'error'
  },
  'E-FILE-002': {
    code: 'E-FILE-002',
    message: 'ファイルサイズが制限を超えています',
    detail: '10MB以下のファイルを選択してください',
    type: 'error'
  },
  'E-FILE-003': {
    code: 'E-FILE-003',
    message: '非対応のファイル形式です',
    detail: '対応形式: JPG, PNG, PDF, DOCX',
    type: 'error'
  },
  'E-FILE-004': {
    code: 'E-FILE-004',
    message: 'ファイルが見つかりません',
    detail: '指定されたファイルは存在しません',
    type: 'error'
  },
  'E-FILE-005': {
    code: 'E-FILE-005',
    message: 'ファイルの削除に失敗しました',
    detail: 'ファイルの削除中にエラーが発生しました',
    type: 'error'
  },

  // 成功
  'S-FILE-001': {
    code: 'S-FILE-001',
    message: 'ファイルをアップロードしました',
    detail: 'ファイルのアップロードが完了しました',
    type: 'success'
  },
  'S-FILE-002': {
    code: 'S-FILE-002',
    message: 'ファイルを削除しました',
    detail: 'ファイルの削除が完了しました',
    type: 'success'
  },

  // ===== 権限 (PERM) =====
  // エラー
  'E-PERM-001': {
    code: 'E-PERM-001',
    message: 'アクセス権限がありません',
    detail: 'この操作を実行する権限がありません',
    type: 'error'
  },
  'E-PERM-002': {
    code: 'E-PERM-002',
    message: '管理者権限が必要です',
    detail: 'この機能は管理者のみ利用可能です',
    type: 'error'
  },
  'E-PERM-003': {
    code: 'E-PERM-003',
    message: '閲覧権限がありません',
    detail: 'このコンテンツを表示する権限がありません',
    type: 'error'
  },

  // 警告
  'W-PERM-001': {
    code: 'W-PERM-001',
    message: '権限が不足しています',
    detail: '一部の機能が制限されます',
    type: 'warning'
  }
}

// カテゴリ定義
export const MessageCategories = {
  AUTH: '認証',
  USER: 'ユーザー',
  DATA: 'データ',
  NET: 'ネットワーク',
  VALID: '検証',
  SYS: 'システム',
  FILE: 'ファイル',
  PERM: '権限'
} as const

// コード体系の解析
export function parseMessageCode(code: string): {
  type: MessageType
  category: keyof typeof MessageCategories
  number: string
} | null {
  const pattern = /^([EWIS])-([A-Z]+)-(\d{3})$/
  const match = code.match(pattern)

  if (!match) return null

  const typeMap: Record<string, MessageType> = {
    'E': 'error',
    'W': 'warning',
    'I': 'info',
    'S': 'success'
  }

  return {
    type: typeMap[match[1]],
    category: match[2] as keyof typeof MessageCategories,
    number: match[3]
  }
}
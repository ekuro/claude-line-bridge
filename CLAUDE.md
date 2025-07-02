# CLAUDE.md

## プロジェクト概要

Mac上のClaude Codeとの双方向通信を実現するLINE Bridge Server。Claude Codeから直接LINEを通じてユーザーとインタラクションできるシンプルなHTTP APIサーバーです。

## アーキテクチャ設計

```
┌─────────────────┐    HTTP API    ┌─────────────────┐    LINE API    ┌──────────┐
│   Claude Code   │◄──────────────►│  Bridge Server  │◄──────────────►│   LINE   │
│   (Mac Local)   │                │  (Bun + Hono)   │                │  (User)  │
└─────────────────┘                └─────────────────┘                └──────────┘
```

**責任分離:**
- **Claude Code**: タスク実行、意思決定ロジック、データ管理
- **Bridge Server**: 入出力インターフェース、メッセージルーティングのみ
- **LINE**: ユーザーインターフェース

## 技術スタック

- **Runtime**: Bun
- **Framework**: Hono
- **External API**: LINE Messaging API
- **State**: In-Memory (永続化なし)
- **Deployment**: Local Development

## コア機能仕様

### Webhook (`/webhook`)
LINEからのメッセージ受信とClaude Code実行

```typescript
interface WebhookAPI {
  endpoint: 'POST /webhook'
  request: LineWebhookEvent
  response: { status: 'ok' | 'error' }
}
```

## ファイル構成

```
claude-line-bridge/
├── CLAUDE.md           # このファイル
├── README.md           # ユーザー向けドキュメント
├── .env                # 環境変数（Git管理外）
├── package.json        # 依存関係とスクリプト
├── bunfig.toml         # Bun設定
└── src/
    ├── index.ts        # メインサーバー・ルーティング
    ├── line.ts         # LINE API通信レイヤー
    └── types.ts        # TypeScript型定義
```

## 実装詳細

### 状態管理戦略
```typescript
// インメモリ管理：シンプルかつ軽量
const pendingActions = new Map<string, {
  resolve: (value: string | null) => void,
  timeout?: NodeJS.Timeout
}>()

// 特徴:
// - サーバー再起動時にリセット（意図的）
// - 同時選択は1つのみサポート（FIFO処理）
// - タイムアウト自動クリーンアップ
```

### エラーハンドリング方針
```typescript
// 1. LINE API エラー: ログ出力 + HTTP 500
// 2. タイムアウト: null レスポンス
// 3. 不正リクエスト: HTTP 400
// 4. システムエラー: ログ出力 + graceful degradation
```

### セキュリティ考慮事項
- **認証**: LINE Channel Tokenによる認証
- **認可**: 単一ユーザー（LINE_USER_ID）に制限
- **入力検証**: 基本的なペイロード検証
- **レート制限**: LINE API制限に依存

## 開発ワークフロー

### セットアップ
```bash
# 1. 依存関係インストール
bun install

# 2. 環境変数設定
cp .env.example .env
# LINE_CHANNEL_TOKEN, LINE_USER_ID を設定

# 3. 開発サーバー起動
bun run dev

# 4. トンネル設定（別ターミナル）
npx ngrok http 3000
```

### LINE開発者設定
1. [LINE Developers](https://developers.line.biz/) でBot作成
2. Channel Token取得
3. Webhook URL設定: `https://xxx.ngrok.io/webhook`
4. User IDは初回メッセージから取得

### デバッグツール
```bash
# ヘルスチェック
curl http://localhost:3000/health
```

## Claude Code統合パターン

### 権限管理
```bash
# 環境変数で許可するツールを指定
CLAUDE_ALLOWED_TOOLS=Read,Edit,Write,Grep,Glob,LS,Bash

# すべての権限確認をスキップ（注意して使用）
CLAUDE_SKIP_PERMISSIONS=true
```

### 使用例
```bash
# LINEでメッセージを送信
"コードをレビューして"

# Claude Codeが自動的に実行され、結果がLINEに返される
```

## 運用・監視

### ログ戦略
```typescript
// 構造化ログ（JSON）
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'INFO',
  event: 'choice_request',
  message: 'User choice requested',
  metadata: { choices: options.length, timeout }
}))
```

### メトリクス収集
- 選択リクエスト数/時間
- 平均応答時間
- タイムアウト率
- エラー率

### 障害対応
```bash
# サーバー状態確認
curl http://localhost:3000/health

# プロセス確認
ps aux | grep bun

# ログ確認
tail -f logs/server.log  # 本番時
```

## 制限事項・前提条件

### 技術制限
- **セッション**: 30分間のタイムアウト
- **永続化**: なし（再起動時リセット）
- **マルチユーザー**: 非対応（単一ユーザーのみ）
- **認証**: LINE Token認証のみ

### 運用制限  
- **可用性**: 開発環境前提（24/7運用不要）
- **スケーラビリティ**: 単一ユーザー想定
- **バックアップ**: 状態なしのため不要

### LINE API制限
- **レート制限**: 1000req/min
- **メッセージ長**: 2000文字
- **Quick Reply**: 最大13個

## 今後の拡張可能性

### Phase 2: 機能拡張
- [ ] 複数ユーザー対応
- [ ] Rich Message対応（画像、カルーセル）
- [ ] 音声メッセージ処理
- [ ] 選択履歴の永続化

### Phase 3: 運用改善
- [ ] Docker化
- [ ] 本番デプロイ自動化
- [ ] 監視・アラート
- [ ] 負荷分散

### Phase 4: 統合拡張
- [ ] Slack Bot対応
- [ ] Discord Bot対応
- [ ] Web UI提供
- [ ] API Gateway統合

## 関連リソース

- [LINE Messaging API Reference](https://developers.line.biz/en/reference/messaging-api/)
- [Hono Documentation](https://hono.dev/)
- [Bun Documentation](https://bun.sh/docs)
- [ngrok Documentation](https://ngrok.com/docs)
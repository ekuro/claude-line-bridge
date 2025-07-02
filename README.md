# Claude Line Bridge

Claude Code の完全なLINE連携を実現する、超軽量なインタラクティブサーバーです。

## 🌟 主要機能

- 🚀 **タスク実行**: LINEから直接Claude Codeを実行（CLIモード）
- 🤝 **双方向通信**: 選択肢選択 + 自由テキスト指示の両方に対応
- 📊 **ステータス確認**: `/status` コマンドでセッション状態を確認
- ⚡ **シンプル**: 各メッセージが独立したClaude Code実行として処理

## 💡 使用例

```
📱 LINE → 「現在のディレクトリはどこ？」
🤔 Claude → 考えています...
📄 Claude → 現在の作業ディレクトリは /Users/ekuro/git です。

📱 LINE → 「package.jsonの内容を見せて」
🤔 Claude → 考えています...
📄 Claude → package.jsonの内容：[ファイル内容を表示]

📱 LINE → /status
📊 Claude → セッション状態:
- 最終活動: 2025/07/01 13:30:45
- 作業ディレクトリ: /Users/ekuro/git
```

## 🔧 技術スタック

- 🧠 Claude Code (Mac/iTerm上で実行)
- 📱 LINE Messaging API
- 🚀 Bun + Hono (最小構成＆超高速)

## ⚠️ Claude Code 権限設定について

Claude Codeはツール使用時に権限を要求しますが、Bunの制限により対話的な権限付与ができません。以下の設定方法から選択してください：

### 方法1: 基本的なツールのみ許可（推奨）
`.env`ファイルに以下を設定：
```env
CLAUDE_ALLOWED_TOOLS=Read,Edit,Write,Grep,Glob,LS
CLAUDE_SKIP_PERMISSIONS=false
```
- ✅ ファイル読み書きなど基本操作が可能
- ✅ BashやWebSearchは使用時に確認メッセージ
- ✅ セキュリティを保ちつつ実用的

### 方法2: すべてのツールを自動許可
`.env`ファイルに以下を設定：
```env
CLAUDE_SKIP_PERMISSIONS=true
```
- ✅ すべての操作がスムーズに実行
- ⚠️ セキュリティリスクあり（信頼できる環境でのみ使用）

### 方法3: 最小限のツールのみ（デフォルト）
何も設定しない場合：
- Read, Grep, Glob, LS のみ使用可能
- その他のツールは使用不可

---

## 🔧 セットアップ手順

### 前提条件

- Bun がインストールされていること（[インストール方法](https://bun.sh/docs/installation)）
- LINE Developers アカウントを持っていること
- ngrok アカウント（無料）を持っていること（下記参照）

### 1. ngrok アカウントの作成（初回のみ）

1. **[ngrok.com](https://ngrok.com/) にアクセス**
2. **「Sign up」をクリックして無料アカウントを作成**
   - Google/GitHub アカウントでも登録可能
3. **ダッシュボードにログイン後、認証トークンを取得**
   - [Your Authtoken](https://dashboard.ngrok.com/get-started/your-authtoken) ページにアクセス
   - 表示されているトークンをコピー（後で使用）

### 2. LINE Bot の詳細設定

1. **LINE Developers Console にログイン**
   - [LINE Developers](https://developers.line.biz/) にアクセス
   - LINEアカウントでログイン

2. **プロバイダーを作成**
   - 「新規プロバイダー作成」をクリック
   - プロバイダー名を入力（例：`Claude Bridge`）

3. **Messaging API チャネルを作成**
   - 作成したプロバイダー内で「新規チャネル作成」
   - チャネルの種類：「Messaging API」を選択
   - 必要事項を入力：
     - チャネル名：`Claude Line Bridge`（任意）
     - チャネル説明：任意
     - 大業種・小業種：適当に選択
     - メールアドレス：あなたのメールアドレス

4. **チャネルアクセストークンを発行**
   - チャネル基本設定 > Messaging API設定 タブを開く
   - 「チャネルアクセストークン（長期）」の「発行」をクリック
   - 発行されたトークンをコピー（後で使用）

5. **自分のユーザーIDを取得**
   - チャネル基本設定 > チャネル基本情報 タブ
   - 「あなたのユーザーID」をコピー
   - または、Botに初めてメッセージを送った後、サーバーログから取得可能

6. **応答設定を変更（重要！）**
   - Messaging API設定 > 応答メッセージ：**必ず無効にする**
     - ⚠️ これが有効だと「メッセージありがとうございます！」という自動応答が返ってしまいます
   - Messaging API設定 > あいさつメッセージ：**無効**
   - Messaging API設定 > Webhook：**有効**（後で設定）

---

### 3. このリポジトリをクローン＆環境構築

```bash
# リポジトリをクローン
git clone https://github.com/ekuro/claude-line-bridge.git
cd claude-line-bridge

# 依存関係をインストール
bun install

# 環境変数ファイルを作成
cp .env.example .env
```

**`.env` ファイルを編集：**
```env
# LINE Messaging API設定
LINE_CHANNEL_TOKEN=ここに先ほどコピーしたチャネルアクセストークンを貼り付け
LINE_USER_ID=ここにあなたのユーザーIDを貼り付け

# Claude Code許可ツール設定（オプション）
# デフォルト: Read（環境変数未設定時）
# 空文字列を設定するとすべてのツールで許可が必要
# カンマ区切りで指定（例: Read,Edit,Write,Grep,Glob,LS,Bash,Task,WebSearch）
CLAUDE_ALLOWED_TOOLS=

# パーミッションスキップ設定（オプション）
# true: すべてのツール使用を自動許可
# false: 対話的にツール使用を許可（デフォルト）
CLAUDE_SKIP_PERMISSIONS=false

# サーバー設定（デフォルトのままでOK）
PORT=3000
```

---

### 4. サーバーを起動

**ターミナル1で開発サーバーを起動：**
```bash
# 開発モード（ホットリロード対応）
bun run dev

# または本番モード
bun run start
```

正常に起動すると以下のようなログが表示されます：
```
{"timestamp":"2025-07-01T...","level":"INFO","event":"server_start","message":"Claude LINE Bridge Server starting","metadata":{"port":3000}}
🚀 Server running at http://localhost:3000
```

**動作確認：**
```bash
# 別のターミナルでヘルスチェック
curl http://localhost:3000/health
# → {"status":"ok","timestamp":"2025-07-01T..."}
```

---

### 5. ngrok でトンネリング設定

**ターミナル2で ngrok を起動：**

```bash
# ngrok をインストール（初回のみ）
# macOS (Homebrew)
brew install ngrok

# または直接ダウンロード
# https://ngrok.com/download

# ngrok 認証トークンを設定（初回のみ）
# 手順1でコピーした認証トークンを使用
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE

# トンネルを開始
ngrok http http://localhost:3000
```

**ngrok 起動後の画面例：**
```
Session Status                online
Account                       your-email@example.com (Plan: Free)
Version                       3.5.0
Region                        Japan (jp)
Latency                       32ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

重要：`Forwarding` に表示される **HTTPS URL**（例：`https://abc123.ngrok-free.app`）をコピー

---

### 6. LINE Webhook URL を設定

1. **LINE Developers Console に戻る**
2. **Messaging API設定タブ**を開く
3. **Webhook URL** に ngrok の URL + `/webhook` を設定
   - 例：`https://abc123.ngrok-free.app/webhook`
4. **「検証」ボタン**をクリックして接続確認
   - 「成功」と表示されればOK
5. **Webhook の利用：有効** になっていることを確認

---

### 7. LINE Bot を友だち追加

1. **チャネル基本設定 > Messaging API設定**
2. **QRコード**を表示
3. LINEアプリでQRコードを読み取って友だち追加
4. または **Bot basic ID** で検索して追加

---

## 📝 CLAUDE.md による Claude Code の動作最適化

Claude Code は作業ディレクトリ（`CLAUDE_WORKING_DIR`）に `CLAUDE.md` ファイルがあると、それを読み込んでプロジェクトのコンテキストを理解します。

### CLAUDE.md の効果

1. **プロジェクト固有の知識を提供**
   - プロジェクトの構造、アーキテクチャ、技術スタックなどを記載
   - Claude Code がより適切な応答やコードを生成できるようになる

2. **作業効率の向上**
   - よく使うコマンドやワークフローを記載しておくと、Claude Code が自動的に実行
   - プロジェクト固有のルールや規約を理解して作業

3. **複数プロジェクトでの使い分け**
   - 各プロジェクトのルートに `CLAUDE.md` を配置
   - プロジェクトごとに異なるコンテキストを提供可能

### CLAUDE.md の配置例

```bash
# CLAUDE_WORKING_DIR=/Users/username/projects の場合

/Users/username/projects/
├── CLAUDE.md          # 全プロジェクト共通の設定
├── project-a/
│   └── CLAUDE.md      # project-a 専用の設定
├── project-b/
│   └── CLAUDE.md      # project-b 専用の設定
└── claude-line-bridge/
    └── CLAUDE.md      # このプロジェクト専用の設定
```

### CLAUDE.md の記載例

```markdown
# プロジェクト概要
このプロジェクトは Next.js を使用したWebアプリケーションです。

## 技術スタック
- Frontend: Next.js 14, TypeScript, Tailwind CSS
- Backend: Node.js, Express
- Database: PostgreSQL

## 開発コマンド
- `npm run dev` - 開発サーバー起動
- `npm test` - テスト実行
- `npm run build` - 本番ビルド

## プロジェクト構造
\`\`\`
src/
├── app/          # Next.js App Router
├── components/   # 共通コンポーネント
└── lib/          # ユーティリティ関数
\`\`\`

## 開発ルール
- コミットメッセージは日本語で記載
- コンポーネントは関数型で実装
- 状態管理には Zustand を使用
```

---

## 🎮 使い方

### 基本的な動作確認

1. **LINE でボットにメッセージを送信**
   ```
   こんにちは
   ```

2. **サーバーログを確認**
   - ユーザーIDが表示される（初回のみ必要な場合）
   - `.env` の `LINE_USER_ID` が正しいか確認

### LINE からClaude Codeを使用

**通常の質問やタスク：**
```
現在のディレクトリを教えて
→ Claude Codeが実行されて結果が返される

README.mdファイルの内容を要約して
→ ファイルを読み取って要約を返す

このプロジェクトの構造を説明して
→ プロジェクト構造を分析して説明
```

**特殊コマンド：**
```
/status または ステータス
→ 現在のセッション情報を表示

/new または 新規
→ 新しいセッションを開始（会話履歴をリセット）

/stop または 終了
→ セッションを明示的に終了
```

---

## 🐛 トラブルシューティング

### サーバーが起動しない
- `.env` ファイルが正しく設定されているか確認
- 必要な環境変数（`LINE_CHANNEL_TOKEN`、`LINE_USER_ID`）が設定されているか確認
- ポート3000が他のプロセスで使用されていないか確認

### LINEからメッセージが届かない
- Webhook URL が正しく設定されているか確認（末尾に `/webhook` が必要）
- ngrok が起動しているか確認
- LINE Developers Console で Webhook が「有効」になっているか確認
- 応答メッセージが「無効」になっているか確認

### ユーザーIDがわからない
1. `.env` の `LINE_USER_ID` を一時的に空欄にする
2. サーバーを再起動
3. LINEでボットにメッセージを送信
4. サーバーログに表示される `Message from unauthorized user: U1234567890abcdef...` の ID をコピー
5. `.env` に設定して再起動

### ngrok の URL が変わってしまう
- 無料プランでは再起動のたびに URL が変わります
- 固定URLが必要な場合は ngrok の有料プランを検討
- または [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/) などの代替手段を検討

---

## 📝 環境変数一覧

| 変数名 | 必須 | 説明 | デフォルト値 |
|--------|------|------|------------|
| `LINE_CHANNEL_TOKEN` | ✅ | LINE Messaging API のチャネルアクセストークン | - |
| `LINE_USER_ID` | ✅ | 通信を許可するLINEユーザーID | - |
| `CLAUDE_WORKING_DIR` | - | Claude Code を実行するディレクトリ | カレントディレクトリ |
| `CLAUDE_ALLOWED_TOOLS` | - | 許可するツールのカンマ区切りリスト | `Read`（未設定時） |
| `CLAUDE_SKIP_PERMISSIONS` | - | ツール使用を自動許可するかどうか | `false` |
| `PORT` | - | サーバーのポート番号 | 3000 |

---

## 🔒 セキュリティ考慮事項

- 単一ユーザー（`LINE_USER_ID`）のみからの通信を許可
- 他のユーザーからのメッセージは無視される
- `.env` ファイルは Git にコミットしない（`.gitignore` に含まれています）
- 本番環境では HTTPS 通信必須（ngrok が自動的に処理）

---

## 🔄 アーキテクチャ

**動作フロー：**
1. LINEメッセージ受信
2. 最初のメッセージ: `claude -p "メッセージ"` を実行
3. 2回目以降: `claude -c -p "メッセージ"` を実行（会話継続）
4. 結果をLINEに返信
5. プロセス終了

**セッション管理：**
- 30分のタイムアウト設定
- 処理中の重複実行を防止
- `/new` コマンドで新規セッション開始
- `/status` コマンドでステータス確認
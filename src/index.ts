import { Hono } from 'hono'
import { serve } from 'bun'
import 'dotenv/config'
import { LineClient } from './line'
import { Claude } from './claude'
import type {
  LineWebhookEvent
} from './types'

const app = new Hono()

const LINE_CHANNEL_TOKEN = process.env.LINE_CHANNEL_TOKEN!
const LINE_USER_ID = process.env.LINE_USER_ID!
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000

if (!LINE_CHANNEL_TOKEN || !LINE_USER_ID) {
  console.error('Missing required environment variables: LINE_CHANNEL_TOKEN, LINE_USER_ID')
  process.exit(1)
}

const lineClient = new LineClient(LINE_CHANNEL_TOKEN, LINE_USER_ID)

const CLAUDE_WORKING_DIR = process.env.CLAUDE_WORKING_DIR || process.cwd()

// セッション管理
interface Session {
  claude: Claude
  lastActivity: Date
}

const sessions = new Map<string, Session>()
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30分

// セッションクリーンアップ
setInterval(() => {
  const now = Date.now()
  for (const [userId, session] of sessions) {
    if (now - session.lastActivity.getTime() > SESSION_TIMEOUT) {
      sessions.delete(userId)
    }
  }
}, 60 * 1000) // 1分ごとにチェック

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})


app.post('/webhook', async (c) => {
  console.log('Webhook received')
  try {
    const body = await c.req.json<LineWebhookEvent>()
    
    for (const event of body.events) {
      if (event.type !== 'message' || event.message?.type !== 'text') {
        continue
      }

      if (!lineClient.isValidUser(event)) {
        continue
      }

      const userMessage = event.message.text
      if (!userMessage) {
        continue
      }
      console.log('Valid user message received:', userMessage)
      

      // Claude実行
      await executeClaude(userMessage, event.replyToken)
    }

    return c.json({ status: 'ok' })
  } catch (error) {
    console.error('Error in /webhook:', error)
    return c.json({ status: 'error' }, 500)
  }
})

// Claude実行関数
async function executeClaude(message: string, replyToken?: string): Promise<void> {
  try {
    // 特殊コマンドの処理
    if (message === '/new' || message === '新規') {
      sessions.delete(LINE_USER_ID)
      await lineClient.pushMessage([{ type: 'text', text: '🔄 新しいセッションを開始しました' }])
      return
    }

    if (message === '/status' || message === 'ステータス') {
      const session = sessions.get(LINE_USER_ID)
      const status = session ? 
        `📊 セッション状態:\n- 最終活動: ${session.lastActivity.toLocaleString('ja-JP')}\n- 作業ディレクトリ: ${CLAUDE_WORKING_DIR}` :
        '❌ アクティブなセッションはありません'
      await lineClient.pushMessage([{ type: 'text', text: status }])
      return
    }

    // 即座に処理中メッセージを送信
    if (replyToken) {
      await lineClient.replyMessage(replyToken, [
        { type: 'text', text: '🤔 考えています...' }
      ])
    }

    // セッションを取得または作成
    let session = sessions.get(LINE_USER_ID)
    if (!session) {
      session = {
        claude: new Claude({
          workingDirectory: CLAUDE_WORKING_DIR,
          lineClient,
          allowedTools: undefined,
          skipPermissions: undefined
        }),
        lastActivity: new Date()
      }
      sessions.set(LINE_USER_ID, session)
    }

    try {
      const output = await session.claude.execute(message)
      session.lastActivity = new Date()
      
      // 出力を整形
      const cleanedOutput = cleanOutput(output)
      
      // 長いメッセージは分割して送信
      await sendLongMessage(cleanedOutput)
      
    } catch (error) {
      console.error('Claude execution error:', error)
      let errorMessage = '❌ エラーが発生しました:\n'
      
      if (error instanceof Error) {
        if (error.message.includes('timed out')) {
          errorMessage += '⏰ Claude Codeの実行がタイムアウトしました（10分）。\n処理に時間がかかる場合は、より具体的な指示をお試しください。'
        } else {
          errorMessage += error.message
        }
      } else {
        errorMessage += 'Unknown error'
      }
      
      await lineClient.pushMessage([{ 
        type: 'text', 
        text: errorMessage
      }])
    }
    
  } catch (error) {
    console.error('Failed to execute Claude command:', error)
    if (replyToken) {
      await lineClient.replyMessage(replyToken, [
        { type: 'text', text: '❌ コマンドの実行に失敗しました' }
      ])
    }
  }
}

// 出力をクリーニングする関数
function cleanOutput(output: string): string {
  return output
    .replace(/\x1b\[[0-9;]*m/g, '') // ANSIエスケープコードを除去
    .trim()
}

// 長いメッセージを分割して送信
async function sendLongMessage(message: string): Promise<void> {
  if (!message) return
  
  const maxLength = 2000
  const chunks = []
  
  for (let i = 0; i < message.length; i += maxLength) {
    chunks.push(message.substring(i, i + maxLength))
  }
  
  for (const chunk of chunks) {
    await lineClient.pushMessage([{ type: 'text', text: chunk }])
    // レート制限を考慮して少し待機
    if (chunks.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
}

console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'INFO',
  event: 'server_start',
  message: 'Claude LINE Bridge Server starting',
  metadata: { port: PORT, workingDir: CLAUDE_WORKING_DIR }
}))

serve({
  fetch: app.fetch,
  port: PORT
})

console.log(`🚀 Server running at http://localhost:${PORT}`)
console.log(`📁 Working directory: ${CLAUDE_WORKING_DIR}`)
console.log(`💬 Sessions are maintained for 30 minutes`)
console.log(`🔄 Use '/new' to start a new session`)
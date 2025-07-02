export interface LineWebhookEvent {
  destination: string
  events: LineEvent[]
}

export interface LineEvent {
  type: string
  message?: LineMessage
  replyToken?: string
  source?: LineSource
  timestamp: number
  mode: string
}

export interface LineMessage {
  type: string
  id: string
  text?: string
}

export interface LineSource {
  type: string
  userId: string
}

export interface LineReplyMessage {
  type: string
  text: string
}


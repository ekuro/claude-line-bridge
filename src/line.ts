import axios from 'axios'
import type { LineReplyMessage, LineEvent } from './types'

const LINE_API_BASE = 'https://api.line.me/v2/bot'

export class LineClient {
  private channelToken: string
  private userId: string

  constructor(channelToken: string, userId: string) {
    this.channelToken = channelToken
    this.userId = userId
  }

  async replyMessage(replyToken: string, messages: LineReplyMessage[]): Promise<void> {
    try {
      await axios.post(
        `${LINE_API_BASE}/message/reply`,
        {
          replyToken,
          messages
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.channelToken}`
          }
        }
      )
    } catch (error) {
      console.error('Failed to reply message:', error)
      throw error
    }
  }

  async pushMessage(messages: LineReplyMessage[]): Promise<void> {
    try {
      await axios.post(
        `${LINE_API_BASE}/message/push`,
        {
          to: this.userId,
          messages
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.channelToken}`
          }
        }
      )
    } catch (error) {
      console.error('Failed to push message:', error)
      throw error
    }
  }

  isValidUser(event: LineEvent): boolean {
    return event.source?.userId === this.userId
  }
}
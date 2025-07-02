import { describe, expect, test } from 'bun:test'
import { Claude } from '../src/claude'

describe('Claude', () => {
  test('should create Claude instance', () => {
    const claude = new Claude({
      workingDirectory: '/test/dir',
      lineClient: {
        sendMessage: async () => {}
      } as any
    })
    
    expect(claude).toBeDefined()
  })

  test('should maintain options', () => {
    const options = {
      workingDirectory: '/test/dir',
      lineClient: {
        sendMessage: async () => {}
      } as any
    }
    
    const claude = new Claude(options)
    expect(claude['options']).toEqual(options)
  })
})
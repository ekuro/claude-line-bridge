import { spawn, type Subprocess } from 'bun'
import { LineClient } from './line'

export interface ClaudeOptions {
  workingDirectory: string
  lineClient: LineClient
  allowedTools?: string[]
  skipPermissions?: boolean
}

export class Claude {
  private options: ClaudeOptions
  private isFirstMessage: boolean = true

  constructor(options: ClaudeOptions) {
    this.options = {
      ...options,
      allowedTools: options.allowedTools || this.getDefaultAllowedTools(),
      skipPermissions: options.skipPermissions ?? this.getSkipPermissions()
    }
  }

  private getDefaultAllowedTools(): string[] {
    const envTools = process.env.CLAUDE_ALLOWED_TOOLS
    if (envTools !== undefined) {
      if (envTools.trim() === '') {
        return []
      }
      return envTools.split(',').map(tool => tool.trim()).filter(tool => tool.length > 0)
    }
    return ['Read', 'Grep', 'Glob', 'LS']
  }

  private getSkipPermissions(): boolean {
    return process.env.CLAUDE_SKIP_PERMISSIONS === 'true'
  }

  async execute(message: string): Promise<string> {
    
    const args = this.isFirstMessage 
      ? ['claude', '-p', message, '--output-format', 'text']
      : ['claude', '--continue', '-p', message, '--output-format', 'text']
    
    if (this.options.allowedTools && this.options.allowedTools.length > 0) {
      args.push('--allowedTools', this.options.allowedTools.join(','))
    }
    
    if (this.options.skipPermissions) {
      args.push('--dangerously-skip-permissions')
    }
    
    if (process.env.CLAUDE_VERBOSE === 'true') {
      args.push('--verbose')
    }
    
    this.isFirstMessage = false

    const proc = spawn(args, {
      cwd: this.options.workingDirectory,
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: 'inherit'
    })

    if (!proc.pid) {
      throw new Error('Failed to spawn Claude process')
    }

    const timeout = setTimeout(() => {
      console.error('Claude process timeout after 600 seconds - killing process')
      proc.kill()
    }, 600000)

    const decoder = new TextDecoder()
    let output = ''
    let error = ''

    const readStdout = async () => {
      if (proc.stdout) {
        const reader = proc.stdout.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          output += chunk
        }
      }
    }

    const readStderr = async () => {
      if (proc.stderr) {
        const reader = proc.stderr.getReader()
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          error += chunk
        }
      }
    }

    await Promise.all([
      readStdout(),
      readStderr(),
      proc.exited
    ])

    const exitCode = proc.exitCode
    clearTimeout(timeout)
    
    if (exitCode !== 0) {
      if (exitCode === 143) {
        throw new Error(`Claude execution timed out after 10 minutes. The process was terminated.`)
      }
      throw new Error(`Claude exited with code ${exitCode}: ${error}`)
    }

    return output.trim()
  }
  
}
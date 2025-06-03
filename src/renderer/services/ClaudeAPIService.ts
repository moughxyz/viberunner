import { getNewRunnerPrompt } from '../prompts/newRunner'
import { Message } from '../components/AIAgentInterface'

const { ipcRenderer } = window.require('electron')

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeResponse {
  content: string
  usage?: {
    input_tokens: number
    output_tokens: number
  }
}

export class ClaudeAPIService {
  private apiKey: string
  private model = 'claude-3-5-sonnet-20241022'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async sendMessage(userPrompt: string, conversationHistory: Message[]): Promise<ClaudeResponse> {
    try {
      // Build conversation messages
      const messages: ClaudeMessage[] = []

      // If this is the first message, include the system prompt
      if (conversationHistory.length === 0) {
        const systemPrompt = getNewRunnerPrompt(userPrompt)
        messages.push({
          role: 'user',
          content: systemPrompt
        })
      } else {
        // Add conversation history
        conversationHistory.forEach(msg => {
          if (msg.role !== 'assistant' || msg.content) {
            messages.push({
              role: msg.role,
              content: msg.content
            })
          }
        })

        // Add the new user message
        messages.push({
          role: 'user',
          content: userPrompt
        })
      }

      console.log('Sending request to Claude API via IPC:', {
        model: this.model,
        messageCount: messages.length,
        userPrompt: userPrompt.substring(0, 100) + '...'
      })

      // Use IPC to call the main process to bypass CORS restrictions
      const result = await ipcRenderer.invoke('claude-api-call', {
        apiKey: this.apiKey,
        messages,
        model: this.model
      })

      if (!result.success) {
        // Handle specific error cases
        if (result.error.includes('401')) {
          throw new Error('Invalid API key. Please check your Claude API key.')
        } else if (result.error.includes('429')) {
          throw new Error('Rate limit exceeded. Please try again later.')
        } else if (result.error.includes('500')) {
          throw new Error('Claude API server error. Please try again later.')
        }
        throw new Error(result.error)
      }

      return {
        content: result.content,
        usage: result.usage
      }

    } catch (error) {
      console.error('Claude API service error:', error)

      if (error instanceof Error) {
        throw error
      }

      throw new Error('Unknown error occurred while calling Claude API')
    }
  }

  // Test the API key
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.sendMessage('Hello, can you respond with "Connection successful"?', [])
      return response.content.toLowerCase().includes('connection successful')
    } catch (error) {
      console.error('API key test failed:', error)
      return false
    }
  }
}
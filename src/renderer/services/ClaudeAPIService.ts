import { getNewRunnerPrompt } from '../prompts/newRunner'
import { Message } from '../components/AIAgentInterface'
import Anthropic from '@anthropic-ai/sdk'

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
  private anthropic: Anthropic
  private model = 'claude-3-5-sonnet-20241022'
  private originalSystemPrompt: string | null = null

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true
    })
  }

  async sendMessage(userPrompt: string, conversationHistory: Message[]): Promise<ClaudeResponse> {
    try {
      // Build conversation messages
      const messages: ClaudeMessage[] = []

      if (conversationHistory.length === 0) {
        // First message - create and store the system prompt
        this.originalSystemPrompt = getNewRunnerPrompt(userPrompt)
        messages.push({
          role: 'user',
          content: this.originalSystemPrompt
        })
      } else {
        // Follow-up message - include the original system prompt first
        if (this.originalSystemPrompt) {
          messages.push({
            role: 'user',
            content: this.originalSystemPrompt
          })
        }

        // Add ALL conversation history
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

      console.log('Sending request to Claude API directly from renderer:', {
        model: this.model,
        messageCount: messages.length,
        hasSystemPrompt: !!this.originalSystemPrompt,
        userPrompt: userPrompt.substring(0, 100) + '...'
      })

      // Use the Anthropic SDK directly in the renderer
      const response = await this.anthropic.messages.create({
        model: this.model,
        max_tokens: 8192,
        temperature: 0.7,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      })

      // Extract text content from the response
      let content = ''
      if (response.content && response.content.length > 0) {
        const textContent = response.content.find(block => block.type === 'text')
        if (textContent && 'text' in textContent) {
          content = textContent.text
        }
      }

      if (!content) {
        throw new Error('No text content found in Claude API response')
      }

      return {
        content,
        usage: response.usage
      }

    } catch (error) {
      console.error('Claude API service error:', error)

      if (error instanceof Error) {
        // Handle specific error cases
        if (error.message.includes('401')) {
          throw new Error('Invalid API key. Please check your Claude API key.')
        } else if (error.message.includes('429')) {
          throw new Error('Rate limit exceeded. Please try again later.')
        } else if (error.message.includes('500')) {
          throw new Error('Claude API server error. Please try again later.')
        }
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
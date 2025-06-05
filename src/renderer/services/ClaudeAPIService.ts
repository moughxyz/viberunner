import { getNewRunnerPrompt } from '../prompts/newRunner'
import { Message, FileChange } from '../components/AIAgentInterface'
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

// Available Claude models
export const CLAUDE_MODELS = {
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
  'claude-sonnet-4-20250514': 'Claude 4 Sonnet',
  'claude-opus-4-20250514': 'Claude 4 Opus'
} as const

export type ClaudeModelId = keyof typeof CLAUDE_MODELS

export class ClaudeAPIService {
  private anthropic: Anthropic
  private model: ClaudeModelId
  private originalSystemPrompt: string | null = null

  constructor(apiKey: string, model: ClaudeModelId = 'claude-3-5-sonnet-20241022') {
    this.anthropic = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true
    })
    this.model = model
  }

  // Get current model
  getCurrentModel(): ClaudeModelId {
    return this.model
  }

  // Set model
  setModel(model: ClaudeModelId): void {
    this.model = model
    // Reset system prompt when changing models to ensure consistency
    this.originalSystemPrompt = null
  }

  // Get available models
  static getAvailableModels(): typeof CLAUDE_MODELS {
    return CLAUDE_MODELS
  }

  async sendMessage(userPrompt: string, conversationHistory: Message[], currentFiles?: Record<string, FileChange>): Promise<ClaudeResponse> {
    try {
      // Build conversation messages
      const messages: ClaudeMessage[] = []

      if (conversationHistory.length === 0) {
        // First message - create and store the system prompt
        this.originalSystemPrompt = getNewRunnerPrompt(userPrompt, currentFiles)
        messages.push({
          role: 'user',
          content: this.originalSystemPrompt
        })
      } else {
        // Follow-up message - include the original system prompt first
        if (!this.originalSystemPrompt) {
          // If we don't have a system prompt yet (e.g., when editing existing runner), create one
          this.originalSystemPrompt = getNewRunnerPrompt(userPrompt, currentFiles)
        }

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
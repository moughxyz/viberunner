import React, { useState, useRef, useEffect } from 'react'
import { Message } from './AIAgentInterface'

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (content: string) => void
  isLoading: boolean
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading
}) => {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim())
      setInputValue('')
      // Reset textarea height
      if (textAreaRef.current) {
        textAreaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }

  const formatMessage = (content: string) => {
    // First handle code blocks (triple backticks) before inline code
    let formatted = content
      // Handle code blocks with language specification
      .replace(/```(\w+)?\n?([\s\S]*?)```/g, (_match, lang, code) => {
        const className = lang ? ` class="language-${lang}"` : ''
        return `<pre${className}><code>${code.trim()}</code></pre>`
      })
      // Handle inline code (single backticks)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Handle bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Handle italic text
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Handle line breaks
      .replace(/\n/g, '<br>')

    return formatted
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h3>Chat with AI</h3>
        <div className="chat-status">
          {isLoading && <span className="loading-indicator">●</span>}
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="welcome-message">
            <div className="welcome-icon">🤖</div>
            <h4>Welcome to AI Runner Builder</h4>
            <p>Describe what you want to build and I'll help you create a Viberunner for it.</p>
            <div className="example-prompts">
              <div className="example-prompt" onClick={() => setInputValue("a clipboard manager that shows recent history")}>
                "a clipboard manager that shows recent history"
              </div>
              <div className="example-prompt" onClick={() => setInputValue("a todo list with drag and drop")}>
                "a todo list with drag and drop"
              </div>
              <div className="example-prompt" onClick={() => setInputValue("a color picker utility")}>
                "a color picker utility"
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            <div className="message-header">
              <div className="message-role">
                {message.role === 'user' ? '👤' : '🤖'}
                {message.role === 'user' ? 'You' : 'AI Assistant'}
              </div>
              <div className="message-timestamp">
                {formatTimestamp(message.timestamp)}
              </div>
            </div>

            <div className="message-content">
              <div
                dangerouslySetInnerHTML={{
                  __html: formatMessage(message.content)
                }}
              />

              {message.fileChanges && message.fileChanges.length > 0 && (
                <div className="file-changes">
                  <div className="file-changes-header">📁 Files created/modified:</div>
                  {message.fileChanges.map((file, index) => (
                    <div key={index} className="file-change">
                      <span className="file-icon">📄</span>
                      <span className="file-path">{file.path}</span>
                    </div>
                  ))}
                </div>
              )}

              {message.commands && message.commands.length > 0 && (
                <div className="commands">
                  <div className="commands-header">⚡ Commands executed:</div>
                  {message.commands.map((command, index) => (
                    <div key={index} className="command">
                      <code>{command}</code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message assistant loading">
            <div className="message-header">
              <div className="message-role">
                🤖 AI Assistant
              </div>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="chat-input-container">
          <textarea
            ref={textAreaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            disabled={isLoading}
            rows={1}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="send-button"
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChatInterface
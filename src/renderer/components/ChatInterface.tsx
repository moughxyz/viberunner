import React, { useState, useRef, useEffect } from 'react'
import { Message } from './AIAgentInterface'

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (content: string) => void
  isLoading: boolean
  runnerName: string
  onRunnerNameChange: (name: string) => void
  onSave: () => void
  onDiscard: () => void
  isDiscarding: boolean
  hasFiles: boolean
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading,
  runnerName,
  onRunnerNameChange,
  onSave,
  onDiscard,
  isDiscarding,
  hasFiles
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
        return `<pre class="code-block"><code>${code.trim()}</code></pre>`
      })
      // Handle inline code (single backticks)
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
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
    <>
      <style>
        {`
          .message-content .inline-code {
            background: rgb(15 23 42);
            color: rgb(226 232 240);
            padding: 0.125rem 0.375rem;
            border-radius: 0.375rem;
            font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 0.875em;
            font-weight: 500;
            border: 1px solid rgb(51 65 85);
          }
          .message-content .code-block {
            background: rgb(15 23 42);
            border: 1px solid rgb(51 65 85);
            border-radius: 0.5rem;
            padding: 1rem;
            margin: 1rem 0;
            overflow-x: auto;
            font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
          }
          .message-content .code-block code {
            background: transparent;
            color: rgb(226 232 240);
            padding: 0;
            border: none;
            border-radius: 0;
            font-size: 0.875rem;
            line-height: 1.5;
          }
          .message-content strong {
            font-weight: 600;
          }
          .message-content em {
            font-style: italic;
          }
          .message-content p {
            margin: 0.75rem 0;
          }
          .message-content p:first-child {
            margin-top: 0;
          }
          .message-content p:last-child {
            margin-bottom: 0;
          }
        `}
      </style>
      <div className="flex flex-col h-full bg-neutral-900 w-1/4 min-w-[300px]">
        {/* Header */}
        <div className="bg-neutral-900/40 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex-1 max-w-sm">
              <input
                id="runner-name-input-tab"
                type="text"
                placeholder="Runner name (optional)"
                value={runnerName}
                onChange={(e) => onRunnerNameChange(e.target.value)}
                className="w-full h-9 bg-[#0A0A0A] border border-[#333333] rounded-md px-3 text-[13px] text-white/90 placeholder:text-[#666666] focus:outline-none focus:ring-1 focus:ring-[#1D1D1D] hover:border-[#424242] transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 ml-3">
              <button
                onClick={onSave}
                disabled={!hasFiles || isDiscarding}
                className="h-8 px-3 text-[13px] font-medium rounded-md transition-all duration-150 bg-white text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
              >
                Done
              </button>
              {hasFiles && (
                <button
                  onClick={onDiscard}
                  disabled={isDiscarding}
                  className="h-8 px-3 text-[13px] font-medium rounded-md transition-all duration-150 bg-[#1D1D1D] text-white/80 hover:bg-[#2D2D2D] border border-[#333333] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#1D1D1D]"
                >
                  {isDiscarding ? 'Discarding...' : 'Discard'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-4 py-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 bg-[#1D1D1D] rounded-lg flex items-center justify-center mb-4">
                  <span className="text-xl">✨</span>
                </div>
                <h3 className="text-lg font-medium text-white/90 mb-2">
                  Start building with AI
                </h3>
                <p className="text-[13px] text-[#888888] mb-8 max-w-md text-center">
                  Describe what you want to build and I'll help you create a Viberunner for it.
                </p>
                <div className="grid gap-2 max-w-lg w-full">
                  {[
                    "a clipboard manager that shows recent history",
                    "a todo list with drag and drop",
                    "a color picker utility"
                  ].map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => setInputValue(prompt)}
                      className="w-full px-4 py-2 text-left text-[13px] text-white/80 bg-[#1D1D1D] hover:bg-[#2D2D2D] rounded-md transition-colors"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="group">
                  {/* Message */}
                  <div className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center text-[13px] font-medium ${
                        message.role === 'user'
                          ? 'bg-[#1D1D1D] text-white/80'
                          : 'bg-[#1D1D1D] text-white/80'
                      }`}>
                        {message.role === 'user' ? 'U' : 'AI'}
                      </div>
                    </div>

                    {/* Content */}
                    <div className={`flex-1 max-w-2xl ${message.role === 'user' ? 'text-right' : ''}`}>
                      {/* Message bubble */}
                      <div className={`inline-block p-4 rounded-lg ${
                        message.role === 'user'
                          ? 'bg-[#1D1D1D] text-white/90'
                          : 'bg-[#1D1D1D] text-white/90'
                      }`}>
                        <div
                          className="message-content text-[13px] leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: formatMessage(message.content)
                          }}
                        />
                      </div>

                      {/* Timestamp */}
                      <div className={`text-xs text-[#666666] mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                        {formatTimestamp(message.timestamp)}
                      </div>

                      {/* File Changes */}
                      {message.fileChanges && message.fileChanges.length > 0 && (
                        <div className="mt-3 bg-[#1D1D1D] border border-[#333333] rounded-lg overflow-hidden">
                          <div className="p-3">
                            <div className="flex items-center gap-2 text-[#888888] font-medium text-[13px] mb-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12z" />
                              </svg>
                              Files created/modified
                            </div>
                            <div className="space-y-1">
                              {message.fileChanges.map((file, index) => (
                                <div key={index} className="flex items-center gap-2 text-[13px]">
                                  <svg className="w-4 h-4 text-[#888888]" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                  </svg>
                                  <code className="font-mono text-[12px] bg-black/20 text-white/70 px-2 py-1 rounded">
                                    {file.path}
                                  </code>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Commands */}
                      {message.commands && message.commands.length > 0 && (
                        <div className="mt-3 bg-[#1D1D1D] border border-[#333333] rounded-lg overflow-hidden">
                          <div className="p-3">
                            <div className="flex items-center gap-2 text-[#888888] font-medium text-[13px] mb-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" />
                              </svg>
                              Commands executed
                            </div>
                            <div className="space-y-1">
                              {message.commands.map((command, index) => (
                                <code key={index} className="block font-mono text-[12px] bg-black/20 text-white/70 px-2 py-1 rounded">
                                  {command}
                                </code>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading State */}
              {isLoading && (
                <div className="group">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-md bg-[#1D1D1D] text-white/80 flex items-center justify-center text-[13px] font-medium">
                        AI
                      </div>
                    </div>
                    <div className="flex-1 max-w-2xl">
                      <div className="inline-block p-4 rounded-lg bg-[#1D1D1D]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-neutral-900/40 backdrop-blur-xl">
          <div className="px-4 py-3">
            <form onSubmit={handleSubmit} className="relative">
              <textarea
                ref={textAreaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Describe what you want to build..."
                disabled={isLoading}
                rows={1}
                className="w-full resize-none rounded-lg bg-[#0A0A0A] border border-[#333333] px-4 py-3 pr-12 text-[13px] text-white/90 placeholder:text-[#666666] focus:outline-none focus:ring-1 focus:ring-[#1D1D1D] hover:border-[#424242] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-[44px] w-[44px] flex items-center justify-center rounded-md bg-[#1D1D1D] text-white/80 hover:bg-[#2D2D2D] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#1D1D1D] transition-colors"
              >
                {isLoading ? (
                  <svg className="w-4 h-4 animate-spin text-white/60" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}

export default ChatInterface
import React, { useState, useRef, useEffect } from "react"
import { Message } from "./AIAgentInterface"
import "./ChatInterface.css"

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
  hasFiles,
}) => {
  const [inputValue, setInputValue] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim())
      setInputValue("")
      // Reset textarea height
      if (textAreaRef.current) {
        textAreaRef.current.style.height = "auto"
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }

  const formatMessage = (content: string) => {
    // First handle code blocks (triple backticks) before inline code
    let formatted = content
      // Handle code blocks with language specification
      .replace(/```(\w+)?\n?([\s\S]*?)```/g, (_match, _lang, code) => {
        return `<pre class="code-block"><code>${code.trim()}</code></pre>`
      })
      // Handle inline code (single backticks)
      .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
      // Handle bold text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Handle italic text
      .replace(/\*(.*?)\*/g, "<em>$1</em>")

    // Split into paragraphs and handle line breaks properly
    const paragraphs = formatted
      .split(/\n\s*\n/) // Split on double newlines (paragraph breaks)
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph.length > 0)
      .map(paragraph => paragraph.replace(/\n/g, "<br>")) // Convert single newlines to br within paragraphs
      .map(paragraph => `<p>${paragraph}</p>`)

    return paragraphs.join('')
  }

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="chat-interface">
      {/* Header */}
      <div className="chat-header">
        <div className="header-content">
          <div className="runner-name-container">
            <input
              id="runner-name-input-tab"
              type="text"
              placeholder="Runner name (optional)"
              value={runnerName}
              onChange={(e) => onRunnerNameChange(e.target.value)}
              className="runner-name-input"
            />
          </div>
          <div className="header-buttons">
            <button
              onClick={onSave}
              disabled={!hasFiles || isDiscarding}
              className="done-button"
            >
              Done
            </button>
            {hasFiles && (
              <button
                onClick={onDiscard}
                disabled={isDiscarding}
                className="discard-button"
              >
                {isDiscarding ? "Discarding..." : "Discard"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="messages-container">
        <div className="messages-content">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="24" height="24" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 50 H25 L35 20 L50 80 L65 20 L75 50 H95" stroke="currentColor" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h3 className="empty-state-title">
                Start building with Viberunner
              </h3>
              <p className="empty-state-description">
                Describe the productivity app or system utility you want to
                build.
              </p>
              <div className="empty-state-prompts">
                {[
                  "a clipboard manager that shows recent history",
                  "a todo list with drag and drop",
                  "a color picker utility",
                ].map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => setInputValue(prompt)}
                    className="prompt-button"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="messages-list">
            {messages.map((message) => (
              <div key={message.id} className="message-group">
                {/* Message */}
                <div
                  className={`message-wrapper ${
                    message.role === "user" ? "user" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div className="message-avatar">
                    <div className="avatar">
                      {message.role === "user" ? "U" : "AI"}
                    </div>
                  </div>

                  {/* Content */}
                  <div
                    className={`message-content-wrapper ${
                      message.role === "user" ? "user" : ""
                    }`}
                  >
                    {/* Message bubble */}
                    <div className="message-bubble">
                      <div
                        className="message-content"
                        dangerouslySetInnerHTML={{
                          __html: formatMessage(message.content),
                        }}
                      />
                    </div>

                    {/* Timestamp */}
                    <div
                      className={`message-timestamp ${
                        message.role === "user" ? "user" : ""
                      }`}
                    >
                      {formatTimestamp(message.timestamp)}
                    </div>

                    {/* File Changes */}
                    {message.fileChanges &&
                      message.fileChanges.length > 0 && (
                        <div className="file-changes-container">
                          <div className="file-changes-content">
                            <div className="file-changes-header">
                              <svg
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12z"
                                />
                              </svg>
                              Files created/modified
                            </div>
                            <div className="file-changes-list">
                              {message.fileChanges.map((file, index) => (
                                <div
                                  key={index}
                                  className="file-change-item"
                                >
                                  <svg
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  <code className="file-path">
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
                      <div className="commands-container">
                        <div className="commands-content">
                          <div className="commands-header">
                            <svg
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z"
                              />
                            </svg>
                            Commands executed
                          </div>
                          <div className="commands-list">
                            {message.commands.map((command, index) => (
                              <code
                                key={index}
                                className="command-item"
                              >
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
              <div className="loading-container">
                <div className="loading-wrapper">
                  <div className="message-avatar">
                    <div className="avatar">
                      AI
                    </div>
                  </div>
                  <div className="loading-content">
                    <div className="loading-bubble">
                      <div className="loading-dots">
                        <div className="loading-dot"></div>
                        <div className="loading-dot"></div>
                        <div className="loading-dot"></div>
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
      <div className="input-area">
        <div className="input-container">
          <form onSubmit={handleSubmit} className="input-form">
            <textarea
              ref={textAreaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to build..."
              disabled={isLoading}
              rows={1}
              className="input-textarea"
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="submit-button"
            >
              {isLoading ? (
                <svg
                  className="spinner"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ChatInterface

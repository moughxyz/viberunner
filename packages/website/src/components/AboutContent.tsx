import React from 'react'
import { product } from '@viberunner/common'
import './AboutContent.css'

const AboutContent: React.FC = () => {
  return (
    <>
      <section className="about-hero">
        <h1 className="about-title">
          About <span className="gradient">{product.productName}</span>
        </h1>
        <p className="about-subtitle">
          Democratizing desktop app development, one vibe at a time
        </p>
      </section>

      <section className="about-content">
        <div className="about-section">
          <h2>Our Vision</h2>
          <p>
            We believe everyone should have the power to create their own desktop tools. Instead of searching through app stores, buying expensive software, or settling for generic solutions, you should be able to dream up exactly what you need and make it real in seconds.
          </p>
          <p>
            {product.productName} is a new paradigm - a powerful runtime that lets you build and run personal desktop applications with nothing more than a simple description of what you want.
          </p>
        </div>

        <div className="about-section">
          <h2>How It Works</h2>
          <div className="process-steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Describe Your Idea</h3>
              <p>Tell {product.productName} what you want to build. It can be as simple as "stopwatch" or as detailed as you like.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>AI Generates Your App</h3>
              <p>Our intelligent system creates a React-based runner with full system access and Node.js capabilities.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Launch & Customize</h3>
              <p>Run your app as a tab, dock window, or menu bar utility. Iterate and improve as needed.</p>
            </div>
          </div>
        </div>

        <div className="about-section">
          <h2>Key Features</h2>
          <div className="features-grid">
            <div className="feature-item">
              <span className="feature-icon">🚀</span>
              <h3>Instant Creation</h3>
              <p>Go from idea to working app in seconds, not hours or days.</p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚛️</span>
              <h3>React-Powered</h3>
              <p>Built on modern React with TypeScript support and hot reloading.</p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔧</span>
              <h3>System Access</h3>
              <p>Full Node.js capabilities - read files, make API calls, run shell commands.</p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎯</span>
              <h3>Smart Matching</h3>
              <p>Advanced file matching system that knows which app to use for each file type.</p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🌙</span>
              <h3>Beautiful UI</h3>
              <p>Modern dark interface with glassmorphism effects and smooth animations.</p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚙️</span>
              <h3>Flexible Launch</h3>
              <p>Run apps as tabs, separate windows, or menu bar utilities.</p>
            </div>
          </div>
        </div>

        <div className="about-section">
          <h2>Philosophy</h2>
          <p>
            {product.productName} is designed as a single-player playground - a personal computing environment where you have complete control. We're not trying to build another app marketplace or social platform. Instead, we're giving you the tools to become your own software developer.
          </p>
          <p>
            Every computer user has unique needs and workflows. Traditional software tries to be everything to everyone, but often ends up being perfect for no one. With {product.productName}, you can build tools that fit your exact requirements, no compromises needed.
          </p>
        </div>

        <div className="about-section">
          <h2>Examples of What You Can Build</h2>
          <div className="examples-grid">
            <div className="example">
              <h4>📝 Personal Note-Taking App</h4>
              <p>Custom organization system that saves notes exactly where you want them</p>
            </div>
            <div className="example">
              <h4>📊 System Monitor</h4>
              <p>Real-time dashboard showing exactly the metrics you care about</p>
            </div>
            <div className="example">
              <h4>🎨 Image Redactor</h4>
              <p>Quick tool to blur or black out sensitive information in screenshots</p>
            </div>
            <div className="example">
              <h4>📋 Clipboard Manager</h4>
              <p>Track your copy/paste history with smart categorization</p>
            </div>
            <div className="example">
              <h4>⏰ Custom Timer</h4>
              <p>Pomodoro, workout, cooking - whatever timing system works for you</p>
            </div>
            <div className="example">
              <h4>🔍 File Analyzer</h4>
              <p>Custom viewers for your specific file types and data formats</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default AboutContent
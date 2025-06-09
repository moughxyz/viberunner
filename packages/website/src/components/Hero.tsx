import React, { useState, useEffect } from "react"
import { Download, Sparkles } from "lucide-react"
import { product, release } from "@viberunner/common"
import "./Hero.css"

const Hero: React.FC = () => {
  const [downloadUrl, setDownloadUrl] = useState<string>("")
  const [platform, setPlatform] = useState<string>("")

  useEffect(() => {
    try {
      // Detect platform
      const userAgent = navigator.userAgent.toLowerCase()
      let detectedPlatform = ""
      let url = ""

      if (userAgent.includes("win")) {
        detectedPlatform = "Windows"
        url = release.downloads.windows
      } else if (userAgent.includes("mac")) {
        detectedPlatform = "macOS"
        // Prefer ARM64 for newer Macs, fallback to DMG
        url =
          userAgent.includes("arm") || userAgent.includes("apple")
            ? release.downloads.macOS.arm64
            : release.downloads.macOS.dmg
      } else if (userAgent.includes("linux")) {
        detectedPlatform = "Linux"
        url = release.downloads.linux.deb
      } else {
        detectedPlatform = "Download"
        url = `https://github.com/moughxyz/viberunner/releases/latest`
      }

      setPlatform(detectedPlatform)
      setDownloadUrl(url)
    } catch (error) {
      console.error("Failed to load release data:", error)
      // Fallback to GitHub releases page
      setPlatform("Download")
      setDownloadUrl("https://github.com/moughxyz/viberunner/releases/latest")
    }
  }, [])
  return (
    <div className="hero">
      <section className="hero-main">
        <h1 className="title">
          <span className="gradient">{product.productName}</span>
        </h1>
        <p className="subtitle">Build personal desktop apps in seconds</p>

        <p className="description">
          We believe everyone should have the power to create their own desktop
          tools. Instead of searching through app stores, buying expensive
          software, or settling for generic solutions, you should be able to
          dream up exactly what you need and make it real in seconds.
        </p>
        <p className="vision">
          {product.productName} is a new paradigm - a powerful runtime that lets
          you build and run personal desktop applications with nothing more than
          a simple description of what you want.
        </p>
        <div className="download-section">
          <a
            href={downloadUrl}
            className="download-button"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="download-icon" size={20} />
            <span className="download-text">Download for {platform}</span>
          </a>
          <p className="download-footnote">
            Totally free during alpha - just bring your own Claude key!
          </p>
          <p className="download-note">
            Available for macOS. Windows and Linux coming soon.
          </p>
        </div>
        <div className="how-it-works-screenshots">
          <div className="screenshot-container">
            <img
              src="/screenshot-1.jpg"
              alt="Step 1: Describing your app idea in Viberunner"
              className="how-it-works-image"
            />
          </div>
          <div className="screenshot-container">
            <img
              src="/screenshot-2.jpg"
              alt="Step 2: AI generates your custom app"
              className="how-it-works-image"
            />
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="process-steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Describe Your Idea</h3>
            <p>
              Tell {product.productName} what you want to build. It can be as
              simple as "stopwatch" or as detailed as you like.
            </p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>AI Generates Your App</h3>
            <p>
              Our intelligent system creates a React-based runner with full
              system access and Node.js capabilities.
            </p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Launch & Customize</h3>
            <p>
              Run your app as a tab, dock window, or menu bar utility. Iterate
              and improve as needed.
            </p>
          </div>
        </div>
      </section>

      <section className="key-features">
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
            <p>
              Built on modern React with TypeScript support and hot reloading.
            </p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔧</span>
            <h3>System Access</h3>
            <p>
              Full Node.js capabilities - read files, make API calls, run shell
              commands.
            </p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎯</span>
            <h3>Smart Matching</h3>
            <p>
              Advanced file matching system that knows which app to use for each
              file type.
            </p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🌙</span>
            <h3>Beautiful UI</h3>
            <p>
              Modern dark interface with glassmorphism effects and smooth
              animations.
            </p>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚙️</span>
            <h3>Flexible Launch</h3>
            <p>Run apps as tabs, separate windows, or menu bar utilities.</p>
          </div>
        </div>
      </section>

      <section className="philosophy">
        <h2>Your Personal Computing Environment</h2>
        <p>
          {product.productName} is designed as a single-player playground - a
          personal computing environment where you have complete control. We're
          not trying to build another app marketplace or social platform.
          Instead, we're giving you the tools to become your own software
          developer.
        </p>
        <p>
          Every computer user has unique needs and workflows. Traditional
          software tries to be everything to everyone, but often ends up being
          perfect for no one. With {product.productName}, you can build tools
          that fit your exact requirements, no compromises needed.
        </p>
      </section>

      <section className="examples">
        <h2>Examples of What You Can Build</h2>
        <div className="examples-grid">
          <div className="example">
            <h4>📝 Personal Note-Taking App</h4>
            <p>
              Custom organization system that saves notes exactly where you want
              them
            </p>
          </div>
          <div className="example">
            <h4>📊 System Monitor</h4>
            <p>
              Real-time dashboard showing exactly the metrics you care about
            </p>
          </div>
          <div className="example">
            <h4>🎨 Image Redactor</h4>
            <p>
              Quick tool to blur or black out sensitive information in
              screenshots
            </p>
          </div>
          <div className="example">
            <h4>📋 Clipboard Manager</h4>
            <p>Track your copy/paste history with smart categorization</p>
          </div>
          <div className="example">
            <h4>⏰ Custom Timer</h4>
            <p>
              Pomodoro, workout, cooking - whatever timing system works for you
            </p>
          </div>
          <div className="example">
            <h4>🔍 File Analyzer</h4>
            <p>Custom viewers for your specific file types and data formats</p>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Hero

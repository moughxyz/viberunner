import React from "react"
import { product } from "@viberunner/common"
import "./Footer.css"

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="footer-logo">
              <span className="gradient">{product.productName}</span>
            </h3>
            <p className="footer-description">
              Build personal desktop apps in seconds. Democratizing desktop app
              development for all.
            </p>
          </div>

          <div className="footer-section">
            <h4>Product</h4>
            <ul className="footer-links">
              <li>
                <a href="/">Home</a>
              </li>
              <li>
                <a href="/about">About</a>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Connect</h4>
            <ul className="footer-links">
              <li>
                <a
                  href="https://github.com/moughxyz/viberunner"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://twitter.com/@moughxyz"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  X/Twitter
                </a>
              </li>
              <li>
                <a href="mailto:viberunner.ngder@aleeas.com">Contact</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-copyright">
            <p>
              &copy; {currentYear} {product.productName}. All rights reserved.
            </p>
          </div>
          <div className="footer-legal">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

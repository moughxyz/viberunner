import React from 'react'
import { product } from '@viberunner/common'
import './Navigation.css'

interface NavigationProps {
  currentPage?: 'home' | 'about'
}

const Navigation: React.FC<NavigationProps> = ({ currentPage = 'home' }) => {
  return (
    <nav className="nav">
      <div className="nav-container">
        <a href="/" className="nav-logo">
          <span className="gradient">{product.productName}</span>
        </a>
        <div className="nav-links">
          <a href="/" className={currentPage === 'home' ? 'active' : ''}>
            Home
          </a>
          <a href="/about" className={currentPage === 'about' ? 'active' : ''}>
            About
          </a>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
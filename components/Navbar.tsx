'use client'

import { useState } from 'react'
import Image from 'next/image'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="navbar">
      {/* Desktop Navbar */}
      <div className="navbar-desktop">
        <div className="navbar-logo">
          <Image
            src="/logo.png"
            alt="Fanrae"
            width={200}
            height={0}
            style={{ height: 'auto', width: '200px' }}
            priority
          />
        </div>
        <div className="navbar-actions">
          <button className="btn-signup">Sign up</button>
          <button className="btn-login">Login</button>
        </div>
      </div>

      {/* Mobile Navbar */}
      <div className="navbar-mobile">
        <div className="navbar-logo-mobile">
          <Image
            src="/logo.png"
            alt="Fanrae"
            width={200}
            height={0}
            style={{ height: 'auto', width: '200px' }}
            priority
          />
        </div>
        <button
          className="btn-menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className="menu-icon">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </div>

      {/* Mobile Menu (hidden for now as per requirements) */}
      {mobileMenuOpen && (
        <div className="mobile-menu">
          {/* Menu content will be added later */}
        </div>
      )}
    </nav>
  )
}


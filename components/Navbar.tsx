'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="navbar">
      {/* Desktop Navbar */}
      <div className="navbar-desktop">
        <Link href="/" className="navbar-logo">
          <Image
            src="/logo.png"
            alt="Fanrae"
            width={200}
            height={0}
            style={{ height: 'auto', width: '200px' }}
            priority
          />
        </Link>
        <div className="navbar-actions">
          <Link href="/signup" className="btn-signup">Sign up</Link>
          <Link href="/login" className="btn-login">Login</Link>
        </div>
      </div>

      {/* Mobile Navbar */}
      <div className="navbar-mobile">
        <Link href="/" className="navbar-logo-mobile">
          <Image
            src="/logo.png"
            alt="Fanrae"
            width={200}
            height={0}
            style={{ height: 'auto', width: '200px' }}
            priority
          />
        </Link>
        <button
          className={`btn-menu ${mobileMenuOpen ? 'menu-open' : ''}`}
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-actions">
            <Link href="/signup" className="btn-signup-mobile">Sign up</Link>
            <Link href="/login" className="btn-login-mobile">Login</Link>
          </div>
        </div>
      )}
    </nav>
  )
}


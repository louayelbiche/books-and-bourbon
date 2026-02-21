'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from '@iconify/react'

const footerLinks = {
  explore: [
    { href: '/events', label: 'Events' },
    { href: '/books', label: 'Books' },
  ],
  company: [
    { href: '/about', label: 'About Us' },
    { href: '/contact', label: 'Contact' },
    { href: '/faq', label: 'FAQ' },
    { href: '/contact', label: 'Suggest a Book' },
  ],
  legal: [
    { href: '#', label: 'Privacy Policy' },
    { href: '#', label: 'Terms of Service' },
  ],
}

const socialLinks = [
  { href: 'https://www.instagram.com/capvstrategies/', icon: 'mdi:instagram', label: 'Instagram' },
  { href: 'https://www.linkedin.com/company/capitalvstrategies', icon: 'mdi:linkedin', label: 'LinkedIn' },
]

export function Footer() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || isSubmitting) return

    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      const response = await fetch('/api/subscribe/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'footer' }),
      })

      const data = await response.json()

      if (!response.ok) {
        setSubmitStatus('error')
        setErrorMessage(data.error || 'Failed to subscribe.')
        return
      }

      setSubmitStatus('success')
    } catch {
      setSubmitStatus('error')
      setErrorMessage('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <footer className="bg-surface border-t border-text-muted/10">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-brand-burgundy flex items-center justify-center">
                <Icon icon="mdi:book-open-page-variant" className="w-6 h-6 text-brand-cream" />
              </div>
              <span className="font-display text-xl font-semibold text-brand-cream">
                Books & Bourbon
              </span>
            </Link>
            <p className="text-brand-tan text-sm leading-relaxed max-w-sm mb-6">
              Where great literature meets spirited conversation. Join us for
              moderated discussions with acclaimed authors, hosted by passionate
              literary enthusiasts.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="w-10 h-10 bg-surface-elevated flex items-center justify-center text-text-secondary hover:text-brand-cream hover:bg-brand-burgundy transition-all duration-300"
                >
                  <Icon icon={social.icon} className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Explore Links */}
          <div>
            <h3 className="font-display text-brand-cream font-semibold text-base mb-4">
              Explore
            </h3>
            <ul className="space-y-3">
              {footerLinks.explore.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-text-secondary text-sm hover:text-brand-cream transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-display text-brand-cream font-semibold text-base mb-4">
              Company
            </h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-text-secondary text-sm hover:text-brand-cream transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-display text-brand-cream font-semibold text-base mb-4">
              Stay Updated
            </h3>
            <p className="text-brand-tan text-sm mb-4">
              Get notified about new episodes and author announcements.
            </p>
            {submitStatus === 'success' ? (
              <div className="bg-green-900/30 border border-green-700/50 rounded px-4 py-3">
                <p className="text-green-400 text-sm font-medium">Subscribed!</p>
                <p className="text-green-400/80 text-xs mt-1">You&apos;ll hear from us soon.</p>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="form-input text-sm"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-brand-burgundy hover:bg-brand-burgundy-light text-brand-cream px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                </button>
                {submitStatus === 'error' && (
                  <p className="text-red-400 text-xs">{errorMessage}</p>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-text-muted/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-text-secondary text-sm" suppressHydrationWarning>
            &copy; {new Date().getFullYear()} Books and Bourbon. All rights reserved.
          </p>
          <ul className="flex gap-6">
            {footerLinks.legal.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="text-text-secondary text-sm hover:text-brand-cream transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}

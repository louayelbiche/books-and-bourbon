'use client'

import { Icon } from '@iconify/react'
import { useState } from 'react'

type FormData = {
  name: string
  email: string
  type: 'book' | 'author' | 'general' | 'partnership'
  bookTitle: string
  authorName: string
  message: string
}

const initialFormData: FormData = {
  name: '',
  email: '',
  type: 'book',
  bookTitle: '',
  authorName: '',
  message: '',
}

export default function ContactPage() {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      // Using API route for Google Sheets integration
      const response = await fetch('/api/submit-suggestion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          type: formData.type,
          bookTitle: formData.bookTitle,
          authorName: formData.authorName,
          message: formData.message,
        }),
      })

      if (response.ok) {
        setSubmitStatus('success')
        setFormData(initialFormData)
      } else {
        setSubmitStatus('error')
      }
    } catch {
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <>
      {/* Header */}
      <section className="pt-32 pb-16 bg-brand-black">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-brand-burgundy-light font-medium tracking-wider uppercase text-sm mb-4">
            Get in Touch
          </p>
          <h1 className="font-display text-5xl md:text-6xl text-brand-cream mb-6">
            Contact Us
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            Have a book suggestion, partnership inquiry, or just want to say hello? We&apos;d love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 md:py-24 bg-surface">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Form */}
            <div>
              <h2 className="font-display text-3xl text-brand-cream mb-8">
                Send Us a Message
              </h2>

              {submitStatus === 'success' && (
                <div className="bg-brand-gold/10 border border-brand-gold/30 p-4 mb-8 flex items-center gap-3">
                  <Icon icon="mdi:check-circle" className="w-6 h-6 text-brand-gold" />
                  <p className="text-brand-tan">
                    Thank you! Your message has been sent successfully.
                  </p>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="bg-brand-burgundy/20 border border-brand-burgundy/50 p-4 mb-8 flex items-center gap-3">
                  <Icon icon="mdi:alert-circle" className="w-6 h-6 text-brand-burgundy-light" />
                  <p className="text-brand-cream/80">
                    Something went wrong. Please try again later.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-brand-cream mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="form-input"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-brand-cream mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="form-input"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-brand-cream mb-2">
                    Inquiry Type *
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="book">Book Suggestion</option>
                    <option value="author">Author Recommendation</option>
                    <option value="partnership">Partnership Inquiry</option>
                    <option value="general">General Question</option>
                  </select>
                </div>

                {(formData.type === 'book' || formData.type === 'author') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="bookTitle" className="block text-sm font-medium text-brand-cream mb-2">
                        Book Title {formData.type === 'book' ? '*' : '(Optional)'}
                      </label>
                      <input
                        type="text"
                        id="bookTitle"
                        name="bookTitle"
                        value={formData.bookTitle}
                        onChange={handleChange}
                        required={formData.type === 'book'}
                        className="form-input"
                        placeholder="Enter book title"
                      />
                    </div>
                    <div>
                      <label htmlFor="authorName" className="block text-sm font-medium text-brand-cream mb-2">
                        Author Name {formData.type === 'author' ? '*' : '(Optional)'}
                      </label>
                      <input
                        type="text"
                        id="authorName"
                        name="authorName"
                        value={formData.authorName}
                        onChange={handleChange}
                        required={formData.type === 'author'}
                        className="form-input"
                        placeholder="Enter author name"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-brand-cream mb-2">
                    Your Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="form-input resize-none"
                    placeholder="Tell us why you think this would be a great fit for Books and Bourbon..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center justify-center gap-2">
                    {isSubmitting ? (
                      <>
                        <Icon icon="mdi:loading" className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Message
                        <Icon icon="mdi:send" className="w-5 h-5" />
                      </>
                    )}
                  </span>
                </button>
              </form>
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="font-display text-3xl text-brand-cream mb-8">
                Other Ways to Reach Us
              </h2>

              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-brand-burgundy flex items-center justify-center flex-shrink-0">
                    <Icon icon="mdi:email" className="w-6 h-6 text-brand-cream" />
                  </div>
                  <div>
                    <h3 className="font-medium text-brand-cream mb-1">Email</h3>
                    <p className="text-brand-tan">info@capvstrategies.com</p>
                    <p className="text-brand-tan/70 text-sm mt-1">We respond within 48 hours</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-brand-burgundy flex items-center justify-center flex-shrink-0">
                    <Icon icon="mdi:map-marker" className="w-6 h-6 text-brand-cream" />
                  </div>
                  <div>
                    <h3 className="font-medium text-brand-cream mb-1">Location</h3>
                    <p className="text-brand-tan">
                      40 Thompson Street, Floor 6<br />
                      New York, NY 10013
                    </p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="mt-12 pt-8 border-t border-text-muted/20">
                <h3 className="font-medium text-brand-cream mb-4">Follow Us</h3>
                <div className="flex gap-4">
                  {[
                    { icon: 'mdi:instagram', label: 'Instagram', href: 'https://www.instagram.com/capvstrategies/' },
                    { icon: 'mdi:linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/company/capitalvstrategies' },
                  ].map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="w-10 h-10 bg-surface-elevated flex items-center justify-center text-text-secondary hover:text-brand-cream hover:bg-brand-burgundy transition-all"
                    >
                      <Icon icon={social.icon} className="w-5 h-5" />
                    </a>
                  ))}
                </div>
              </div>

              {/* FAQ Link */}
              <div className="mt-12 p-6 bg-brand-black">
                <h3 className="font-display text-xl text-brand-cream mb-2">
                  Frequently Asked Questions
                </h3>
                <p className="text-brand-tan text-sm mb-4">
                  Have questions about how Books and Bourbon works?
                </p>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 text-brand-burgundy-light font-medium hover:text-brand-gold transition-colors"
                >
                  View FAQ
                  <Icon icon="mdi:arrow-right" className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

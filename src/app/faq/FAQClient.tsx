'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import type { CMSFAQ } from '@/lib/cms'

interface FAQClientProps {
  faqs: CMSFAQ[]
  header?: { eyebrow: string; title: string; description: string }
  cta?: { heading: string; description: string; buttonText: string }
}

function AccordionItem({ faq, isOpen, onToggle }: { faq: CMSFAQ; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-l-4 border-brand-burgundy bg-surface-elevated">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 text-left hover:bg-brand-burgundy/5 transition-colors"
      >
        <span className="font-display text-lg text-brand-cream pr-4">{faq.question}</span>
        <Icon
          icon="mdi:chevron-down"
          className={`w-5 h-5 text-brand-burgundy-light flex-shrink-0 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-5 text-brand-tan leading-relaxed">
          {faq.answer}
        </div>
      </div>
    </div>
  )
}

export function FAQClient({ faqs, header, cta }: FAQClientProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const categories = Array.from(new Set(faqs.map((f) => f.category).filter(Boolean))) as string[]
  const hasCategories = categories.length > 1

  const filteredFAQs = activeCategory
    ? faqs.filter((f) => f.category === activeCategory)
    : faqs

  return (
    <>
      {/* Header */}
      <section className="pt-32 pb-16 bg-brand-black">
        <div className="max-w-7xl mx-auto px-6">
          <p className="font-mono text-brand-burgundy-light font-medium tracking-[0.15em] uppercase text-sm mb-4">
            {header?.eyebrow || 'Help Center'}
          </p>
          <h1 className="font-display text-5xl md:text-6xl text-brand-cream mb-6">
            {header?.title || 'Frequently Asked Questions'}
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl">
            {header?.description || 'Find answers to common questions about Books and Bourbon, our events, and how to get involved.'}
          </p>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16 md:py-24 bg-surface">
        <div className="max-w-3xl mx-auto px-6">
          {/* Category Filter */}
          {hasCategories && (
            <div className="flex flex-wrap gap-2 mb-10">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeCategory === null
                    ? 'bg-brand-burgundy text-brand-cream'
                    : 'bg-surface-elevated text-text-secondary hover:text-brand-cream hover:bg-brand-burgundy/20'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeCategory === cat
                      ? 'bg-brand-burgundy text-brand-cream'
                      : 'bg-surface-elevated text-text-secondary hover:text-brand-cream hover:bg-brand-burgundy/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Accordion */}
          <div className="space-y-3">
            {filteredFAQs.map((faq) => (
              <AccordionItem
                key={faq.id}
                faq={faq}
                isOpen={openId === faq.id}
                onToggle={() => setOpenId(openId === faq.id ? null : faq.id)}
              />
            ))}
          </div>

          {/* Contact CTA */}
          <div className="mt-16 text-center">
            <div className="p-8 bg-brand-black">
              <h2 className="font-display text-2xl text-brand-cream mb-3">
                {cta?.heading || 'Still Have Questions?'}
              </h2>
              <p className="text-brand-tan mb-6">
                {cta?.description || "Can't find what you're looking for? We'd love to hear from you."}
              </p>
              <Link
                href="/contact"
                className="btn-primary inline-flex items-center gap-2"
              >
                {cta?.buttonText || 'Contact Us'}
                <Icon icon="mdi:arrow-right" className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

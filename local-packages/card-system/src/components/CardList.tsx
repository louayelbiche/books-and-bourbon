'use client';

import { useState, useEffect, useRef, type CSSProperties } from 'react';
import type { ChatCard, CardTheme, CardConfig } from '../types.js';
import { CardRenderer } from './CardRenderer.js';

interface CardListProps {
  cards: ChatCard[];
  theme: CardTheme;
  config: CardConfig;
  onCardClick: (card: ChatCard) => void;
  /** Label for image load error fallback */
  imageErrorLabel?: string;
  /** Called when a card becomes visible in viewport (50% for 500ms). */
  onCardVisible?: (card: ChatCard) => void;
  /** Called when a visible card leaves the viewport. Includes dwell time in ms. */
  onCardDwell?: (card: ChatCard, dwellMs: number) => void;
}

export function CardList({ cards, theme, config, onCardClick, imageErrorLabel, onCardVisible, onCardDwell }: CardListProps) {
  const [visibleCount, setVisibleCount] = useState(config.maxCardsPerMessage);
  const containerRef = useRef<HTMLDivElement>(null);
  const visibilityTimers = useRef<Map<string, number>>(new Map());
  const notifiedCards = useRef<Set<string>>(new Set());

  // IntersectionObserver for card visibility tracking (BA-207)
  useEffect(() => {
    if (!onCardVisible && !onCardDwell) return;
    if (!containerRef.current) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const cardId = entry.target.getAttribute('data-card-id');
          if (!cardId) continue;
          const card = cards.find((c) => c.id === cardId);
          if (!card) continue;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Card entered viewport: start 500ms timer for card_visible
            if (!visibilityTimers.current.has(cardId)) {
              const timer = window.setTimeout(() => {
                if (!notifiedCards.current.has(cardId)) {
                  notifiedCards.current.add(cardId);
                  onCardVisible?.(card);
                }
                // Store dwell start time (overwrite the timer ID)
                visibilityTimers.current.set(cardId, Date.now());
              }, 500);
              visibilityTimers.current.set(cardId, -timer); // negative = pending timer
            }
          } else {
            // Card left viewport
            const timerOrStart = visibilityTimers.current.get(cardId);
            if (timerOrStart !== undefined) {
              if (timerOrStart < 0) {
                // Cancel pending timer (didn't reach 500ms threshold)
                window.clearTimeout(-timerOrStart);
              } else if (timerOrStart > 0 && notifiedCards.current.has(cardId)) {
                // Card was visible; compute dwell time
                const dwellMs = Date.now() - timerOrStart;
                if (dwellMs > 0) onCardDwell?.(card, dwellMs);
              }
              visibilityTimers.current.delete(cardId);
            }
          }
        }
      },
      { threshold: 0.5 }
    );

    const cardElements = containerRef.current.querySelectorAll('[data-card-id]');
    cardElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      for (const [, timerOrStart] of visibilityTimers.current) {
        if (timerOrStart < 0) window.clearTimeout(-timerOrStart);
      }
      visibilityTimers.current.clear();
    };
  }, [cards, onCardVisible, onCardDwell]);

  if (!cards || cards.length === 0) return null;

  const visibleCards = cards.slice(0, visibleCount);
  const hasMore = cards.length > visibleCount;

  const handleShowMore = () => {
    const nextStep = config.expandSteps.find((step) => step > visibleCount);
    setVisibleCount(nextStep ?? cards.length);
  };

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '8px',
    maxWidth: '100%',
  };

  const showMoreStyle: CSSProperties = {
    padding: '6px 12px',
    fontSize: '12px',
    color: theme.cardSubtitle.color,
    background: 'transparent',
    border: `1px solid ${theme.card.border}`,
    borderRadius: '8px',
    cursor: 'pointer',
    alignSelf: 'center',
    minHeight: '36px',
    transition: 'background 0.2s',
  };

  return (
    <div ref={containerRef} style={containerStyle}>
      {visibleCards.map((card) => (
        <div key={card.id} data-card-id={card.id}>
          <CardRenderer
            card={card}
            theme={theme}
            config={config}
            onClick={onCardClick}
            imageErrorLabel={imageErrorLabel}
          />
        </div>
      ))}
      {hasMore && (
        <button
          type="button"
          style={showMoreStyle}
          onClick={handleShowMore}
        >
          Show more ({cards.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
}

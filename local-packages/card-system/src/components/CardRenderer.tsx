'use client';

import { useState, type CSSProperties } from 'react';
import type { ChatCard, CardTheme, CardConfig } from '../types.js';
import { CardImage } from './CardImage.js';

interface CardRendererProps {
  card: ChatCard;
  theme: CardTheme;
  config: CardConfig;
  onClick: (card: ChatCard) => void;
  /** Label for image load error fallback */
  imageErrorLabel?: string;
}

export function CardRenderer({ card, theme, config, onClick, imageErrorLabel }: CardRendererProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const clickTarget = config.clickBehavior === 'auto'
    ? (isMobile ? '_blank' : '_blank')
    : (config.clickBehavior === 'new_tab' ? '_blank' : '_self');

  const handleClick = () => {
    onClick(card);
  };

  const cardStyle: CSSProperties = {
    background: theme.card.bg,
    border: `1px solid ${isHovered ? theme.card.hoverBorder : theme.card.border}`,
    borderRadius: theme.card.radius,
    boxShadow: theme.card.shadow,
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease',
    minHeight: '44px',
  };

  const bodyStyle: CSSProperties = {
    padding: '8px 10px',
    flex: 1,
    minWidth: 0,
  };

  const titleStyle: CSSProperties = {
    margin: 0,
    fontSize: theme.cardTitle.fontSize,
    fontWeight: 600,
    color: theme.cardTitle.color,
    lineHeight: 1.3,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };

  const subtitleRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '2px',
    flexWrap: 'wrap',
  };

  const subtitleStyle: CSSProperties = {
    margin: 0,
    fontSize: theme.cardSubtitle.fontSize,
    color: theme.cardSubtitle.color,
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const variantsRowStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '6px',
  };

  const variantBadgeStyle = (isSelected: boolean): CSSProperties => ({
    padding: '2px 8px',
    fontSize: '11px',
    borderRadius: '4px',
    background: isSelected ? theme.cardVariant.activeBg : theme.cardVariant.bg,
    border: `1px solid ${isSelected ? theme.cardVariant.activeBorder : theme.cardVariant.border}`,
    color: isSelected ? '#fff' : theme.cardVariant.text,
    lineHeight: 1.4,
  });

  const availabilityStyle: CSSProperties = {
    display: 'inline-block',
    padding: '1px 6px',
    fontSize: '10px',
    borderRadius: '3px',
    fontWeight: 500,
    ...(card.availability === 'sold_out'
      ? { background: '#fef2f2', color: '#dc2626' }
      : card.availability === 'low_stock'
        ? { background: '#fffbeb', color: '#d97706' }
        : {}),
  };

  const hasImage = !!card.image;

  const rowStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
  };

  const thumbnailStyle: CSSProperties = {
    width: '72px',
    minHeight: '72px',
    flexShrink: 0,
    background: theme.cardImage.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderTopLeftRadius: 'inherit',
    borderBottomLeftRadius: 'inherit',
  };

  const thumbnailImgStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  return (
    <div
      style={cardStyle}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={`View ${card.title}`}
    >
      <div style={rowStyle}>
        {hasImage && (
          <div style={thumbnailStyle}>
            <img
              src={card.image}
              alt={card.title}
              style={thumbnailImgStyle}
              loading="lazy"
            />
          </div>
        )}
        <div style={bodyStyle}>
          <p style={titleStyle}>{card.title}</p>

          {(card.subtitle?.trim() || (card.availability && card.availability !== 'available')) && (
            <div style={subtitleRowStyle}>
              {card.subtitle?.trim() && <p style={subtitleStyle}>{card.subtitle.trim()}</p>}
              {card.availability && card.availability !== 'available' && (
                <span style={availabilityStyle}>
                  {card.availability === 'sold_out' ? 'Sold out' : 'Low stock'}
                </span>
              )}
            </div>
          )}

          {config.enableVariantSelectors && card.variants && card.variants.length > 0 && (
            <div style={variantsRowStyle}>
              {card.variants.map((variant) => (
                variant.options.map((opt) => (
                  <span
                    key={`${variant.name}-${opt}`}
                    style={variantBadgeStyle(opt === variant.selected)}
                  >
                    {opt}
                  </span>
                ))
              ))}
            </div>
          )}

          {!hasImage && config.imagePlaceholderText && (
            <p style={{ margin: '4px 0 0', fontSize: '10px', color: theme.cardSubtitle.color, opacity: 0.7, lineHeight: 1.3 }}>
              {config.imagePlaceholderText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, type CSSProperties } from 'react';
import type { CardTheme } from '../types.js';

interface CardImageProps {
  src?: string;
  alt: string;
  theme: CardTheme['cardImage'];
  /** Label for the error fallback (default: 'Image unavailable') */
  errorLabel?: string;
  /** Placeholder text shown when no image is available (e.g. demo disclaimer) */
  placeholderText?: string;
}

export function CardImage({ src, alt, theme, errorLabel, placeholderText }: CardImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(
    src ? 'loading' : 'error'
  );

  // No src — show placeholder disclaimer if provided, otherwise nothing
  if (!src) {
    if (!placeholderText) return null;
    const placeholderStyle: CSSProperties = {
      padding: '12px',
      fontSize: '11px',
      lineHeight: 1.4,
      color: theme.fallbackText,
      background: theme.fallbackBg,
      borderTopLeftRadius: 'inherit',
      borderTopRightRadius: 'inherit',
      textAlign: 'center' as const,
      opacity: 0.8,
    };
    return <div style={placeholderStyle}>{placeholderText}</div>;
  }

  // Image failed to load — compact single-line fallback
  if (status === 'error') {
    const errorStyle: CSSProperties = {
      padding: '6px 12px',
      fontSize: '11px',
      color: theme.fallbackText,
      background: theme.fallbackBg,
      borderTopLeftRadius: 'inherit',
      borderTopRightRadius: 'inherit',
    };
    return <div style={errorStyle}>{'\u26A0'} {errorLabel || 'Image unavailable'}</div>;
  }

  const containerStyle: CSSProperties = {
    aspectRatio: theme.aspectRatio,
    background: theme.bg,
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 'inherit',
    borderTopRightRadius: 'inherit',
  };

  const imgStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: status === 'loaded' ? 1 : 0,
    transition: 'opacity 0.3s ease',
  };

  return (
    <div style={containerStyle}>
      <img
        src={src}
        alt={alt}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('error')}
        style={imgStyle}
        loading="lazy"
      />
    </div>
  );
}

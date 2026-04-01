import { describe, test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardImage } from '../../src/components/CardImage.js';
import type { CardTheme } from '../../src/types.js';

const theme: CardTheme['cardImage'] = {
  bg: '#f3f4f6',
  fallbackBg: '#fef2f2',
  fallbackText: '#dc2626',
  aspectRatio: '16/9',
};

describe('CardImage', () => {
  test('renders null when no src and no placeholderText', () => {
    const { container } = render(
      <CardImage alt="test" theme={theme} />,
    );
    expect(container.innerHTML).toBe('');
  });

  test('renders placeholder text when no src but placeholderText provided', () => {
    render(
      <CardImage alt="test" theme={theme} placeholderText="Demo only" />,
    );
    expect(screen.getByText('Demo only')).toBeDefined();
  });

  test('renders img element when src provided', () => {
    render(
      <CardImage src="https://example.com/img.jpg" alt="Test image" theme={theme} />,
    );
    const img = screen.getByAltText('Test image') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/img.jpg');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  test('shows error fallback on image load failure', () => {
    render(
      <CardImage src="https://broken.com/404.jpg" alt="Broken" theme={theme} />,
    );
    const img = screen.getByAltText('Broken');
    fireEvent.error(img);
    expect(screen.getByText(/Image unavailable/)).toBeDefined();
  });

  test('shows custom error label on image load failure', () => {
    render(
      <CardImage
        src="https://broken.com/404.jpg"
        alt="Broken"
        theme={theme}
        errorLabel="Photo not found"
      />,
    );
    const img = screen.getByAltText('Broken');
    fireEvent.error(img);
    expect(screen.getByText(/Photo not found/)).toBeDefined();
  });

  test('image opacity transitions to 1 on load', () => {
    render(
      <CardImage src="https://example.com/img.jpg" alt="Loading" theme={theme} />,
    );
    const img = screen.getByAltText('Loading') as HTMLImageElement;
    // Before load, opacity is 0
    expect(img.style.opacity).toBe('0');
    // After load, opacity is 1
    fireEvent.load(img);
    expect(img.style.opacity).toBe('1');
  });
});

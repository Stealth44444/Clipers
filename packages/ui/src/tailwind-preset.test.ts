import { describe, it, expect } from 'vitest';
import { clipersPreset } from './tailwind-preset';

describe('clipersPreset', () => {
  it('defines the brand color tokens', () => {
    const colors = clipersPreset.theme?.extend?.colors as Record<string, string>;
    expect(colors['brand-primary']).toBe('var(--brand-primary)');
    expect(colors['status-positive']).toBe('var(--status-positive)');
  });

  it('fixes the button radius token', () => {
    const radius = clipersPreset.theme?.extend?.borderRadius as Record<string, string>;
    expect(radius.button).toBe('var(--radius-button)');
  });
});

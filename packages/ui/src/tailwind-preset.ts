import type { Config } from 'tailwindcss';

export const clipersPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-panel': 'var(--bg-panel)',
        'text-primary': 'var(--text-primary)',
        'border-stroke': 'var(--border-stroke)',
        'brand-primary': 'var(--brand-primary)',
        'brand-primary-dark': 'var(--brand-primary-dark)',
        'action-primary': 'var(--action-primary)',
        'status-positive': 'var(--status-positive)',
      },
      borderRadius: {
        button: 'var(--radius-button)',
      },
      borderWidth: {
        stroke: 'var(--border-width)',
      },
    },
  },
};

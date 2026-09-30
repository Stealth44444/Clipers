import type { Config } from 'tailwindcss';
import { clipersPreset } from '@clipers/ui';

const config: Config = {
  presets: [clipersPreset as Config],
  content: ['./app/**/*.{ts,tsx}'],
};

export default config;

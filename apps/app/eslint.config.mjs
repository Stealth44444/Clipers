import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  // Plain <img> on purpose: SVG logos and remote thumbnails gain nothing from next/image.
  { rules: { '@next/next/no-img-element': 'off' } },
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
];

export default eslintConfig;

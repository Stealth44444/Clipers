import { useId } from 'react';

const METALS = {
  1: { light: '#fbe7a1', mid: '#e3b54a', dark: '#a8781f', edge: '#7a5512' },
  2: { light: '#f4f6f8', mid: '#c4cad1', dark: '#8a929b', edge: '#5f666e' },
  3: { light: '#f3c6a2', mid: '#c98552', dark: '#8f5530', edge: '#653a1f' },
} as const;

/** Hexagonal podium medal for ranks 1–3, drawn as SVG so it stays crisp and needs no image assets. */
export function RankMedal({ rank, size = 96 }: { rank: 1 | 2 | 3; size?: number }) {
  const id = useId();
  const metal = METALS[rank];
  const hexagon = 'M50 4 L90 27 L90 73 L50 96 L10 73 L10 27 Z';
  const inner = 'M50 14 L81 32 L81 68 L50 86 L19 68 L19 32 Z';

  return (
    <svg aria-label={`${rank}위`} height={size} role="img" viewBox="0 0 100 100" width={size}>
      <defs>
        <linearGradient id={`${id}-face`} x1="0.15" x2="0.85" y1="0" y2="1">
          <stop offset="0%" stopColor={metal.light} />
          <stop offset="45%" stopColor={metal.mid} />
          <stop offset="100%" stopColor={metal.dark} />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={metal.mid} />
          <stop offset="100%" stopColor={metal.edge} />
        </linearGradient>
        <filter height="140%" id={`${id}-shadow`} width="140%" x="-20%" y="-10%">
          <feDropShadow dx="0" dy="6" floodColor="#000" floodOpacity="0.45" stdDeviation="5" />
        </filter>
      </defs>
      <g filter={`url(#${id}-shadow)`}>
        <path d={hexagon} fill={`url(#${id}-rim)`} />
        <path d={inner} fill={`url(#${id}-face)`} />
        <path d="M19 32 L50 14 L81 32 L81 44 L19 44 Z" fill="#fff" opacity="0.18" />
        <text
          fill={metal.edge}
          fontFamily="var(--font-body)"
          fontSize="40"
          fontWeight="600"
          opacity="0.85"
          textAnchor="middle"
          x="50"
          y="64"
        >
          {rank}
        </text>
      </g>
    </svg>
  );
}

import { describe, expect, it } from 'vitest';
import {
  PARETO_ALPHA,
  belowMeanShare,
  hitProbability,
  hitTiles,
  medianPricePer1kManwon,
  medianToMean,
  topShare,
  worstCostMultiple,
} from './views-math';

describe('views math (80:20 as a Pareto distribution)', () => {
  it('gives the top 20% of videos 80% of views', () => {
    expect(PARETO_ALPHA).toBeCloseTo(1.161, 3);
    expect(topShare(0.2)).toBeCloseTo(0.8, 6);
  });

  it('puts the median at a quarter of the mean', () => {
    expect(medianToMean()).toBeCloseTo(0.2519, 4);
    expect(medianPricePer1kManwon()).toBe(8);
  });

  it('leaves nine posts in ten below the mean, at worst about 7x the price per view', () => {
    expect(belowMeanShare()).toBeCloseTo(0.899, 3);
    expect(worstCostMultiple()).toBeCloseTo(7.21, 2);
  });

  it('gives ten clips an 89% chance of one top-20% hit', () => {
    expect(hitProbability(1)).toBeCloseTo(0.2, 6);
    expect(hitProbability(10)).toBeCloseTo(0.8926, 4);
  });

  it('scatters a fixed set of hit tiles', () => {
    const hits = hitTiles(100, 20);
    expect(hits).toHaveLength(20);
    expect(new Set(hits).size).toBe(20);
    expect(hits.every((index) => index >= 0 && index < 100)).toBe(true);
    expect(hitTiles(100, 20)).toEqual(hits);
  });
});

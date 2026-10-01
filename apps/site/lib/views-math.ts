// The numbers behind the brand page's data section (spec: docs/superpowers/specs/2026-10-01-brand-hero-data-design.md §3).
// Short-form views split 80:20 (SILC, UIUC·MIT 2026); modelled as a Pareto distribution, a few closed forms follow.
// Nothing here touches Clipers' own rates.

/** Pareto shape for which the top 20% of videos hold 80% of views: log 5 / log 4. */
export const PARETO_ALPHA = Math.log(5) / Math.log(4);

/** Sponsored short-form price basis: 20,000원 per 1,000 average views (Tagby, 2026). */
export const SPONSOR_PRICE_PER_1K = 20_000;

/** Share of all views held by the top `fraction` of videos. */
export function topShare(fraction: number, alpha = PARETO_ALPHA): number {
  return Math.pow(fraction, 1 - 1 / alpha);
}

/** Median views ÷ mean views. */
export function medianToMean(alpha = PARETO_ALPHA): number {
  return ((alpha - 1) / alpha) * Math.pow(2, 1 / alpha);
}

/** Share of posts that get fewer views than the mean they were priced on. */
export function belowMeanShare(alpha = PARETO_ALPHA): number {
  return 1 - Math.pow(alpha / (alpha - 1), -alpha);
}

/** The worst post's real cost per view, as a multiple of the agreed price (mean ÷ minimum). */
export function worstCostMultiple(alpha = PARETO_ALPHA): number {
  return alpha / (alpha - 1);
}

/** Chance that at least one of `clips` lands in the top `top` share of videos. */
export function hitProbability(clips: number, top = 0.2): number {
  return 1 - Math.pow(1 - top, clips);
}

/** What the median post really pays per 1,000 views, in 만 원, rounded. */
export function medianPricePer1kManwon(): number {
  return Math.round(SPONSOR_PRICE_PER_1K / medianToMean() / 10_000);
}

/** Which of `total` tiles are hits, in the order they fill: a fixed shuffle so server and client agree. */
export function hitTiles(total: number, hits: number, seed = 5): number[] {
  let state = seed;
  const next = () => (state = (state * 16807) % 2147483647) / 2147483647;
  const order = Array.from({ length: total }, (_, index) => index);
  for (let index = total - 1; index > 0; index--) {
    const swap = Math.floor(next() * (index + 1));
    [order[index], order[swap]] = [order[swap], order[index]];
  }
  return order.slice(0, hits);
}

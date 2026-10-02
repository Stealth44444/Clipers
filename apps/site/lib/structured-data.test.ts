import { describe, expect, it } from 'vitest';
import { DEFAULT_PRICING } from '@clipers/db';
import { formatKRW } from '@clipers/ui';
import { ORGANIZATION_ID } from './company';
import { GUIDES } from './guides';
import { brandServiceJsonLd, guideListJsonLd } from './structured-data';

describe('structured data', () => {
  it('describes the brand service without any price', () => {
    const service = brandServiceJsonLd();
    expect(service['@type']).toBe('Service');
    expect(service.provider).toEqual({ '@id': ORGANIZATION_ID });
    const json = JSON.stringify(service);
    for (const word of ['offers', 'price', '1천 회당', formatKRW(DEFAULT_PRICING.brandCpm), formatKRW(DEFAULT_PRICING.creatorCpm)]) {
      expect(json).not.toContain(word);
    }
  });

  it('lists every guide once, in order', () => {
    const list = guideListJsonLd(GUIDES);
    expect(list['@type']).toBe('ItemList');
    expect(list.itemListElement.map((item) => item.position)).toEqual(GUIDES.map((_, index) => index + 1));
    expect(new Set(list.itemListElement.map((item) => item.url)).size).toBe(GUIDES.length);
  });
});

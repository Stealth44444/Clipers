import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { categoryGroup, categoryId, categoryLabel, isCategoryId } from './categories';
import { INTERESTS } from './onboarding';

describe('campaign categories', () => {
  it('reads ids and legacy labels alike', () => {
    expect(categoryId('kpop')).toBe('kpop');
    expect(categoryId('K팝·아이돌')).toBe('kpop');
    expect(categoryLabel('kpop')).toBe('K팝·아이돌');
    expect(categoryLabel('K팝·아이돌')).toBe('K팝·아이돌');
    expect(categoryGroup('fitness')).toBe('health');
    expect(categoryGroup('운동·헬스')).toBe('health');
  });

  it('leaves unknown values alone', () => {
    expect(categoryId('기타')).toBeNull();
    expect(categoryLabel('기타')).toBe('기타');
    expect(categoryGroup('기타')).toBeNull();
    expect(isCategoryId('K팝·아이돌')).toBe(false);
  });

  it('match the ids and labels the pending database migration uses', () => {
    const pending = fileURLToPath(new URL('../../../supabase/pending/', import.meta.url));
    const sql = readdirSync(pending)
      .filter((file) => file.includes('category'))
      .map((file) => readFileSync(pending + file, 'utf8'))
      .join('\n');
    for (const interest of INTERESTS) {
      expect(sql).toContain(`('${interest.label}', '${interest.id}')`);
    }
  });
});

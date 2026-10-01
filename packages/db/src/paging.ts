// PostgREST caps responses (1,000 rows by default) and long `in.(...)` filters can exceed URL limits.
// Aggregations must read every row, so they page with .range() and split id lists into chunks.

type PageResult<T> = { data: T[] | null; error: { message: string } | null };
export type PageQuery<T> = (from: number, to: number) => PromiseLike<PageResult<T>>;

const PAGE_SIZE = 1000;
const ID_CHUNK = 100;

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size));
  return groups;
}

/** Reads every row of a query. The query must have a stable order (e.g. `.order('id')`) for paging to be reliable. */
export async function fetchAllRows<T>(page: PageQuery<T>, pageSize = PAGE_SIZE): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
  }
}

/** fetchAllRows for an `.in(column, ids)` filter, querying the ids a chunk at a time. */
export async function fetchAllRowsIn<T, Id>(ids: readonly Id[], build: (slice: Id[]) => PageQuery<T>, chunkSize = ID_CHUNK): Promise<T[]> {
  const rows: T[] = [];
  for (const slice of chunk(ids, chunkSize)) rows.push(...(await fetchAllRows(build(slice))));
  return rows;
}

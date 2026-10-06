export interface PageResult<T> {
  items: T[];
  hasNext: boolean;
}

export interface PagedResult<T> {
  items: T[];
  /** true when `maxPages` was reached while GitHub still had more pages. */
  truncated: boolean;
  pages: number;
}

/** Whether a REST page has a successor: the Link header is authoritative, a full page is the fallback. */
export function hasNextPage(linkHeader: string | null, itemCount: number, perPage: number): boolean {
  if (linkHeader !== null) return /<[^>]*>;\s*rel="next"/.test(linkHeader);
  return itemCount >= perPage;
}

/**
 * Sequential page walker with a hard safety limit. Pages are requested by number
 * (never by following URLs from the response), one at a time.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<PageResult<T>>,
  maxPages: number
): Promise<PagedResult<T>> {
  const items: T[] = [];
  let pages = 0;
  while (pages < maxPages) {
    const result = await fetchPage(pages + 1);
    pages++;
    items.push(...result.items);
    if (!result.hasNext) return { items, truncated: false, pages };
  }
  return { items, truncated: true, pages };
}

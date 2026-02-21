declare function saveSnapshot<T>(key: string, data: T): void;
declare function loadSnapshot<T>(key: string): T | null;
/**
 * Stale-while-revalidate helper.
 * Returns snapshot instantly if available (refreshes in background),
 * otherwise awaits the fetcher and saves the result.
 */
declare function snapshotFirst<T>(key: string, fetcher: () => Promise<T | null>): Promise<T | null>;

export { loadSnapshot, saveSnapshot, snapshotFirst };

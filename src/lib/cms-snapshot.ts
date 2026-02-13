import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs';
import { join } from 'path';

const SNAPSHOT_DIR = join(process.cwd(), 'cms-snapshots');
try { mkdirSync(SNAPSHOT_DIR, { recursive: true }); } catch {}

export function saveSnapshot<T>(key: string, data: T): void {
  try {
    const path = join(SNAPSHOT_DIR, `${key}.json`);
    const tmp = path + '.tmp';
    writeFileSync(tmp, JSON.stringify(data));
    renameSync(tmp, path); // atomic write
  } catch (error) {
    console.error(`[cms-snapshot] Failed to save ${key}:`, error);
  }
}

export function loadSnapshot<T>(key: string): T | null {
  try {
    const path = join(SNAPSHOT_DIR, `${key}.json`);
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch {
    return null;
  }
}

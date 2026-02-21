// src/index.ts
import { readFileSync, writeFileSync, mkdirSync, renameSync } from "fs";
import { join } from "path";
var SNAPSHOT_DIR = join(process.cwd(), "cms-snapshots");
try {
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
} catch {
}
function saveSnapshot(key, data) {
  try {
    const path = join(SNAPSHOT_DIR, `${key}.json`);
    const tmp = path + ".tmp";
    writeFileSync(tmp, JSON.stringify(data));
    renameSync(tmp, path);
  } catch (error) {
    console.error(`[cms-snapshot] Failed to save ${key}:`, error);
  }
}
function loadSnapshot(key) {
  try {
    const path = join(SNAPSHOT_DIR, `${key}.json`);
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}
async function snapshotFirst(key, fetcher) {
  const snapshot = loadSnapshot(key);
  if (snapshot) {
    void fetcher().then((result2) => {
      if (result2 !== null) saveSnapshot(key, result2);
    }).catch(() => {
    });
    return snapshot;
  }
  const result = await fetcher();
  if (result !== null) {
    saveSnapshot(key, result);
    return result;
  }
  return null;
}
export {
  loadSnapshot,
  saveSnapshot,
  snapshotFirst
};
//# sourceMappingURL=index.js.map
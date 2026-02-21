"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  loadSnapshot: () => loadSnapshot,
  saveSnapshot: () => saveSnapshot,
  snapshotFirst: () => snapshotFirst
});
module.exports = __toCommonJS(src_exports);
var import_fs = require("fs");
var import_path = require("path");
var SNAPSHOT_DIR = (0, import_path.join)(process.cwd(), "cms-snapshots");
try {
  (0, import_fs.mkdirSync)(SNAPSHOT_DIR, { recursive: true });
} catch {
}
function saveSnapshot(key, data) {
  try {
    const path = (0, import_path.join)(SNAPSHOT_DIR, `${key}.json`);
    const tmp = path + ".tmp";
    (0, import_fs.writeFileSync)(tmp, JSON.stringify(data));
    (0, import_fs.renameSync)(tmp, path);
  } catch (error) {
    console.error(`[cms-snapshot] Failed to save ${key}:`, error);
  }
}
function loadSnapshot(key) {
  try {
    const path = (0, import_path.join)(SNAPSHOT_DIR, `${key}.json`);
    return JSON.parse((0, import_fs.readFileSync)(path, "utf-8"));
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  loadSnapshot,
  saveSnapshot,
  snapshotFirst
});
//# sourceMappingURL=index.cjs.map
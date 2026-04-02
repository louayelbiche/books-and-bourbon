var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
// Allowlist of valid table/column identifiers for $queryRawUnsafe.
// Only PostgreSQL-safe identifiers are accepted (letters, digits, underscores).
var IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;
/**
 * Prisma database connectivity check.
 * Runs `SELECT 1` via `$queryRawUnsafe` to verify the database connection is alive.
 *
 * @param prisma - Any Prisma client instance (uses `$queryRawUnsafe`)
 * @returns A HealthCheck that verifies database connectivity
 *
 * @example
 * ```typescript
 * import { prisma } from '@/lib/prisma';
 * import { prismaCheck } from '@runwell/health';
 *
 * const healthChecks = [prismaCheck(prisma)];
 * ```
 */
export function prismaCheck(prisma) {
    var _this = this;
    return {
        name: 'database',
        check: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, prisma.$queryRawUnsafe('SELECT 1')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, { status: 'pass', message: 'Database connection OK' }];
                }
            });
        }); },
    };
}
/**
 * Redis connectivity check.
 * Connects to the given Redis URL, sends a PING, and disconnects.
 *
 * Requires `ioredis` to be installed in the consuming project.
 * Uses dynamic import to avoid hard dependency.
 *
 * @param redisUrl - Redis connection URL (e.g. "redis://localhost:6379")
 * @returns A HealthCheck that verifies Redis connectivity
 *
 * @example
 * ```typescript
 * import { redisCheck } from '@runwell/health';
 *
 * const healthChecks = [redisCheck(process.env.REDIS_URL!)];
 * ```
 */
export function redisCheck(redisUrl) {
    var _this = this;
    return {
        name: 'redis',
        check: function () { return __awaiter(_this, void 0, void 0, function () {
            var RedisConstructor, moduleName, mod, _a, client, pong;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        moduleName = 'ioredis';
                        return [4 /*yield*/, Function('moduleName', 'return import(moduleName)')(moduleName)];
                    case 1:
                        mod = _b.sent();
                        RedisConstructor = mod.default;
                        return [3 /*break*/, 3];
                    case 2:
                        _a = _b.sent();
                        return [2 /*return*/, {
                                status: 'fail',
                                message: 'ioredis not installed. Add it as a dependency to use redisCheck.',
                            }];
                    case 3:
                        client = new RedisConstructor(redisUrl);
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, , 6, 8]);
                        return [4 /*yield*/, client.ping()];
                    case 5:
                        pong = _b.sent();
                        if (pong !== 'PONG') {
                            return [2 /*return*/, {
                                    status: 'warn',
                                    message: "Redis PING returned unexpected: ".concat(pong),
                                }];
                        }
                        return [2 /*return*/, { status: 'pass', message: 'Redis connection OK' }];
                    case 6: return [4 /*yield*/, client.quit().catch(function () {
                            // Swallow quit errors — connection may already be closed
                        })];
                    case 7:
                        _b.sent();
                        return [7 /*endfinally*/];
                    case 8: return [2 /*return*/];
                }
            });
        }); },
    };
}
/**
 * Seed data freshness check.
 * Queries the most recent record in a given table/column and compares
 * it against a staleness threshold.
 *
 * Useful for demo/staging environments where seed data can become stale
 * and cause confusing UX (e.g. "last sale was 90 days ago").
 *
 * @param prisma - Any Prisma client instance (uses `$queryRawUnsafe`)
 * @param options - Configuration for the freshness check
 * @param options.table - Database table name to query
 * @param options.dateColumn - Column containing the date to check
 * @param options.maxStaleDays - Number of days after which data is considered stale
 * @returns A HealthCheck that verifies seed data freshness
 *
 * @example
 * ```typescript
 * import { prisma } from '@/lib/prisma';
 * import { seedFreshnessCheck } from '@runwell/health';
 *
 * const healthChecks = [
 *   seedFreshnessCheck(prisma, {
 *     table: 'Sale',
 *     dateColumn: 'createdAt',
 *     maxStaleDays: 7,
 *   }),
 * ];
 * ```
 */
export function seedFreshnessCheck(prisma, options) {
    var _this = this;
    var table = options.table, dateColumn = options.dateColumn, maxStaleDays = options.maxStaleDays;
    // Validate identifiers against strict pattern to prevent SQL injection.
    // Only safe PostgreSQL identifiers are allowed (no special chars, no quotes).
    if (!IDENTIFIER_RE.test(table)) {
        throw new Error("Invalid table name: ".concat(table));
    }
    if (!IDENTIFIER_RE.test(dateColumn)) {
        throw new Error("Invalid column name: ".concat(dateColumn));
    }
    return {
        name: "seed-freshness:".concat(table),
        check: function () { return __awaiter(_this, void 0, void 0, function () {
            var rows, maxDate, latestDate, now, staleDays;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, prisma.$queryRawUnsafe("SELECT MAX(\"".concat(dateColumn, "\") as \"maxDate\" FROM \"").concat(table, "\""))];
                    case 1:
                        rows = (_b.sent());
                        maxDate = (_a = rows[0]) === null || _a === void 0 ? void 0 : _a.maxDate;
                        if (!maxDate) {
                            return [2 /*return*/, {
                                    status: 'fail',
                                    message: "No records found in ".concat(table, ".").concat(dateColumn),
                                    details: { table: table, dateColumn: dateColumn },
                                }];
                        }
                        latestDate = new Date(maxDate);
                        now = new Date();
                        staleDays = Math.floor((now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
                        if (staleDays > maxStaleDays) {
                            return [2 /*return*/, {
                                    status: 'warn',
                                    message: "".concat(table, " seed data is ").concat(staleDays, " days stale (threshold: ").concat(maxStaleDays, ")"),
                                    details: {
                                        table: table,
                                        dateColumn: dateColumn,
                                        latestDate: latestDate.toISOString(),
                                        staleDays: staleDays,
                                        maxStaleDays: maxStaleDays,
                                    },
                                }];
                        }
                        return [2 /*return*/, {
                                status: 'pass',
                                message: "".concat(table, " seed data is fresh (").concat(staleDays, " days old)"),
                                details: {
                                    table: table,
                                    dateColumn: dateColumn,
                                    latestDate: latestDate.toISOString(),
                                    staleDays: staleDays,
                                    maxStaleDays: maxStaleDays,
                                },
                            }];
                }
            });
        }); },
    };
}

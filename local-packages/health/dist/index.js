// src/checks.ts
var IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;
function prismaCheck(prisma) {
  return {
    name: "database",
    check: async () => {
      await prisma.$queryRawUnsafe("SELECT 1");
      return { status: "pass", message: "Database connection OK" };
    }
  };
}
function redisCheck(redisUrl) {
  return {
    name: "redis",
    check: async () => {
      let RedisConstructor;
      try {
        const moduleName = "ioredis";
        const mod = await Function(
          "moduleName",
          "return import(moduleName)"
        )(moduleName);
        RedisConstructor = mod.default;
      } catch {
        return {
          status: "fail",
          message: "ioredis not installed. Add it as a dependency to use redisCheck."
        };
      }
      const client = new RedisConstructor(redisUrl);
      try {
        const pong = await client.ping();
        if (pong !== "PONG") {
          return {
            status: "warn",
            message: `Redis PING returned unexpected: ${pong}`
          };
        }
        return { status: "pass", message: "Redis connection OK" };
      } finally {
        await client.quit().catch(() => {
        });
      }
    }
  };
}
function seedFreshnessCheck(prisma, options) {
  const { table, dateColumn, maxStaleDays } = options;
  if (!IDENTIFIER_RE.test(table)) {
    throw new Error(`Invalid table name: ${table}`);
  }
  if (!IDENTIFIER_RE.test(dateColumn)) {
    throw new Error(`Invalid column name: ${dateColumn}`);
  }
  return {
    name: `seed-freshness:${table}`,
    check: async () => {
      var _a;
      const rows = await prisma.$queryRawUnsafe(
        `SELECT MAX("${dateColumn}") as "maxDate" FROM "${table}"`
      );
      const maxDate = (_a = rows[0]) == null ? void 0 : _a.maxDate;
      if (!maxDate) {
        return {
          status: "fail",
          message: `No records found in ${table}.${dateColumn}`,
          details: { table, dateColumn }
        };
      }
      const latestDate = new Date(maxDate);
      const now = /* @__PURE__ */ new Date();
      const staleDays = Math.floor(
        (now.getTime() - latestDate.getTime()) / (1e3 * 60 * 60 * 24)
      );
      if (staleDays > maxStaleDays) {
        return {
          status: "warn",
          message: `${table} seed data is ${staleDays} days stale (threshold: ${maxStaleDays})`,
          details: {
            table,
            dateColumn,
            latestDate: latestDate.toISOString(),
            staleDays,
            maxStaleDays
          }
        };
      }
      return {
        status: "pass",
        message: `${table} seed data is fresh (${staleDays} days old)`,
        details: {
          table,
          dateColumn,
          latestDate: latestDate.toISOString(),
          staleDays,
          maxStaleDays
        }
      };
    }
  };
}

// src/index.ts
function createHealthCheck(options) {
  return async function GET() {
    const checks = {};
    const errors = [];
    for (const check of options.checks ?? []) {
      const start = performance.now();
      try {
        const result = await check.check();
        result.latencyMs = Math.round(performance.now() - start);
        checks[check.name] = result;
      } catch (err) {
        const elapsed = Math.round(performance.now() - start);
        const message = err instanceof Error ? err.message : String(err);
        checks[check.name] = {
          status: "fail",
          latencyMs: elapsed,
          message
        };
        errors.push(`${check.name}: ${message}`);
      }
    }
    const statuses = Object.values(checks).map((c) => c.status);
    const status = statuses.includes("fail") ? "unhealthy" : statuses.includes("warn") ? "degraded" : "healthy";
    const httpStatus = status === "unhealthy" ? 503 : 200;
    const response = {
      status,
      project: options.projectName,
      version: options.version,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: process.uptime(),
      checks,
      ...errors.length > 0 && { errors }
    };
    return Response.json(response, {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate"
      }
    });
  };
}
export {
  createHealthCheck,
  prismaCheck,
  redisCheck,
  seedFreshnessCheck
};

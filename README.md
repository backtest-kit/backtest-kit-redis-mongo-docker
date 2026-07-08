<img src="https://github.com/tripolskypetr/backtest-kit/raw/refs/heads/master/assets/consciousness.svg" height="45px" align="right">

# 🧿 backtest-kit-redis-postgres-pgpool-docker

> A production-grade integration of [backtest-kit](https://github.com/tripolskypetr/backtest-kit) that replaces the default file-based `./dump/` persistence with **PostgreSQL** as the source of truth and **Redis** as an O(1) lookup cache, packaged with `docker-compose` for one-command deploys.

![screenshot](https://raw.githubusercontent.com/tripolskypetr/backtest-kit/HEAD/assets/screenshots/screenshot16.png)

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/tripolskypetr/backtest-kit)
[![npm](https://img.shields.io/npm/v/backtest-kit.svg?style=flat-square)](https://npmjs.org/package/backtest-kit)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)]()
[![Build](https://github.com/tripolskypetr/backtest-kit/actions/workflows/webpack.yml/badge.svg)](https://github.com/tripolskypetr/backtest-kit/actions/workflows/webpack.yml)

This project ships **16 custom Persist adapters** that implement the full backtest-kit `IPersist*Instance` contract on top of PostgreSQL (via TypeORM) + Redis. Strategy code, runners, and the CLI entrypoint stay unchanged — only the persistence layer is swapped.

📚 **[API Reference](https://backtest-kit.github.io/documents/example_02_first_backtest.html)** | 🌟 **[Quick Start](https://github.com/tripolskypetr/backtest-kit/tree/master/example)** | **📰 [Article](https://backtest-kit.github.io/documents/article_07_ai_news_trading_signals.html)**


## 🚀 Quick Start

### Local run (host node, dockerized infrastructure)

Start the PostgreSQL cluster and Redis in containers:

```bash
docker-compose -f docker/pgpool/docker-compose.yaml up -d
docker-compose -f docker/redis/docker-compose.yaml up -d
```

`docker/pgpool` boots a whole cluster — 1 primary + 2 streaming replicas behind Pgpool-II — on `:5432` (see [Docker Layout](#-docker-layout)). The app connects to that single port; writes go to the primary, reads are load-balanced across the replicas. First boot takes ~60–90 s while the replicas clone.

Run a backtest:

```bash
npm run start -- --entry --backtest --ui ./build/index.cjs
```

Live mode:

```bash
npm run start -- --entry --live --ui ./build/index.cjs
```

Paper mode:

```bash
npm run start -- --entry --paper --ui ./build/index.cjs
```

### Full docker deploy

Bundles the strategy, runner, and `backtest-kit` container together. Reads `MODE` from env (`backtest` | `live` | `paper`):

```bash
MODE=backtest ENTRY=1 UI=1 STRATEGY_FILE=./build/index.cjs docker-compose up -d
docker-compose logs -f
```

Or via npm script:

```bash
npm run start:docker
npm run stop:docker
```


## 🗂️ The 16 Persist Adapters

Each adapter implements the corresponding `IPersist*Instance` interface from `backtest-kit` and is registered in [src/config/setup.ts](src/config/setup.ts). All adapters share the same skeleton:

```ts
PersistXAdapter.usePersistXAdapter(class implements IPersistXInstance {
  constructor(/* context fields from backtest-kit */) {}
  async waitForInit(initial: boolean) {
    if (!initial) return;
    await waitForInfra();        // gate first-touch on Postgres + Redis ready
  }
  async readXData(...) { return await ioc.xDbService.findByContext(...); }
  async writeXData(..., when: Date) { await ioc.xDbService.upsert(..., when); }
});
```

| Adapter | Table | Context key (= unique index) | Purpose |
|---|---|---|---|
| **Candle** | `candle-items` | `(symbol, interval, timestamp)` | OHLCV cache; immutable inserts |
| **Signal** | `signal-items` | `(symbol, strategyName, exchangeName)` | Live signal state per context |
| **Schedule** | `schedule-items` | `(symbol, strategyName, exchangeName)` | Pending scheduled signal |
| **Strategy** | `strategy-items` | `(symbol, strategyName, exchangeName)` | Persistent strategy state per context |
| **Risk** | `risk-items` | `(riskName, exchangeName)` | Active risk positions snapshot |
| **Partial** | `partial-items` | `(symbol, strategyName, exchangeName, signalId)` | Partial profit/loss levels per signal |
| **Breakeven** | `breakeven-items` | `(symbol, strategyName, exchangeName, signalId)` | Breakeven reached flag |
| **Storage** | `storage-items` | `(backtest, signalId)` | Closed/opened signal log per mode |
| **Notification** | `notification-items` | `(backtest, notificationId)` | Event notifications |
| **Log** | `log-items` | `(entryId)` | Strategy log entries |
| **Measure** | `measure-items` | `(bucket, entryKey)` | LLM/API response cache (soft-delete) |
| **Interval** | `interval-items` | `(bucket, entryKey)` | Once-per-interval markers (soft-delete) |
| **Memory** | `memory-items` | `(signalId, bucketName, memoryId)` | Per-signal memory store (soft-delete) |
| **Recent** | `recent-items` | `(symbol, strategyName, exchangeName, frameName, backtest)` | Last public signal per context |
| **State** | `state-items` | `(signalId, bucketName)` | Per-signal state buckets |
| **Session** | `session-items` | `(strategyName, exchangeName, frameName, symbol, backtest)` | One session per running strategy |


## ⚛️ Atomicity & Read-After-Write Guarantee

`backtest-kit` is **designed with a write durability contract**: after `writeXData(...)` returns, the very next `readXData(...)` must see the just-written value. The default file-based persist satisfies this trivially via `fs.writeFile` + `fs.readFile`. A naïve SQL implementation — `findByContext → if existing update else insert` — does **not** satisfy this contract under concurrent access: two parallel writers both see "no existing row", both attempt insert, the second one crashes with a unique-constraint violation. The framework then re-fetches from the exchange, retries the write, loops forever, or silently corrupts state.

### How we solve it

Every `upsert` in this project goes through a **single atomic round-trip** to PostgreSQL — one `INSERT … ON CONFLICT … DO UPDATE … RETURNING *` statement, no read-then-write:

```ts
// from src/lib/services/db/SignalDbService.ts
public upsert = async (symbol, strategyName, exchangeName, payload) => {
  const repo = await this.repo<ISignalRowDoc>();
  const { raw } = await repo
    .createQueryBuilder()
    .insert()
    .values({ symbol, strategyName, exchangeName, payload })
    .orUpdate(["payload"], ["symbol", "strategyName", "exchangeName"])  // conflict target = unique index
    .returning("*")
    .execute();
  const result = raw[0] as ISignalRowDoc;
  await this.signalCacheService.setSignalId(result);     // Redis: ctx-key → id
};
```

Key properties of this pattern:

1. **Conflict target == unique index shape.** Every table has a unique compound index whose columns are exactly the context key fields. PostgreSQL serializes concurrent inserts on that key at the storage engine level — the loser of the race takes the `DO UPDATE` branch instead of throwing, so no unique-violation ever leaks to the application.
2. **`DO UPDATE SET payload = EXCLUDED.payload`, not a no-op.** Subsequent writes to the same context key are real *updates*. The exception is `CandleDbService`, where candles are immutable: it uses a no-op `DO UPDATE SET symbol = EXCLUDED.symbol` so the OHLCV columns are never overwritten while the row is still returned (insert-only, but always readable).
3. **`RETURNING *`** yields the just-written row in the same statement. Its id is fed to the Redis cache immediately, so the next `findByContext` is O(1) — and, crucially, the cache is seeded from the returned row, **never** from a follow-up `SELECT` that could be routed to a lagging replica.
4. **uuid primary keys with `gen_random_uuid()`** and TypeORM `createDate`/`updateDate` columns are applied on insert automatically — no application-side id or timestamp bookkeeping.

For soft-delete operations (Measure, Interval, Memory), a parallel atomic pattern is used — a single server-side `UPDATE` with `jsonb_set`, never a read-modify-write:

```ts
public softRemove = async (bucket, entryKey) => {
  const repo = await this.repo<IIntervalRow>();
  const { raw } = await repo
    .createQueryBuilder()
    .update()
    .set({
      removed: true,
      payload: () => `jsonb_set("payload", '{removed}', 'true')`,  // flag flipped in-place, server-side
    })
    .where({ bucket, entryKey })
    .returning("*")
    .execute();
  const saved = raw[0];
  if (saved) await this.intervalCacheService.setIntervalId(saved);
};
```

The row is never physically deleted — `listKeys` filters on `removed = false` to skip tombstones. Because the new value is computed on the server (`jsonb_set`) inside one statement, there is no `SELECT`-then-`save` window where a concurrent upsert could be lost. This mirrors the soft-delete semantics of the default file-based `PersistMeasureInstance` / `PersistIntervalInstance` / `PersistMemoryInstance`.

### The single-node atomicity illusion

There is a subtle trap that only surfaces on a cluster. A lone PostgreSQL instance is **one process**: all concurrency is arbitrated internally by row locks and MVCC — effectively "atomicity through one global mutex". On such a node, even a sloppy `write` followed by a **separate** `SELECT` appears correct, because that `SELECT` hits the very same process that just committed. It *looks* atomic.

Add read replicas and the illusion breaks. Writes go to the primary, but reads are load-balanced onto asynchronous replicas that lag behind by a few milliseconds. Now a `write` + follow-up `SELECT` can be routed to a replica that has **not yet received** the commit, and the read returns a stale value (or `relation does not exist` right after schema creation) — silently violating the read-after-write contract. Code that passed every test on a single node corrupts state in production.

This is exactly why the two patterns above never do a follow-up read: the written row comes back in the **same** statement via `RETURNING`, and the Redis cache is seeded from it. It is also why the dev environment ([docker/pgpool](docker/pgpool)) runs a **real cluster with two replicas** rather than a single Postgres container — so any accidental read-after-write dependency is caught in development, not in prod. A one-node dev database would hide it behind the global-mutex illusion.

## ⚡ Redis as O(1) ID Cache

PostgreSQL queries on an indexed compound key are fast (O(log n) on the B-tree), but `backtest-kit` performs **thousands of read-by-context-key per second** during backtests. Redis turns that into O(1) lookups.

### The pattern

For each domain there is a `*CacheService` that extends `BaseMap` ([src/lib/common/BaseMap.ts](src/lib/common/BaseMap.ts)) — a thin wrapper around `ioredis` that gives a string-keyed map API (`get`, `set`, `delete`, `has`, `keys`, `values`, `toArray`, `iterate`, `size`) on top of Redis keys namespaced by a service prefix. The cache stores only the row's `id` (a uuid string), never the document itself.

```ts
// src/lib/services/cache/SignalCacheService.ts
const REDIS_KEY = "signal_cache";

export class SignalCacheService extends BaseMap(REDIS_KEY, -1) {  // -1 = no TTL
  private _cacheKey(symbol, strategyName, exchangeName) {
    return `${exchangeName}:${strategyName}:${symbol}`;
  }
  public async getSignalId(symbol, strategyName, exchangeName) {
    return <string>await super.get(this._cacheKey(...)) ?? null;
  }
  public async setSignalId(row) {
    await super.set(this._cacheKey(row.symbol, row.strategyName, row.exchangeName), row.id);
    return row.id;
  }
}
```

### Read path

```ts
public findByContext = async (symbol, strategyName, exchangeName) => {
  const cachedId = await this.signalCacheService.getSignalId(...);
  if (cachedId) {
    const cached = await super.findByFilter({ id: cachedId });   // ← O(1) Redis + PK lookup
    if (cached) return cached;
  }
  // Cache miss: fall back to Postgres by full filter, then backfill Redis.
  const result = await super.findByFilter({ symbol, strategyName, exchangeName });
  if (result) await this.signalCacheService.setSignalId(result);
  return result;
};
```

- **Cache hit (steady state):** one Redis `GET` + one Postgres lookup by primary key — both O(1)
- **Cache miss (cold start, eviction, Redis restart):** one Postgres `SELECT` by indexed filter + one Redis `SET` to backfill
- **After `upsert`:** the cache is updated synchronously from the `RETURNING` row in the same critical section, so the next `findByContext` always hits the cache

## 🛡️ Look-Ahead Bias Protection (`when: Date`)

`backtest-kit` 9.0+ added a `when: Date` argument to every adapter `write*` method (and to `read*` for adapters that affect signal logic: Risk, Partial, Breakeven). The argument carries the **logical simulation timestamp** at which the write happens.

For adapters that touch signal-affecting state (Risk, Partial, Breakeven, Recent, State, Session, Memory, Interval), the corresponding entity has a `when` column stored as `bigint` (epoch milliseconds). A shared `ValueTransformer` keeps the JS-visible value a plain `number`, since the `pg` driver returns `bigint` as a string:

```ts
// src/schema/State.schema.ts
const StateModel = new EntitySchema<IStateRow>({
  name: "state-items",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    signalId: { type: String },
    bucketName: { type: String },
    payload: { type: "jsonb" },                                  // typed by the domain payload
    when: { type: "bigint", transformer: epochTransformer },     // ms since epoch, read back as number
    createDate: { type: "timestamptz", createDate: true },
    updatedDate: { type: "timestamptz", updateDate: true },
  },
  indices: [{ name: "state_items_uq", columns: ["signalId", "bucketName"], unique: true }],
});
```

The DbService converts `Date → ms` and writes it in the same atomic upsert:

```ts
public upsert = async (signalId, bucketName, payload, when) => {
  const repo = await this.repo<IStateRow>();
  const { raw } = await repo
    .createQueryBuilder()
    .insert()
    .values({ signalId, bucketName, payload, when: when.getTime() })
    .orUpdate(["payload", "when"], ["signalId", "bucketName"])
    .returning("*")
    .execute();
  // ...
};
```

This lets backtest-kit's internal look-ahead-bias filter (which lives upstream of the adapter) verify that no `read` returns a value with `when > current_simulation_time`. **Measure** is intentionally exempt — it caches LLM responses where look-ahead bias is not applicable.

## 🐳 Docker Layout

```
docker/
  pgpool/docker-compose.yaml    # all-in-one cluster: primary + 2 replicas + Pgpool-II on :5432
  postgres/docker-compose.yaml  # single postgres:16-alpine on :5432 (simple/CI use)
  redis/docker-compose.yaml     # redis:7.4.1 on :6379, password=mysecurepassword
docker-compose.yaml             # main: backtest-kit container, mounts project as /workspace
```

The main `docker-compose.yaml` uses `extra_hosts: host.docker.internal:host-gateway` so the container reaches PostgreSQL and Redis on the host machine. Use `host.docker.internal` instead of `127.0.0.1` in your connection strings, or override via `.env` if your infrastructure runs elsewhere:

```bash
CC_POSTGRES_CONNECTION_STRING=postgres://backtest:mysecurepassword@prod-postgres:5432/backtest-pro
CC_REDIS_HOST=prod-redis
CC_REDIS_PORT=6379
CC_REDIS_USER=default
CC_REDIS_PASSWORD=...
```

The schema is created automatically on first connect (TypeORM `synchronize: true`), so there is no manual migration step — the tables and unique indexes appear when the app boots against an empty database.

Container env vars consumed by `@backtest-kit/cli`:

| Var | Purpose |
|---|---|
| `MODE` | `backtest` \| `live` \| `paper` |
| `STRATEGY_FILE` | Path to compiled strategy bundle (default: `./build/index.cjs`) |
| `ENTRY` | Set to `1` to actually run (matches `--entry` flag in CLI mode) |
| `SYMBOL`, `STRATEGY`, `EXCHANGE`, `FRAME` | Override strategy context |
| `UI` | Enable web UI on `:60050` |
| `TELEGRAM`, `VERBOSE`, `NO_CACHE`, `NO_FLUSH` | Standard backtest-kit CLI flags |

Healthcheck pings `http://localhost:60050/api/v1/health/health_check` every 30s.

## 📦 Strategy Definition

The actual trading logic lives outside the persistence layer — see [src/logic/strategy/](src/logic/strategy/) and [src/logic/frame/](src/logic/frame/) for examples, and [modules/](modules/) for the `ccxt` exchange adapter registration. Mode-specific entry points in [src/main/](src/main/) gate on CLI args from [src/helpers/getArgs.ts](src/helpers/getArgs.ts):

```ts
// src/main/backtest.ts
const main = async () => {
  const { values } = getArgs();
  if (!values.entry || !values.backtest) return;

  await ioc.postgresService.waitForInit();
  await ioc.redisService.waitForInit();
  await waitForReady(true);

  await warmCandles({ exchangeName: ExchangeName.CCXT, /* ... */ });

  Backtest.background("TRXUSDT", {
    exchangeName: ExchangeName.CCXT,
    frameName: FrameName.Jan2026Frame,
    strategyName: StrategyName.Jan2026Strategy,
  });
};
```

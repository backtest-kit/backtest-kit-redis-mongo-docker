<img src="https://github.com/tripolskypetr/backtest-kit/raw/refs/heads/master/assets/consciousness.svg" height="45px" align="right">

# 🧿backtest-kit-redis-mongo-docker

> A production-grade integration of [backtest-kit](https://github.com/tripolskypetr/backtest-kit) that replaces the default file-based `./dump/` persistence with **MongoDB** as the source of truth and **Redis** as an O(1) lookup cache, packaged with `docker-compose` for one-command deploys.

![screenshot](https://raw.githubusercontent.com/tripolskypetr/backtest-kit/HEAD/assets/screenshots/screenshot16.png)

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/tripolskypetr/backtest-kit)
[![npm](https://img.shields.io/npm/v/backtest-kit.svg?style=flat-square)](https://npmjs.org/package/backtest-kit)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)]()
[![Build](https://github.com/tripolskypetr/backtest-kit/actions/workflows/webpack.yml/badge.svg)](https://github.com/tripolskypetr/backtest-kit/actions/workflows/webpack.yml)

This project ships **15 custom Persist adapters** that implement the full backtest-kit `IPersist*Instance` contract on top of MongoDB + Redis. Strategy code, runners, and the CLI entrypoint stay unchanged — only the persistence layer is swapped.

📚 **[API Reference](https://backtest-kit.github.io/documents/example_02_first_backtest.html)** | 🌟 **[Quick Start](https://github.com/tripolskypetr/backtest-kit/tree/master/example)** | **📰 [Article](https://backtest-kit.github.io/documents/article_07_ai_news_trading_signals.html)**

## 🗂️ The 15 Persist Adapters

Each adapter implements the corresponding `IPersist*Instance` interface from `backtest-kit` and is registered in [src/config/setup.ts](src/config/setup.ts). All adapters share the same skeleton:

```ts
PersistXAdapter.usePersistXAdapter(class implements IPersistXInstance {
  constructor(/* context fields from backtest-kit */) {}
  async waitForInit(initial: boolean) {
    if (!initial) return;
    await waitForInfra();        // gate first-touch on Mongo + Redis ready
  }
  async readXData(...) { return await ioc.xDbService.findByContext(...); }
  async writeXData(..., when: Date) { await ioc.xDbService.upsert(..., when); }
});
```

| Adapter | Collection | Context key (= unique index) | Purpose |
|---|---|---|---|
| **Candle** | `candle-items` | `(symbol, interval, timestamp)` | OHLCV cache; immutable inserts |
| **Signal** | `signal-items` | `(symbol, strategyName, exchangeName)` | Live signal state per context |
| **Schedule** | `schedule-items` | `(symbol, strategyName, exchangeName)` | Pending scheduled signal |
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
| **Session** | `session-items` | `(strategyName, exchangeName, frameName)` | One session per running strategy |


## 🚀 Quick Start

### Local run (host node, dockerized infrastructure)

Start MongoDB and Redis in containers:

```bash
docker-compose -f docker/mongodb/docker-compose.yaml up -d
docker-compose -f docker/redis/docker-compose.yaml up -d
```

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


## ⚛️ Atomicity & Read-After-Write Guarantee

`backtest-kit` is **designed with a write durability contract**: after `writeXData(...)` returns, the very next `readXData(...)` must see the just-written value. The default file-based persist satisfies this trivially via `fs.writeFile` + `fs.readFile`. A naïve Mongo implementation — `findByContext → if existing update else create` — does **not** satisfy this contract under concurrent access: two parallel writers both hit "no existing", both attempt insert, second one crashes with `E11000 duplicate key`. The framework then re-fetches from the exchange, retries the write, loops forever, or silently corrupts state.

### How we solve it

Every `upsert` in this project goes through a **single atomic round-trip** to MongoDB:

```ts
// from src/lib/services/db/SignalDbService.ts
public upsert = async (symbol, strategyName, exchangeName, payload) => {
  const filter = { symbol, strategyName, exchangeName };  // matches the unique index
  const document = await SignalModel.findOneAndUpdate(
    filter,
    { $set: { payload } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const result = readTransform(document.toJSON()) as ISignalRowDoc;
  await this.signalCacheService.setSignalId(result);     // Redis: ctx-key → id
};
```

Key properties of this pattern:

1. **Filter shape == unique index shape.** Every collection has a Mongoose unique compound index whose fields are exactly the context key fields. MongoDB rejects all but one concurrent insert at the storage engine level — no E11000 leaks to the application.
2. **`$set` for mutable fields, never `$setOnInsert` for the payload.** Subsequent writes to the same context key are *updates*, not no-ops. The exception is `CandleDbService` where candles are immutable and use `$setOnInsert` to preserve the first-written values.
3. **`new: true`** returns the just-mutated document. The id is fed to the Redis cache immediately, so the next `findByContext` is O(1).
4. **`setDefaultsOnInsert: true`** ensures Mongoose schema defaults (`createDate`, `updatedDate`, `removed: false`) are applied on insert paths.

For soft-delete operations (Measure, Interval, Memory), a parallel atomic pattern is used:

```ts
public softRemove = async (bucket, entryKey) => {
  const document = await IntervalModel.findOneAndUpdate(
    { bucket, entryKey },
    { $set: { removed: true, "payload.removed": true } },
    { new: true },
  );
  if (document) await this.intervalCacheService.setIntervalId(...);
};
```

The document is never physically deleted — `listKeys` filters on `removed: false` to skip tombstones. This mirrors the soft-delete semantics of the default file-based `PersistMeasureInstance` / `PersistIntervalInstance` / `PersistMemoryInstance` ([Persist.ts:3304](backtest-kit/src/classes/Persist.ts#L3304)).

## ⚡ Redis as O(1) ID Cache

MongoDB queries on an indexed compound key are fast (O(log n) on the B-tree), but `backtest-kit` performs **thousands of read-by-context-key per second** during backtests. Redis turns that into O(1) lookups.

### The pattern

For each domain there is a `*CacheService` that extends `BaseMap` ([src/lib/common/BaseMap.ts](src/lib/common/BaseMap.ts)) — a thin wrapper around `ioredis` that gives a string-keyed map API (`get`, `set`, `delete`, `has`, `keys`, `values`, `toArray`, `iterate`, `size`) on top of Redis keys namespaced by a service prefix.

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
  try {
    const cachedId = await this.signalCacheService.getSignalId(...);
    if (cachedId) return await super.findById(cachedId);   // ← O(1) Redis + O(1) Mongo by _id
  } catch { void 0; }
  // Cache miss: fall back to Mongo by full filter, then backfill Redis.
  const result = await super.findByFilter({ symbol, strategyName, exchangeName });
  if (result) await this.signalCacheService.setSignalId(result);
  return result;
};
```

- **Cache hit (steady state):** one Redis `GET` + one Mongo `findById(_id)` — both O(1)
- **Cache miss (cold start, eviction, Redis restart):** one Mongo `findOne` by indexed filter + one Redis `SET` to backfill
- **After `upsert`:** the cache is updated synchronously in the same critical section, so the next `findByContext` always hits the cache

## 🛡️ Look-Ahead Bias Protection (`when: Date`)

`backtest-kit` 9.0+ added a `when: Date` argument to every adapter `write*` method (and to `read*` for adapters that affect signal logic: Risk, Partial, Breakeven). The argument carries the **logical simulation timestamp** at which the write happens.

For adapters that touch signal-affecting state (Risk, Partial, Breakeven, Recent, State, Session, Memory, Interval), the corresponding Mongoose schema has an indexed `when: Number` column:

```ts
// src/schema/State.schema.ts
const StateSchema = new Schema({
  signalId: { type: String, required: true, index: true },
  bucketName: { type: String, required: true, index: true },
  payload: { type: Schema.Types.Mixed, required: true },
  when: { type: Number, required: true, index: true },  // ms since epoch
});
```

The DbService converts `Date → ms` and stores it via `$set` on every upsert:

```ts
public upsert = async (signalId, bucketName, payload, when) => {
  const document = await StateModel.findOneAndUpdate(
    { signalId, bucketName },
    { $set: { payload, when: when.getTime() } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  // ...
};
```

This lets backtest-kit's internal look-ahead-bias filter (which lives upstream of the adapter) verify that no `read` returns a value with `when > current_simulation_time`. **Measure** is intentionally exempt — it caches LLM responses where look-ahead bias is not applicable.

## 🐳 Docker Layout

```
docker/
  mongodb/docker-compose.yaml   # mongodb:8.0.4 on :27017, volume ./mongo_data
  redis/docker-compose.yaml     # redis:7.4.1 on :6379, password=mysecurepassword
docker-compose.yaml             # main: backtest-kit container, mounts project as /workspace
```

The main `docker-compose.yaml` uses `network_mode: host` so the container reaches MongoDB and Redis on the host's `127.0.0.1` (defaults in `params.ts`). Override via `.env` if your infrastructure runs elsewhere:

```bash
CC_MONGO_CONNECTION_STRING=mongodb://prod-mongo:27017/backtest-pro
CC_REDIS_HOST=prod-redis
CC_REDIS_PORT=6379
CC_REDIS_USER=default
CC_REDIS_PASSWORD=...
```

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

  await ioc.mongoService.waitForInit();
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

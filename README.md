<img src="https://github.com/tripolskypetr/backtest-kit/raw/refs/heads/master/assets/consciousness.svg" height="45px" align="right">

# 🧿 backtest-kit-minio-s3-docker

> An integration of [backtest-kit](https://github.com/tripolskypetr/backtest-kit) that replaces the default file-based `./dump/` persistence with **MinIO (S3) as the source of truth** and **Redis as a time-ordered index**, packaged with `docker-compose` for one-command deploys.

![screenshot](https://raw.githubusercontent.com/tripolskypetr/backtest-kit/HEAD/assets/screenshots/screenshot16.png)

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/tripolskypetr/backtest-kit)
[![npm](https://img.shields.io/npm/v/backtest-kit.svg?style=flat-square)](https://npmjs.org/package/backtest-kit)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)]()
[![Build](https://github.com/tripolskypetr/backtest-kit/actions/workflows/webpack.yml/badge.svg)](https://github.com/tripolskypetr/backtest-kit/actions/workflows/webpack.yml)

This project ships **16 custom Persist adapters** that implement the full backtest-kit `IPersist*Instance` contract on top of MinIO + Redis. Strategy code, runners, and the CLI entrypoint stay unchanged — only the persistence layer is swapped.

An exotic but deliberate middle ground between the built-in file adapter and a full database:

| | Default file `./dump/` | **MinIO + Redis (this project)** | [`@backtest-kit/mongo`](backtest-kit/packages/mongo) / [`@backtest-kit/pg`](backtest-kit/packages/pg) |
|---|---|---|---|
| Infrastructure | none | 2 containers | database + Redis cache |
| Source of truth | JSON files on local disk | JSON objects in S3 bucket | rows / documents |
| Durability & ops | single host, manual backup | S3 semantics: versioning, replication, `mc mirror`, lifecycle | DB tooling: dumps, replicas |
| Newest-first listings | directory scan | Redis minute-index, O(limit) | `ORDER BY … LIMIT`, O(log n) |
| Point reads (candles) | `fs.readFile` | 1 GET ≈ 1–3 ms | b-tree lookup ≈ 0.1–1 ms |
| Sweet spot | local runs, CI | fat JSON snapshots, cheap unbounded archive, S3-native infra | hundreds of millions of candles, ad-hoc SQL/aggregation |

Pick this variant when you want S3-grade durability and zero schema management, but a full DBMS would be overkill. If your candle set grows into the hundreds of millions, take the `pg`/`mongo` package instead — b-trees win that workload.

📚 **[API Reference](https://backtest-kit.github.io/documents/example_02_first_backtest.html)** | 🌟 **[Quick Start](https://github.com/tripolskypetr/backtest-kit/tree/master/example)** | **📰 [Article](https://backtest-kit.github.io/documents/article_07_ai_news_trading_signals.html)**


## 🚀 Quick Start

### Local run (host node, dockerized infrastructure)

Start MinIO and Redis in containers:

```bash
docker-compose -f docker/minio/docker-compose.yaml up -d
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


## 🗂️ The 16 Persist Adapters

Each adapter implements the corresponding `IPersist*Instance` interface from `backtest-kit` and is registered in [src/config/setup.ts](src/config/setup.ts). All adapters share the same skeleton:

```ts
PersistXAdapter.usePersistXAdapter(class implements IPersistXInstance {
  constructor(/* context fields from backtest-kit */) {}
  async waitForInit(initial: boolean) {
    if (!initial) return;
    await waitForInfra();        // gate first-touch on Redis ready (MinIO client is lazy)
  }
  async readXData(...) { return await ioc.xDataService.findByContext(...); }
  async writeXData(..., when: Date) { await ioc.xDataService.upsert(..., when); }
});
```

Everything lives in **one MinIO bucket `backtest-kit`** — each entity gets a root folder. The `BaseStorage("backtest-kit/<entity>-items")` name format is parsed as `bucket/parent-folder`: the first path segment is the physical bucket, the rest becomes a transparent key prefix ([src/lib/common/BaseStorage.ts](src/lib/common/BaseStorage.ts)). A name without a slash (`BaseStorage("breakeven-items")`) still means a dedicated bucket — fully backward compatible.

| Adapter | Folder | Object key | Purpose |
|---|---|---|---|
| **Candle** | `candle-items/` | `exchange/symbol/interval/timestamp` | OHLCV cache; immutable inserts |
| **Signal** | `signal-items/` | `symbol/strategy/exchange` | Live signal state per context |
| **Schedule** | `schedule-items/` | `symbol/strategy/exchange` | Pending scheduled signal |
| **Strategy** | `strategy-items/` | `symbol/strategy/exchange` | Deferred commit queue snapshot |
| **Risk** | `risk-items/` | `riskName/exchange` | Active risk positions snapshot |
| **Partial** | `partial-items/` | `symbol/strategy/exchange/signalId` | Partial profit/loss levels per signal |
| **Breakeven** | `breakeven-items/` | `symbol/strategy/exchange/signalId` | Breakeven reached flag |
| **Storage** | `storage-items/` | `backtest/signalId` | Closed/opened signal log per mode † |
| **Notification** | `notification-items/` | `backtest/⟲ts_notificationId` | Event notifications † |
| **Log** | `log-items/` | `⟲ts_entryId` | Strategy log entries † |
| **Measure** | `measure-items/` | `bucket/entryKey` | LLM/API response cache |
| **Interval** | `interval-items/` | `bucket/entryKey` | Once-per-interval markers |
| **Memory** | `memory-items/` | `signalId/bucket/memoryId` | Per-signal memory store |
| **Recent** | `recent-items/` | `symbol/strategy/exchange/frame/backtest` | Last public signal per context |
| **State** | `state-items/` | `signalId/bucket` | Per-signal state buckets |
| **Session** | `session-items/` | `strategy/exchange/frame/symbol/backtest` | One session per running strategy |

`⟲ts` = inverted timestamp (`MAX_SAFE_INTEGER − ms`, zero-padded): plain lexicographic S3 listing yields **newest first** with no sorting. † = entity also maintained in the Redis time index (see below).


## ⚛️ Write Durability Without a Database

`backtest-kit` has a **write durability contract**: after `writeXData(...)` returns, the very next `readXData(...)` must see the just-written value. S3 gives strong read-after-write consistency for single objects, so the contract holds with plain object semantics — no transactions needed:

1. **Deterministic keys.** Every record's object key is a pure function of its context (`symbol/strategy/exchange/…`), so an upsert is a single idempotent `PUT` — no read-before-write, no duplicate-key races.
2. **Immutable entities never rewrite.** Candles use a `stat` + `PUT` insert-only pair; log entries and notifications skip the `PUT` entirely when the key already exists, backed by an in-process index of persisted keys (FIFO-capped) so re-sending the accumulated list costs zero network in steady state.
3. **Write order: MinIO first, Redis second.** A crash between the two leaves an object readable by key but invisible to listings — never a phantom entry pointing at nothing.
4. **`removed` means absent.** Soft-delete entities (Measure, Interval, Memory) physically delete the object instead of writing a tombstone. `listKeys` is then a pure prefix LIST — zero body reads — and reads of removed entries return `null` by construction.

```ts
// src/lib/services/data/CandleDataService.ts — insert-only, one stat + one PUT
public create = async (dto: ICandleDto): Promise<ICandleRow> => {
  const key = GET_STORAGE_KEY_FN(dto.symbol, dto.interval, dto.timestamp);
  const row: ICandleRow = { id: key, ...dto, /* dates */ };
  if (await this.has(key)) return row;   // candles are immutable — no body download
  await this.set(key, row);
  return row;
};
```


## ⚡ Redis as a Time-Ordered Index

S3 can list keys only in lexicographic order and cannot answer "what was created last" without walking the bucket. For the three entities that need newest-first listings (Log, Notification, Storage), a `*ConnectionService` ([src/lib/services/connection/](src/lib/services/connection/)) maintains a Redis index:

- **One Redis SET per minute**: `<entity>-connection:<aligned-minute>` → object names. `register()` is a single pipeline (`SADD` + `SETNX` of the floor marker). Timestamps are minute-aligned via `alignToInterval`, so re-registering within a minute deduplicates by construction.
- **`listNewest(limit, prefix)` walks backwards from the current minute** — direct key lookups, no `SCAN` over the keyspace. Minutes are probed in pipelines of 1000; a cheap `SCARD` pass skips empty minutes without transferring a single member; hot minutes (a fast backtest replay packs many records into one wall-clock minute) are paged via `SSCAN` with early exit at `limit`.
- **Cold-index fallback.** If Redis was flushed, listings fall back to the bucket LIST (inverted-timestamp keys are already newest-first) and warm the index back up.

Steady-state cost of `readLogData` at startup: 1 RTT for the floor + 1–2 pipeline RTTs + ≤200 point GETs for bodies — independent of how many objects the bucket holds.

```ts
// src/lib/services/data/LogDataService.ts — read path
const names = await this.logConnectionService.listNewest(LIST_LIMIT);
if (names.length) {
  for (const name of names) rows.push(await this.get<ILogRow>(name));
} else {
  for await (const value of this.values("", LIST_LIMIT)) { /* fallback + re-warm */ }
}
```


## 🐳 Docker Layout

```
docker/
  minio/docker-compose.yaml   # MinIO on :9000 (S3) / :9001 (console), volume ./minio_data
  redis/docker-compose.yaml   # redis:7.4.1 on :6379, password=mysecurepassword
docker-compose.yaml           # main: backtest-kit container, mounts project as /workspace
```

The main `docker-compose.yaml` uses `extra_hosts: host.docker.internal:host-gateway` so the container reaches MinIO and Redis on the host machine. Use `host.docker.internal` instead of `127.0.0.1`, or override via `.env` if your infrastructure runs elsewhere:

```bash
CC_MINIO_ENDPOINT=prod-minio
CC_MINIO_PORT=9000
CC_MINIO_ACCESSKEY=...
CC_MINIO_SECRETKEY=...
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

  await ioc.redisService.waitForInit();   // MinIO client connects lazily per bucket
  await waitForReady(true);

  await warmCandles({ exchangeName: ExchangeName.CCXT, /* ... */ });

  Backtest.background("TRXUSDT", {
    exchangeName: ExchangeName.CCXT,
    frameName: FrameName.Jan2026Frame,
    strategyName: StrategyName.Jan2026Strategy,
  });
};
```

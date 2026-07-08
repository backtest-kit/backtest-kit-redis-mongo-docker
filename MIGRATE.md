# Миграция кодовой базы с MongoDB (Mongoose) на PostgreSQL (TypeORM)

Документ описывает паттерн, по которому в этом проекте слой хранения был переведён
с MongoDB/Mongoose на PostgreSQL/TypeORM **без изменения публичного API сервисов**
и, главное, **с сохранением атомарности записи** — инварианта, который требует
вышестоящий слой персистентности:

> Промис записи должен резолвиться **только после того, как следующее чтение
> гарантированно вернёт обновлённое значение.**

В Mongo это давал атомарный `findOneAndUpdate(filter, update, {upsert:true,
new:true})` — одна операция, которая пишет и возвращает пост-запись документ. В
Postgres тот же инвариант держится одним атомарным
`INSERT … ON CONFLICT … DO UPDATE … RETURNING *`.

---

## 0. Контекст: что мигрируем

16 сервисов `src/lib/services/db/*DbService.ts`. Каждый:

- расширяет базовый класс `BaseCRUD(Model)`;
- имеет пару — Redis‑кэш `*CacheService`, который хранит `naturalKey → id`
  документа (не сам документ);
- предоставляет `upsert(...)` и `findBy*(...)`, часть — `softRemove`, `list*`,
  `has*`.

Потребитель у всех один — слой связывания (`src/config/setup.ts`), где адаптеры
персистентности вызывают `ioc.*DbService`. Прикладной код (`src/main/*`,
`src/logic/*`) напрямую типы строк/модели не трогает — поверхность миграции
полностью локализована. **Перед началом обязательно подтвердите это для своего
проекта:** найдите всех потребителей DB‑сервисов и типов строк
(`grep -r "DbService\|I.*Row\|\.schema"`) и убедитесь, что они ходят только через
публичный API, а не лезут в модель/`_id` напрямую.

---

## 1. Общий принцип

**Публичный контракт каждого сервиса сохраняется дословно** — те же имена методов,
те же аргументы, те же возвращаемые типы (`I*Row` / `I*Dto`). Меняется только тело:
Mongoose‑запрос → TypeORM‑запрос. Тогда слой связывания и адаптеры персистентности
работают без единой правки.

Замены по слоям:

| Было (Mongo/Mongoose) | Стало (Postgres/TypeORM) |
|---|---|
| `mongoose.Schema` + `mongoose.model(name)` | `new EntitySchema<I*Row>({ name, columns, indices })` |
| `Schema.Types.Mixed` | `jsonb`, **типизированный** конкретным доменным типом |
| `_id: ObjectId`, `readTransform(_id→id)` | `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` (строка сразу с `id`) |
| `findOneAndUpdate(..., {upsert,new})` | `INSERT … ON CONFLICT … DO UPDATE … RETURNING *` |
| `$setOnInsert` (insert‑only) | `ON CONFLICT DO UPDATE SET <key>=EXCLUDED.<key> RETURNING *` (no‑op update) |
| `findOneAndUpdate({removed,...})` для soft‑remove | атомарный `UPDATE … SET … jsonb_set(...) … RETURNING *` |
| уникальный compound index | `indices: [{ columns: [...], unique: true }]` |
| `timestamps: {createdAt,updatedAt}` | `{ createDate: true }` / `{ updateDate: true }` колонки |

---

## 2. Схемы: EntitySchema без декораторов

TypeORM поддерживает два способа описания сущностей: декораторы (`@Entity`) и
объектный `EntitySchema`. Выбран **`EntitySchema`**, потому что:

- не требует `experimentalDecorators` / `emitDecoratorMetadata` в `tsconfig` и не
  ломает сборку через `rollup` + `@rollup/plugin-typescript`;
- ближе к прежнему стилю «схема как объект».

Паттерн одной схемы (см. `src/schema/*.schema.ts`):

```ts
import { EntitySchema } from "typeorm";
import { BreakevenData } from "../domain/types";   // доменный тип payload
import { epochTransformer } from "../utils/epochTransformer";

interface IBreakevenDto {              // строка БЕЗ id (входные данные)
  symbol: string;
  strategyName: string;
  exchangeName: string;
  signalId: string;
  payload: BreakevenData;              // <-- явный доменный тип, НЕ any
  when: number;
}

interface IBreakevenRow extends IBreakevenDto {   // строка С id и автополями
  id: string;
  createDate: Date;
  updatedDate: Date;
}

const BreakevenModel = new EntitySchema<IBreakevenRow>({
  name: "breakeven-items",                         // = имя коллекции в Mongo
  columns: {
    id:          { type: "uuid", primary: true, generated: "uuid" },
    symbol:      { type: String },
    strategyName:{ type: String },
    exchangeName:{ type: String },
    signalId:    { type: String },
    payload:     { type: "jsonb" },                // тип свойства берётся из I*Row
    when:        { type: "bigint", transformer: epochTransformer },
    createDate:  { type: "timestamptz", createDate: true },
    updatedDate: { type: "timestamptz", updateDate: true },
  },
  indices: [
    { name: "breakeven_items_uq",
      columns: ["symbol", "strategyName", "exchangeName", "signalId"],
      unique: true },
  ],
});

export { BreakevenModel, IBreakevenDto, IBreakevenRow };
```

Правила преобразования:

- **`I*Dto` / `I*Row`** — сохраняем паттерн: `I*Dto` без `id`, `I*Row extends I*Dto`
  добавляет `id: string`, `createDate: Date`, `updatedDate: Date`. Имена‑исключения
  из исходного кода сохраняются как есть (напр. `ISignalRowDoc`, поле `positions` у
  Risk вместо `payload`).
- **`payload` — всегда `jsonb`, но типизированный.** `Schema.Types.Mixed`
  превращается не в `any`, а в конкретный доменный тип
  (`BreakevenData`, `SessionData`, `ISignalRow | null`, …). Тип живёт в
  `I*Row.payload` + дженерике `EntitySchema<I*Row>`.
- **`id` = uuid.** Раньше `_id` (ObjectId) маппился в строку через
  `readTransform`. Теперь `id uuid` генерируется базой (`gen_random_uuid()`) и сразу
  строка — `readTransform` больше не нужен и удалён.
- **Эпоха‑числа (`when`, `timestamp`).** Хранились как `when.getTime()` (число мс).
  В Postgres — `bigint` + `ValueTransformer`, который на чтении парсит строку
  драйвера `pg` обратно в `number`, чтобы `row.when` оставался числом:

  ```ts
  // src/utils/epochTransformer.ts
  export const epochTransformer: ValueTransformer = {
    to:   (v: number | null | undefined) => v,
    from: (v: string | null | undefined) => (v == null ? v : Number(v)),
  };
  ```
- **Уникальные ключи** переносятся в `indices: [{ columns, unique: true }]` — это
  цель `ON CONFLICT` для upsert (см. ниже).
- **Nullable payload** (Signal/Schedule/Strategy) → `nullable: true`.
- `minimize:false` из Mongo не нужен — `jsonb` хранит `{}`/`[]` как есть.

---

## 3. Базовый класс: BaseCRUD поверх Repository

`BaseCRUD(Model)` остаётся `di-factory`‑миксином, но внутри держит `EntitySchema`
и лениво резолвит `Repository` из общего `DataSource`:

```ts
export const BaseCRUD = factory(class {
  constructor(public readonly TargetModel: EntitySchema<any>) {}

  public async repo<T = any>(): Promise<Repository<T>> {
    const dataSource = await getPostgres();
    return dataSource.getRepository<T>(this.TargetModel);
  }
  // create / findByFilter / findAll / findById — тонкие обёртки над repo
});
```

Реализуются только реально используемые методы (`create`, `findByFilter`,
`findAll`, `findById`). Возвращаемые строки уже содержат `id`/`createDate`/
`updatedDate` — отдельный маппинг `_id→id` не нужен.

> Тонкость `di-factory`: миксин экспортируется анонимным классом. TS запрещает
> `protected`/`private` члены на таком экспортируемом типе (`TS4094`) — поэтому
> `repo()` и `entityName` сделаны `public`.

---

## 4. АТОМАРНОСТЬ — ядро миграции

Инвариант «resolve только после того как чтение вернёт свежее значение» держится,
если каждая запись — **один атомарный statement, который и пишет, и возвращает
записанную строку**, и кэш засеивается **из этой возвращённой строки** (не из
отдельного `SELECT`).

### 4.1. Обычный upsert

Mongo:
```ts
const doc = await Model.findOneAndUpdate(
  filter, { $set: { payload, when: when.getTime() } },
  { upsert: true, new: true, setDefaultsOnInsert: true },
);
await cache.setId(readTransform(doc.toJSON()));
```

Postgres:
```ts
const repo = await this.repo<IRow>();
const { raw } = await repo
  .createQueryBuilder()
  .insert()
  .values({ ...naturalKey, payload, when: when.getTime() })
  .orUpdate(["payload", "when"], [...naturalKeyColumns])  // DO UPDATE SET ... ON CONFLICT(<key>)
  .returning("*")
  .execute();
const row = raw[0] as IRow;
await this.cache.setId(row);                              // кэш из RETURNING-строки
```

Генерируется:
```sql
INSERT INTO "..."(...) VALUES (...)
ON CONFLICT (<naturalKey>) DO UPDATE SET "payload"=EXCLUDED."payload", "when"=EXCLUDED."when"
RETURNING *;
```

Одна транзакция на primary → промис резолвится только после коммита, `RETURNING`
отдаёт пост‑запись строку, кэш засеивается из неё. **Инвариант сохранён.**

### 4.2. Insert‑only (`$setOnInsert` → no‑op DO UPDATE)

Candle: существующую свечу перезаписывать нельзя, но строку надо вернуть в любом
случае. `ON CONFLICT DO NOTHING` **не годится** — при конфликте у него пустой
`RETURNING`, что заставило бы делать второй `SELECT` (а он на кластере может уйти
на отстающую реплику и вернуть `null`).

Решение — **no‑op `DO UPDATE`**, переписывающий ключ сам в себя:
```ts
.orUpdate(["symbol"], ["symbol", "interval", "timestamp"])  // SET symbol=EXCLUDED.symbol
.returning("*")
```
```sql
INSERT INTO "candle-items"(...) VALUES (...)
ON CONFLICT (symbol, interval, timestamp)
DO UPDATE SET "symbol" = EXCLUDED."symbol"   -- данные не меняются (insert-only)
RETURNING *;
```
OHLCV не трогаются (insert‑only сохранён), но `RETURNING` срабатывает **и при
вставке, и при конфликте** — один атомарный statement, без второго чтения.

### 4.3. Soft‑remove (атомарный UPDATE + jsonb_set)

Было (Mongo): `findOneAndUpdate({ $set: { removed:true, "payload.removed":true } },
{ new:true })`.

**Наивный перенос — ловушка:** `findOne` (SELECT) → мутация объекта в приложении →
`repo.save(...)` (UPDATE). Это **read‑modify‑write двумя statement‑ами**: SELECT
может уйти на отстающую реплику (устаревший payload), а параллельный `upsert`
между read и save будет затёрт (lost update).

Правильно — **один атомарный UPDATE**, который вычисляет новое значение на сервере,
ничего не читая в приложение:
```ts
const { raw } = await repo.createQueryBuilder()
  .update()
  .set({
    removed: true,
    payload: () => `jsonb_set("payload", '{removed}', 'true')`,
  })
  .where({ ...naturalKey })
  .returning("*")
  .execute();
const saved = raw[0] as IRow | undefined;
if (!saved) return;               // строки нет — безопасный no-op
await this.cache.setId(saved);
```
```sql
UPDATE "..." SET "removed"=true,
                 "payload"=jsonb_set("payload", '{removed}', 'true'),
                 "updatedDate"=now()
WHERE (<naturalKey>) RETURNING *;
```
Флаг ставится in‑place, остальные ключи payload сохраняются, нет ни устаревшего
чтения, ни lost update.

### 4.4. Чтения (cache‑aside) — без изменения логики

`findBy*` остаются cache‑aside: спросить `cache.getId(...)`; при попадании —
`findByFilter({ id: cachedId })`; при промахе — `findByFilter({ ...naturalKey })` и
прогреть кэш. Единственная замена — фильтр по `id` вместо `_id`. Инвариант
«resolve после write» к чтениям не относится, атомарность им не нужна.

### 4.5. Список неатомарных ловушек, которые НАДО искать

При аудите каждого метода искать паттерн **«write, затем отдельный read»** или
**«read, потом write»**:

- ❌ `INSERT DO NOTHING` + отдельный `SELECT` → на реплике вернёт `null` → **§4.2**.
- ❌ `findOne` → мутация → `save` (soft‑remove, любой RMW) → lost update → **§4.3**.
- ❌ upsert без `RETURNING` + `findBy*` для кэша → лишнее чтение, возможно с реплики.
- ✅ Всё, что пишет, обязано быть **одним** `INSERT/UPDATE … RETURNING *`, и кэш
  засеивается из `RETURNING`, а не из последующего `SELECT`.

---

## 5. Эталонные листинги (референс‑реализация)

Ниже — три файла из референс‑проекта **дословно**, как образец для копирования.
Типы `CandleInterval` и импорт `backtest-kit` в них — доменные для того проекта;
в своём подставьте собственные доменные типы (см. §2), остальное переносится
один‑в‑один.

### 5.1. `CandleDbService.create` — эталон insert‑only атомарности

Полный метод (плюс окружение класса для контекста). Ключевое —
`.orUpdate([<key>], [<conflict cols>]).returning("*")`: один атомарный statement,
no‑op `DO UPDATE`, строка возвращается всегда, кэш засеивается из неё (§4.2).

```ts
import BaseCRUD from "../../common/BaseCRUD";
import { ICandleDto, ICandleRow, CandleModel } from "../../../schema/Candle.schema";
import { inject } from "../../core/di";
import { TYPES } from "../../core/types";
import { LoggerService } from "../base/LoggerService";
import CandleCacheService from "../cache/CandleCacheService";
import { CandleInterval } from "backtest-kit";

const EXCHANGE_NAME = "ccxt_binance";

export class CandleDbService extends BaseCRUD(CandleModel) {
  readonly loggerService = inject<LoggerService>(TYPES.loggerService);
  readonly candleCacheService = inject<CandleCacheService>(TYPES.candleCacheService);

  public create = async (dto: ICandleDto): Promise<ICandleRow> => {
    this.loggerService.log("candleDbService create", { dto });
    const repo = await this.repo<ICandleRow>();
    // Insert-only, atomic on a single statement (safe on a Postgres cluster).
    //
    // `ON CONFLICT DO NOTHING` cannot RETURNING the conflicting row, which would
    // force a follow-up SELECT — and on a cluster that SELECT may be routed to an
    // async read-replica that has not yet seen the just-inserted row (replication
    // lag), breaking the "resolve only after the row is readable" invariant.
    //
    // Instead we do a no-op `DO UPDATE` that rewrites the natural key to its own
    // EXCLUDED value: the OHLCV columns are never touched (insert-only preserved),
    // but the row is always produced by RETURNING — whether it was inserted now or
    // already existed. Everything happens in one write transaction on the primary.
    const { raw } = await repo
      .createQueryBuilder()
      .insert()
      .values({
        symbol: dto.symbol,
        interval: dto.interval,
        timestamp: dto.timestamp,
        exchangeName: EXCHANGE_NAME,
        open: dto.open,
        high: dto.high,
        low: dto.low,
        close: dto.close,
        volume: dto.volume,
      })
      .orUpdate(["symbol"], ["symbol", "interval", "timestamp"])
      .returning("*")
      .execute();
    const result = raw[0] as ICandleRow;
    await this.candleCacheService.setCandleId(result);
    return result;
  };

  public hasCandle = async (symbol: string, interval: CandleInterval, timestamp: number): Promise<boolean> => {
    this.loggerService.log("candleDbService hasCandle", {
      symbol,
      interval,
      timestamp,
    });
    const hasInCache = await this.candleCacheService.hasCandleId(
      symbol,
      interval,
      EXCHANGE_NAME,
      timestamp,
    );
    if (hasInCache) {
      return true;
    }
    const hasInDb = await this.findBySymbolIntervalTimestamp(symbol, interval, timestamp);
    if (hasInDb) {
      return true;
    }
    return false;
  };

  public findBySymbolIntervalTimestamp = async (symbol: string, interval: CandleInterval, timestamp: number): Promise<ICandleRow | null> => {
    this.loggerService.log("candleDbService findBySymbolIntervalTimestamp", { symbol, interval, timestamp });
    const cachedId = await this.candleCacheService.getCandleId(symbol, interval, EXCHANGE_NAME, timestamp);
    if (cachedId) {
      const cached = await super.findByFilter({ id: cachedId }) as ICandleRow | null;
      if (cached) {
        return cached;
      }
    }
    const result = await super.findByFilter({ symbol, interval, exchangeName: EXCHANGE_NAME, timestamp }) as ICandleRow | null;
    if (result) {
      await this.candleCacheService.setCandleId(result);
    }
    return result;
  };

}

export default CandleDbService;
```

### 5.2. `BaseCRUD` — база поверх TypeORM Repository

```ts
import { factory } from "di-factory";
import { EntitySchema, Repository, FindOptionsOrder, FindOptionsWhere } from "typeorm";
import { inject } from "../core/di";
import LoggerService from "../services/base/LoggerService";
import TYPES from "../core/types";
import { getPostgres } from "../../config/postgres";

const FIND_ALL_LIMIT = 1_000;

export const BaseCRUD = factory(
  class {
    readonly loggerService = inject<LoggerService>(TYPES.loggerService);

    constructor(public readonly TargetModel: EntitySchema<any>) {}

    public get entityName(): string {
      return this.TargetModel.options.name;
    }

    public async repo<T = any>(): Promise<Repository<T>> {
      const dataSource = await getPostgres();
      return dataSource.getRepository<T>(this.TargetModel);
    }

    public async create(dto: object) {
      this.loggerService.info(`BaseCRUD create entityName=${this.entityName}`, {
        dto,
      });
      const repo = await this.repo();
      const entity = repo.create(dto as any);
      const saved = await repo.save(entity);
      return saved as any;
    }

    public async update(id: string, dto: object) {
      this.loggerService.info(`BaseCRUD update entityName=${this.entityName}`, {
        id,
        dto,
      });
      const repo = await this.repo();
      const { id: _omitId, ...rest } = dto as Record<string, unknown>;
      await repo.update({ id } as any, rest as any);
      const updated = await repo.findOne({ where: { id } as any });
      if (!updated) {
        throw new Error(`${this.entityName} not found`);
      }
      return updated as any;
    }

    public async findById(id: string) {
      this.loggerService.info(`BaseCRUD findById entityName=${this.entityName}`, {
        id,
      });
      const repo = await this.repo();
      const item = await repo.findOne({ where: { id } as any });
      if (!item) {
        throw new Error(`${this.entityName} not found`);
      }
      return item as any;
    }

    public async findByFilter(filterData: object, order?: object) {
      this.loggerService.info(`BaseCRUD findByFilter entityName=${this.entityName}`, {
        filterData,
        order,
      });
      const repo = await this.repo();
      const item = await repo.findOne({
        where: filterData as FindOptionsWhere<any>,
        order: order as FindOptionsOrder<any>,
      });
      return (item as any) ?? null;
    }

    public async findAll(filterData: object = {}, limit = FIND_ALL_LIMIT, order?: object) {
      this.loggerService.info(`BaseCRUD findAll entityName=${this.entityName}`, {
        filterData,
      });
      const repo = await this.repo();
      const items = await repo.find({
        where: filterData as FindOptionsWhere<any>,
        order: order as FindOptionsOrder<any>,
        take: limit,
      });
      return items as any[];
    }
  }
);

export default BaseCRUD;
```

### 5.3. `Candle.schema` — эталон EntitySchema

```ts
import { EntitySchema } from "typeorm";
import { CandleInterval } from "backtest-kit";
import { epochTransformer } from "../utils/epochTransformer";

interface ICandleDto {
  symbol: string;
  interval: CandleInterval;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ICandleRow extends ICandleDto {
  id: string;
  exchangeName: string;
  createDate: Date;
  updatedDate: Date;
}

const CandleModel = new EntitySchema<ICandleRow>({
  name: "candle-items",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    symbol: { type: String },
    interval: { type: String },
    timestamp: { type: "bigint", transformer: epochTransformer },
    exchangeName: { type: String },
    open: { type: "double precision" },
    high: { type: "double precision" },
    low: { type: "double precision" },
    close: { type: "double precision" },
    volume: { type: "double precision" },
    createDate: { type: "timestamptz", createDate: true },
    updatedDate: { type: "timestamptz", updateDate: true },
  },
  indices: [
    {
      name: "candle_items_uq",
      columns: ["symbol", "interval", "timestamp"],
      unique: true,
    },
  ],
});

export { CandleModel, ICandleDto, ICandleRow };
```

### 5.4. `Storage.schema` — эталон jsonb‑payload

Простейшая сущность с типизированным `jsonb`‑payload (`IStorageSignalRow` —
доменный тип), составным уникальным ключом `(backtest, signalId)` и uuid‑PK. Именно
так `Schema.Types.Mixed` → `jsonb` с явным типом свойства (§2).

```ts
import { EntitySchema } from "typeorm";
import { IStorageSignalRow } from "backtest-kit";

interface IStorageDto {
  backtest: boolean;
  signalId: string;
  payload: IStorageSignalRow;
}

interface IStorageRow extends IStorageDto {
  id: string;
  createDate: Date;
  updatedDate: Date;
}

const StorageModel = new EntitySchema<IStorageRow>({
  name: "storage-items",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    backtest: { type: "boolean" },
    signalId: { type: String },
    payload: { type: "jsonb" },
    createDate: { type: "timestamptz", createDate: true },
    updatedDate: { type: "timestamptz", updateDate: true },
  },
  indices: [
    {
      name: "storage_items_uq",
      columns: ["backtest", "signalId"],
      unique: true,
    },
  ],
});

export { StorageModel, IStorageDto, IStorageRow };
```

### 5.5. `epochTransformer` — bigint ↔ number для эпоха‑полей

Автополя `createDate`/`updatedDate` в схемах делаются декларативно
(`{ type: "timestamptz", createDate: true }` / `{ …, updateDate: true }` — TypeORM
проставляет их сам, трансформер не нужен). А вот **доменные эпоха‑поля** (`when`,
`timestamp`), которые в Mongo были `number` (`when.getTime()`), в Postgres хранятся
как `bigint`; драйвер `pg` отдаёт `bigint` строкой, поэтому нужен `ValueTransformer`,
возвращающий `number`. Один общий трансформер на все такие колонки:

```ts
import { ValueTransformer } from "typeorm";

/**
 * Stores epoch-millisecond numbers in a Postgres `bigint` column while keeping
 * the JS-visible value a plain `number`. The `pg` driver returns `bigint` as a
 * string, so `from` parses it back; `to` passes the number through unchanged.
 */
export const epochTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null | undefined) =>
    value === null || value === undefined ? value : Number(value),
};
```

Применение в схеме: `when: { type: "bigint", transformer: epochTransformer }`
(см. §5.3 — колонка `timestamp`).

### 5.6. `MeasureDbService` — эталон soft‑remove + upsert + list

Полный сервис с `removed`‑флагом: `upsert` (пишет `removed = payload.removed`),
атомарный `softRemove` (jsonb_set, §4.3), `listKeys` (`WHERE removed = false`),
cache‑aside `findByKey`. Ориентир для любого сервиса с мягким удалением.

```ts
import BaseCRUD from "../../common/BaseCRUD";
import { IMeasureRow, MeasureModel } from "../../../schema/Measure.schema";
import { inject } from "../../core/di";
import { TYPES } from "../../core/types";
import { LoggerService } from "../base/LoggerService";
import MeasureCacheService from "../cache/MeasureCacheService";
import { MeasureData } from "backtest-kit";

export class MeasureDbService extends BaseCRUD(MeasureModel) {
  readonly loggerService = inject<LoggerService>(TYPES.loggerService);
  readonly measureCacheService = inject<MeasureCacheService>(TYPES.measureCacheService);

  public upsert = async (bucket: string, entryKey: string, payload: MeasureData): Promise<void> => {
    this.loggerService.log("measureDbService upsert", { bucket, entryKey });
    const repo = await this.repo<IMeasureRow>();
    const { raw } = await repo
      .createQueryBuilder()
      .insert()
      .values({ bucket, entryKey, payload, removed: Boolean(payload.removed) })
      .orUpdate(["payload", "removed"], ["bucket", "entryKey"])
      .returning("*")
      .execute();
    const result = raw[0] as IMeasureRow;
    await this.measureCacheService.setMeasureId(result);
  };

  public findByKey = async (bucket: string, entryKey: string): Promise<IMeasureRow | null> => {
    this.loggerService.log("measureDbService findByKey", { bucket, entryKey });
    const cachedId = await this.measureCacheService.getMeasureId(bucket, entryKey);
    if (cachedId) {
      const cached = await super.findByFilter({ id: cachedId }) as IMeasureRow | null;
      if (cached) {
        return cached;
      }
    }
    const result = await super.findByFilter({ bucket, entryKey }) as IMeasureRow | null;
    if (result) {
      await this.measureCacheService.setMeasureId(result);
    }
    return result;
  };

  public softRemove = async (bucket: string, entryKey: string): Promise<void> => {
    this.loggerService.log("measureDbService softRemove", { bucket, entryKey });
    const repo = await this.repo<IMeasureRow>();
    // Atomic soft-remove: a single UPDATE computes the new value server-side.
    // No read-modify-write, so there is no stale read from a replica and no
    // lost update under concurrent upserts. The nested payload.removed flag is
    // set in-place via jsonb_set. Early-return when the row does not exist.
    const { raw } = await repo
      .createQueryBuilder()
      .update()
      .set({
        removed: true,
        payload: () => `jsonb_set("payload", '{removed}', 'true')`,
      })
      .where({ bucket, entryKey })
      .returning("*")
      .execute();
    const saved = raw[0] as IMeasureRow | undefined;
    if (!saved) {
      return;
    }
    await this.measureCacheService.setMeasureId(saved);
  };

  public listKeys = async (bucket: string): Promise<string[]> => {
    this.loggerService.log("measureDbService listKeys", { bucket });
    const rows = await super.findAll({ bucket, removed: false }) as IMeasureRow[];
    return rows.map((row) => row.entryKey);
  };
}

export default MeasureDbService;
```

### 5.7. `MeasureCacheService` — эталон кэш‑слоя (naturalKey → id)

Кэш‑слой **при миграции не меняется** (см. §8): он хранит `naturalKey → id` в
Redis, а не документ. Ключевое для атомарности — `set<X>Id(row)` принимает **целую
строку** (ту, что вернул `RETURNING` из write‑запроса), и кладёт из неё `row.id`.
`BaseMap(REDIS_KEY, -1)` — Redis‑бэкенд (второй аргумент `-1` = без TTL). Никаких
ссылок на `_id` или на форму документа — только `id`.

```ts
import BaseMap from "../../common/BaseMap";
import { inject } from "../../core/di";
import { TYPES } from "../../core/types";
import LoggerService from "../base/LoggerService";
import { IMeasureRow } from "../../../schema/Measure.schema";

const REDIS_KEY = "measure_cache";

export class MeasureCacheService extends BaseMap(REDIS_KEY, -1) {
  readonly loggerService = inject<LoggerService>(TYPES.loggerService);

  private _cacheKey(bucket: string, entryKey: string): string {
    return `${bucket}:${entryKey}`;
  }

  public async hasMeasureId(bucket: string, entryKey: string): Promise<boolean> {
    this.loggerService.log("measureCacheService hasMeasureId", { bucket, entryKey });
    return await this.has(this._cacheKey(bucket, entryKey));
  }

  public async getMeasureId(bucket: string, entryKey: string): Promise<string | null> {
    this.loggerService.log("measureCacheService getMeasureId", { bucket, entryKey });
    const id = <string>await super.get(this._cacheKey(bucket, entryKey));
    return id ?? null;
  }

  public async setMeasureId(row: IMeasureRow): Promise<string> {
    this.loggerService.log("measureCacheService setMeasureId", { bucket: row.bucket, entryKey: row.entryKey });
    await super.set(this._cacheKey(row.bucket, row.entryKey), row.id);
    return row.id;
  }
}

export default MeasureCacheService;
```

> `BaseMap` (Redis‑обёртка) — часть существующей инфраструктуры проекта и миграцией
> Mongo→Postgres не затрагивается, поэтому здесь не приводится. Важно лишь, что
> `set(key, value)` / `get(key)` / `has(key)` работают со строковым `id`.

---

## 6. Подключение и bootstrap

- `src/config/postgres.ts` — `getPostgres = singleshot(async () => { … })`: строит
  `DataSource` (`type: "postgres"`, все `EntitySchema` в `entities`,
  `synchronize: true`), вызывает `initialize()`, вешает `SIGINT → destroy()`.
- `synchronize: true` — на первом запуске сам создаёт таблицы и индексы, если их
  нет. Zero‑config: строка подключения в `src/config/params.ts` имеет рабочий
  дефолт.
- `PostgresService` (`src/lib/services/base/PostgresService.ts`) повторяет форму
  прежнего `MongoService`: `waitForInit = singleshot(...)` с гонкой против
  таймаута. Зарегистрирован в DI (`types.ts` / `provide.ts` / `lib/index.ts`) и
  подставлен в `waitForInfra()` в `setup.ts` вместо `mongoService`.

### 6.1. `src/config/postgres.ts` — DataSource (singleshot)

```ts
import { singleshot } from "functools-kit";
import { DataSource } from "typeorm";
import { CC_POSTGRES_CONNECTION_STRING } from "./params";

import { BreakevenModel } from "../schema/Breakeven.schema";
import { CandleModel } from "../schema/Candle.schema";
import { IntervalModel } from "../schema/Interval.schema";
import { LogModel } from "../schema/Log.schema";
import { MeasureModel } from "../schema/Measure.schema";
import { MemoryModel } from "../schema/Memory.schema";
import { NotificationModel } from "../schema/Notification.schema";
import { PartialModel } from "../schema/Partial.schema";
import { RecentModel } from "../schema/Recent.schema";
import { RiskModel } from "../schema/Risk.schema";
import { ScheduleModel } from "../schema/Schedule.schema";
import { SessionModel } from "../schema/Session.schema";
import { SignalModel } from "../schema/Signal.schema";
import { StateModel } from "../schema/State.schema";
import { StorageModel } from "../schema/Storage.schema";
import { StrategyModel } from "../schema/Strategy.schema";

export const getPostgres = singleshot(async () => {
  const dataSource = new DataSource({
    type: "postgres",
    url: CC_POSTGRES_CONNECTION_STRING,
    entities: [
      BreakevenModel,
      CandleModel,
      IntervalModel,
      LogModel,
      MeasureModel,
      MemoryModel,
      NotificationModel,
      PartialModel,
      RecentModel,
      RiskModel,
      ScheduleModel,
      SessionModel,
      SignalModel,
      StateModel,
      StorageModel,
      StrategyModel,
    ],
    synchronize: true,
    logging: false,
  });

  await dataSource.initialize();

  process.on("SIGINT", async () => {
    await dataSource.destroy();
  });

  return dataSource;
});
```

### 6.2. `PostgresService` — waitForInit с таймаутом

```ts
import { DataSource } from "typeorm";
import { singleshot, sleep } from "functools-kit";
import { getPostgres } from "../../../config/postgres";
import { inject } from "../../core/di";
import LoggerService from "./LoggerService";
import TYPES from "../../core/types";

const CONNECTION_TIMEOUT = 15_000;
const TIMEOUT_SYMBOL = Symbol("timeout");

export class PostgresService {

  readonly loggerService = inject<LoggerService>(TYPES.loggerService);

  public waitForInit = singleshot(async () => {
    this.loggerService.log("postgresService waitForInit");
    const result = await Promise.race([
      getPostgres(),
      sleep(CONNECTION_TIMEOUT).then(() => TIMEOUT_SYMBOL),
    ]);
    if (result === TIMEOUT_SYMBOL) {
      this.waitForInit.clear();
      throw new Error("Postgres connection timeout");
    }
    this.loggerService.log("postgresService connected to the database");
    return result as DataSource;
  });

  protected init = async () => {
    this.loggerService.log("postgresService init");
    await this.waitForInit();
  };
}

export default PostgresService;
```

### 6.3. `waitForInfra` (в `setup.ts`) — единая точка ожидания инфраструктуры

Одно место, где инициализируются все инфраструктурные сервисы. Именно здесь
`mongoService` заменяется на `postgresService`; форма (`singleshot` + `Promise.all`)
не меняется.

```ts
const waitForInfra = singleshot(
  async () => {
    await Promise.all([
      ioc.postgresService.waitForInit(),
      ioc.redisService.waitForInit(),
    ]);
  }
);
```

### 6.4. DI‑контейнер (`di-kit`) и регистрация `postgresService`

Контейнер — `di-kit`: `createActivator(namespace)` даёт `{ init, inject, provide }`.
`provide(token, factory)` регистрирует лениво, `inject<T>(token)` резолвит,
`init()` вызывается один раз после всех `provide`/`inject`.

`src/lib/core/di.ts` (весь файл):
```ts
import { createActivator } from "di-kit";

export const { init, inject, provide } = createActivator("pro");
```

Токены — `Symbol`‑константы. В `src/lib/core/types.ts` добавляется
`postgresService` (и убирается `mongoService` при очистке):
```ts
const baseServices = {
    loggerService: Symbol('loggerService'),
    postgresService: Symbol('postgresService'),
    redisService: Symbol('redisService'),
};
// ...cacheServices, dbServices — по Symbol на каждый сервис
export const TYPES = { ...baseServices, ...cacheServices, ...dbServices };
export default TYPES;
```

В `src/lib/core/provide.ts` регистрируется фабрика (импорт‑сайд‑эффект модуль):
```ts
provide(TYPES.postgresService, () => new PostgresService());
```

В `src/lib/index.ts` сервис инжектится в общий `ioc`‑объект, и в конце дёргается
`init()`:
```ts
export const ioc = {
  loggerService: inject<LoggerService>(TYPES.loggerService),
  postgresService: inject<PostgresService>(TYPES.postgresService),
  redisService: inject<RedisService>(TYPES.redisService),
  // ...cache/db сервисы
};

init();
export default ioc;
```

Именно этот `ioc.postgresService` и потребляет `waitForInfra` (§6.3), а
`ioc.*DbService` — слой связывания.

### 6.5. `src/config/params.ts` — connection string с рабочим дефолтом

Zero‑config: строка подключения имеет дефолт, совпадающий с dev‑инфраструктурой,
поэтому на первом запуске ничего настраивать не нужно; свой пароль/хост кодер
пропишет через переменную окружения позже.

```ts
declare function parseInt(value: unknown): number;

export const CC_REDIS_HOST = process.env.CC_REDIS_HOST || "127.0.0.1";
export const CC_REDIS_PORT = parseInt(process.env.CC_REDIS_PORT) || 6379;
export const CC_REDIS_USER = process.env.CC_REDIS_USER || "default";
export const CC_REDIS_PASSWORD = process.env.CC_REDIS_PASSWORD || "mysecurepassword";

export const CC_POSTGRES_CONNECTION_STRING = process.env.CC_POSTGRES_CONNECTION_STRING || "postgres://backtest:mysecurepassword@localhost:5432/backtest-pro";
```

> Нюанс кластера: `synchronize` создаёт таблицы на **primary**. На кластере с
> read‑репликами первый `SELECT`, разбалансированный на ещё не догнавшую реплику,
> может увидеть `relation does not exist` (реплик‑лаг). Это касается только самого
> первого запуска на пустой БД; повторный запрос отрабатывает. Рабочие
> (`upsert`/`RETURNING`/`softRemove`) пути от этого не страдают.

---

## 7. Инфраструктура: dev‑кластер вместо одиночного Postgres

Чтобы **убрать «иллюзию атомарности» одиночного узла** из dev‑среды и ловить
кластерные эффекты (реплик‑лаг, роутинг чтений) уже при разработке, dev поднимает
не один Postgres, а **рой**: 1 primary + 2 streaming‑реплики за Pgpool‑II
(`writes → primary`, `reads → балансировка на реплики`).

- Всё это упаковано в один образ `tripolskypetr/pgpool` (см. `./pgpool`,
  `docker/pgpool/docker-compose.yaml`).
- Postgres — **single‑master**: «кластер» = 1 primary + N read‑реплик (multi‑master
  в ванильном Postgres не существует); это и есть форма прода.
- Приложение подключается к единому порту `5432` без изменений в коде — connection
  string тот же.

Именно на этой среде проверяется, что атомарные `upsert`/`RETURNING`/`jsonb_set`
корректны, когда чтения физически уходят на реплики.

### 7.1. Почему НЕ одиночный `postgres` образ

Стандартный образ `postgres` — это **один процесс**: любая конкурентность
разруливается внутри него локами/MVCC, то есть фактически «атомарность через
глобальный мьютекс одного узла». В такой среде **невозможно воспроизвести**
кластерные эффекты — реплик‑лаг и роутинг чтений на standby. Код, который корректен
только на одиночном узле (напр. `write` + отдельный `SELECT`, §4.5), на таком dev
выглядит рабочим, а в проде на кластере ломается. Поэтому dev с самого начала должен
быть **роем**, а не одиночным Postgres.

### 7.2. Рекомендуемая база: `docker/pgpool/docker-compose.yaml`

Готовый образ `tripolskypetr/pgpool:latest` разворачивает весь рой (1 primary + 2
streaming‑реплики + Pgpool‑II на порту 5432) в одном контейнере — приложение
подключается к `5432` без изменений в коде. Все env перечислены явно и равны
дефолтам образа (self‑documenting); данные bind‑mount'ятся в локальную `./data`
(в `.gitignore`).

```yaml
# Runs the published all-in-one cluster image tripolskypetr/pgpool:latest —
# 1 primary + 2 streaming replicas behind Pgpool-II on port 5432, in one
# container. See ../../pgpool for the image source.
#
# Every environment variable the image understands is listed explicitly below and
# set to the image's built-in default, so this file is self-documenting: change a
# value here and nothing else needs touching. Cluster data is bind-mounted to
# ./data (gitignored) so it survives restarts and is easy to inspect/wipe.

services:
  pgpool:
    image: tripolskypetr/pgpool:latest
    container_name: pgcluster
    ports:
      - "5432:5432"          # single entrypoint: writes->primary, reads->replicas
    environment:
      # --- application role / database (must match src/config/params.ts) ---
      POSTGRES_USER: backtest
      POSTGRES_PASSWORD: mysecurepassword
      POSTGRES_DB: backtest-pro
      # --- internal streaming-replication role ---
      REPL_USER: replicator
      REPL_PASSWORD: replicatorpass
      # --- paths inside the container (image defaults; rarely changed) ---
      PGCLUSTER_ROOT: /var/lib/pgcluster
      PGBIN: /usr/local/bin
    volumes:
      # Bind-mount cluster data to a local folder (gitignored).
      - ./data:/var/lib/pgcluster
    healthcheck:
      test: ["CMD-SHELL", "PGPASSWORD=mysecurepassword psql -h 127.0.0.1 -p 5432 -U backtest -d backtest-pro -tAc 'SELECT 1' || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 15
      start_period: 120s     # first boot clones two replicas (~60-90s)
    restart: always
```

> Первый запуск занимает ~60–90 с (клонирование двух реплик через `pg_basebackup`),
> поэтому `start_period: 120s` в healthcheck. Образ `tripolskypetr/pgpool` собран из
> `./pgpool` (официальный `postgres:18-alpine` + Pgpool‑II + supervisord); внутри —
> синхронная кворум‑репликация и физические слоты, чтобы primary не перерабатывал
> WAL, нужный репликам. Инструкция по сборке/публикации образа — в `pgpool/README.md`.

---

## 8. Что проверить в целевом проекте ДО старта

Паттерн выше выведен из конкретной структуры. Прежде чем применять его к другому
проекту, обязательно изучите три подсистемы — от них зависит, сработает ли план
как есть или потребует адаптации:

- **`db/connection` (bootstrap соединения).** Как проект открывает Mongo:
  singleshot‑коннектор, `waitForInit`, обработчики `SIGINT`/reconnect? Именно это
  место переписывается на `getPostgres` + `DataSource` (см. §6). Убедитесь, что
  соединение резолвится **один раз** и все сервисы ждут его инициализации — иначе
  атомарные `RETURNING`‑запросы будут гоняться по недоинициализированному пулу.
  Проверьте, нет ли **второго**, дублирующего коннектора (в этом проекте был
  забытый `config/mongo.ts` рядом с `MongoService`) — его надо удалить, а не
  переносить.

- **`db/cache` (кэш‑слой).** Подтвердите ключевую инвариантность: кэш хранит
  **`naturalKey → id`**, а не сам документ. Тогда при миграции меняется только тип
  `id` (ObjectId‑строка → uuid), а сам кэш‑слой **не трогается**. Пройдите по всем
  `*CacheService` и убедитесь, что нигде нет ссылок на `_id` или на форму документа
  — если кэш хранит целые документы, план усложняется (кэш тоже придётся
  ревизовать на согласованность с `RETURNING`‑строкой). Также проверьте, что запись
  в кэш идёт **из строки, вернувшейся из write‑запроса**, а не из отдельного
  чтения (это и есть точка сохранения атомарности, §4).

- **`db/measure` (и любой сервис с soft‑remove / `removed`‑флагом).** Это самый
  вероятный источник **неатомарных** переносов. Проверьте каждый сервис, где есть
  `removed` и/или вложенный `payload.removed`: в Mongo это был один
  `findOneAndUpdate`, а наивный перенос даёт `findOne`→мутация→`save` (два
  statement‑а, lost update, чтение с реплики). Такие места переписываются на
  атомарный `UPDATE … jsonb_set … RETURNING *` (§4.3). `measure` в этом проекте —
  эталонный пример: `upsert` (с `removed = payload.removed`), `softRemove`
  (jsonb_set), `listKeys` (`WHERE removed = false`). Сверяйтесь с ним.

---

## 9. Порядок выполнения миграции (чек‑лист)

1. **Зависимости:** добавить `typeorm`, `pg`; убрать использование `mongoose`.
2. **Схемы:** переписать все `src/schema/*.schema.ts` на `EntitySchema`, сохранив
   экспорты и имена таблиц; `payload` типизировать доменными типами; `when`/
   `timestamp` → `bigint` + `epochTransformer`; уникальные ключи → `indices`.
3. **BaseCRUD:** перевести на `Repository` (§3).
4. **DB‑сервисы:** переписать тела, сохранив сигнатуры. Каждый write — атомарный
   `INSERT/UPDATE … RETURNING *`; кэш из `RETURNING` (§4). Заменить `_id` → `id` в
   cache‑aside чтениях.
5. **Bootstrap:** `getPostgres` + `PostgresService`; подставить в DI и в
   `waitForInfra()` (§6).
6. **Кэш‑слой не трогать** — он хранит `naturalKey → id`; меняется лишь тип id
   (uuid). Проверить, что нигде нет ссылок на `_id`.
7. **Аудит атомарности:** пройтись по КАЖДОМУ методу и убедиться, что нет ни одного
   «write→read» / «read→write» из §4.5.
8. **Очистка:** удалить `readTransform`, `config/mongo.ts`, `MongoService`,
   mongo‑токен DI, зависимость `mongoose`.
9. **Верификация (см. §10).**

---

## 10. Как проверять (end‑to‑end)

Гонять не только typecheck, а реальный путь через сервисы против живого Postgres —
в идеале против **кластера**, где чтения балансируются на реплики:

- **upsert→find:** `upsert(...)` двумя разными payload подряд, затем
  `findByContext(...)` возвращает последнее значение, `id` строки стабилен между
  апдейтами.
- **insert‑only:** `candle.create(...)` дважды с одним ключом → тот же `id`, OHLCV
  не перезаписаны; параллельные `create` того же ключа сходятся в одну строку.
- **soft‑remove:** `upsert` → `softRemove` → `findByKey` показывает `removed:true`
  и `payload.removed:true`, прочие ключи payload целы, `listKeys` исключает запись;
  `softRemove` отсутствующей строки — безопасный no‑op.
- **эпоха‑числа:** `row.when` / `row.timestamp` — `number`, равны исходному
  `getTime()`.
- **балансировка:** `SHOW pool_nodes` через pgpool показывает распределение
  `select_cnt` по primary и репликам — подтверждение, что чтения реально уходят на
  standby, а инварианты при этом держатся.
- **интеграция:** прогон реального сценария под нагрузкой — адаптеры
  персистентности из слоя связывания должны корректно round‑trip'иться через
  TypeORM (запись → чтение возвращает записанное).

import * as functools_kit from 'functools-kit';
import * as typeorm from 'typeorm';
import { DataSource } from 'typeorm';
import { Redis } from 'ioredis';
import { CandleInterval, ISignalRow, IScheduledSignalRow, StrategyData, RiskData, PartialData, BreakevenData, IStorageSignalRow, NotificationModel, ILogEntry, MeasureData, IntervalData, MemoryData, IPublicSignalRow, StateData, SessionData } from 'backtest-kit';

interface ILogger {
    log(topic: string, ...args: any[]): void;
    debug(topic: string, ...args: any[]): void;
    info(topic: string, ...args: any[]): void;
    warn(topic: string, ...args: any[]): void;
}
declare class LoggerService implements ILogger {
    private _commonLogger;
    log: (topic: string, ...args: any[]) => Promise<void>;
    debug: (topic: string, ...args: any[]) => Promise<void>;
    info: (topic: string, ...args: any[]) => Promise<void>;
    warn: (topic: string, ...args: any[]) => Promise<void>;
    setLogger: (logger: ILogger) => void;
}

declare class PostgresService {
    readonly loggerService: LoggerService;
    waitForInit: (() => Promise<DataSource>) & functools_kit.ISingleshotClearable<() => Promise<DataSource>>;
    protected init: () => Promise<void>;
}

declare class RedisService {
    readonly loggerService: LoggerService;
    waitForInit: (() => Promise<Redis>) & functools_kit.ISingleshotClearable<() => Promise<Redis>>;
    protected init: () => Promise<void>;
}

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

declare const CandleCacheService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly connectionKey: string;
    readonly ttlExpireSeconds: number;
    _getItemKey(key: string): string;
    set(key: string, value: unknown): Promise<void>;
    get(key: string | null): Promise<unknown | null>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    toArray(): Promise<[string, unknown][]>;
    iterate(): AsyncIterableIterator<readonly [string, unknown]>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<unknown>;
    size(): Promise<number>;
}) & Omit<{
    new (connectionKey: string, ttlExpireSeconds?: number): {
        readonly loggerService: LoggerService;
        readonly connectionKey: string;
        readonly ttlExpireSeconds: number;
        _getItemKey(key: string): string;
        set(key: string, value: unknown): Promise<void>;
        get(key: string | null): Promise<unknown | null>;
        delete(key: string): Promise<void>;
        has(key: string): Promise<boolean>;
        clear(): Promise<void>;
        toArray(): Promise<[string, unknown][]>;
        iterate(): AsyncIterableIterator<readonly [string, unknown]>;
        keys(): AsyncIterableIterator<string>;
        values(): AsyncIterableIterator<unknown>;
        size(): Promise<number>;
    };
}, "prototype">;
declare class CandleCacheService extends CandleCacheService_base {
    readonly loggerService: LoggerService;
    private _cacheKey;
    hasCandleId(symbol: string, interval: CandleInterval, exchangeName: string, timestamp: number): Promise<boolean>;
    getCandleId(symbol: string, interval: CandleInterval, exchangeName: string, timestamp: number): Promise<string | null>;
    setCandleId(row: ICandleRow): Promise<string>;
}

interface ISignalDto {
    symbol: string;
    strategyName: string;
    exchangeName: string;
    payload: ISignalRow | null;
}
interface ISignalRowDoc extends ISignalDto {
    id: string;
    createDate: Date;
    updatedDate: Date;
}

declare const SignalCacheService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly connectionKey: string;
    readonly ttlExpireSeconds: number;
    _getItemKey(key: string): string;
    set(key: string, value: unknown): Promise<void>;
    get(key: string | null): Promise<unknown | null>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    toArray(): Promise<[string, unknown][]>;
    iterate(): AsyncIterableIterator<readonly [string, unknown]>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<unknown>;
    size(): Promise<number>;
}) & Omit<{
    new (connectionKey: string, ttlExpireSeconds?: number): {
        readonly loggerService: LoggerService;
        readonly connectionKey: string;
        readonly ttlExpireSeconds: number;
        _getItemKey(key: string): string;
        set(key: string, value: unknown): Promise<void>;
        get(key: string | null): Promise<unknown | null>;
        delete(key: string): Promise<void>;
        has(key: string): Promise<boolean>;
        clear(): Promise<void>;
        toArray(): Promise<[string, unknown][]>;
        iterate(): AsyncIterableIterator<readonly [string, unknown]>;
        keys(): AsyncIterableIterator<string>;
        values(): AsyncIterableIterator<unknown>;
        size(): Promise<number>;
    };
}, "prototype">;
declare class SignalCacheService extends SignalCacheService_base {
    readonly loggerService: LoggerService;
    private _cacheKey;
    hasSignalId(symbol: string, strategyName: string, exchangeName: string): Promise<boolean>;
    getSignalId(symbol: string, strategyName: string, exchangeName: string): Promise<string | null>;
    setSignalId(row: ISignalRowDoc): Promise<string>;
}

interface IScheduleDto {
    symbol: string;
    strategyName: string;
    exchangeName: string;
    payload: IScheduledSignalRow | null;
}
interface IScheduleRow extends IScheduleDto {
    id: string;
    createDate: Date;
    updatedDate: Date;
}

declare const ScheduleCacheService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly connectionKey: string;
    readonly ttlExpireSeconds: number;
    _getItemKey(key: string): string;
    set(key: string, value: unknown): Promise<void>;
    get(key: string | null): Promise<unknown | null>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    toArray(): Promise<[string, unknown][]>;
    iterate(): AsyncIterableIterator<readonly [string, unknown]>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<unknown>;
    size(): Promise<number>;
}) & Omit<{
    new (connectionKey: string, ttlExpireSeconds?: number): {
        readonly loggerService: LoggerService;
        readonly connectionKey: string;
        readonly ttlExpireSeconds: number;
        _getItemKey(key: string): string;
        set(key: string, value: unknown): Promise<void>;
        get(key: string | null): Promise<unknown | null>;
        delete(key: string): Promise<void>;
        has(key: string): Promise<boolean>;
        clear(): Promise<void>;
        toArray(): Promise<[string, unknown][]>;
        iterate(): AsyncIterableIterator<readonly [string, unknown]>;
        keys(): AsyncIterableIterator<string>;
        values(): AsyncIterableIterator<unknown>;
        size(): Promise<number>;
    };
}, "prototype">;
declare class ScheduleCacheService extends ScheduleCacheService_base {
    readonly loggerService: LoggerService;
    private _cacheKey;
    hasScheduleId(symbol: string, strategyName: string, exchangeName: string): Promise<boolean>;
    getScheduleId(symbol: string, strategyName: string, exchangeName: string): Promise<string | null>;
    setScheduleId(row: IScheduleRow): Promise<string>;
}

interface IStrategyDto {
    symbol: string;
    strategyName: string;
    exchangeName: string;
    payload: StrategyData | null;
}
interface IStrategyRow extends IStrategyDto {
    id: string;
    createDate: Date;
    updatedDate: Date;
}

declare const StrategyCacheService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly connectionKey: string;
    readonly ttlExpireSeconds: number;
    _getItemKey(key: string): string;
    set(key: string, value: unknown): Promise<void>;
    get(key: string | null): Promise<unknown | null>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    toArray(): Promise<[string, unknown][]>;
    iterate(): AsyncIterableIterator<readonly [string, unknown]>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<unknown>;
    size(): Promise<number>;
}) & Omit<{
    new (connectionKey: string, ttlExpireSeconds?: number): {
        readonly loggerService: LoggerService;
        readonly connectionKey: string;
        readonly ttlExpireSeconds: number;
        _getItemKey(key: string): string;
        set(key: string, value: unknown): Promise<void>;
        get(key: string | null): Promise<unknown | null>;
        delete(key: string): Promise<void>;
        has(key: string): Promise<boolean>;
        clear(): Promise<void>;
        toArray(): Promise<[string, unknown][]>;
        iterate(): AsyncIterableIterator<readonly [string, unknown]>;
        keys(): AsyncIterableIterator<string>;
        values(): AsyncIterableIterator<unknown>;
        size(): Promise<number>;
    };
}, "prototype">;
declare class StrategyCacheService extends StrategyCacheService_base {
    readonly loggerService: LoggerService;
    private _cacheKey;
    hasStrategyId(symbol: string, strategyName: string, exchangeName: string): Promise<boolean>;
    getStrategyId(symbol: string, strategyName: string, exchangeName: string): Promise<string | null>;
    setStrategyId(row: IStrategyRow): Promise<string>;
}

interface IRiskDto {
    riskName: string;
    exchangeName: string;
    positions: RiskData;
    when: number;
}
interface IRiskRow extends IRiskDto {
    id: string;
    createDate: Date;
    updatedDate: Date;
}

declare const RiskCacheService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly connectionKey: string;
    readonly ttlExpireSeconds: number;
    _getItemKey(key: string): string;
    set(key: string, value: unknown): Promise<void>;
    get(key: string | null): Promise<unknown | null>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    toArray(): Promise<[string, unknown][]>;
    iterate(): AsyncIterableIterator<readonly [string, unknown]>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<unknown>;
    size(): Promise<number>;
}) & Omit<{
    new (connectionKey: string, ttlExpireSeconds?: number): {
        readonly loggerService: LoggerService;
        readonly connectionKey: string;
        readonly ttlExpireSeconds: number;
        _getItemKey(key: string): string;
        set(key: string, value: unknown): Promise<void>;
        get(key: string | null): Promise<unknown | null>;
        delete(key: string): Promise<void>;
        has(key: string): Promise<boolean>;
        clear(): Promise<void>;
        toArray(): Promise<[string, unknown][]>;
        iterate(): AsyncIterableIterator<readonly [string, unknown]>;
        keys(): AsyncIterableIterator<string>;
        values(): AsyncIterableIterator<unknown>;
        size(): Promise<number>;
    };
}, "prototype">;
declare class RiskCacheService extends RiskCacheService_base {
    readonly loggerService: LoggerService;
    private _cacheKey;
    hasRiskId(riskName: string, exchangeName: string): Promise<boolean>;
    getRiskId(riskName: string, exchangeName: string): Promise<string | null>;
    setRiskId(row: IRiskRow): Promise<string>;
}

interface IPartialDto {
    symbol: string;
    strategyName: string;
    exchangeName: string;
    signalId: string;
    payload: PartialData;
    when: number;
}
interface IPartialRow extends IPartialDto {
    id: string;
    createDate: Date;
    updatedDate: Date;
}

declare const PartialCacheService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly connectionKey: string;
    readonly ttlExpireSeconds: number;
    _getItemKey(key: string): string;
    set(key: string, value: unknown): Promise<void>;
    get(key: string | null): Promise<unknown | null>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    toArray(): Promise<[string, unknown][]>;
    iterate(): AsyncIterableIterator<readonly [string, unknown]>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<unknown>;
    size(): Promise<number>;
}) & Omit<{
    new (connectionKey: string, ttlExpireSeconds?: number): {
        readonly loggerService: LoggerService;
        readonly connectionKey: string;
        readonly ttlExpireSeconds: number;
        _getItemKey(key: string): string;
        set(key: string, value: unknown): Promise<void>;
        get(key: string | null): Promise<unknown | null>;
        delete(key: string): Promise<void>;
        has(key: string): Promise<boolean>;
        clear(): Promise<void>;
        toArray(): Promise<[string, unknown][]>;
        iterate(): AsyncIterableIterator<readonly [string, unknown]>;
        keys(): AsyncIterableIterator<string>;
        values(): AsyncIterableIterator<unknown>;
        size(): Promise<number>;
    };
}, "prototype">;
declare class PartialCacheService extends PartialCacheService_base {
    readonly loggerService: LoggerService;
    private _cacheKey;
    hasPartialId(symbol: string, strategyName: string, exchangeName: string, signalId: string): Promise<boolean>;
    getPartialId(symbol: string, strategyName: string, exchangeName: string, signalId: string): Promise<string | null>;
    setPartialId(row: IPartialRow): Promise<string>;
}

interface IBreakevenDto {
    symbol: string;
    strategyName: string;
    exchangeName: string;
    signalId: string;
    payload: BreakevenData;
    when: number;
}
interface IBreakevenRow extends IBreakevenDto {
    id: string;
    createDate: Date;
    updatedDate: Date;
}

declare const BreakevenCacheService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly connectionKey: string;
    readonly ttlExpireSeconds: number;
    _getItemKey(key: string): string;
    set(key: string, value: unknown): Promise<void>;
    get(key: string | null): Promise<unknown | null>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    toArray(): Promise<[string, unknown][]>;
    iterate(): AsyncIterableIterator<readonly [string, unknown]>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<unknown>;
    size(): Promise<number>;
}) & Omit<{
    new (connectionKey: string, ttlExpireSeconds?: number): {
        readonly loggerService: LoggerService;
        readonly connectionKey: string;
        readonly ttlExpireSeconds: number;
        _getItemKey(key: string): string;
        set(key: string, value: unknown): Promise<void>;
        get(key: string | null): Promise<unknown | null>;
        delete(key: string): Promise<void>;
        has(key: string): Promise<boolean>;
        clear(): Promise<void>;
        toArray(): Promise<[string, unknown][]>;
        iterate(): AsyncIterableIterator<readonly [string, unknown]>;
        keys(): AsyncIterableIterator<string>;
        values(): AsyncIterableIterator<unknown>;
        size(): Promise<number>;
    };
}, "prototype">;
declare class BreakevenCacheService extends BreakevenCacheService_base {
    readonly loggerService: LoggerService;
    private _cacheKey;
    hasBreakevenId(symbol: string, strategyName: string, exchangeName: string, signalId: string): Promise<boolean>;
    getBreakevenId(symbol: string, strategyName: string, exchangeName: string, signalId: string): Promise<string | null>;
    setBreakevenId(row: IBreakevenRow): Promise<string>;
}

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

declare const StorageCacheService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly connectionKey: string;
    readonly ttlExpireSeconds: number;
    _getItemKey(key: string): string;
    set(key: string, value: unknown): Promise<void>;
    get(key: string | null): Promise<unknown | null>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    toArray(): Promise<[string, unknown][]>;
    iterate(): AsyncIterableIterator<readonly [string, unknown]>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<unknown>;
    size(): Promise<number>;
}) & Omit<{
    new (connectionKey: string, ttlExpireSeconds?: number): {
        readonly loggerService: LoggerService;
        readonly connectionKey: string;
        readonly ttlExpireSeconds: number;
        _getItemKey(key: string): string;
        set(key: string, value: unknown): Promise<void>;
        get(key: string | null): Promise<unknown | null>;
        delete(key: string): Promise<void>;
        has(key: string): Promise<boolean>;
        clear(): Promise<void>;
        toArray(): Promise<[string, unknown][]>;
        iterate(): AsyncIterableIterator<readonly [string, unknown]>;
        keys(): AsyncIterableIterator<string>;
        values(): AsyncIterableIterator<unknown>;
        size(): Promise<number>;
    };
}, "prototype">;
declare class StorageCacheService extends StorageCacheService_base {
    readonly loggerService: LoggerService;
    private _cacheKey;
    hasStorageId(backtest: boolean, signalId: string): Promise<boolean>;
    getStorageId(backtest: boolean, signalId: string): Promise<string | null>;
    setStorageId(row: IStorageRow): Promise<string>;
}

interface INotificationDto {
    backtest: boolean;
    notificationId: string;
    payload: NotificationModel;
}
interface INotificationRow extends INotificationDto {
    id: string;
    createDate: Date;
    updatedDate: Date;
}

declare const NotificationCacheService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly connectionKey: string;
    readonly ttlExpireSeconds: number;
    _getItemKey(key: string): string;
    set(key: string, value: unknown): Promise<void>;
    get(key: string | null): Promise<unknown | null>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    toArray(): Promise<[string, unknown][]>;
    iterate(): AsyncIterableIterator<readonly [string, unknown]>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<unknown>;
    size(): Promise<number>;
}) & Omit<{
    new (connectionKey: string, ttlExpireSeconds?: number): {
        readonly loggerService: LoggerService;
        readonly connectionKey: string;
        readonly ttlExpireSeconds: number;
        _getItemKey(key: string): string;
        set(key: string, value: unknown): Promise<void>;
        get(key: string | null): Promise<unknown | null>;
        delete(key: string): Promise<void>;
        has(key: string): Promise<boolean>;
        clear(): Promise<void>;
        toArray(): Promise<[string, unknown][]>;
        iterate(): AsyncIterableIterator<readonly [string, unknown]>;
        keys(): AsyncIterableIterator<string>;
        values(): AsyncIterableIterator<unknown>;
        size(): Promise<number>;
    };
}, "prototype">;
declare class NotificationCacheService extends NotificationCacheService_base {
    readonly loggerService: LoggerService;
    private _cacheKey;
    hasNotificationId(backtest: boolean, notificationId: string): Promise<boolean>;
    getNotificationId(backtest: boolean, notificationId: string): Promise<string | null>;
    setNotificationId(row: INotificationRow): Promise<string>;
}

interface ILogDto {
    entryId: string;
    payload: ILogEntry;
}
interface ILogRow extends ILogDto {
    id: string;
    createDate: Date;
    updatedDate: Date;
}

declare const LogCacheService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly connectionKey: string;
    readonly ttlExpireSeconds: number;
    _getItemKey(key: string): string;
    set(key: string, value: unknown): Promise<void>;
    get(key: string | null): Promise<unknown | null>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    toArray(): Promise<[string, unknown][]>;
    iterate(): AsyncIterableIterator<readonly [string, unknown]>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<unknown>;
    size(): Promise<number>;
}) & Omit<{
    new (connectionKey: string, ttlExpireSeconds?: number): {
        readonly loggerService: LoggerService;
        readonly connectionKey: string;
        readonly ttlExpireSeconds: number;
        _getItemKey(key: string): string;
        set(key: string, value: unknown): Promise<void>;
        get(key: string | null): Promise<unknown | null>;
        delete(key: string): Promise<void>;
        has(key: string): Promise<boolean>;
        clear(): Promise<void>;
        toArray(): Promise<[string, unknown][]>;
        iterate(): AsyncIterableIterator<readonly [string, unknown]>;
        keys(): AsyncIterableIterator<string>;
        values(): AsyncIterableIterator<unknown>;
        size(): Promise<number>;
    };
}, "prototype">;
declare class LogCacheService extends LogCacheService_base {
    readonly loggerService: LoggerService;
    hasLogId(entryId: string): Promise<boolean>;
    getLogId(entryId: string): Promise<string | null>;
    setLogId(row: ILogRow): Promise<string>;
}

interface IMeasureDto {
    bucket: string;
    entryKey: string;
    payload: MeasureData;
    removed: boolean;
}
interface IMeasureRow extends IMeasureDto {
    id: string;
    createDate: Date;
    updatedDate: Date;
}

declare const MeasureCacheService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly connectionKey: string;
    readonly ttlExpireSeconds: number;
    _getItemKey(key: string): string;
    set(key: string, value: unknown): Promise<void>;
    get(key: string | null): Promise<unknown | null>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    toArray(): Promise<[string, unknown][]>;
    iterate(): AsyncIterableIterator<readonly [string, unknown]>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<unknown>;
    size(): Promise<number>;
}) & Omit<{
    new (connectionKey: string, ttlExpireSeconds?: number): {
        readonly loggerService: LoggerService;
        readonly connectionKey: string;
        readonly ttlExpireSeconds: number;
        _getItemKey(key: string): string;
        set(key: string, value: unknown): Promise<void>;
        get(key: string | null): Promise<unknown | null>;
        delete(key: string): Promise<void>;
        has(key: string): Promise<boolean>;
        clear(): Promise<void>;
        toArray(): Promise<[string, unknown][]>;
        iterate(): AsyncIterableIterator<readonly [string, unknown]>;
        keys(): AsyncIterableIterator<string>;
        values(): AsyncIterableIterator<unknown>;
        size(): Promise<number>;
    };
}, "prototype">;
declare class MeasureCacheService extends MeasureCacheService_base {
    readonly loggerService: LoggerService;
    private _cacheKey;
    hasMeasureId(bucket: string, entryKey: string): Promise<boolean>;
    getMeasureId(bucket: string, entryKey: string): Promise<string | null>;
    setMeasureId(row: IMeasureRow): Promise<string>;
}

interface IIntervalDto {
    bucket: string;
    entryKey: string;
    payload: IntervalData;
    removed: boolean;
    when: number;
}
interface IIntervalRow extends IIntervalDto {
    id: string;
    createDate: Date;
    updatedDate: Date;
}

declare const IntervalCacheService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly connectionKey: string;
    readonly ttlExpireSeconds: number;
    _getItemKey(key: string): string;
    set(key: string, value: unknown): Promise<void>;
    get(key: string | null): Promise<unknown | null>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    toArray(): Promise<[string, unknown][]>;
    iterate(): AsyncIterableIterator<readonly [string, unknown]>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<unknown>;
    size(): Promise<number>;
}) & Omit<{
    new (connectionKey: string, ttlExpireSeconds?: number): {
        readonly loggerService: LoggerService;
        readonly connectionKey: string;
        readonly ttlExpireSeconds: number;
        _getItemKey(key: string): string;
        set(key: string, value: unknown): Promise<void>;
        get(key: string | null): Promise<unknown | null>;
        delete(key: string): Promise<void>;
        has(key: string): Promise<boolean>;
        clear(): Promise<void>;
        toArray(): Promise<[string, unknown][]>;
        iterate(): AsyncIterableIterator<readonly [string, unknown]>;
        keys(): AsyncIterableIterator<string>;
        values(): AsyncIterableIterator<unknown>;
        size(): Promise<number>;
    };
}, "prototype">;
declare class IntervalCacheService extends IntervalCacheService_base {
    readonly loggerService: LoggerService;
    private _cacheKey;
    hasIntervalId(bucket: string, entryKey: string): Promise<boolean>;
    getIntervalId(bucket: string, entryKey: string): Promise<string | null>;
    setIntervalId(row: IIntervalRow): Promise<string>;
    deleteIntervalId(bucket: string, entryKey: string): Promise<void>;
}

interface IMemoryDto {
    signalId: string;
    bucketName: string;
    memoryId: string;
    payload: MemoryData;
    removed: boolean;
    when: number;
}
interface IMemoryRow extends IMemoryDto {
    id: string;
    createDate: Date;
    updatedDate: Date;
}

declare const MemoryCacheService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly connectionKey: string;
    readonly ttlExpireSeconds: number;
    _getItemKey(key: string): string;
    set(key: string, value: unknown): Promise<void>;
    get(key: string | null): Promise<unknown | null>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    toArray(): Promise<[string, unknown][]>;
    iterate(): AsyncIterableIterator<readonly [string, unknown]>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<unknown>;
    size(): Promise<number>;
}) & Omit<{
    new (connectionKey: string, ttlExpireSeconds?: number): {
        readonly loggerService: LoggerService;
        readonly connectionKey: string;
        readonly ttlExpireSeconds: number;
        _getItemKey(key: string): string;
        set(key: string, value: unknown): Promise<void>;
        get(key: string | null): Promise<unknown | null>;
        delete(key: string): Promise<void>;
        has(key: string): Promise<boolean>;
        clear(): Promise<void>;
        toArray(): Promise<[string, unknown][]>;
        iterate(): AsyncIterableIterator<readonly [string, unknown]>;
        keys(): AsyncIterableIterator<string>;
        values(): AsyncIterableIterator<unknown>;
        size(): Promise<number>;
    };
}, "prototype">;
declare class MemoryCacheService extends MemoryCacheService_base {
    readonly loggerService: LoggerService;
    private _cacheKey;
    hasMemoryEntryId(signalId: string, bucketName: string, memoryId: string): Promise<boolean>;
    getMemoryEntryId(signalId: string, bucketName: string, memoryId: string): Promise<string | null>;
    setMemoryEntryId(row: IMemoryRow): Promise<string>;
}

interface IRecentDto {
    symbol: string;
    strategyName: string;
    exchangeName: string;
    frameName: string;
    backtest: boolean;
    payload: IPublicSignalRow;
    when: number;
}
interface IRecentRow extends IRecentDto {
    id: string;
    createDate: Date;
    updatedDate: Date;
}

declare const RecentCacheService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly connectionKey: string;
    readonly ttlExpireSeconds: number;
    _getItemKey(key: string): string;
    set(key: string, value: unknown): Promise<void>;
    get(key: string | null): Promise<unknown | null>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    toArray(): Promise<[string, unknown][]>;
    iterate(): AsyncIterableIterator<readonly [string, unknown]>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<unknown>;
    size(): Promise<number>;
}) & Omit<{
    new (connectionKey: string, ttlExpireSeconds?: number): {
        readonly loggerService: LoggerService;
        readonly connectionKey: string;
        readonly ttlExpireSeconds: number;
        _getItemKey(key: string): string;
        set(key: string, value: unknown): Promise<void>;
        get(key: string | null): Promise<unknown | null>;
        delete(key: string): Promise<void>;
        has(key: string): Promise<boolean>;
        clear(): Promise<void>;
        toArray(): Promise<[string, unknown][]>;
        iterate(): AsyncIterableIterator<readonly [string, unknown]>;
        keys(): AsyncIterableIterator<string>;
        values(): AsyncIterableIterator<unknown>;
        size(): Promise<number>;
    };
}, "prototype">;
declare class RecentCacheService extends RecentCacheService_base {
    readonly loggerService: LoggerService;
    private _cacheKey;
    hasRecentId(symbol: string, strategyName: string, exchangeName: string, frameName: string, backtest: boolean): Promise<boolean>;
    getRecentId(symbol: string, strategyName: string, exchangeName: string, frameName: string, backtest: boolean): Promise<string | null>;
    setRecentId(row: IRecentRow): Promise<string>;
}

interface IStateDto {
    signalId: string;
    bucketName: string;
    payload: StateData;
    when: number;
}
interface IStateRow extends IStateDto {
    id: string;
    createDate: Date;
    updatedDate: Date;
}

declare const StateCacheService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly connectionKey: string;
    readonly ttlExpireSeconds: number;
    _getItemKey(key: string): string;
    set(key: string, value: unknown): Promise<void>;
    get(key: string | null): Promise<unknown | null>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    toArray(): Promise<[string, unknown][]>;
    iterate(): AsyncIterableIterator<readonly [string, unknown]>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<unknown>;
    size(): Promise<number>;
}) & Omit<{
    new (connectionKey: string, ttlExpireSeconds?: number): {
        readonly loggerService: LoggerService;
        readonly connectionKey: string;
        readonly ttlExpireSeconds: number;
        _getItemKey(key: string): string;
        set(key: string, value: unknown): Promise<void>;
        get(key: string | null): Promise<unknown | null>;
        delete(key: string): Promise<void>;
        has(key: string): Promise<boolean>;
        clear(): Promise<void>;
        toArray(): Promise<[string, unknown][]>;
        iterate(): AsyncIterableIterator<readonly [string, unknown]>;
        keys(): AsyncIterableIterator<string>;
        values(): AsyncIterableIterator<unknown>;
        size(): Promise<number>;
    };
}, "prototype">;
declare class StateCacheService extends StateCacheService_base {
    readonly loggerService: LoggerService;
    private _cacheKey;
    hasStateId(signalId: string, bucketName: string): Promise<boolean>;
    getStateId(signalId: string, bucketName: string): Promise<string | null>;
    setStateId(row: IStateRow): Promise<string>;
}

interface ISessionDto {
    strategyName: string;
    exchangeName: string;
    frameName: string;
    symbol: string;
    backtest: boolean;
    payload: SessionData;
    when: number;
}
interface ISessionRow extends ISessionDto {
    id: string;
    createDate: Date;
    updatedDate: Date;
}

declare const SessionCacheService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly connectionKey: string;
    readonly ttlExpireSeconds: number;
    _getItemKey(key: string): string;
    set(key: string, value: unknown): Promise<void>;
    get(key: string | null): Promise<unknown | null>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    clear(): Promise<void>;
    toArray(): Promise<[string, unknown][]>;
    iterate(): AsyncIterableIterator<readonly [string, unknown]>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<unknown>;
    size(): Promise<number>;
}) & Omit<{
    new (connectionKey: string, ttlExpireSeconds?: number): {
        readonly loggerService: LoggerService;
        readonly connectionKey: string;
        readonly ttlExpireSeconds: number;
        _getItemKey(key: string): string;
        set(key: string, value: unknown): Promise<void>;
        get(key: string | null): Promise<unknown | null>;
        delete(key: string): Promise<void>;
        has(key: string): Promise<boolean>;
        clear(): Promise<void>;
        toArray(): Promise<[string, unknown][]>;
        iterate(): AsyncIterableIterator<readonly [string, unknown]>;
        keys(): AsyncIterableIterator<string>;
        values(): AsyncIterableIterator<unknown>;
        size(): Promise<number>;
    };
}, "prototype">;
declare class SessionCacheService extends SessionCacheService_base {
    readonly loggerService: LoggerService;
    private _cacheKey;
    hasSessionId(strategyName: string, exchangeName: string, frameName: string, symbol: string, backtest: boolean): Promise<boolean>;
    getSessionId(strategyName: string, exchangeName: string, frameName: string, symbol: string, backtest: boolean): Promise<string | null>;
    setSessionId(row: ISessionRow): Promise<string>;
}

declare const CandleDbService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly TargetModel: typeorm.EntitySchema<any>;
    readonly entityName: string;
    repo<T = any>(): Promise<typeorm.Repository<T>>;
    create(dto: object): Promise<any>;
    update(id: string, dto: object): Promise<any>;
    findById(id: string): Promise<any>;
    findByFilter(filterData: object, order?: object): Promise<any>;
    findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
}) & Omit<{
    new (TargetModel: typeorm.EntitySchema<any>): {
        readonly loggerService: LoggerService;
        readonly TargetModel: typeorm.EntitySchema<any>;
        readonly entityName: string;
        repo<T = any>(): Promise<typeorm.Repository<T>>;
        create(dto: object): Promise<any>;
        update(id: string, dto: object): Promise<any>;
        findById(id: string): Promise<any>;
        findByFilter(filterData: object, order?: object): Promise<any>;
        findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
    };
}, "prototype">;
declare class CandleDbService extends CandleDbService_base {
    readonly loggerService: LoggerService;
    readonly candleCacheService: CandleCacheService;
    create: (dto: ICandleDto) => Promise<ICandleRow>;
    hasCandle: (symbol: string, interval: CandleInterval, timestamp: number) => Promise<boolean>;
    findBySymbolIntervalTimestamp: (symbol: string, interval: CandleInterval, timestamp: number) => Promise<ICandleRow | null>;
}

declare const SignalDbService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly TargetModel: typeorm.EntitySchema<any>;
    readonly entityName: string;
    repo<T = any>(): Promise<typeorm.Repository<T>>;
    create(dto: object): Promise<any>;
    update(id: string, dto: object): Promise<any>;
    findById(id: string): Promise<any>;
    findByFilter(filterData: object, order?: object): Promise<any>;
    findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
}) & Omit<{
    new (TargetModel: typeorm.EntitySchema<any>): {
        readonly loggerService: LoggerService;
        readonly TargetModel: typeorm.EntitySchema<any>;
        readonly entityName: string;
        repo<T = any>(): Promise<typeorm.Repository<T>>;
        create(dto: object): Promise<any>;
        update(id: string, dto: object): Promise<any>;
        findById(id: string): Promise<any>;
        findByFilter(filterData: object, order?: object): Promise<any>;
        findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
    };
}, "prototype">;
declare class SignalDbService extends SignalDbService_base {
    readonly loggerService: LoggerService;
    readonly signalCacheService: SignalCacheService;
    upsert: (symbol: string, strategyName: string, exchangeName: string, payload: ISignalRow | null) => Promise<void>;
    findByContext: (symbol: string, strategyName: string, exchangeName: string) => Promise<ISignalRowDoc | null>;
}

declare const ScheduleDbService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly TargetModel: typeorm.EntitySchema<any>;
    readonly entityName: string;
    repo<T = any>(): Promise<typeorm.Repository<T>>;
    create(dto: object): Promise<any>;
    update(id: string, dto: object): Promise<any>;
    findById(id: string): Promise<any>;
    findByFilter(filterData: object, order?: object): Promise<any>;
    findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
}) & Omit<{
    new (TargetModel: typeorm.EntitySchema<any>): {
        readonly loggerService: LoggerService;
        readonly TargetModel: typeorm.EntitySchema<any>;
        readonly entityName: string;
        repo<T = any>(): Promise<typeorm.Repository<T>>;
        create(dto: object): Promise<any>;
        update(id: string, dto: object): Promise<any>;
        findById(id: string): Promise<any>;
        findByFilter(filterData: object, order?: object): Promise<any>;
        findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
    };
}, "prototype">;
declare class ScheduleDbService extends ScheduleDbService_base {
    readonly loggerService: LoggerService;
    readonly scheduleCacheService: ScheduleCacheService;
    upsert: (symbol: string, strategyName: string, exchangeName: string, payload: IScheduledSignalRow | null) => Promise<void>;
    findByContext: (symbol: string, strategyName: string, exchangeName: string) => Promise<IScheduleRow | null>;
}

declare const StrategyDbService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly TargetModel: typeorm.EntitySchema<any>;
    readonly entityName: string;
    repo<T = any>(): Promise<typeorm.Repository<T>>;
    create(dto: object): Promise<any>;
    update(id: string, dto: object): Promise<any>;
    findById(id: string): Promise<any>;
    findByFilter(filterData: object, order?: object): Promise<any>;
    findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
}) & Omit<{
    new (TargetModel: typeorm.EntitySchema<any>): {
        readonly loggerService: LoggerService;
        readonly TargetModel: typeorm.EntitySchema<any>;
        readonly entityName: string;
        repo<T = any>(): Promise<typeorm.Repository<T>>;
        create(dto: object): Promise<any>;
        update(id: string, dto: object): Promise<any>;
        findById(id: string): Promise<any>;
        findByFilter(filterData: object, order?: object): Promise<any>;
        findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
    };
}, "prototype">;
declare class StrategyDbService extends StrategyDbService_base {
    readonly loggerService: LoggerService;
    readonly strategyCacheService: StrategyCacheService;
    upsert: (symbol: string, strategyName: string, exchangeName: string, payload: StrategyData | null) => Promise<void>;
    findByContext: (symbol: string, strategyName: string, exchangeName: string) => Promise<IStrategyRow | null>;
}

declare const RiskDbService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly TargetModel: typeorm.EntitySchema<any>;
    readonly entityName: string;
    repo<T = any>(): Promise<typeorm.Repository<T>>;
    create(dto: object): Promise<any>;
    update(id: string, dto: object): Promise<any>;
    findById(id: string): Promise<any>;
    findByFilter(filterData: object, order?: object): Promise<any>;
    findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
}) & Omit<{
    new (TargetModel: typeorm.EntitySchema<any>): {
        readonly loggerService: LoggerService;
        readonly TargetModel: typeorm.EntitySchema<any>;
        readonly entityName: string;
        repo<T = any>(): Promise<typeorm.Repository<T>>;
        create(dto: object): Promise<any>;
        update(id: string, dto: object): Promise<any>;
        findById(id: string): Promise<any>;
        findByFilter(filterData: object, order?: object): Promise<any>;
        findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
    };
}, "prototype">;
declare class RiskDbService extends RiskDbService_base {
    readonly loggerService: LoggerService;
    readonly riskCacheService: RiskCacheService;
    upsert: (riskName: string, exchangeName: string, positions: RiskData, when: Date) => Promise<void>;
    findByContext: (riskName: string, exchangeName: string) => Promise<IRiskRow | null>;
}

declare const PartialDbService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly TargetModel: typeorm.EntitySchema<any>;
    readonly entityName: string;
    repo<T = any>(): Promise<typeorm.Repository<T>>;
    create(dto: object): Promise<any>;
    update(id: string, dto: object): Promise<any>;
    findById(id: string): Promise<any>;
    findByFilter(filterData: object, order?: object): Promise<any>;
    findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
}) & Omit<{
    new (TargetModel: typeorm.EntitySchema<any>): {
        readonly loggerService: LoggerService;
        readonly TargetModel: typeorm.EntitySchema<any>;
        readonly entityName: string;
        repo<T = any>(): Promise<typeorm.Repository<T>>;
        create(dto: object): Promise<any>;
        update(id: string, dto: object): Promise<any>;
        findById(id: string): Promise<any>;
        findByFilter(filterData: object, order?: object): Promise<any>;
        findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
    };
}, "prototype">;
declare class PartialDbService extends PartialDbService_base {
    readonly loggerService: LoggerService;
    readonly partialCacheService: PartialCacheService;
    upsert: (symbol: string, strategyName: string, exchangeName: string, signalId: string, payload: PartialData, when: Date) => Promise<void>;
    findByContext: (symbol: string, strategyName: string, exchangeName: string, signalId: string) => Promise<IPartialRow | null>;
}

declare const BreakevenDbService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly TargetModel: typeorm.EntitySchema<any>;
    readonly entityName: string;
    repo<T = any>(): Promise<typeorm.Repository<T>>;
    create(dto: object): Promise<any>;
    update(id: string, dto: object): Promise<any>;
    findById(id: string): Promise<any>;
    findByFilter(filterData: object, order?: object): Promise<any>;
    findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
}) & Omit<{
    new (TargetModel: typeorm.EntitySchema<any>): {
        readonly loggerService: LoggerService;
        readonly TargetModel: typeorm.EntitySchema<any>;
        readonly entityName: string;
        repo<T = any>(): Promise<typeorm.Repository<T>>;
        create(dto: object): Promise<any>;
        update(id: string, dto: object): Promise<any>;
        findById(id: string): Promise<any>;
        findByFilter(filterData: object, order?: object): Promise<any>;
        findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
    };
}, "prototype">;
declare class BreakevenDbService extends BreakevenDbService_base {
    readonly loggerService: LoggerService;
    readonly breakevenCacheService: BreakevenCacheService;
    upsert: (symbol: string, strategyName: string, exchangeName: string, signalId: string, payload: BreakevenData, when: Date) => Promise<void>;
    findByContext: (symbol: string, strategyName: string, exchangeName: string, signalId: string) => Promise<IBreakevenRow | null>;
}

declare const StorageDbService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly TargetModel: typeorm.EntitySchema<any>;
    readonly entityName: string;
    repo<T = any>(): Promise<typeorm.Repository<T>>;
    create(dto: object): Promise<any>;
    update(id: string, dto: object): Promise<any>;
    findById(id: string): Promise<any>;
    findByFilter(filterData: object, order?: object): Promise<any>;
    findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
}) & Omit<{
    new (TargetModel: typeorm.EntitySchema<any>): {
        readonly loggerService: LoggerService;
        readonly TargetModel: typeorm.EntitySchema<any>;
        readonly entityName: string;
        repo<T = any>(): Promise<typeorm.Repository<T>>;
        create(dto: object): Promise<any>;
        update(id: string, dto: object): Promise<any>;
        findById(id: string): Promise<any>;
        findByFilter(filterData: object, order?: object): Promise<any>;
        findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
    };
}, "prototype">;
declare class StorageDbService extends StorageDbService_base {
    readonly loggerService: LoggerService;
    readonly storageCacheService: StorageCacheService;
    upsert: (backtest: boolean, signalId: string, payload: IStorageSignalRow) => Promise<void>;
    findBySignalId: (backtest: boolean, signalId: string) => Promise<IStorageRow | null>;
    listByMode: (backtest: boolean) => Promise<IStorageRow[]>;
}

declare const NotificationDbService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly TargetModel: typeorm.EntitySchema<any>;
    readonly entityName: string;
    repo<T = any>(): Promise<typeorm.Repository<T>>;
    create(dto: object): Promise<any>;
    update(id: string, dto: object): Promise<any>;
    findById(id: string): Promise<any>;
    findByFilter(filterData: object, order?: object): Promise<any>;
    findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
}) & Omit<{
    new (TargetModel: typeorm.EntitySchema<any>): {
        readonly loggerService: LoggerService;
        readonly TargetModel: typeorm.EntitySchema<any>;
        readonly entityName: string;
        repo<T = any>(): Promise<typeorm.Repository<T>>;
        create(dto: object): Promise<any>;
        update(id: string, dto: object): Promise<any>;
        findById(id: string): Promise<any>;
        findByFilter(filterData: object, order?: object): Promise<any>;
        findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
    };
}, "prototype">;
declare class NotificationDbService extends NotificationDbService_base {
    readonly loggerService: LoggerService;
    readonly notificationCacheService: NotificationCacheService;
    upsert: (backtest: boolean, notificationId: string, payload: NotificationModel) => Promise<void>;
    findByNotificationId: (backtest: boolean, notificationId: string) => Promise<INotificationRow | null>;
    listByMode: (backtest: boolean) => Promise<INotificationRow[]>;
}

declare const LogDbService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly TargetModel: typeorm.EntitySchema<any>;
    readonly entityName: string;
    repo<T = any>(): Promise<typeorm.Repository<T>>;
    create(dto: object): Promise<any>;
    update(id: string, dto: object): Promise<any>;
    findById(id: string): Promise<any>;
    findByFilter(filterData: object, order?: object): Promise<any>;
    findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
}) & Omit<{
    new (TargetModel: typeorm.EntitySchema<any>): {
        readonly loggerService: LoggerService;
        readonly TargetModel: typeorm.EntitySchema<any>;
        readonly entityName: string;
        repo<T = any>(): Promise<typeorm.Repository<T>>;
        create(dto: object): Promise<any>;
        update(id: string, dto: object): Promise<any>;
        findById(id: string): Promise<any>;
        findByFilter(filterData: object, order?: object): Promise<any>;
        findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
    };
}, "prototype">;
declare class LogDbService extends LogDbService_base {
    readonly loggerService: LoggerService;
    readonly logCacheService: LogCacheService;
    upsert: (entryId: string, payload: ILogEntry) => Promise<void>;
    findByEntryId: (entryId: string) => Promise<ILogRow | null>;
    listAll: () => Promise<ILogRow[]>;
}

declare const MeasureDbService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly TargetModel: typeorm.EntitySchema<any>;
    readonly entityName: string;
    repo<T = any>(): Promise<typeorm.Repository<T>>;
    create(dto: object): Promise<any>;
    update(id: string, dto: object): Promise<any>;
    findById(id: string): Promise<any>;
    findByFilter(filterData: object, order?: object): Promise<any>;
    findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
}) & Omit<{
    new (TargetModel: typeorm.EntitySchema<any>): {
        readonly loggerService: LoggerService;
        readonly TargetModel: typeorm.EntitySchema<any>;
        readonly entityName: string;
        repo<T = any>(): Promise<typeorm.Repository<T>>;
        create(dto: object): Promise<any>;
        update(id: string, dto: object): Promise<any>;
        findById(id: string): Promise<any>;
        findByFilter(filterData: object, order?: object): Promise<any>;
        findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
    };
}, "prototype">;
declare class MeasureDbService extends MeasureDbService_base {
    readonly loggerService: LoggerService;
    readonly measureCacheService: MeasureCacheService;
    upsert: (bucket: string, entryKey: string, payload: MeasureData) => Promise<void>;
    findByKey: (bucket: string, entryKey: string) => Promise<IMeasureRow | null>;
    softRemove: (bucket: string, entryKey: string) => Promise<void>;
    listKeys: (bucket: string) => Promise<string[]>;
}

declare const IntervalDbService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly TargetModel: typeorm.EntitySchema<any>;
    readonly entityName: string;
    repo<T = any>(): Promise<typeorm.Repository<T>>;
    create(dto: object): Promise<any>;
    update(id: string, dto: object): Promise<any>;
    findById(id: string): Promise<any>;
    findByFilter(filterData: object, order?: object): Promise<any>;
    findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
}) & Omit<{
    new (TargetModel: typeorm.EntitySchema<any>): {
        readonly loggerService: LoggerService;
        readonly TargetModel: typeorm.EntitySchema<any>;
        readonly entityName: string;
        repo<T = any>(): Promise<typeorm.Repository<T>>;
        create(dto: object): Promise<any>;
        update(id: string, dto: object): Promise<any>;
        findById(id: string): Promise<any>;
        findByFilter(filterData: object, order?: object): Promise<any>;
        findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
    };
}, "prototype">;
declare class IntervalDbService extends IntervalDbService_base {
    readonly loggerService: LoggerService;
    readonly intervalCacheService: IntervalCacheService;
    upsert: (bucket: string, entryKey: string, payload: IntervalData, when: Date) => Promise<void>;
    findByKey: (bucket: string, entryKey: string) => Promise<IIntervalRow | null>;
    softRemove: (bucket: string, entryKey: string) => Promise<void>;
    listKeys: (bucket: string) => Promise<string[]>;
    clearBucket: (bucket: string) => Promise<void>;
}

declare const MemoryDbService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly TargetModel: typeorm.EntitySchema<any>;
    readonly entityName: string;
    repo<T = any>(): Promise<typeorm.Repository<T>>;
    create(dto: object): Promise<any>;
    update(id: string, dto: object): Promise<any>;
    findById(id: string): Promise<any>;
    findByFilter(filterData: object, order?: object): Promise<any>;
    findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
}) & Omit<{
    new (TargetModel: typeorm.EntitySchema<any>): {
        readonly loggerService: LoggerService;
        readonly TargetModel: typeorm.EntitySchema<any>;
        readonly entityName: string;
        repo<T = any>(): Promise<typeorm.Repository<T>>;
        create(dto: object): Promise<any>;
        update(id: string, dto: object): Promise<any>;
        findById(id: string): Promise<any>;
        findByFilter(filterData: object, order?: object): Promise<any>;
        findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
    };
}, "prototype">;
declare class MemoryDbService extends MemoryDbService_base {
    readonly loggerService: LoggerService;
    readonly memoryCacheService: MemoryCacheService;
    upsert: (signalId: string, bucketName: string, memoryId: string, payload: MemoryData, when: Date) => Promise<void>;
    findByMemoryId: (signalId: string, bucketName: string, memoryId: string) => Promise<IMemoryRow | null>;
    hasMemoryEntry: (signalId: string, bucketName: string, memoryId: string) => Promise<boolean>;
    softRemove: (signalId: string, bucketName: string, memoryId: string) => Promise<void>;
    listEntries: (signalId: string, bucketName: string) => Promise<IMemoryRow[]>;
}

declare const RecentDbService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly TargetModel: typeorm.EntitySchema<any>;
    readonly entityName: string;
    repo<T = any>(): Promise<typeorm.Repository<T>>;
    create(dto: object): Promise<any>;
    update(id: string, dto: object): Promise<any>;
    findById(id: string): Promise<any>;
    findByFilter(filterData: object, order?: object): Promise<any>;
    findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
}) & Omit<{
    new (TargetModel: typeorm.EntitySchema<any>): {
        readonly loggerService: LoggerService;
        readonly TargetModel: typeorm.EntitySchema<any>;
        readonly entityName: string;
        repo<T = any>(): Promise<typeorm.Repository<T>>;
        create(dto: object): Promise<any>;
        update(id: string, dto: object): Promise<any>;
        findById(id: string): Promise<any>;
        findByFilter(filterData: object, order?: object): Promise<any>;
        findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
    };
}, "prototype">;
declare class RecentDbService extends RecentDbService_base {
    readonly loggerService: LoggerService;
    readonly recentCacheService: RecentCacheService;
    upsert: (symbol: string, strategyName: string, exchangeName: string, frameName: string, backtest: boolean, payload: IPublicSignalRow, when: Date) => Promise<void>;
    findByContext: (symbol: string, strategyName: string, exchangeName: string, frameName: string, backtest: boolean) => Promise<IRecentRow | null>;
}

declare const StateDbService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly TargetModel: typeorm.EntitySchema<any>;
    readonly entityName: string;
    repo<T = any>(): Promise<typeorm.Repository<T>>;
    create(dto: object): Promise<any>;
    update(id: string, dto: object): Promise<any>;
    findById(id: string): Promise<any>;
    findByFilter(filterData: object, order?: object): Promise<any>;
    findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
}) & Omit<{
    new (TargetModel: typeorm.EntitySchema<any>): {
        readonly loggerService: LoggerService;
        readonly TargetModel: typeorm.EntitySchema<any>;
        readonly entityName: string;
        repo<T = any>(): Promise<typeorm.Repository<T>>;
        create(dto: object): Promise<any>;
        update(id: string, dto: object): Promise<any>;
        findById(id: string): Promise<any>;
        findByFilter(filterData: object, order?: object): Promise<any>;
        findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
    };
}, "prototype">;
declare class StateDbService extends StateDbService_base {
    readonly loggerService: LoggerService;
    readonly stateCacheService: StateCacheService;
    upsert: (signalId: string, bucketName: string, payload: StateData, when: Date) => Promise<void>;
    findByContext: (signalId: string, bucketName: string) => Promise<IStateRow | null>;
}

declare const SessionDbService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly TargetModel: typeorm.EntitySchema<any>;
    readonly entityName: string;
    repo<T = any>(): Promise<typeorm.Repository<T>>;
    create(dto: object): Promise<any>;
    update(id: string, dto: object): Promise<any>;
    findById(id: string): Promise<any>;
    findByFilter(filterData: object, order?: object): Promise<any>;
    findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
}) & Omit<{
    new (TargetModel: typeorm.EntitySchema<any>): {
        readonly loggerService: LoggerService;
        readonly TargetModel: typeorm.EntitySchema<any>;
        readonly entityName: string;
        repo<T = any>(): Promise<typeorm.Repository<T>>;
        create(dto: object): Promise<any>;
        update(id: string, dto: object): Promise<any>;
        findById(id: string): Promise<any>;
        findByFilter(filterData: object, order?: object): Promise<any>;
        findAll(filterData?: object, limit?: number, order?: object): Promise<any[]>;
    };
}, "prototype">;
declare class SessionDbService extends SessionDbService_base {
    readonly loggerService: LoggerService;
    readonly sessionCacheService: SessionCacheService;
    upsert: (strategyName: string, exchangeName: string, frameName: string, symbol: string, backtest: boolean, payload: SessionData, when: Date) => Promise<void>;
    findByContext: (strategyName: string, exchangeName: string, frameName: string, symbol: string, backtest: boolean) => Promise<ISessionRow | null>;
}

declare const ioc: {
    candleDbService: CandleDbService;
    signalDbService: SignalDbService;
    scheduleDbService: ScheduleDbService;
    strategyDbService: StrategyDbService;
    riskDbService: RiskDbService;
    partialDbService: PartialDbService;
    breakevenDbService: BreakevenDbService;
    storageDbService: StorageDbService;
    notificationDbService: NotificationDbService;
    logDbService: LogDbService;
    measureDbService: MeasureDbService;
    intervalDbService: IntervalDbService;
    memoryDbService: MemoryDbService;
    recentDbService: RecentDbService;
    stateDbService: StateDbService;
    sessionDbService: SessionDbService;
    candleCacheService: CandleCacheService;
    signalCacheService: SignalCacheService;
    scheduleCacheService: ScheduleCacheService;
    strategyCacheService: StrategyCacheService;
    riskCacheService: RiskCacheService;
    partialCacheService: PartialCacheService;
    breakevenCacheService: BreakevenCacheService;
    storageCacheService: StorageCacheService;
    notificationCacheService: NotificationCacheService;
    logCacheService: LogCacheService;
    measureCacheService: MeasureCacheService;
    intervalCacheService: IntervalCacheService;
    memoryCacheService: MemoryCacheService;
    recentCacheService: RecentCacheService;
    stateCacheService: StateCacheService;
    sessionCacheService: SessionCacheService;
    loggerService: LoggerService;
    postgresService: PostgresService;
    redisService: RedisService;
};

export { ioc };

import * as functools_kit from 'functools-kit';
import { Redis } from 'ioredis';
import * as minio from 'minio';
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

declare class RedisService {
    readonly loggerService: LoggerService;
    waitForInit: (() => Promise<Redis>) & functools_kit.ISingleshotClearable<() => Promise<Redis>>;
    protected init: () => Promise<void>;
}

declare class MinioService {
    getClient: ((bucketName: string) => Promise<minio.Client>) & functools_kit.IClearableMemoize<[bucketName: string]> & functools_kit.IControlMemoize<[bucketName: string], Promise<minio.Client>>;
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

declare const CandleDataService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly minioService: MinioService;
    readonly bucketName: string;
    readonly rootPrefix: string;
    readonly BUCKET_NAME: string;
    set(key: string, value: unknown): Promise<void>;
    get<T = unknown>(key: string | null): Promise<T | null>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<void>;
    clear(prefix?: string): Promise<void>;
    keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
    values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
    iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
    toArray(prefix?: string): Promise<[string, unknown][]>;
    size(prefix?: string): Promise<number>;
}) & Omit<{
    new (BUCKET_NAME: string): {
        readonly loggerService: LoggerService;
        readonly minioService: MinioService;
        readonly bucketName: string;
        readonly rootPrefix: string;
        readonly BUCKET_NAME: string;
        set(key: string, value: unknown): Promise<void>;
        get<T = unknown>(key: string | null): Promise<T | null>;
        has(key: string): Promise<boolean>;
        delete(key: string): Promise<void>;
        clear(prefix?: string): Promise<void>;
        keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
        values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
        iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
        toArray(prefix?: string): Promise<[string, unknown][]>;
        size(prefix?: string): Promise<number>;
    };
}, "prototype">;
declare class CandleDataService extends CandleDataService_base {
    readonly loggerService: LoggerService;
    create: (dto: ICandleDto) => Promise<ICandleRow>;
    hasCandle: (symbol: string, interval: CandleInterval, timestamp: number) => Promise<boolean>;
    findBySymbolIntervalTimestamp: (symbol: string, interval: CandleInterval, timestamp: number) => Promise<ICandleRow | null>;
}

interface ISignalDto {
    symbol: string;
    strategyName: string;
    exchangeName: string;
    payload: ISignalRow;
}
interface ISignalRowDoc extends ISignalDto {
    id: string;
    createDate: Date;
    updatedDate: Date;
}

declare const SignalDataService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly minioService: MinioService;
    readonly bucketName: string;
    readonly rootPrefix: string;
    readonly BUCKET_NAME: string;
    set(key: string, value: unknown): Promise<void>;
    get<T = unknown>(key: string | null): Promise<T | null>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<void>;
    clear(prefix?: string): Promise<void>;
    keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
    values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
    iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
    toArray(prefix?: string): Promise<[string, unknown][]>;
    size(prefix?: string): Promise<number>;
}) & Omit<{
    new (BUCKET_NAME: string): {
        readonly loggerService: LoggerService;
        readonly minioService: MinioService;
        readonly bucketName: string;
        readonly rootPrefix: string;
        readonly BUCKET_NAME: string;
        set(key: string, value: unknown): Promise<void>;
        get<T = unknown>(key: string | null): Promise<T | null>;
        has(key: string): Promise<boolean>;
        delete(key: string): Promise<void>;
        clear(prefix?: string): Promise<void>;
        keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
        values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
        iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
        toArray(prefix?: string): Promise<[string, unknown][]>;
        size(prefix?: string): Promise<number>;
    };
}, "prototype">;
declare class SignalDataService extends SignalDataService_base {
    readonly loggerService: LoggerService;
    upsert: (symbol: string, strategyName: string, exchangeName: string, payload: ISignalRow | null) => Promise<void>;
    findByContext: (symbol: string, strategyName: string, exchangeName: string) => Promise<ISignalRowDoc | null>;
}

interface IScheduleDto {
    symbol: string;
    strategyName: string;
    exchangeName: string;
    payload: IScheduledSignalRow;
}
interface IScheduleRow extends IScheduleDto {
    id: string;
    createDate: Date;
    updatedDate: Date;
}

declare const ScheduleDataService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly minioService: MinioService;
    readonly bucketName: string;
    readonly rootPrefix: string;
    readonly BUCKET_NAME: string;
    set(key: string, value: unknown): Promise<void>;
    get<T = unknown>(key: string | null): Promise<T | null>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<void>;
    clear(prefix?: string): Promise<void>;
    keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
    values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
    iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
    toArray(prefix?: string): Promise<[string, unknown][]>;
    size(prefix?: string): Promise<number>;
}) & Omit<{
    new (BUCKET_NAME: string): {
        readonly loggerService: LoggerService;
        readonly minioService: MinioService;
        readonly bucketName: string;
        readonly rootPrefix: string;
        readonly BUCKET_NAME: string;
        set(key: string, value: unknown): Promise<void>;
        get<T = unknown>(key: string | null): Promise<T | null>;
        has(key: string): Promise<boolean>;
        delete(key: string): Promise<void>;
        clear(prefix?: string): Promise<void>;
        keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
        values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
        iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
        toArray(prefix?: string): Promise<[string, unknown][]>;
        size(prefix?: string): Promise<number>;
    };
}, "prototype">;
declare class ScheduleDataService extends ScheduleDataService_base {
    readonly loggerService: LoggerService;
    upsert: (symbol: string, strategyName: string, exchangeName: string, payload: IScheduledSignalRow | null) => Promise<void>;
    findByContext: (symbol: string, strategyName: string, exchangeName: string) => Promise<IScheduleRow | null>;
}

interface IStrategyDto {
    symbol: string;
    strategyName: string;
    exchangeName: string;
    payload: StrategyData;
}
interface IStrategyRow extends IStrategyDto {
    id: string;
    createDate: Date;
    updatedDate: Date;
}

declare const StrategyDataService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly minioService: MinioService;
    readonly bucketName: string;
    readonly rootPrefix: string;
    readonly BUCKET_NAME: string;
    set(key: string, value: unknown): Promise<void>;
    get<T = unknown>(key: string | null): Promise<T | null>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<void>;
    clear(prefix?: string): Promise<void>;
    keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
    values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
    iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
    toArray(prefix?: string): Promise<[string, unknown][]>;
    size(prefix?: string): Promise<number>;
}) & Omit<{
    new (BUCKET_NAME: string): {
        readonly loggerService: LoggerService;
        readonly minioService: MinioService;
        readonly bucketName: string;
        readonly rootPrefix: string;
        readonly BUCKET_NAME: string;
        set(key: string, value: unknown): Promise<void>;
        get<T = unknown>(key: string | null): Promise<T | null>;
        has(key: string): Promise<boolean>;
        delete(key: string): Promise<void>;
        clear(prefix?: string): Promise<void>;
        keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
        values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
        iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
        toArray(prefix?: string): Promise<[string, unknown][]>;
        size(prefix?: string): Promise<number>;
    };
}, "prototype">;
declare class StrategyDataService extends StrategyDataService_base {
    readonly loggerService: LoggerService;
    upsert: (symbol: string, strategyName: string, exchangeName: string, payload: StrategyData | null) => Promise<void>;
    findByContext: (symbol: string, strategyName: string, exchangeName: string) => Promise<IStrategyRow | null>;
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

declare const RiskDataService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly minioService: MinioService;
    readonly bucketName: string;
    readonly rootPrefix: string;
    readonly BUCKET_NAME: string;
    set(key: string, value: unknown): Promise<void>;
    get<T = unknown>(key: string | null): Promise<T | null>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<void>;
    clear(prefix?: string): Promise<void>;
    keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
    values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
    iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
    toArray(prefix?: string): Promise<[string, unknown][]>;
    size(prefix?: string): Promise<number>;
}) & Omit<{
    new (BUCKET_NAME: string): {
        readonly loggerService: LoggerService;
        readonly minioService: MinioService;
        readonly bucketName: string;
        readonly rootPrefix: string;
        readonly BUCKET_NAME: string;
        set(key: string, value: unknown): Promise<void>;
        get<T = unknown>(key: string | null): Promise<T | null>;
        has(key: string): Promise<boolean>;
        delete(key: string): Promise<void>;
        clear(prefix?: string): Promise<void>;
        keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
        values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
        iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
        toArray(prefix?: string): Promise<[string, unknown][]>;
        size(prefix?: string): Promise<number>;
    };
}, "prototype">;
declare class RiskDataService extends RiskDataService_base {
    readonly loggerService: LoggerService;
    upsert: (riskName: string, exchangeName: string, positions: RiskData, when: Date) => Promise<void>;
    findByContext: (riskName: string, exchangeName: string) => Promise<IRiskRow | null>;
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

declare const PartialDataService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly minioService: MinioService;
    readonly bucketName: string;
    readonly rootPrefix: string;
    readonly BUCKET_NAME: string;
    set(key: string, value: unknown): Promise<void>;
    get<T = unknown>(key: string | null): Promise<T | null>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<void>;
    clear(prefix?: string): Promise<void>;
    keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
    values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
    iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
    toArray(prefix?: string): Promise<[string, unknown][]>;
    size(prefix?: string): Promise<number>;
}) & Omit<{
    new (BUCKET_NAME: string): {
        readonly loggerService: LoggerService;
        readonly minioService: MinioService;
        readonly bucketName: string;
        readonly rootPrefix: string;
        readonly BUCKET_NAME: string;
        set(key: string, value: unknown): Promise<void>;
        get<T = unknown>(key: string | null): Promise<T | null>;
        has(key: string): Promise<boolean>;
        delete(key: string): Promise<void>;
        clear(prefix?: string): Promise<void>;
        keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
        values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
        iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
        toArray(prefix?: string): Promise<[string, unknown][]>;
        size(prefix?: string): Promise<number>;
    };
}, "prototype">;
declare class PartialDataService extends PartialDataService_base {
    readonly loggerService: LoggerService;
    upsert: (symbol: string, strategyName: string, exchangeName: string, signalId: string, payload: PartialData, when: Date) => Promise<void>;
    findByContext: (symbol: string, strategyName: string, exchangeName: string, signalId: string) => Promise<IPartialRow | null>;
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

declare const BreakevenDataService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly minioService: MinioService;
    readonly bucketName: string;
    readonly rootPrefix: string;
    readonly BUCKET_NAME: string;
    set(key: string, value: unknown): Promise<void>;
    get<T = unknown>(key: string | null): Promise<T | null>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<void>;
    clear(prefix?: string): Promise<void>;
    keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
    values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
    iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
    toArray(prefix?: string): Promise<[string, unknown][]>;
    size(prefix?: string): Promise<number>;
}) & Omit<{
    new (BUCKET_NAME: string): {
        readonly loggerService: LoggerService;
        readonly minioService: MinioService;
        readonly bucketName: string;
        readonly rootPrefix: string;
        readonly BUCKET_NAME: string;
        set(key: string, value: unknown): Promise<void>;
        get<T = unknown>(key: string | null): Promise<T | null>;
        has(key: string): Promise<boolean>;
        delete(key: string): Promise<void>;
        clear(prefix?: string): Promise<void>;
        keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
        values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
        iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
        toArray(prefix?: string): Promise<[string, unknown][]>;
        size(prefix?: string): Promise<number>;
    };
}, "prototype">;
declare class BreakevenDataService extends BreakevenDataService_base {
    readonly loggerService: LoggerService;
    upsert: (symbol: string, strategyName: string, exchangeName: string, signalId: string, payload: BreakevenData, when: Date) => Promise<void>;
    findByContext: (symbol: string, strategyName: string, exchangeName: string, signalId: string) => Promise<IBreakevenRow | null>;
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

declare const StorageConnectionService_base: (new () => {
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
declare class StorageConnectionService extends StorageConnectionService_base {
    readonly loggerService: LoggerService;
    register: (objectName: string) => Promise<void>;
    listNewest: (limit: number, prefix?: string) => Promise<string[]>;
}

declare const StorageDataService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly minioService: MinioService;
    readonly bucketName: string;
    readonly rootPrefix: string;
    readonly BUCKET_NAME: string;
    set(key: string, value: unknown): Promise<void>;
    get<T = unknown>(key: string | null): Promise<T | null>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<void>;
    clear(prefix?: string): Promise<void>;
    keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
    values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
    iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
    toArray(prefix?: string): Promise<[string, unknown][]>;
    size(prefix?: string): Promise<number>;
}) & Omit<{
    new (BUCKET_NAME: string): {
        readonly loggerService: LoggerService;
        readonly minioService: MinioService;
        readonly bucketName: string;
        readonly rootPrefix: string;
        readonly BUCKET_NAME: string;
        set(key: string, value: unknown): Promise<void>;
        get<T = unknown>(key: string | null): Promise<T | null>;
        has(key: string): Promise<boolean>;
        delete(key: string): Promise<void>;
        clear(prefix?: string): Promise<void>;
        keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
        values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
        iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
        toArray(prefix?: string): Promise<[string, unknown][]>;
        size(prefix?: string): Promise<number>;
    };
}, "prototype">;
declare class StorageDataService extends StorageDataService_base {
    readonly loggerService: LoggerService;
    readonly storageConnectionService: StorageConnectionService;
    private _registeredKeys;
    private _rememberKey;
    upsert: (backtest: boolean, signalId: string, payload: IStorageSignalRow) => Promise<void>;
    findBySignalId: (backtest: boolean, signalId: string) => Promise<IStorageRow | null>;
    listByMode: (backtest: boolean) => Promise<IStorageRow[]>;
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

declare const NotificationConnectionService_base: (new () => {
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
declare class NotificationConnectionService extends NotificationConnectionService_base {
    readonly loggerService: LoggerService;
    register: (objectName: string) => Promise<void>;
    listNewest: (limit: number, prefix?: string) => Promise<string[]>;
}

declare const NotificationDataService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly minioService: MinioService;
    readonly bucketName: string;
    readonly rootPrefix: string;
    readonly BUCKET_NAME: string;
    set(key: string, value: unknown): Promise<void>;
    get<T = unknown>(key: string | null): Promise<T | null>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<void>;
    clear(prefix?: string): Promise<void>;
    keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
    values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
    iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
    toArray(prefix?: string): Promise<[string, unknown][]>;
    size(prefix?: string): Promise<number>;
}) & Omit<{
    new (BUCKET_NAME: string): {
        readonly loggerService: LoggerService;
        readonly minioService: MinioService;
        readonly bucketName: string;
        readonly rootPrefix: string;
        readonly BUCKET_NAME: string;
        set(key: string, value: unknown): Promise<void>;
        get<T = unknown>(key: string | null): Promise<T | null>;
        has(key: string): Promise<boolean>;
        delete(key: string): Promise<void>;
        clear(prefix?: string): Promise<void>;
        keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
        values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
        iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
        toArray(prefix?: string): Promise<[string, unknown][]>;
        size(prefix?: string): Promise<number>;
    };
}, "prototype">;
declare class NotificationDataService extends NotificationDataService_base {
    readonly loggerService: LoggerService;
    readonly notificationConnectionService: NotificationConnectionService;
    private _persistedKeys;
    private _rememberKey;
    upsert: (backtest: boolean, notificationId: string, payload: NotificationModel) => Promise<void>;
    findByNotificationId: (backtest: boolean, notificationId: string, when: Date) => Promise<INotificationRow | null>;
    listByMode: (backtest: boolean) => Promise<INotificationRow[]>;
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

declare const LogConnectionService_base: (new () => {
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
declare class LogConnectionService extends LogConnectionService_base {
    readonly loggerService: LoggerService;
    register: (objectName: string) => Promise<void>;
    listNewest: (limit: number, prefix?: string) => Promise<string[]>;
}

declare const LogDataService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly minioService: MinioService;
    readonly bucketName: string;
    readonly rootPrefix: string;
    readonly BUCKET_NAME: string;
    set(key: string, value: unknown): Promise<void>;
    get<T = unknown>(key: string | null): Promise<T | null>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<void>;
    clear(prefix?: string): Promise<void>;
    keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
    values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
    iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
    toArray(prefix?: string): Promise<[string, unknown][]>;
    size(prefix?: string): Promise<number>;
}) & Omit<{
    new (BUCKET_NAME: string): {
        readonly loggerService: LoggerService;
        readonly minioService: MinioService;
        readonly bucketName: string;
        readonly rootPrefix: string;
        readonly BUCKET_NAME: string;
        set(key: string, value: unknown): Promise<void>;
        get<T = unknown>(key: string | null): Promise<T | null>;
        has(key: string): Promise<boolean>;
        delete(key: string): Promise<void>;
        clear(prefix?: string): Promise<void>;
        keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
        values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
        iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
        toArray(prefix?: string): Promise<[string, unknown][]>;
        size(prefix?: string): Promise<number>;
    };
}, "prototype">;
declare class LogDataService extends LogDataService_base {
    readonly loggerService: LoggerService;
    readonly logConnectionService: LogConnectionService;
    private _persistedKeys;
    private _rememberKey;
    upsert: (entryId: string, payload: ILogEntry) => Promise<void>;
    findByEntryId: (entryId: string, when: Date) => Promise<ILogRow | null>;
    listAll: () => Promise<ILogRow[]>;
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

declare const MeasureDataService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly minioService: MinioService;
    readonly bucketName: string;
    readonly rootPrefix: string;
    readonly BUCKET_NAME: string;
    set(key: string, value: unknown): Promise<void>;
    get<T = unknown>(key: string | null): Promise<T | null>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<void>;
    clear(prefix?: string): Promise<void>;
    keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
    values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
    iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
    toArray(prefix?: string): Promise<[string, unknown][]>;
    size(prefix?: string): Promise<number>;
}) & Omit<{
    new (BUCKET_NAME: string): {
        readonly loggerService: LoggerService;
        readonly minioService: MinioService;
        readonly bucketName: string;
        readonly rootPrefix: string;
        readonly BUCKET_NAME: string;
        set(key: string, value: unknown): Promise<void>;
        get<T = unknown>(key: string | null): Promise<T | null>;
        has(key: string): Promise<boolean>;
        delete(key: string): Promise<void>;
        clear(prefix?: string): Promise<void>;
        keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
        values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
        iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
        toArray(prefix?: string): Promise<[string, unknown][]>;
        size(prefix?: string): Promise<number>;
    };
}, "prototype">;
declare class MeasureDataService extends MeasureDataService_base {
    readonly loggerService: LoggerService;
    upsert: (bucket: string, entryKey: string, payload: MeasureData) => Promise<void>;
    findByKey: (bucket: string, entryKey: string) => Promise<IMeasureRow | null>;
    softRemove: (bucket: string, entryKey: string) => Promise<void>;
    listKeys: (bucket: string) => Promise<string[]>;
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

declare const IntervalDataService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly minioService: MinioService;
    readonly bucketName: string;
    readonly rootPrefix: string;
    readonly BUCKET_NAME: string;
    set(key: string, value: unknown): Promise<void>;
    get<T = unknown>(key: string | null): Promise<T | null>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<void>;
    clear(prefix?: string): Promise<void>;
    keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
    values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
    iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
    toArray(prefix?: string): Promise<[string, unknown][]>;
    size(prefix?: string): Promise<number>;
}) & Omit<{
    new (BUCKET_NAME: string): {
        readonly loggerService: LoggerService;
        readonly minioService: MinioService;
        readonly bucketName: string;
        readonly rootPrefix: string;
        readonly BUCKET_NAME: string;
        set(key: string, value: unknown): Promise<void>;
        get<T = unknown>(key: string | null): Promise<T | null>;
        has(key: string): Promise<boolean>;
        delete(key: string): Promise<void>;
        clear(prefix?: string): Promise<void>;
        keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
        values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
        iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
        toArray(prefix?: string): Promise<[string, unknown][]>;
        size(prefix?: string): Promise<number>;
    };
}, "prototype">;
declare class IntervalDataService extends IntervalDataService_base {
    readonly loggerService: LoggerService;
    upsert: (bucket: string, entryKey: string, payload: IntervalData, when: Date) => Promise<void>;
    findByKey: (bucket: string, entryKey: string) => Promise<IIntervalRow | null>;
    softRemove: (bucket: string, entryKey: string) => Promise<void>;
    listKeys: (bucket: string) => Promise<string[]>;
    clearBucket: (bucket: string) => Promise<void>;
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

declare const MemoryDataService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly minioService: MinioService;
    readonly bucketName: string;
    readonly rootPrefix: string;
    readonly BUCKET_NAME: string;
    set(key: string, value: unknown): Promise<void>;
    get<T = unknown>(key: string | null): Promise<T | null>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<void>;
    clear(prefix?: string): Promise<void>;
    keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
    values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
    iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
    toArray(prefix?: string): Promise<[string, unknown][]>;
    size(prefix?: string): Promise<number>;
}) & Omit<{
    new (BUCKET_NAME: string): {
        readonly loggerService: LoggerService;
        readonly minioService: MinioService;
        readonly bucketName: string;
        readonly rootPrefix: string;
        readonly BUCKET_NAME: string;
        set(key: string, value: unknown): Promise<void>;
        get<T = unknown>(key: string | null): Promise<T | null>;
        has(key: string): Promise<boolean>;
        delete(key: string): Promise<void>;
        clear(prefix?: string): Promise<void>;
        keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
        values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
        iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
        toArray(prefix?: string): Promise<[string, unknown][]>;
        size(prefix?: string): Promise<number>;
    };
}, "prototype">;
declare class MemoryDataService extends MemoryDataService_base {
    readonly loggerService: LoggerService;
    upsert: (signalId: string, bucketName: string, memoryId: string, payload: MemoryData, when: Date) => Promise<void>;
    findByMemoryId: (signalId: string, bucketName: string, memoryId: string) => Promise<IMemoryRow | null>;
    hasMemoryEntry: (signalId: string, bucketName: string, memoryId: string) => Promise<boolean>;
    softRemove: (signalId: string, bucketName: string, memoryId: string) => Promise<void>;
    listEntries: (signalId: string, bucketName: string) => Promise<IMemoryRow[]>;
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

declare const RecentDataService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly minioService: MinioService;
    readonly bucketName: string;
    readonly rootPrefix: string;
    readonly BUCKET_NAME: string;
    set(key: string, value: unknown): Promise<void>;
    get<T = unknown>(key: string | null): Promise<T | null>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<void>;
    clear(prefix?: string): Promise<void>;
    keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
    values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
    iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
    toArray(prefix?: string): Promise<[string, unknown][]>;
    size(prefix?: string): Promise<number>;
}) & Omit<{
    new (BUCKET_NAME: string): {
        readonly loggerService: LoggerService;
        readonly minioService: MinioService;
        readonly bucketName: string;
        readonly rootPrefix: string;
        readonly BUCKET_NAME: string;
        set(key: string, value: unknown): Promise<void>;
        get<T = unknown>(key: string | null): Promise<T | null>;
        has(key: string): Promise<boolean>;
        delete(key: string): Promise<void>;
        clear(prefix?: string): Promise<void>;
        keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
        values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
        iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
        toArray(prefix?: string): Promise<[string, unknown][]>;
        size(prefix?: string): Promise<number>;
    };
}, "prototype">;
declare class RecentDataService extends RecentDataService_base {
    readonly loggerService: LoggerService;
    upsert: (symbol: string, strategyName: string, exchangeName: string, frameName: string, backtest: boolean, payload: IPublicSignalRow, when: Date) => Promise<void>;
    findByContext: (symbol: string, strategyName: string, exchangeName: string, frameName: string, backtest: boolean) => Promise<IRecentRow | null>;
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

declare const StateDataService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly minioService: MinioService;
    readonly bucketName: string;
    readonly rootPrefix: string;
    readonly BUCKET_NAME: string;
    set(key: string, value: unknown): Promise<void>;
    get<T = unknown>(key: string | null): Promise<T | null>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<void>;
    clear(prefix?: string): Promise<void>;
    keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
    values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
    iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
    toArray(prefix?: string): Promise<[string, unknown][]>;
    size(prefix?: string): Promise<number>;
}) & Omit<{
    new (BUCKET_NAME: string): {
        readonly loggerService: LoggerService;
        readonly minioService: MinioService;
        readonly bucketName: string;
        readonly rootPrefix: string;
        readonly BUCKET_NAME: string;
        set(key: string, value: unknown): Promise<void>;
        get<T = unknown>(key: string | null): Promise<T | null>;
        has(key: string): Promise<boolean>;
        delete(key: string): Promise<void>;
        clear(prefix?: string): Promise<void>;
        keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
        values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
        iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
        toArray(prefix?: string): Promise<[string, unknown][]>;
        size(prefix?: string): Promise<number>;
    };
}, "prototype">;
declare class StateDataService extends StateDataService_base {
    readonly loggerService: LoggerService;
    upsert: (signalId: string, bucketName: string, payload: StateData, when: Date) => Promise<void>;
    findByContext: (signalId: string, bucketName: string) => Promise<IStateRow | null>;
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

declare const SessionDataService_base: (new () => {
    readonly loggerService: LoggerService;
    readonly minioService: MinioService;
    readonly bucketName: string;
    readonly rootPrefix: string;
    readonly BUCKET_NAME: string;
    set(key: string, value: unknown): Promise<void>;
    get<T = unknown>(key: string | null): Promise<T | null>;
    has(key: string): Promise<boolean>;
    delete(key: string): Promise<void>;
    clear(prefix?: string): Promise<void>;
    keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
    values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
    iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
    toArray(prefix?: string): Promise<[string, unknown][]>;
    size(prefix?: string): Promise<number>;
}) & Omit<{
    new (BUCKET_NAME: string): {
        readonly loggerService: LoggerService;
        readonly minioService: MinioService;
        readonly bucketName: string;
        readonly rootPrefix: string;
        readonly BUCKET_NAME: string;
        set(key: string, value: unknown): Promise<void>;
        get<T = unknown>(key: string | null): Promise<T | null>;
        has(key: string): Promise<boolean>;
        delete(key: string): Promise<void>;
        clear(prefix?: string): Promise<void>;
        keys(prefix?: string, limit?: number): AsyncIterableIterator<string>;
        values(prefix?: string, limit?: number): AsyncIterableIterator<unknown>;
        iterate(prefix?: string, limit?: number): AsyncIterableIterator<readonly [string, unknown]>;
        toArray(prefix?: string): Promise<[string, unknown][]>;
        size(prefix?: string): Promise<number>;
    };
}, "prototype">;
declare class SessionDataService extends SessionDataService_base {
    readonly loggerService: LoggerService;
    upsert: (strategyName: string, exchangeName: string, frameName: string, symbol: string, backtest: boolean, payload: SessionData, when: Date) => Promise<void>;
    findByContext: (strategyName: string, exchangeName: string, frameName: string, symbol: string, backtest: boolean) => Promise<ISessionRow | null>;
}

declare const ioc: {
    logConnectionService: LogConnectionService;
    notificationConnectionService: NotificationConnectionService;
    storageConnectionService: StorageConnectionService;
    candleDataService: CandleDataService;
    signalDataService: SignalDataService;
    scheduleDataService: ScheduleDataService;
    strategyDataService: StrategyDataService;
    riskDataService: RiskDataService;
    partialDataService: PartialDataService;
    breakevenDataService: BreakevenDataService;
    storageDataService: StorageDataService;
    notificationDataService: NotificationDataService;
    logDataService: LogDataService;
    measureDataService: MeasureDataService;
    intervalDataService: IntervalDataService;
    memoryDataService: MemoryDataService;
    recentDataService: RecentDataService;
    stateDataService: StateDataService;
    sessionDataService: SessionDataService;
    loggerService: LoggerService;
    redisService: RedisService;
    minioService: MinioService;
};

export { ioc };

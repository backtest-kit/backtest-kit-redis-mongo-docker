import {
  CandleInterval,
  CandleData,
  RiskData,
  StrategyData,
  PartialData,
  BreakevenData,
  StorageData,
  NotificationData,
  LogData,
  MeasureData,
  MemoryData,
  IntervalData,
  RecentData,
  StateData,
  SessionData,
  ISignalRow,
  IScheduledSignalRow,
  PersistCandleAdapter,
  IPersistCandleInstance,
  PersistSignalAdapter,
  IPersistSignalInstance,
  PersistRiskAdapter,
  IPersistRiskInstance,
  PersistScheduleAdapter,
  IPersistScheduleInstance,
  PersistStrategyAdapter,
  IPersistStrategyInstance,
  PersistPartialAdapter,
  IPersistPartialInstance,
  PersistBreakevenAdapter,
  IPersistBreakevenInstance,
  PersistStorageAdapter,
  IPersistStorageInstance,
  PersistNotificationAdapter,
  IPersistNotificationInstance,
  PersistLogAdapter,
  IPersistLogInstance,
  PersistMeasureAdapter,
  IPersistMeasureInstance,
  PersistIntervalAdapter,
  IPersistIntervalInstance,
  PersistMemoryAdapter,
  IPersistMemoryInstance,
  PersistRecentAdapter,
  IPersistRecentInstance,
  PersistStateAdapter,
  IPersistStateInstance,
  PersistSessionAdapter,
  IPersistSessionInstance,
} from "backtest-kit";
import ioc from "../lib";
import { singleshot } from "functools-kit";

const MS_PER_MINUTE = 60_000;

const INTERVAL_MINUTES: Record<CandleInterval, number> = {
  "1m": 1,
  "3m": 3,
  "5m": 5,
  "15m": 15,
  "30m": 30,
  "1h": 60,
  "2h": 120,
  "4h": 240,
  "6h": 360,
  "8h": 480,
  "1d": 1440,
};

const waitForInfra = singleshot(
  async () => {
    await Promise.all([
      ioc.mongoService.waitForInit(),
      ioc.redisService.waitForInit(),
    ]);
  }
);

PersistCandleAdapter.usePersistCandleAdapter(class implements IPersistCandleInstance {
  constructor(
    readonly symbol: string,
    readonly interval: CandleInterval,
    readonly exchangeName: string,
  ) {}
  async waitForInit(initial: boolean) {
    if (!initial) {
      return;
    }
    await waitForInfra();
  }
  async writeCandlesData(candles: CandleData[]): Promise<void> {
    for (const candle of candles) {
      await ioc.candleDataService.create({
        symbol: this.symbol,
        interval: this.interval,
        close: candle.close,
        high: candle.high,
        low: candle.low,
        open: candle.open,
        timestamp: candle.timestamp,
        volume: candle.volume,
      });
    }
  }
  async readCandlesData(limit: number, sinceTimestamp: number) {
    const stepMs = INTERVAL_MINUTES[this.interval] * MS_PER_MINUTE;
    const result: CandleData[] = [];
    for (let i = 0; i < limit; i++) {
      const ts = sinceTimestamp + i * stepMs;
      const row = await ioc.candleDataService.findBySymbolIntervalTimestamp(this.symbol, this.interval, ts);
      if (!row) {
        return null;
      }
      result.push({ timestamp: row.timestamp, open: row.open, high: row.high, low: row.low, close: row.close, volume: row.volume });
    }
    return result;
  }
});

PersistSignalAdapter.usePersistSignalAdapter(class implements IPersistSignalInstance {
  constructor(
    readonly symbol: string,
    readonly strategyName: string,
    readonly exchangeName: string,
  ) {}
  async waitForInit(initial: boolean) {
    if (!initial) {
      return;
    }
    await waitForInfra();
  }
  async readSignalData(): Promise<ISignalRow | null> {
    const row = await ioc.signalDataService.findByContext(this.symbol, this.strategyName, this.exchangeName);
    return row ? row.payload : null;
  }
  async writeSignalData(signalRow: ISignalRow | null): Promise<void> {
    await ioc.signalDataService.upsert(this.symbol, this.strategyName, this.exchangeName, signalRow);
  }
});

PersistRiskAdapter.usePersistRiskAdapter(class implements IPersistRiskInstance {
  constructor(
    readonly riskName: string,
    readonly exchangeName: string,
  ) {}
  async waitForInit(initial: boolean) {
    if (!initial) {
      return;
    }
    await waitForInfra();
  }
  async readPositionData(_when: Date): Promise<RiskData> {
    const row = await ioc.riskDataService.findByContext(this.riskName, this.exchangeName);
    return row ? row.positions : [];
  }
  async writePositionData(positions: RiskData, when: Date): Promise<void> {
    await ioc.riskDataService.upsert(this.riskName, this.exchangeName, positions, when);
  }
});

PersistScheduleAdapter.usePersistScheduleAdapter(class implements IPersistScheduleInstance {
  constructor(
    readonly symbol: string,
    readonly strategyName: string,
    readonly exchangeName: string,
  ) {}
  async waitForInit(initial: boolean) {
    if (!initial) {
      return;
    }
    await waitForInfra();
  }
  async readScheduleData(): Promise<IScheduledSignalRow | null> {
    const row = await ioc.scheduleDataService.findByContext(this.symbol, this.strategyName, this.exchangeName);
    return row ? row.payload : null;
  }
  async writeScheduleData(scheduleRow: IScheduledSignalRow | null): Promise<void> {
    await ioc.scheduleDataService.upsert(this.symbol, this.strategyName, this.exchangeName, scheduleRow);
  }
});

PersistStrategyAdapter.usePersistStrategyAdapter(class implements IPersistStrategyInstance {
  constructor(
    readonly symbol: string,
    readonly strategyName: string,
    readonly exchangeName: string,
  ) {}
  async waitForInit(initial: boolean) {
    if (!initial) {
      return;
    }
    await waitForInfra();
  }
  async readStrategyData(): Promise<StrategyData | null> {
    const row = await ioc.strategyDataService.findByContext(this.symbol, this.strategyName, this.exchangeName);
    return row ? row.payload : null;
  }
  async writeStrategyData(strategyRow: StrategyData | null): Promise<void> {
    await ioc.strategyDataService.upsert(this.symbol, this.strategyName, this.exchangeName, strategyRow);
  }
});

PersistPartialAdapter.usePersistPartialAdapter(class implements IPersistPartialInstance {
  constructor(
    readonly symbol: string,
    readonly strategyName: string,
    readonly exchangeName: string,
  ) {}
  async waitForInit(initial: boolean) {
    if (!initial) {
      return;
    }
    await waitForInfra();
  }
  async readPartialData(signalId: string, _when: Date): Promise<PartialData> {
    const row = await ioc.partialDataService.findByContext(this.symbol, this.strategyName, this.exchangeName, signalId);
    return row ? row.payload : {};
  }
  async writePartialData(data: PartialData, signalId: string, when: Date): Promise<void> {
    await ioc.partialDataService.upsert(this.symbol, this.strategyName, this.exchangeName, signalId, data, when);
  }
});

PersistBreakevenAdapter.usePersistBreakevenAdapter(class implements IPersistBreakevenInstance {
  constructor(
    readonly symbol: string,
    readonly strategyName: string,
    readonly exchangeName: string,
  ) {}
  async waitForInit(initial: boolean) {
    if (!initial) {
      return;
    }
    await waitForInfra();
  }
  async readBreakevenData(signalId: string, _when: Date): Promise<BreakevenData> {
    const row = await ioc.breakevenDataService.findByContext(this.symbol, this.strategyName, this.exchangeName, signalId);
    return row ? row.payload : {};
  }
  async writeBreakevenData(data: BreakevenData, signalId: string, when: Date): Promise<void> {
    await ioc.breakevenDataService.upsert(this.symbol, this.strategyName, this.exchangeName, signalId, data, when);
  }
});

PersistStorageAdapter.usePersistStorageAdapter(class implements IPersistStorageInstance {
  constructor(readonly backtest: boolean) {}
  async waitForInit(initial: boolean) {
    if (!initial) {
      return;
    }
    await waitForInfra();
  }
  async readStorageData(): Promise<StorageData> {
    const rows = await ioc.storageDataService.listByMode(this.backtest);
    return rows.map((row) => row.payload);
  }
  async writeStorageData(signals: StorageData): Promise<void> {
    for (const signal of signals) {
      await ioc.storageDataService.upsert(this.backtest, signal.id, signal);
    }
  }
});

PersistNotificationAdapter.usePersistNotificationAdapter(class implements IPersistNotificationInstance {
  constructor(readonly backtest: boolean) {}
  async waitForInit(initial: boolean) {
    if (!initial) {
      return;
    }
    await waitForInfra();
  }
  async readNotificationData(): Promise<NotificationData> {
    const rows = await ioc.notificationDataService.listByMode(this.backtest);
    return rows.map((row) => row.payload).reverse();
  }
  async writeNotificationData(notifications: NotificationData): Promise<void> {
    for (const notification of notifications) {
      await ioc.notificationDataService.upsert(this.backtest, notification.id, notification);
    }
  }
});

PersistLogAdapter.usePersistLogAdapter(class implements IPersistLogInstance {
  async waitForInit(initial: boolean) {
    if (!initial) {
      return;
    }
    await waitForInfra();
  }
  async readLogData(): Promise<LogData> {
    const rows = await ioc.logDataService.listAll();
    return rows.map((row) => row.payload).reverse();
  }
  async writeLogData(entries: LogData): Promise<void> {
    for (const entry of entries) {
      await ioc.logDataService.upsert(entry.id, entry);
    }
  }
});

PersistMeasureAdapter.usePersistMeasureAdapter(class implements IPersistMeasureInstance {
  constructor(readonly bucket: string) {}
  async waitForInit(initial: boolean) {
    if (!initial) {
      return;
    }
    await waitForInfra();
  }
  async readMeasureData(key: string): Promise<MeasureData | null> {
    const row = await ioc.measureDataService.findByKey(this.bucket, key);
    if (!row || row.removed) {
      return null;
    }
    return row.payload;
  }
  async writeMeasureData(data: MeasureData, key: string, _when: Date): Promise<void> {
    await ioc.measureDataService.upsert(this.bucket, key, data);
  }
  async removeMeasureData(key: string): Promise<void> {
    await ioc.measureDataService.softRemove(this.bucket, key);
  }
  async *listMeasureData(): AsyncGenerator<string> {
    const keys = await ioc.measureDataService.listKeys(this.bucket);
    for (const key of keys) {
      yield key;
    }
  }
});

PersistIntervalAdapter.usePersistIntervalAdapter(class implements IPersistIntervalInstance {
  constructor(readonly bucket: string) {}
  async waitForInit(initial: boolean) {
    if (!initial) {
      return;
    }
    await waitForInfra();
  }
  async readIntervalData(key: string): Promise<IntervalData | null> {
    const row = await ioc.intervalDataService.findByKey(this.bucket, key);
    if (!row || row.removed) {
      return null;
    }
    return row.payload;
  }
  async writeIntervalData(data: IntervalData, key: string, when: Date): Promise<void> {
    await ioc.intervalDataService.upsert(this.bucket, key, data, when);
  }
  async removeIntervalData(key: string): Promise<void> {
    await ioc.intervalDataService.softRemove(this.bucket, key);
  }
  async *listIntervalData(): AsyncGenerator<string> {
    const keys = await ioc.intervalDataService.listKeys(this.bucket);
    for (const key of keys) {
      yield key;
    }
  }
});

PersistMemoryAdapter.usePersistMemoryAdapter(class implements IPersistMemoryInstance {
  constructor(
    readonly signalId: string,
    readonly bucketName: string,
  ) {}
  async waitForInit(initial: boolean) {
    if (!initial) {
      return;
    }
    await waitForInfra();
  }
  async readMemoryData(memoryId: string): Promise<MemoryData | null> {
    const row = await ioc.memoryDataService.findByMemoryId(this.signalId, this.bucketName, memoryId);
    if (!row || row.removed) {
      return null;
    }
    return row.payload;
  }
  async hasMemoryData(memoryId: string): Promise<boolean> {
    return await ioc.memoryDataService.hasMemoryEntry(this.signalId, this.bucketName, memoryId);
  }
  async writeMemoryData(data: MemoryData, memoryId: string, when: Date): Promise<void> {
    await ioc.memoryDataService.upsert(this.signalId, this.bucketName, memoryId, data, when);
  }
  async removeMemoryData(memoryId: string): Promise<void> {
    await ioc.memoryDataService.softRemove(this.signalId, this.bucketName, memoryId);
  }
  async *listMemoryData(): AsyncGenerator<{ memoryId: string; data: MemoryData }> {
    const rows = await ioc.memoryDataService.listEntries(this.signalId, this.bucketName);
    for (const row of rows) {
      yield { memoryId: row.memoryId, data: row.payload };
    }
  }
  dispose(): void { void 0; }
});

PersistRecentAdapter.usePersistRecentAdapter(class implements IPersistRecentInstance {
  constructor(
    readonly symbol: string,
    readonly strategyName: string,
    readonly exchangeName: string,
    readonly frameName: string,
    readonly backtest: boolean,
  ) {}
  async waitForInit(initial: boolean) {
    if (!initial) {
      return;
    }
    await waitForInfra();
  }
  async readRecentData(): Promise<RecentData> {
    const row = await ioc.recentDataService.findByContext(
      this.symbol,
      this.strategyName,
      this.exchangeName,
      this.frameName,
      this.backtest,
    );
    return row ? row.payload : null;
  }
  async writeRecentData(signalRow: NonNullable<RecentData>, when: Date): Promise<void> {
    await ioc.recentDataService.upsert(
      this.symbol,
      this.strategyName,
      this.exchangeName,
      this.frameName,
      this.backtest,
      signalRow,
      when,
    );
  }
});

PersistStateAdapter.usePersistStateAdapter(class implements IPersistStateInstance {
  constructor(
    readonly signalId: string,
    readonly bucketName: string,
  ) {}
  async waitForInit(initial: boolean) {
    if (!initial) {
      return;
    }
    await waitForInfra();
  }
  async readStateData(): Promise<StateData | null> {
    const row = await ioc.stateDataService.findByContext(this.signalId, this.bucketName);
    return row ? row.payload : null;
  }
  async writeStateData(data: StateData, when: Date): Promise<void> {
    await ioc.stateDataService.upsert(this.signalId, this.bucketName, data, when);
  }
  dispose(): void { void 0; }
});

PersistSessionAdapter.usePersistSessionAdapter(class implements IPersistSessionInstance {
  constructor(
    readonly strategyName: string,
    readonly exchangeName: string,
    readonly frameName: string,
    readonly symbol: string,
    readonly backtest: boolean,
  ) {}
  async waitForInit(initial: boolean) {
    if (!initial) {
      return;
    }
    await waitForInfra();
  }
  async readSessionData(): Promise<SessionData | null> {
    const row = await ioc.sessionDataService.findByContext(this.strategyName, this.exchangeName, this.frameName, this.symbol, this.backtest);
    return row ? row.payload : null;
  }
  async writeSessionData(data: SessionData, when: Date): Promise<void> {
    await ioc.sessionDataService.upsert(this.strategyName, this.exchangeName, this.frameName, this.symbol, this.backtest, data, when);
  }
  dispose(): void { void 0; }
});

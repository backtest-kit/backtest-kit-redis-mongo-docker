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
    const existing = await repo.findOne({ where: { bucket, entryKey } });
    if (!existing) {
      return;
    }
    existing.removed = true;
    (existing.payload as MeasureData).removed = true;
    const saved = await repo.save(existing);
    await this.measureCacheService.setMeasureId(saved);
  };

  public listKeys = async (bucket: string): Promise<string[]> => {
    this.loggerService.log("measureDbService listKeys", { bucket });
    const rows = await super.findAll({ bucket, removed: false }) as IMeasureRow[];
    return rows.map((row) => row.entryKey);
  };
}

export default MeasureDbService;

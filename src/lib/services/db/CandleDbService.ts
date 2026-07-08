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
    // Insert-only: an existing candle for (symbol, interval, timestamp) is never
    // overwritten (ON CONFLICT DO NOTHING).
    await repo
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
      .orIgnore()
      .execute();
    // Guaranteed to return the row (either the pre-existing one or the just inserted).
    const result = await this.findBySymbolIntervalTimestamp(dto.symbol, dto.interval, dto.timestamp) as ICandleRow;
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

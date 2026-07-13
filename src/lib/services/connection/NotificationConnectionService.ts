import BaseMap from "../../common/BaseMap";
import { getRedis } from "../../../config/redis";
import { inject } from "../../core/di";
import { TYPES } from "../../core/types";
import LoggerService from "../base/LoggerService";
import { alignToInterval } from "backtest-kit";

const REDIS_KEY = "notification-items-connection";

const MS_PER_MINUTE = 60_000;

/** Minutes probed per pipeline round trip while walking backwards. */
const WALK_BATCH_SIZE = 1_000;

const TIMESTAMP_PAD = String(Number.MAX_SAFE_INTEGER).length;

const GET_MINUTE_KEY_FN = (connectionKey: string, minute: number) => {
    return `${connectionKey}:${String(minute).padStart(TIMESTAMP_PAD, "0")}`;
}

const GET_FLOOR_KEY_FN = (connectionKey: string) => {
    return `${connectionKey}:floor`;
}

export class NotificationConnectionService extends BaseMap(REDIS_KEY, -1) {
  readonly loggerService = inject<LoggerService>(TYPES.loggerService);

  public register = async (objectName: string): Promise<void> => {
    this.loggerService.log("notificationConnectionService register", { objectName });
    const redis = await getRedis();
    // One Redis SET per minute: SADD deduplicates repeated names, the floor
    // marker (first-ever minute) bounds the backwards walk in listNewest
    const minute = alignToInterval(new Date(), "1m").getTime();
    await redis
      .pipeline()
      .sadd(GET_MINUTE_KEY_FN(this.connectionKey, minute), objectName)
      .setnx(GET_FLOOR_KEY_FN(this.connectionKey), String(minute))
      .exec();
  };

  public listNewest = async (limit: number, prefix = ""): Promise<string[]> => {
    this.loggerService.log("notificationConnectionService listNewest", { limit, prefix });
    const redis = await getRedis();
    const floorRaw = await redis.get(GET_FLOOR_KEY_FN(this.connectionKey));
    if (!floorRaw) {
      return [];
    }
    const floor = Number(floorRaw);
    // We know the current time — walk backwards minute by minute with direct
    // key lookups (no SCAN over the keyspace), pipelined per WALK_BATCH_SIZE
    let minute = alignToInterval(new Date(), "1m").getTime();
    const seen = new Set<string>();
    const names: string[] = [];

    while (minute >= floor && names.length < limit) {
      const batch: number[] = [];
      while (batch.length < WALK_BATCH_SIZE && minute >= floor) {
        batch.push(minute);
        minute -= MS_PER_MINUTE;
      }
      const pipeline = redis.pipeline();
      for (const ts of batch) {
        pipeline.smembers(GET_MINUTE_KEY_FN(this.connectionKey, ts));
      }
      const results = await pipeline.exec();
      if (!results) {
        break;
      }
      // Pipeline results follow command order: minutes descend, newest first
      for (const [error, members] of results) {
        if (error || !members) {
          continue;
        }
        for (const name of members as string[]) {
          if (prefix && !name.startsWith(prefix)) {
            continue;
          }
          if (seen.has(name)) {
            continue;
          }
          seen.add(name);
          names.push(name);
        }
        if (names.length >= limit) {
          break;
        }
      }
    }
    return names.slice(0, Number.isFinite(limit) ? limit : names.length);
  };
}

export default NotificationConnectionService;

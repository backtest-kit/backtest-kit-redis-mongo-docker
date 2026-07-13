import { getArgs } from "../helpers/getArgs";
import ioc from "../lib";
import { Backtest, warmCandles, waitForReady } from "backtest-kit";
import { ExchangeName } from "../enum/ExchangeName";
import { FrameName } from "../enum/FrameName";
import { StrategyName } from "../enum/StrategyName";

const main = async () => {

  const { values } = getArgs();

  if (!values.entry) {
    return;
  }

  if (!values.backtest) {
    return;
  }

  {
    await ioc.redisService.waitForInit();
  }

  await waitForReady(true);

  await warmCandles({
    exchangeName: ExchangeName.CCXT,
    from: new Date("2026-01-01T00:00:00Z"),
    to: new Date("2026-01-31T23:59:59Z"),
    interval: "1m",
    symbol: "TRXUSDT",
  })

  Backtest.background("TRXUSDT", {
    exchangeName: ExchangeName.CCXT,
    frameName: FrameName.Jan2026Frame,
    strategyName: StrategyName.Jan2026Strategy,
  });
};

main();

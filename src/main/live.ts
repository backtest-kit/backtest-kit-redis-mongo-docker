import { getArgs } from "../helpers/getArgs";
import ioc from "../lib";
import { Live, waitForReady } from "backtest-kit";
import { ExchangeName } from "../enum/ExchangeName";
import { StrategyName } from "../enum/StrategyName";

const main = async () => {

  const { values } = getArgs();

  if (!values.entry) {
    return;
  }

  if (!values.live) {
    return;
  }

  {
    await ioc.postgresService.waitForInit();
    await ioc.redisService.waitForInit();
  }

  await waitForReady(false);

  Live.background("TRXUSDT", {
    exchangeName: ExchangeName.CCXT,
    strategyName: StrategyName.Jan2026Strategy,
  });
};

main();

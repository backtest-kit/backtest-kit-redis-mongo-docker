declare function parseInt(value: unknown): number;

export const CC_REDIS_HOST = process.env.CC_REDIS_HOST || "127.0.0.1";
export const CC_REDIS_PORT = parseInt(process.env.CC_REDIS_PORT) || 6379;
export const CC_REDIS_USER = process.env.CC_REDIS_USER || "default";
export const CC_REDIS_PASSWORD = process.env.CC_REDIS_PASSWORD || "mysecurepassword";

export const CC_POSTGRES_CONNECTION_STRING = process.env.CC_POSTGRES_CONNECTION_STRING || "postgres://backtest:mysecurepassword@localhost:5432/backtest-pro";

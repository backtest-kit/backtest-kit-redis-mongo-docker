declare function parseInt(value: unknown): number;

export const CC_REDIS_HOST = process.env.CC_REDIS_HOST || "127.0.0.1";
export const CC_REDIS_PORT = parseInt(process.env.CC_REDIS_PORT) || 6379;
export const CC_REDIS_USER = process.env.CC_REDIS_USER || "default";
export const CC_REDIS_PASSWORD = process.env.CC_REDIS_PASSWORD || "mysecurepassword";

export const CC_MONGO_CONNECTION_STRING = process.env.CC_MONGO_CONNECTION_STRING || "mongodb://localhost:27017/backtest-pro?wtimeoutMS=15000";

export const CC_MINIO_ENDPOINT = process.env.CC_MINIO_ENDPOINT || "localhost";
export const CC_MINIO_PORT = parseInt(process.env.CC_MINIO_PORT) || 9000;
export const CC_MINIO_ACCESSKEY = process.env.CC_MINIO_ACCESSKEY || "minioadmin";
export const CC_MINIO_SECRETKEY = process.env.CC_MINIO_SECRETKEY || "minioadmin";

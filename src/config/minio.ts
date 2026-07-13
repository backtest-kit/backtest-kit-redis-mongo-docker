import { Client } from "minio";

import {
  CC_MINIO_ACCESSKEY,
  CC_MINIO_ENDPOINT,
  CC_MINIO_PORT,
  CC_MINIO_SECRETKEY,
} from "./params";

export const getMinio = () => {
  return new Client({
    endPoint: CC_MINIO_ENDPOINT,
    port: CC_MINIO_PORT,
    accessKey: CC_MINIO_ACCESSKEY,
    secretKey: CC_MINIO_SECRETKEY,
    useSSL: false,
  });
};

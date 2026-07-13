import { createClient, type DataGoKrClient } from "@opendata-kr/core";

// data.go.kr UsrInfoService02 서비스 경로.
const SERVICE_PATH = "/1230000/ao/UsrInfoService02";

export function createGateway(): DataGoKrClient {
  return createClient({ path: SERVICE_PATH, params: { type: "json" } });
}

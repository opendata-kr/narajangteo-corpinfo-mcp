import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createGateway } from "./api/gateway.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const client = createGateway();
  if (client.serviceKeyLooksPreEncoded) {
    console.error(
      "[narajangteo-corpinfo-mcp] 경고: DATA_GO_KR_SERVICE_KEY가 이미 URL 인코딩된 키로 보입니다. Decoding(원본) 키를 사용하세요.",
    );
  }
  const server = createServer(client);
  await server.connect(new StdioServerTransport());
}

main().catch((err: unknown) => {
  console.error("[narajangteo-corpinfo-mcp] fatal:", err);
  process.exit(1);
});

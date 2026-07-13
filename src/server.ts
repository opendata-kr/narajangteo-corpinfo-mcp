import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DataGoKrClient } from "@opendata-kr/core";
import { errMessage, withKeyHint } from "@opendata-kr/core";
import { VERSION } from "./version.js";
import {
  runGetCompanyProfile,
  getCompanyProfileInputShape,
} from "./tools/getCompanyProfile.js";
import {
  runCheckCompanyQualification,
  checkCompanyQualificationInputShape,
} from "./tools/checkCompanyQualification.js";

function textResult(payload: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    ...(isError ? { isError: true } : {}),
  };
}

async function guard<T>(client: DataGoKrClient, run: () => Promise<T>) {
  try {
    return textResult(await run());
  } catch (err) {
    return textResult({ error: withKeyHint(client, errMessage(err)) }, true);
  }
}

// 조회 전용 도구 공통 애노테이션: 환경을 바꾸지 않고(readOnlyHint), 외부 API를 호출한다(openWorldHint).
const READONLY = { readOnlyHint: true, openWorldHint: true } as const;

export function createServer(client: DataGoKrClient): McpServer {
  const server = new McpServer({
    name: "narajangteo-corpinfo-mcp",
    version: VERSION,
  });

  server.registerTool(
    "get_company_profile",
    {
      title: "조달업체 프로파일 조회",
      description:
        "사업자등록번호로 한 조달업체의 기본정보·업종·공급물품·부정당제재를 한 번에 조립해 반환한다. 업체 전반을 훑을 때 쓴다. 특정 업종·품목 보유 여부만 판정하려면 check_company_qualification을 쓴다. 사업자번호 입력이 필수이며(업체명→사업자번호 리졸버 없음), 목록은 조회 상한에서 잘릴 수 있다.",
      inputSchema: getCompanyProfileInputShape,
      annotations: READONLY,
    },
    (args) => guard(client, () => runGetCompanyProfile(client, args)),
  );

  server.registerTool(
    "check_company_qualification",
    {
      title: "조달업체 자격 판정",
      description:
        "사업자등록번호에 대해 지정 업종코드·세부품명번호의 보유·유효 여부와 부정당제재를 판정한다. 특정 입찰 자격 충족 여부를 볼 때 쓴다. 업체 전반 프로파일이 필요하면 get_company_profile을 쓴다. 코드→업체 역검색은 지원하지 않으며(사업자번호 입력 필수), 목록이 조회 상한에 잘리면 미보유 판정이 확정이 아닐 수 있다.",
      inputSchema: checkCompanyQualificationInputShape,
      annotations: READONLY,
    },
    (args) => guard(client, () => runCheckCompanyQualification(client, args)),
  );

  return server;
}

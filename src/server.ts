import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DataGoKrClient } from "@opendata-kr/core";
import { guard, READONLY } from "@opendata-kr/core";
import { VERSION } from "./version.js";
import {
  runGetCompanyProfile,
  getCompanyProfileInputShape,
} from "./tools/getCompanyProfile.js";
import {
  runCheckCompanyQualification,
  checkCompanyQualificationInputShape,
} from "./tools/checkCompanyQualification.js";

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
        "사업자등록번호로 한 조달업체의 기본정보·업종·공급물품·부정당제재를 한 번에 조립해 반환한다. 업체 전반을 훑을 때 쓴다. 특정 업종·품목 보유 여부만 판정하려면 check_company_qualification을 쓴다(요청 3건으로 더 가볍다). 사업자번호 입력이 필수이며(업체명→사업자번호 리졸버 없음), 목록은 조회 상한에서 잘릴 수 있다. 한 호출이 facet당 1건 이상, 최소 4건의 API 요청을 소모한다.",
      inputSchema: getCompanyProfileInputShape,
      annotations: READONLY,
    },
    (args) => guard(() => runGetCompanyProfile(client, args)),
  );

  server.registerTool(
    "check_company_qualification",
    {
      title: "조달업체 자격 판정",
      description:
        "사업자등록번호에 대해 지정 업종코드·세부품명번호의 보유·유효 여부와 부정당제재를 판정한다. 특정 입찰 자격 충족 여부를 볼 때 쓴다. 업체 전반 프로파일이 필요하면 get_company_profile을 쓴다. 코드→업체 역검색은 지원하지 않으며(사업자번호 입력 필수), 목록이 조회 상한에 잘리면 미보유 판정이 확정이 아닐 수 있다. 한 호출이 facet당 1건 이상, 최소 3건의 API 요청을 소모한다.",
      inputSchema: checkCompanyQualificationInputShape,
      annotations: READONLY,
    },
    (args) => guard(() => runCheckCompanyQualification(client, args)),
  );

  return server;
}

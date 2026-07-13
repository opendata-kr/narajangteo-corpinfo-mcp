import { z } from "zod";
import type { DataGoKrClient } from "@opendata-kr/core";
import {
  formatIndustry,
  formatSupplyProduct,
  formatSanction,
  kstToday,
} from "../format.js";
import { fetchFacet, type FacetFetch } from "../api/fetchFacet.js";
import type { FacetError, SanctionResult } from "../api/types.js";

// LLM에는 camelCase 의미 이름만 노출하고 raw 코드(inqryDiv 등)는 핸들러 내부에 둔다.
export const checkCompanyQualificationInputShape = {
  bizno: z
    .string()
    .regex(/^\d{10}$/)
    .describe("사업자등록번호 10자리"),
  industryCodes: z
    .array(z.string())
    .optional()
    .describe("업종코드 배열 4자리(indstrytyCd). 미지정 또는 빈 배열이면 전 목록"),
  productCodes: z
    .array(z.string())
    .optional()
    .describe("세부품명번호 배열 10자리(dtilPrdctClsfcNo). 미지정 또는 빈 배열이면 전 목록"),
};

export type CheckArgs = z.infer<
  z.ZodObject<typeof checkCompanyQualificationInputShape>
>;

// 지정 업종코드의 보유·유효 판정. held는 업체 업종 목록에 그 코드가 있는지,
// valid·원신호는 매칭 항목에서 온다(미보유면 held:false·valid:false·빈 원신호).
export interface IndustryCheck {
  code: string;
  held: boolean;
  valid: boolean;
  statusName: string;
  expiryDate: string;
  representative: string;
}

// 지정 세부품명번호의 보유·제조여부 판정(업종과 달리 유효 개념 없음).
export interface ProductCheck {
  code: string;
  held: boolean;
  manufacture: boolean;
}

// 한 사업자번호에 대해 지정 업종·품목의 보유·자격을 판정하고 부정당을 동반한다.
// facet마다 실패를 {error}로 격리해 held:false로 뭉개지 않는다(부분실패 표면화).
export interface CheckResult {
  bizno: string;
  industryChecks: IndustryCheck[] | FacetError;
  productChecks: ProductCheck[] | FacetError;
  sanction: SanctionResult;
  truncated: {
    industries: boolean;
    supplyProducts: boolean;
    sanctions: boolean;
  };
  notes: string[];
}

// allSettled 결과를 FacetFetch로 되돌린다. fetchFacet은 자체적으로 실패를 흡수하지만,
// 예기치 못한 reject도 {error}로 낮춰 전체 throw를 막는다.
function settle(r: PromiseSettledResult<FacetFetch>): FacetFetch {
  if (r.status === "fulfilled") return r.value;
  return {
    error: r.reason instanceof Error ? r.reason.message : String(r.reason),
  };
}

// 에러 facet의 truncated는 의미가 없으므로 false로 본다.
function truncatedOf(f: FacetFetch): boolean {
  return "error" in f ? false : f.truncated;
}

// 코드 지정 = 비어있지 않은 배열. undefined·빈 배열은 미지정(전 목록 반환)으로 동일 처리한다.
function isSpecified(codes: string[] | undefined): codes is string[] {
  return codes !== undefined && codes.length > 0;
}

// 업종 facet 결과를 IndustryCheck[]로. 미지정이면 전 목록(각 held:true),
// 지정이면 코드마다 목록 존재 여부로 held를 매기고 매칭 항목의 원신호를 싣는다.
function toIndustryChecks(
  fetch: FacetFetch,
  codes: string[] | undefined,
  today: string,
): IndustryCheck[] | FacetError {
  if ("error" in fetch) return fetch;
  const industries = fetch.items.map((raw) => formatIndustry(raw, today));
  if (!isSpecified(codes)) {
    return industries.map((ind) => ({
      code: ind.indstrytyCd,
      held: true,
      valid: ind.valid,
      statusName: ind.statusName,
      expiryDate: ind.expiryDate,
      representative: ind.representative,
    }));
  }
  return codes.map((code) => {
    const match = industries.find((ind) => ind.indstrytyCd === code);
    if (!match) {
      return {
        code,
        held: false,
        valid: false,
        statusName: "",
        expiryDate: "",
        representative: "",
      };
    }
    return {
      code,
      held: true,
      valid: match.valid,
      statusName: match.statusName,
      expiryDate: match.expiryDate,
      representative: match.representative,
    };
  });
}

// 공급물품 facet 결과를 ProductCheck[]로. 유효 판정 없이 held·manufacture만 판정한다.
function toProductChecks(
  fetch: FacetFetch,
  codes: string[] | undefined,
): ProductCheck[] | FacetError {
  if ("error" in fetch) return fetch;
  const products = fetch.items.map(formatSupplyProduct);
  if (!isSpecified(codes)) {
    return products.map((p) => ({
      code: p.dtilPrdctClsfcNo,
      held: true,
      manufacture: p.manufacture,
    }));
  }
  return codes.map((code) => {
    const match = products.find((p) => p.dtilPrdctClsfcNo === code);
    return {
      code,
      held: match !== undefined,
      manufacture: match?.manufacture ?? false,
    };
  });
}

export async function runCheckCompanyQualification(
  client: DataGoKrClient,
  args: CheckArgs,
): Promise<CheckResult> {
  const { bizno, industryCodes, productCodes } = args;
  const today = kstToday();

  const [industrySettled, supplySettled, sanctionSettled] =
    await Promise.allSettled([
      fetchFacet(client, "industry", bizno),
      fetchFacet(client, "supply", bizno),
      fetchFacet(client, "sanction", bizno),
    ]);
  const industryRes = settle(industrySettled);
  const supplyRes = settle(supplySettled);
  const sanctionRes = settle(sanctionSettled);

  const sanction: SanctionResult =
    "error" in sanctionRes
      ? sanctionRes
      : {
          sanctioned: sanctionRes.items.length > 0,
          records: sanctionRes.items.map(formatSanction),
        };

  const industryChecks = toIndustryChecks(industryRes, industryCodes, today);
  const productChecks = toProductChecks(supplyRes, productCodes);
  const truncated = {
    industries: truncatedOf(industryRes),
    supplyProducts: truncatedOf(supplyRes),
    sanctions: truncatedOf(sanctionRes),
  };

  // 이 도구는 사업자번호→자격 판정만 한다. 역방향(코드→업체 목록)과
  // 업체명→사업자번호 리졸브는 이 API 표면에 없어 지원하지 않음을 알린다.
  const notes = [
    "코드→업체 역검색은 지원하지 않는다(사업자번호 입력 필수).",
    "업체명→사업자번호 리졸버는 없으므로 사업자번호를 직접 제공해야 한다.",
  ];
  // 목록이 조회 상한(창당 500건)에 잘렸는데 미발견(held:false)이 있으면, 그 코드는 잘린 뒤쪽에
  // 있을 수 있어 미보유가 확정이 아니다. 조용한 거짓 음성을 막으려 명시한다.
  if (truncated.industries && Array.isArray(industryChecks) && industryChecks.some((c) => !c.held)) {
    notes.push("업종 목록이 조회 상한에 잘렸다. 미보유(held:false)로 나온 업종코드는 확정이 아닐 수 있다.");
  }
  if (truncated.supplyProducts && Array.isArray(productChecks) && productChecks.some((c) => !c.held)) {
    notes.push("공급물품 목록이 조회 상한에 잘렸다. 미보유(held:false)로 나온 세부품명번호는 확정이 아닐 수 있다.");
  }

  return { bizno, industryChecks, productChecks, sanction, truncated, notes };
}

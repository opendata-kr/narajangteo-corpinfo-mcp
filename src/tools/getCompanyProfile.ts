import { z } from "zod";
import type { DataGoKrClient } from "@opendata-kr/core";
import {
  formatCompanyBasic,
  formatIndustry,
  formatSupplyProduct,
  toSanctionResult,
  kstToday,
} from "../format.js";
import { fetchFacet, type FacetFetch } from "../api/fetchFacet.js";
import {
  RawCompanyBasicSchema,
  RawIndustrySchema,
  RawSupplyProductSchema,
  RawSanctionSchema,
} from "../api/schema.js";
import type {
  CompanyBasic,
  CompanyIndustry,
  CompanySupplyProduct,
  FacetError,
  SanctionResult,
} from "../api/types.js";

// LLM에는 camelCase 의미 이름만 노출하고 raw 코드(inqryDiv 등)는 핸들러 내부에 둔다.
export const getCompanyProfileInputShape = {
  bizno: z
    .string()
    .regex(/^\d{10}$/)
    .describe("사업자등록번호 10자리(raw bizno)"),
};

export type GetCompanyProfileArgs = z.infer<
  z.ZodObject<typeof getCompanyProfileInputShape>
>;

// 한 사업자번호의 4 facet(기본·업종·공급물품·부정당)을 한 번에 조립한 프로파일.
// facet마다 실패를 {error}로 격리해 부분 성공을 보존한다(전체 throw 금지).
export interface CompanyProfile {
  bizno: string;
  basic: CompanyBasic | null | FacetError;
  industries: CompanyIndustry[] | FacetError;
  supplyProducts: CompanySupplyProduct[] | FacetError;
  sanctions: SanctionResult;
  truncated: {
    industries: boolean;
    supplyProducts: boolean;
    sanctions: boolean;
  };
  invalidCounts: {
    basic: number;
    industries: number;
    supplyProducts: number;
    sanctions: number;
  };
  notes: string[];
}

// allSettled 결과를 FacetFetch로 되돌린다. fetchFacet은 자체적으로 실패를 흡수하지만,
// 예기치 못한 reject도 {error}로 낮춰 전체 throw를 막는다.
function settle<Raw>(r: PromiseSettledResult<FacetFetch<Raw>>): FacetFetch<Raw> {
  if (r.status === "fulfilled") return r.value;
  return {
    error: r.reason instanceof Error ? r.reason.message : String(r.reason),
  };
}

// 에러 facet의 truncated는 의미가 없으므로 false로 본다.
function truncatedOf(f: FacetFetch<unknown>): boolean {
  return "error" in f ? false : f.truncated;
}

// 에러 facet의 invalidCount도 의미가 없으므로 0으로 본다.
function invalidOf(f: FacetFetch<unknown>): number {
  return "error" in f ? 0 : f.invalidCount;
}

export async function runGetCompanyProfile(
  client: DataGoKrClient,
  args: GetCompanyProfileArgs,
): Promise<CompanyProfile> {
  const { bizno } = args;
  const today = kstToday();

  const [basicSettled, industrySettled, supplySettled, sanctionSettled] =
    await Promise.allSettled([
      fetchFacet(client, "basic", bizno, RawCompanyBasicSchema),
      fetchFacet(client, "industry", bizno, RawIndustrySchema),
      fetchFacet(client, "supply", bizno, RawSupplyProductSchema),
      fetchFacet(client, "sanction", bizno, RawSanctionSchema),
    ]);
  const basicRes = settle(basicSettled);
  const industryRes = settle(industrySettled);
  const supplyRes = settle(supplySettled);
  const sanctionRes = settle(sanctionSettled);

  const notes: string[] = [];

  let basic: CompanyBasic | null | FacetError;
  if ("error" in basicRes) {
    basic = basicRes;
  } else {
    const [first] = basicRes.items;
    if (first) {
      basic = formatCompanyBasic(first);
    } else {
      basic = null;
      notes.push("해당 사업자번호 조회결과 없음(미등록 또는 무효 번호)");
    }
  }

  const industries: CompanyIndustry[] | FacetError =
    "error" in industryRes
      ? industryRes
      : industryRes.items.map((raw) => formatIndustry(raw, today));

  const supplyProducts: CompanySupplyProduct[] | FacetError =
    "error" in supplyRes
      ? supplyRes
      : supplyRes.items.map(formatSupplyProduct);

  const sanctions = toSanctionResult(sanctionRes);

  const truncated = {
    industries: truncatedOf(industryRes),
    supplyProducts: truncatedOf(supplyRes),
    sanctions: truncatedOf(sanctionRes),
  };
  const invalidCounts = {
    basic: invalidOf(basicRes),
    industries: invalidOf(industryRes),
    supplyProducts: invalidOf(supplyRes),
    sanctions: invalidOf(sanctionRes),
  };
  // 목록이 조회 상한(창당 500건)에 잘리면, 목록에 없는 코드가 잘린 뒤쪽에 있을 수 있다.
  // 소비 측이 목록 부재를 "미보유"로 오판하지 않게 명시한다(조용한 거짓 음성 금지).
  if (truncated.industries) {
    notes.push("업종 목록이 조회 상한에 잘렸다. 목록에 없는 업종코드가 잘린 뒤쪽에 있을 수 있다.");
  }
  if (truncated.supplyProducts) {
    notes.push("공급물품 목록이 조회 상한에 잘렸다. 목록에 없는 세부품명번호가 잘린 뒤쪽에 있을 수 있다.");
  }

  return { bizno, basic, industries, supplyProducts, sanctions, truncated, invalidCounts, notes };
}

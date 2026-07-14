import type {
  RawCompanyBasic,
  RawIndustry,
  RawSanction,
  RawSupplyProduct,
} from "./api/schema.js";
import type { FacetFetch } from "./api/fetchFacet.js";
import type {
  CompanyBasic,
  CompanyIndustry,
  CompanySanction,
  CompanySupplyProduct,
  SanctionResult,
} from "./api/types.js";

// 업종 무효 상태명 denylist. docx 확인값 "유효기간 경과"를 시드로 둔다.
// 정확한 무효 상태 문자열 집합은 라이브검증에서 확장한다(라이브로 확장).
export const INVALID_STATUS_SET: ReadonlySet<string> = new Set(["유효기간 경과"]);

// 업종 유효 판정(순수함수). today는 KST(Asia/Seoul) 기준 YYYY-MM-DD, 핸들러가 산출해 주입한다.
// notExpired = vldPrdExprtDt 빈값(무기한) OR (날짜부 파싱 가능 AND 만료일 >= today). 경계 포함(만료일==today면 유효).
// 존재하나 파싱 불가한 만료일은 보수적으로 notExpired=false. statusOk = 상태명 ∉ INVALID_STATUS_SET.
export function isIndustryValid(raw: RawIndustry, today: string): boolean {
  const expiry = (raw.vldPrdExprtDt ?? "").trim();
  const notExpired = expiry === "" ? true : isNotExpired(expiry, today);
  const statusOk = !INVALID_STATUS_SET.has(raw.indstrytyStatsNm ?? "");
  return notExpired && statusOk;
}

// 만료일시 "YYYY-MM-DD HH:MM:SS"의 날짜부만 today와 날짜 단위 비교한다(시각 무시).
function isNotExpired(expiry: string, today: string): boolean {
  const datePart = expiry.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return false;
  if (Number.isNaN(Date.parse(datePart))) return false;
  return datePart >= today;
}

export function formatCompanyBasic(raw: RawCompanyBasic): CompanyBasic {
  return {
    bizno: raw.bizno ?? "",
    corpNm: raw.corpNm ?? "",
    engCorpNm: raw.engCorpNm ?? "",
    opbizDt: raw.opbizDt ?? "",
    rgnCd: raw.rgnCd ?? "",
    rgnNm: raw.rgnNm ?? "",
    zip: raw.zip ?? "",
    adrs: raw.adrs ?? "",
    dtlAdrs: raw.dtlAdrs ?? "",
    telNo: raw.telNo ?? "",
    faxNo: raw.faxNo ?? "",
    cntryNm: raw.cntryNm ?? "",
    hmpgAdrs: raw.hmpgAdrs ?? "",
    mnfctDivNm: raw.mnfctDivNm ?? "",
    emplyeNum: raw.emplyeNum ?? "",
    corpBsnsDivCd: raw.corpBsnsDivCd ?? "",
    corpBsnsDivNm: raw.corpBsnsDivNm ?? "",
    hdoffceDivNm: raw.hdoffceDivNm ?? "",
    rgstDt: raw.rgstDt ?? "",
    chgDt: raw.chgDt ?? "",
    ceoNm: raw.ceoNm ?? "",
  };
}

export function formatIndustry(raw: RawIndustry, today: string): CompanyIndustry {
  return {
    indstrytyCd: raw.indstrytyCd ?? "",
    indstrytyNm: raw.indstrytyNm ?? "",
    statusName: raw.indstrytyStatsNm ?? "",
    expiryDate: raw.vldPrdExprtDt ?? "",
    representative: raw.rprsntIndstrytyYn ?? "",
    valid: isIndustryValid(raw, today),
  };
}

export function formatSupplyProduct(raw: RawSupplyProduct): CompanySupplyProduct {
  return {
    dtilPrdctClsfcNo: raw.dtilPrdctClsfcNo ?? "",
    dtilPrdctClsfcNoNm: raw.dtilPrdctClsfcNoNm ?? "",
    manufacture: raw.mnfctYn === "Y",
    rgstDt: raw.rgstDt ?? "",
  };
}

export function formatSanction(raw: RawSanction): CompanySanction {
  return {
    bizno: raw.bizno ?? "",
    corpNm: raw.corpNm ?? "",
    sanctionBgnDt: raw.rsttBgnDate ?? "",
    sanctionEndDt: raw.rsttEndDate ?? "",
    sanctionInstitution: raw.insttNm ?? "",
    legalBasis: raw.lawordNm ?? "",
    articleClause: raw.lawordArtclClause ?? "",
    sanctionStatus: raw.rsttProgrsNm ?? "",
  };
}

// 부정당 facet 결과를 SanctionResult로 조립한다. 두 도구가 verbatim 공유하던 조립을 단일화.
export function toSanctionResult(fetch: FacetFetch<RawSanction>): SanctionResult {
  if ("error" in fetch) return fetch;
  return { sanctioned: fetch.items.length > 0, records: fetch.items.map(formatSanction) };
}

// KST(Asia/Seoul) 오늘을 YYYY-MM-DD로 산출한다. 임시 함수(핸들러 전용, 순수 판정과 분리).
// 서버 타임존(UTC 컨테이너·CI)으로 new Date()를 잡으면 KST 자정~09:00 창에서 하루 어긋난다.
export function kstToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    new Date(),
  );
}

import type { RawItem } from "@opendata-kr/core";
import type {
  CompanyBasic,
  CompanyIndustry,
  CompanySanction,
  CompanySupplyProduct,
} from "./api/types.js";

// raw 필드를 안전하게 뽑는다(없으면 빈 문자열).
export const pick = (raw: RawItem, k: string): string => raw[k] ?? "";

// 업종 무효 상태명 denylist. docx 확인값 "유효기간 경과"를 시드로 둔다.
// 정확한 무효 상태 문자열 집합은 라이브검증에서 확장한다(라이브로 확장).
export const INVALID_STATUS_SET: ReadonlySet<string> = new Set(["유효기간 경과"]);

// 업종 유효 판정(순수함수). today는 KST(Asia/Seoul) 기준 YYYY-MM-DD, 핸들러가 산출해 주입한다.
// notExpired = vldPrdExprtDt 빈값(무기한) OR (날짜부 파싱 가능 AND 만료일 >= today). 경계 포함(만료일==today면 유효).
// 존재하나 파싱 불가한 만료일은 보수적으로 notExpired=false. statusOk = 상태명 ∉ INVALID_STATUS_SET.
export function isIndustryValid(raw: RawItem, today: string): boolean {
  const expiry = pick(raw, "vldPrdExprtDt").trim();
  const notExpired = expiry === "" ? true : isNotExpired(expiry, today);
  const statusOk = !INVALID_STATUS_SET.has(pick(raw, "indstrytyStatsNm"));
  return notExpired && statusOk;
}

// 만료일시 "YYYY-MM-DD HH:MM:SS"의 날짜부만 today와 날짜 단위 비교한다(시각 무시).
function isNotExpired(expiry: string, today: string): boolean {
  const datePart = expiry.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return false;
  if (Number.isNaN(Date.parse(datePart))) return false;
  return datePart >= today;
}

export function formatCompanyBasic(raw: RawItem): CompanyBasic {
  return {
    bizno: pick(raw, "bizno"),
    corpNm: pick(raw, "corpNm"),
    engCorpNm: pick(raw, "engCorpNm"),
    opbizDt: pick(raw, "opbizDt"),
    rgnCd: pick(raw, "rgnCd"),
    rgnNm: pick(raw, "rgnNm"),
    zip: pick(raw, "zip"),
    adrs: pick(raw, "adrs"),
    dtlAdrs: pick(raw, "dtlAdrs"),
    telNo: pick(raw, "telNo"),
    faxNo: pick(raw, "faxNo"),
    cntryNm: pick(raw, "cntryNm"),
    hmpgAdrs: pick(raw, "hmpgAdrs"),
    mnfctDivNm: pick(raw, "mnfctDivNm"),
    emplyeNum: pick(raw, "emplyeNum"),
    corpBsnsDivCd: pick(raw, "corpBsnsDivCd"),
    corpBsnsDivNm: pick(raw, "corpBsnsDivNm"),
    hdoffceDivNm: pick(raw, "hdoffceDivNm"),
    rgstDt: pick(raw, "rgstDt"),
    chgDt: pick(raw, "chgDt"),
    ceoNm: pick(raw, "ceoNm"),
  };
}

export function formatIndustry(raw: RawItem, today: string): CompanyIndustry {
  return {
    indstrytyCd: pick(raw, "indstrytyCd"),
    indstrytyNm: pick(raw, "indstrytyNm"),
    statusName: pick(raw, "indstrytyStatsNm"),
    expiryDate: pick(raw, "vldPrdExprtDt"),
    representative: pick(raw, "rprsntIndstrytyYn"),
    valid: isIndustryValid(raw, today),
  };
}

export function formatSupplyProduct(raw: RawItem): CompanySupplyProduct {
  return {
    dtilPrdctClsfcNo: pick(raw, "dtilPrdctClsfcNo"),
    dtilPrdctClsfcNoNm: pick(raw, "dtilPrdctClsfcNoNm"),
    manufacture: pick(raw, "mnfctYn") === "Y",
    rgstDt: pick(raw, "rgstDt"),
  };
}

export function formatSanction(raw: RawItem): CompanySanction {
  return {
    bizno: pick(raw, "bizno"),
    corpNm: pick(raw, "corpNm"),
    sanctionBgnDt: pick(raw, "rsttBgnDate"),
    sanctionEndDt: pick(raw, "rsttEndDate"),
    sanctionInstitution: pick(raw, "insttNm"),
    legalBasis: pick(raw, "lawordNm"),
    articleClause: pick(raw, "lawordArtclClause"),
    sanctionStatus: pick(raw, "rsttProgrsNm"),
  };
}

// KST(Asia/Seoul) 오늘을 YYYY-MM-DD로 산출한다. 임시 함수(핸들러 전용, 순수 판정과 분리).
// 서버 타임존(UTC 컨테이너·CI)으로 new Date()를 잡으면 KST 자정~09:00 창에서 하루 어긋난다.
export function kstToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    new Date(),
  );
}

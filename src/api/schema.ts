import { z } from "zod";

// data.go.kr 응답 item 검증 스키마. core README 규약대로 관용적으로 짠다.
// looseObject로 미선언 필드를 통과시킨다. 발행 출력계약이 "없으면 빈 문자열"이라
// (쿼리가 bizno를 이미 알고 있어 결손 item도 의미 유지) 필수 필드를 두지 않는다.
// 번호·코드·수치처럼 숫자·문자열이 섞여 올 수 있는 필드는 coerce.string으로 수렴시킨다.

// 기본정보 facet
export const RawCompanyBasicSchema = z.looseObject({
  bizno: z.coerce.string().optional(),
  corpNm: z.string().optional(),
  engCorpNm: z.string().optional(),
  opbizDt: z.coerce.string().optional(),
  rgnCd: z.coerce.string().optional(),
  rgnNm: z.string().optional(),
  zip: z.coerce.string().optional(),
  adrs: z.string().optional(),
  dtlAdrs: z.string().optional(),
  telNo: z.coerce.string().optional(),
  faxNo: z.coerce.string().optional(),
  cntryNm: z.string().optional(),
  hmpgAdrs: z.string().optional(),
  mnfctDivNm: z.string().optional(),
  emplyeNum: z.coerce.string().optional(),
  corpBsnsDivCd: z.coerce.string().optional(),
  corpBsnsDivNm: z.string().optional(),
  hdoffceDivNm: z.string().optional(),
  rgstDt: z.string().optional(),
  chgDt: z.string().optional(),
  ceoNm: z.string().optional(),
});
export type RawCompanyBasic = z.infer<typeof RawCompanyBasicSchema>;

// 업종 facet
export const RawIndustrySchema = z.looseObject({
  indstrytyCd: z.coerce.string().optional(),
  indstrytyNm: z.string().optional(),
  indstrytyStatsNm: z.string().optional(),
  vldPrdExprtDt: z.string().optional(),
  rprsntIndstrytyYn: z.string().optional(),
});
export type RawIndustry = z.infer<typeof RawIndustrySchema>;

// 공급물품 facet
export const RawSupplyProductSchema = z.looseObject({
  dtilPrdctClsfcNo: z.coerce.string().optional(),
  dtilPrdctClsfcNoNm: z.string().optional(),
  mnfctYn: z.string().optional(),
  rgstDt: z.string().optional(),
});
export type RawSupplyProduct = z.infer<typeof RawSupplyProductSchema>;

// 부정당제재 facet
export const RawSanctionSchema = z.looseObject({
  bizno: z.coerce.string().optional(),
  corpNm: z.string().optional(),
  rsttBgnDate: z.string().optional(),
  rsttEndDate: z.string().optional(),
  insttNm: z.string().optional(),
  lawordNm: z.string().optional(),
  lawordArtclClause: z.string().optional(),
  rsttProgrsNm: z.string().optional(),
});
export type RawSanction = z.infer<typeof RawSanctionSchema>;

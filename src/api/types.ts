// 조달업체 기본정보(getPrcrmntCorpBasicInfo02 응답). raw 필드명 그대로 매핑해 원신호를 보존한다.
export interface CompanyBasic {
  bizno: string;
  corpNm: string;
  engCorpNm: string;
  opbizDt: string; // 개업일시 YYYY-MM-DD HH:MM:SS
  rgnCd: string;
  rgnNm: string;
  zip: string;
  adrs: string;
  dtlAdrs: string;
  telNo: string;
  faxNo: string;
  cntryNm: string;
  hmpgAdrs: string; // 홈페이지주소
  mnfctDivNm: string; // 제조구분명(제조/공급)
  emplyeNum: string;
  corpBsnsDivCd: string; // 업체업무구분코드(01:물품 07:공사 05:용역 ...)
  corpBsnsDivNm: string; // 업체업무구분명
  hdoffceDivNm: string; // 본사구분명
  rgstDt: string;
  chgDt: string;
  ceoNm: string; // 대표자명
}

// 조달업체 업종정보(getPrcrmntCorpIndstrytyInfo02 응답) + 유효 판정 결과.
// valid와 무관하게 statusName·expiryDate·representative 원신호를 상시 담아 소비 측 재판정을 허용한다.
export interface CompanyIndustry {
  indstrytyCd: string; // 업종코드 4자리
  indstrytyNm: string;
  statusName: string; // indstrytyStatsNm 업종상태명
  expiryDate: string; // vldPrdExprtDt 유효기간만료일시(빈값=무기한)
  representative: string; // rprsntIndstrytyYn 대표업종여부 Y/N
  valid: boolean;
}

// 조달업체 공급물품(getPrcrmntCorpSplyPrdctInfo02 응답). 유효 개념 없음(제조여부만).
export interface CompanySupplyProduct {
  dtilPrdctClsfcNo: string; // 세부품명번호 10자리
  dtilPrdctClsfcNoNm: string;
  manufacture: boolean; // mnfctYn === "Y"
  rgstDt: string;
}

// 조달업체 부정당제재(getUnptRsttCorpInfo02 응답, 조회시점 유효분만).
export interface CompanySanction {
  bizno: string;
  corpNm: string;
  sanctionBgnDt: string; // rsttBgnDate 제재시작일자 YYYY-MM-DD
  sanctionEndDt: string; // rsttEndDate 제재종료일자 YYYY-MM-DD
  sanctionInstitution: string; // insttNm 제재통보 수요기관명
  legalBasis: string; // lawordNm 근거법령명
  articleClause: string; // lawordArtclClause 조항호
  sanctionStatus: string; // rsttProgrsNm 제재상태명
}

// facet 조회 실패를 held:false로 뭉개지 않고 결과에 남긴다.
export type FacetError = { error: string };

// 부정당 조회 결과: 무제재/제재/조회실패를 구분한다.
export type SanctionResult =
  | { sanctioned: boolean; records: CompanySanction[] }
  | FacetError;

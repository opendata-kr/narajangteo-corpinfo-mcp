import type { Params } from "@opendata-kr/core";

// 사용자정보서비스(UsrInfoService02)의 조달업체 4개 오퍼레이션.
// 수요기관정보조회(getDminsttInfo02)는 조달업체가 아닌 수요기관 엔티티라 범위 밖(제외).
export const OP = {
  basic: "getPrcrmntCorpBasicInfo02",
  industry: "getPrcrmntCorpIndstrytyInfo02",
  supply: "getPrcrmntCorpSplyPrdctInfo02",
  sanction: "getUnptRsttCorpInfo02",
} as const;

export type Facet = keyof typeof OP;

// "사업자등록번호 기준검색"에 각 오퍼레이션이 부여한 inqryDiv 코드가 다르다: 기본정보는 3,
// 업종·공급물품·부정당은 1. 넷 다 값의 의미는 같은 "사업자등록번호 기준검색"이지만 코드 번호만 갈린다.
// 형제 서비스·기억으로 단일 상수를 공유하면 틀린다(docx 요청 명세가 유일 근거, 복사 금지).
export const BIZNO_INQRY_DIV: Record<Facet, string> = {
  basic: "3",
  industry: "1",
  supply: "1",
  sanction: "1",
};

// 사업자번호 조회는 기간 파라미터가 불요하다(날짜는 다른 조회구분에서만 필수).
export function biznoParams(facet: Facet, bizno: string): Params {
  return { inqryDiv: BIZNO_INQRY_DIV[facet], bizno };
}

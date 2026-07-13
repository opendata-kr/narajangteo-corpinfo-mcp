import { describe, it, expect } from "vitest";
import type { RawItem } from "@opendata-kr/core";
import {
  pick,
  formatCompanyBasic,
  formatSupplyProduct,
  formatSanction,
  formatIndustry,
  isIndustryValid,
  INVALID_STATUS_SET,
  kstToday,
} from "./format.js";

const TODAY = "2026-07-13";

describe("isIndustryValid", () => {
  it("만료일이 기준일보다 과거면 valid:false (경과)", () => {
    const raw: RawItem = {
      vldPrdExprtDt: "2017-04-02 00:00:00",
      indstrytyStatsNm: "",
    };
    expect(isIndustryValid(raw, TODAY)).toBe(false);
  });

  it("만료일이 빈값(무기한)이고 상태가 정상이면 valid:true", () => {
    const raw: RawItem = { vldPrdExprtDt: "", indstrytyStatsNm: "정상" };
    expect(isIndustryValid(raw, TODAY)).toBe(true);
  });

  it("INVALID_STATUS_SET 상태면 미래 만료일이어도 valid:false", () => {
    const raw: RawItem = {
      vldPrdExprtDt: "2099-01-01 00:00:00",
      indstrytyStatsNm: "유효기간 경과",
    };
    expect(isIndustryValid(raw, TODAY)).toBe(false);
  });

  it("존재하나 날짜 파싱 불가한 만료일이면 notExpired:false → valid:false", () => {
    const raw: RawItem = {
      vldPrdExprtDt: "알수없음",
      indstrytyStatsNm: "",
    };
    expect(isIndustryValid(raw, TODAY)).toBe(false);
  });

  it("만료일 == 기준일이면 경계 포함으로 valid:true", () => {
    const raw: RawItem = {
      vldPrdExprtDt: "2026-07-13 00:00:00",
      indstrytyStatsNm: "",
    };
    expect(isIndustryValid(raw, TODAY)).toBe(true);
  });
});

describe("INVALID_STATUS_SET", () => {
  it("시드값 '유효기간 경과'를 포함한다", () => {
    expect(INVALID_STATUS_SET.has("유효기간 경과")).toBe(true);
  });
});

describe("kstToday", () => {
  it("YYYY-MM-DD 포맷 문자열을 산출한다", () => {
    expect(kstToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("pick", () => {
  it("없는 키는 빈 문자열을 반환한다", () => {
    expect(pick({} as RawItem, "nope")).toBe("");
  });
});

describe("formatIndustry", () => {
  it("업종 raw를 도메인으로 매핑하고 valid·원신호를 담는다", () => {
    const raw: RawItem = {
      indstrytyCd: "0001",
      indstrytyNm: "토목공사업",
      indstrytyStatsNm: "유효기간 경과",
      vldPrdExprtDt: "2017-04-02 00:00:00",
      rprsntIndstrytyYn: "N",
    };
    expect(formatIndustry(raw, TODAY)).toEqual({
      indstrytyCd: "0001",
      indstrytyNm: "토목공사업",
      statusName: "유효기간 경과",
      expiryDate: "2017-04-02 00:00:00",
      representative: "N",
      valid: false,
    });
  });
});

describe("formatCompanyBasic", () => {
  it("기본정보 raw를 도메인으로 매핑한다(업체명·주소·대표자명 등)", () => {
    const raw: RawItem = {
      bizno: "6168122531",
      corpNm: "주식회사청마토건",
      engCorpNm: "cheongma CO.LTD",
      opbizDt: "1997-12-15 00:00:00",
      rgnCd: "50110",
      rgnNm: "제주특별자치도 제주시",
      zip: "63348",
      adrs: "제주특별자치도 제주시 구좌읍 김녕남2길",
      dtlAdrs: "17 105동 제비101호",
      telNo: "064-712-0471",
      faxNo: "064-712-0472",
      cntryNm: "대한민국",
      hmpgAdrs: "www.aaa.co.kr",
      mnfctDivNm: "공급",
      emplyeNum: "7",
      corpBsnsDivCd: "01,07",
      corpBsnsDivNm: "물품,공사",
      hdoffceDivNm: "본사",
      rgstDt: "2001-08-22 00:00:00",
      chgDt: "2025-07-26 07:00:37",
      ceoNm: "이동환",
    };
    const b = formatCompanyBasic(raw);
    expect(b.bizno).toBe("6168122531");
    expect(b.corpNm).toBe("주식회사청마토건");
    expect(b.adrs).toBe("제주특별자치도 제주시 구좌읍 김녕남2길");
    expect(b.ceoNm).toBe("이동환");
    expect(b.corpBsnsDivNm).toBe("물품,공사");
    expect(b.hmpgAdrs).toBe("www.aaa.co.kr");
  });
});

describe("formatSupplyProduct", () => {
  it("세부품명번호·제조여부를 매핑하고 mnfctYn=Y면 manufacture:true", () => {
    const raw: RawItem = {
      dtilPrdctClsfcNo: "1411150701",
      dtilPrdctClsfcNoNm: "프린트및복사용지",
      mnfctYn: "Y",
      rgstDt: "2024-04-19 09:12:58",
    };
    expect(formatSupplyProduct(raw)).toEqual({
      dtilPrdctClsfcNo: "1411150701",
      dtilPrdctClsfcNoNm: "프린트및복사용지",
      manufacture: true,
      rgstDt: "2024-04-19 09:12:58",
    });
  });

  it("mnfctYn=N이면 manufacture:false", () => {
    const raw: RawItem = { dtilPrdctClsfcNo: "1411150701", mnfctYn: "N" };
    expect(formatSupplyProduct(raw).manufacture).toBe(false);
  });
});

describe("formatSanction", () => {
  it("제재 요약 필드(제재기간·기관·근거)를 매핑한다", () => {
    const raw: RawItem = {
      bizno: "1198686612",
      corpNm: "이엠티씨 주식회사",
      rsttBgnDate: "2025-10-15",
      rsttEndDate: "2026-02-14",
      insttNm: "조달청",
      lawordNm: "지방계약법-부정당제재근거법령",
      lawordArtclClause: "법31조제1항9호 나목",
      rsttProgrsNm: "제재",
    };
    expect(formatSanction(raw)).toEqual({
      bizno: "1198686612",
      corpNm: "이엠티씨 주식회사",
      sanctionBgnDt: "2025-10-15",
      sanctionEndDt: "2026-02-14",
      sanctionInstitution: "조달청",
      legalBasis: "지방계약법-부정당제재근거법령",
      articleClause: "법31조제1항9호 나목",
      sanctionStatus: "제재",
    });
  });
});

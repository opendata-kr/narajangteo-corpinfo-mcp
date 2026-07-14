import { describe, it, expect } from "vitest";
import { OP } from "../api/endpoints.js";
import { routed, result, FAR_FUTURE, FAR_PAST } from "../test-helpers.js";
import {
  checkCompanyQualificationInputShape,
  runCheckCompanyQualification,
} from "./checkCompanyQualification.js";
import { z } from "zod";





describe("checkCompanyQualificationInputShape", () => {
  it("bizno가 10자리 숫자가 아니면 파싱을 거절한다", () => {
    const schema = z.object(checkCompanyQualificationInputShape);
    expect(schema.safeParse({ bizno: "123" }).success).toBe(false);
    expect(schema.safeParse({ bizno: "12345678901" }).success).toBe(false);
    expect(schema.safeParse({ bizno: "1234567890" }).success).toBe(true);
  });

  it("industryCodes·productCodes는 선택이며 문자열 배열이다", () => {
    const schema = z.object(checkCompanyQualificationInputShape);
    expect(
      schema.safeParse({ bizno: "1234567890", industryCodes: ["1234"] }).success,
    ).toBe(true);
    expect(
      schema.safeParse({ bizno: "1234567890", productCodes: ["1111111111"] })
        .success,
    ).toBe(true);
    expect(schema.safeParse({ bizno: "1234567890" }).success).toBe(true);
  });
});

describe("runCheckCompanyQualification", () => {
  it("보유·미보유 혼합 industryCodes를 코드별 held로 판정한다", async () => {
    const client = routed({
      [OP.industry]: result([
          {
            indstrytyCd: "1234",
            indstrytyNm: "전기공사업",
            indstrytyStatsNm: "정상",
            vldPrdExprtDt: FAR_FUTURE,
            rprsntIndstrytyYn: "Y",
          },
        ]),
    });
    const r = await runCheckCompanyQualification(client, {
      bizno: "1234567890",
      industryCodes: ["1234", "9999"],
    });
    expect(Array.isArray(r.industryChecks)).toBe(true);
    if (Array.isArray(r.industryChecks)) {
      const held = r.industryChecks.find((c) => c.code === "1234");
      const missing = r.industryChecks.find((c) => c.code === "9999");
      expect(held?.held).toBe(true);
      expect(held?.valid).toBe(true);
      expect(held?.statusName).toBe("정상");
      expect(held?.expiryDate).toBe(FAR_FUTURE);
      expect(held?.representative).toBe("Y");
      // 미보유 코드는 held:false·valid:false·빈 원신호.
      expect(missing?.held).toBe(false);
      expect(missing?.valid).toBe(false);
      expect(missing?.statusName).toBe("");
      expect(missing?.expiryDate).toBe("");
      expect(missing?.representative).toBe("");
    }
  });

  it("빈 배열 industryCodes는 전 목록을 각 held:true로 반환한다", async () => {
    const client = routed({
      [OP.industry]: result([
          {
            indstrytyCd: "1234",
            indstrytyStatsNm: "정상",
            vldPrdExprtDt: FAR_FUTURE,
          },
          {
            indstrytyCd: "5678",
            indstrytyStatsNm: "정상",
            vldPrdExprtDt: FAR_PAST,
          },
        ]),
    });
    const r = await runCheckCompanyQualification(client, {
      bizno: "1234567890",
      industryCodes: [],
    });
    expect(Array.isArray(r.industryChecks)).toBe(true);
    if (Array.isArray(r.industryChecks)) {
      expect(r.industryChecks).toHaveLength(2);
      expect(r.industryChecks.every((c) => c.held)).toBe(true);
      const live = r.industryChecks.find((c) => c.code === "1234");
      const expired = r.industryChecks.find((c) => c.code === "5678");
      expect(live?.valid).toBe(true);
      expect(expired?.valid).toBe(false);
    }
  });

  it("undefined industryCodes도 전 목록을 반환한다(미지정 동일 처리)", async () => {
    const client = routed({
      [OP.industry]: result([{ indstrytyCd: "1234", indstrytyStatsNm: "정상" }]),
    });
    const r = await runCheckCompanyQualification(client, {
      bizno: "1234567890",
    });
    expect(Array.isArray(r.industryChecks)).toBe(true);
    if (Array.isArray(r.industryChecks)) {
      expect(r.industryChecks).toHaveLength(1);
      expect(r.industryChecks[0]?.held).toBe(true);
      expect(r.industryChecks[0]?.code).toBe("1234");
    }
  });

  it("업종 facet이 실패하면 industryChecks는 {error}이고 held:false로 뭉개지 않는다", async () => {
    const client = routed({
      [OP.industry]: { errorCode: "99", errorMsg: "업종 조회 네트워크 오류" },
    });
    const r = await runCheckCompanyQualification(client, {
      bizno: "1234567890",
      industryCodes: ["1234"],
    });
    expect(Array.isArray(r.industryChecks)).toBe(false);
    expect("error" in r.industryChecks).toBe(true);
    if ("error" in r.industryChecks) {
      expect(r.industryChecks.error).toContain("업종 조회 네트워크 오류");
    }
  });

  it("productChecks는 코드별 held와 manufacture(제조여부)를 판정한다", async () => {
    const client = routed({
      [OP.supply]: result([
          { dtilPrdctClsfcNo: "1111111111", mnfctYn: "Y" },
          { dtilPrdctClsfcNo: "2222222222", mnfctYn: "N" },
        ]),
    });
    const r = await runCheckCompanyQualification(client, {
      bizno: "1234567890",
      productCodes: ["1111111111", "3333333333"],
    });
    expect(Array.isArray(r.productChecks)).toBe(true);
    if (Array.isArray(r.productChecks)) {
      const manuf = r.productChecks.find((c) => c.code === "1111111111");
      const missing = r.productChecks.find((c) => c.code === "3333333333");
      expect(manuf?.held).toBe(true);
      expect(manuf?.manufacture).toBe(true);
      expect(missing?.held).toBe(false);
      expect(missing?.manufacture).toBe(false);
    }
  });

  it("빈 배열 productCodes는 전 목록을 각 held:true로 반환한다", async () => {
    const client = routed({
      [OP.supply]: result([{ dtilPrdctClsfcNo: "1111111111", mnfctYn: "Y" }]),
    });
    const r = await runCheckCompanyQualification(client, {
      bizno: "1234567890",
      productCodes: [],
    });
    expect(Array.isArray(r.productChecks)).toBe(true);
    if (Array.isArray(r.productChecks)) {
      expect(r.productChecks).toHaveLength(1);
      expect(r.productChecks[0]?.held).toBe(true);
      expect(r.productChecks[0]?.manufacture).toBe(true);
    }
  });

  it("부정당이 빈 결과면 sanctioned:false·records:[]로 무제재를 표현한다", async () => {
    const client = routed({});
    const r = await runCheckCompanyQualification(client, {
      bizno: "1234567890",
    });
    expect("error" in r.sanction).toBe(false);
    if (!("error" in r.sanction)) {
      expect(r.sanction.sanctioned).toBe(false);
      expect(r.sanction.records).toEqual([]);
    }
  });

  it("부정당 조회 실패는 {error}로 구분한다", async () => {
    const client = routed({
      [OP.sanction]: { errorCode: "99", errorMsg: "부정당 조회 오류" },
    });
    const r = await runCheckCompanyQualification(client, {
      bizno: "1234567890",
    });
    expect("error" in r.sanction).toBe(true);
    if ("error" in r.sanction) {
      expect(r.sanction.error).toContain("부정당 조회 오류");
    }
  });

  it("facet totalCount가 가져온 건수를 넘으면 truncated를 표면화한다", async () => {
    const fullPage = result(
        Array.from({ length: 100 }, (_, i) => ({ indstrytyCd: String(i) })),
        600,
      );
    const client = routed({ [OP.industry]: fullPage });
    const r = await runCheckCompanyQualification(client, {
      bizno: "1234567890",
    });
    expect(r.truncated.industries).toBe(true);
    expect(r.truncated.supplyProducts).toBe(false);
    expect(r.truncated.sanctions).toBe(false);
  });

  it("업종이 truncated이고 미보유 코드가 있으면 held:false 미확정 caveat를 notes에 담는다", async () => {
    const fullPage = result(
        Array.from({ length: 100 }, (_, i) => ({ indstrytyCd: String(i) })),
        600,
      );
    const client = routed({ [OP.industry]: fullPage });
    const r = await runCheckCompanyQualification(client, {
      bizno: "1234567890",
      industryCodes: ["9999"],
    });
    expect(r.truncated.industries).toBe(true);
    expect(
      r.notes.some((n) => n.includes("업종 목록이 조회 상한에 잘렸다")),
    ).toBe(true);
  });

  it("notes에 역검색·리졸버 불가 안내를 담는다", async () => {
    const client = routed({});
    const r = await runCheckCompanyQualification(client, {
      bizno: "1234567890",
    });
    expect(r.notes.length).toBeGreaterThan(0);
  });
});

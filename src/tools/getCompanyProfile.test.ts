import { describe, it, expect } from "vitest";
import type { DataGoKrClient, OperationResult, Params } from "@opendata-kr/core";
import { OP } from "../api/endpoints.js";
import {
  getCompanyProfileInputShape,
  runGetCompanyProfile,
} from "./getCompanyProfile.js";
import { z } from "zod";

// withKeyHint가 serviceKeyLooksPreEncoded를 읽으므로 stub에 포함한다.
function fakeClient(
  call: (op: string, params?: Params) => Promise<OperationResult>,
): DataGoKrClient {
  return { call, serviceKeyLooksPreEncoded: false };
}

function result(items: Array<Record<string, string>>, totalCount?: number): OperationResult {
  return { totalCount: totalCount ?? items.length, pageNo: 1, items };
}

// op 문자열별로 응답을 라우팅하는 fakeClient. 지정 안 한 op는 빈 결과.
function routed(
  map: Partial<Record<string, () => Promise<OperationResult>>>,
): DataGoKrClient {
  return fakeClient(async (op) => {
    const fn = map[op];
    if (!fn) return result([]);
    return fn();
  });
}

// 극단 만료일: 실시계(kstToday)와 무관하게 valid를 단정하기 위해 먼 미래/과거를 쓴다.
const FAR_FUTURE = "2999-12-31 23:59:59";
const FAR_PAST = "1999-01-01 00:00:00";

describe("getCompanyProfileInputShape", () => {
  it("bizno가 10자리 숫자가 아니면 파싱을 거절한다", () => {
    const schema = z.object(getCompanyProfileInputShape);
    expect(schema.safeParse({ bizno: "123" }).success).toBe(false);
    expect(schema.safeParse({ bizno: "12345678901" }).success).toBe(false);
    expect(schema.safeParse({ bizno: "1234567890" }).success).toBe(true);
  });
});

describe("runGetCompanyProfile", () => {
  it("한 facet만 실패하면 나머지는 반환하고 실패 facet은 {error}로 남긴다", async () => {
    const client = routed({
      [OP.basic]: async () => result([{ bizno: "1234567890", corpNm: "테스트상사" }]),
      [OP.industry]: async () => result([{ indstrytyCd: "1234", indstrytyNm: "전기공사업" }]),
      [OP.supply]: async () => result([{ dtilPrdctClsfcNo: "1111111111", mnfctYn: "Y" }]),
      [OP.sanction]: async () => {
        throw new Error("부정당 조회 네트워크 오류");
      },
    });
    const r = await runGetCompanyProfile(client, { bizno: "1234567890" });

    expect(r.bizno).toBe("1234567890");
    expect(r.basic).not.toBeNull();
    expect(r.basic && "error" in r.basic).toBe(false);
    expect(Array.isArray(r.industries)).toBe(true);
    expect(Array.isArray(r.supplyProducts)).toBe(true);
    // 부정당 facet 실패는 SanctionResult가 {error}.
    expect("error" in r.sanctions).toBe(true);
    if ("error" in r.sanctions) {
      expect(r.sanctions.error).toContain("부정당 조회 네트워크 오류");
    }
  });

  it("basic이 빈 결과면 null과 안내 note를 담는다", async () => {
    const client = routed({});
    const r = await runGetCompanyProfile(client, { bizno: "0000000000" });
    expect(r.basic).toBeNull();
    expect(r.notes.some((n) => n.includes("미등록") || n.includes("무효"))).toBe(true);
  });

  it("부정당이 빈 결과면 sanctioned:false·records:[]로 무제재를 표현한다", async () => {
    const client = routed({
      [OP.basic]: async () => result([{ bizno: "1234567890" }]),
    });
    const r = await runGetCompanyProfile(client, { bizno: "1234567890" });
    expect("error" in r.sanctions).toBe(false);
    if (!("error" in r.sanctions)) {
      expect(r.sanctions.sanctioned).toBe(false);
      expect(r.sanctions.records).toEqual([]);
    }
  });

  it("industries 항목에 valid·statusName·expiryDate·representative 원신호를 담는다", async () => {
    const client = routed({
      [OP.basic]: async () => result([{ bizno: "1234567890" }]),
      [OP.industry]: async () =>
        result([
          {
            indstrytyCd: "1234",
            indstrytyNm: "전기공사업",
            indstrytyStatsNm: "정상",
            vldPrdExprtDt: FAR_FUTURE,
            rprsntIndstrytyYn: "Y",
          },
          {
            indstrytyCd: "5678",
            indstrytyNm: "만료업종",
            indstrytyStatsNm: "정상",
            vldPrdExprtDt: FAR_PAST,
            rprsntIndstrytyYn: "N",
          },
        ]),
    });
    const r = await runGetCompanyProfile(client, { bizno: "1234567890" });
    expect(Array.isArray(r.industries)).toBe(true);
    if (Array.isArray(r.industries)) {
      const [live, expired] = r.industries;
      expect(live?.valid).toBe(true);
      expect(live?.statusName).toBe("정상");
      expect(live?.expiryDate).toBe(FAR_FUTURE);
      expect(live?.representative).toBe("Y");
      expect(expired?.valid).toBe(false);
    }
  });

  it("facet totalCount가 가져온 건수를 넘으면 truncated:true를 표면화한다", async () => {
    // 매 페이지 full(100)이고 totalCount 600 → 500 fetched < 600 → truncated.
    const fullPage = async () =>
      result(
        Array.from({ length: 100 }, (_, i) => ({ indstrytyCd: String(i) })),
        600,
      );
    const client = routed({
      [OP.basic]: async () => result([{ bizno: "1234567890" }]),
      [OP.industry]: fullPage,
    });
    const r = await runGetCompanyProfile(client, { bizno: "1234567890" });
    expect(r.truncated.industries).toBe(true);
    expect(r.truncated.supplyProducts).toBe(false);
    expect(r.truncated.sanctions).toBe(false);
    // 잘린 목록은 거짓 음성 방지 caveat note를 동반한다.
    expect(
      r.notes.some((n) => n.includes("업종 목록이 조회 상한에 잘렸다")),
    ).toBe(true);
  });
});

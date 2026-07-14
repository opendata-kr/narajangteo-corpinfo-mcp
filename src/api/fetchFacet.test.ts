import { describe, it, expect } from "vitest";
import { z } from "zod";
import { OP } from "./endpoints.js";
import { makeTestClient, result } from "../test-helpers.js";
import { fetchFacet } from "./fetchFacet.js";
import type { FacetError } from "./types.js";
import { RawCompanyBasicSchema, RawSupplyProductSchema, RawSanctionSchema } from "./schema.js";

function page(count: number, totalCount: number) {
  return result(
    Array.from({ length: count }, (_, i) => ({ bizno: String(i) })),
    totalCount,
  );
}

describe("fetchFacet", () => {
  it("성공 시 items·totalCount·truncated:false를 반환한다", async () => {
    const { client } = makeTestClient({ [OP.basic]: page(3, 3) });
    const r = await fetchFacet(client, "basic", "6168122531", RawCompanyBasicSchema);
    expect("error" in r).toBe(false);
    if ("error" in r) throw new Error("unexpected error");
    expect(r.totalCount).toBe(3);
    expect(r.items).toHaveLength(3);
    expect(r.truncated).toBe(false);
    expect(r.invalidCount).toBe(0);
  });

  it("매 페이지 full(100)이고 totalCount가 fetched를 넘으면 truncated:true", async () => {
    // totalCount 600, maxPages 5 * pageSize 100 = 500 fetched < 600 → truncated.
    const { client } = makeTestClient({ [OP.supply]: page(100, 600) });
    const r = await fetchFacet(client, "supply", "8633000223", RawSupplyProductSchema);
    expect("error" in r).toBe(false);
    if ("error" in r) throw new Error("unexpected error");
    expect(r.truncated).toBe(true);
    expect(r.items).toHaveLength(500);
  });

  it("API 오류는 {error}로 표면화한다(throw 아님)", async () => {
    const { client } = makeTestClient({
      [OP.sanction]: { errorCode: "99", errorMsg: "네트워크 오류" },
    });
    const r = await fetchFacet(client, "sanction", "1198686612", RawSanctionSchema);
    expect("error" in r).toBe(true);
    expect((r as FacetError).error).toContain("네트워크 오류");
  });

  it("스키마 탈락 item은 items에서 빠지고 invalidCount로 집계된다", async () => {
    const StrictSchema = z.looseObject({ id: z.string() });
    const { client } = makeTestClient({
      [OP.basic]: result([{ id: "ok" }, { id: 123 }]),
    });
    const r = await fetchFacet(client, "basic", "6168122531", StrictSchema);
    if ("error" in r) throw new Error("unexpected error");
    expect(r.items).toEqual([{ id: "ok" }]);
    expect(r.invalidCount).toBe(1);
  });
});

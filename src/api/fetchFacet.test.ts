import { describe, it, expect } from "vitest";
import type { DataGoKrClient, OperationResult, Params } from "@opendata-kr/core";
import { fetchFacet } from "./fetchFacet.js";
import type { FacetError } from "./types.js";

// withKeyHint가 serviceKeyLooksPreEncoded를 읽으므로 stub에 포함한다.
function fakeClient(
  call: (op: string, params?: Params) => Promise<OperationResult>,
): DataGoKrClient {
  return { call, serviceKeyLooksPreEncoded: false };
}

function page(count: number, totalCount: number): OperationResult {
  const items = Array.from({ length: count }, (_, i) => ({ bizno: String(i) }));
  return { totalCount, pageNo: 1, items };
}

describe("fetchFacet", () => {
  it("성공 시 items·totalCount·truncated:false를 반환한다", async () => {
    const client = fakeClient(async () => page(3, 3));
    const r = await fetchFacet(client, "basic", "6168122531");
    expect("error" in r).toBe(false);
    if ("error" in r) throw new Error("unexpected error");
    expect(r.totalCount).toBe(3);
    expect(r.items).toHaveLength(3);
    expect(r.truncated).toBe(false);
  });

  it("매 페이지 full(100)이고 totalCount가 fetched를 넘으면 truncated:true", async () => {
    // totalCount 600, maxPages 5 * pageSize 100 = 500 fetched < 600 → truncated.
    const client = fakeClient(async () => page(100, 600));
    const r = await fetchFacet(client, "supply", "8633000223");
    expect("error" in r).toBe(false);
    if ("error" in r) throw new Error("unexpected error");
    expect(r.truncated).toBe(true);
    expect(r.items).toHaveLength(500);
  });

  it("call이 reject하면 {error}로 표면화한다(throw 아님)", async () => {
    const client = fakeClient(async () => {
      throw new Error("네트워크 오류");
    });
    const r = await fetchFacet(client, "sanction", "1198686612");
    expect("error" in r).toBe(true);
    expect((r as FacetError).error).toContain("네트워크 오류");
  });
});

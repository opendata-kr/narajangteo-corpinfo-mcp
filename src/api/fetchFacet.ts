import {
  fetchAllPages,
  errMessage,
  withKeyHint,
  type DataGoKrClient,
  type RawItem,
} from "@opendata-kr/core";
import { OP, biznoParams, type Facet } from "./endpoints.js";
import type { FacetError } from "./types.js";

// 한 facet의 페이징 조회 결과. 실패는 throw하지 않고 FacetError로 표면화한다(부분실패 격리).
export type FacetFetch =
  | { items: RawItem[]; totalCount: number; truncated: boolean }
  | FacetError;

// 사업자번호로 한 facet을 fetchAllPages(pageSize 100, maxPages 5, 최대 500건)로 조회한다.
// 500건을 넘으면 truncated:true로 표면화해 소비 측이 "가져온 범위에 없음"을 구분하게 한다.
export async function fetchFacet(
  client: DataGoKrClient,
  facet: Facet,
  bizno: string,
): Promise<FacetFetch> {
  try {
    const { items, totalCount, truncated } = await fetchAllPages(
      (op, params) => client.call(op, params),
      OP[facet],
      biznoParams(facet, bizno),
      { pageSize: 100, maxPages: 5 },
    );
    return { items, totalCount, truncated };
  } catch (err) {
    return { error: withKeyHint(client, errMessage(err)) };
  }
}

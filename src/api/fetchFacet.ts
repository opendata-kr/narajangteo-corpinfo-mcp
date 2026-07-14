import {
  errMessage,
  type DataGoKrClient,
  type StandardSchemaV1,
} from "@opendata-kr/core";
import { OP, biznoParams, type Facet } from "./endpoints.js";
import type { FacetError } from "./types.js";

// 한 facet의 페이징 조회 결과. 실패는 throw하지 않고 FacetError로 표면화한다(부분실패 격리).
// invalidCount는 스키마 검증에서 탈락해 items에서 제외된 건수다(0이 아니면 API 응답 드리프트 신호).
export type FacetFetch<Raw> =
  | { items: Raw[]; totalCount: number; truncated: boolean; invalidCount: number }
  | FacetError;

// 사업자번호로 한 facet을 core paginate(pageSize 100, maxPages 5, 최대 500건)로 조회하고
// item을 facet 스키마로 검증한다. 500건을 넘으면 truncated:true로 표면화해
// 소비 측이 "가져온 범위에 없음"을 구분하게 한다.
// 에러 문자열화·키 힌트는 core(errMessage·클라이언트 기본 인터셉터)가 처리한다.
export async function fetchFacet<Raw>(
  client: DataGoKrClient,
  facet: Facet,
  bizno: string,
  schema: StandardSchemaV1<unknown, Raw>,
): Promise<FacetFetch<Raw>> {
  try {
    const { data, totalCount, truncated, invalid } = await client.paginate(OP[facet], {
      params: biznoParams(facet, bizno),
      schema,
      pageSize: 100,
      maxPages: 5,
    });
    return { items: data, totalCount, truncated, invalidCount: invalid.length };
  } catch (err) {
    return { error: errMessage(err) };
  }
}

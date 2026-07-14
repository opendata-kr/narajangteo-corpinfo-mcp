# corpinfo 후속 백로그 (도구 구현 후)

도구 2종 구현·검증 완료 후 최종 코드리뷰가 남긴 항목이다. 라이브 검증 결과와 교차 정합 리팩터로 나뉜다.

## 라이브 검증 결과 (2026-07-13, 승인 인증키로 실 API 구동)

인증 정상(code 30 아님), 4 오퍼레이션 응답·필드 매핑 정합 확인. 두 도구가 실데이터로 정확히 동작.

- **필드 매핑·응답 구조**: 확인 완료. `get_company_profile`의 4 facet(기본·업종·공급물품·부정당)과 `check_company_qualification`이 실데이터로 동작. 부정당 필드 매핑(`rsttBgnDate`→`sanctionBgnDt`, `insttNm`→`sanctionInstitution`, `lawordNm`→`legalBasis`, `rsttProgrsNm`→`sanctionStatus` 등)을 제재 업체(bizno 1489901590)로 확정. `inqryDiv` 맵 정확(전 facet 정상 응답).
- **업종 유효 판정**: 확인 완료. 활성 업종은 `statusName` ""/"정상"·`expiryDate` 빈값이라 `valid:true`. 만료 업종(bizno 3068134668)은 "유효기간 경과"·과거 만료일이라 `valid:false`. `INVALID_STATUS_SET` 시드 "유효기간 경과"가 실 상태 문자열과 일치. 정지·말소류는 샘플에서 미관측(발생 시 expiry 검사가 방어). 새 무효 상태명이 관측되면 그때 denylist에 추가.
- **동일 업종코드 중복행**: 샘플 업체들에서 코드당 중복행 미관측. `find()`-first 실무 위험 낮음. 잔여 관찰 항목이다(중복 발견 시 `toIndustryChecks`에서 유효·최신 행 우선).

## 교차 정합·리팩터 (동작 무변)

- **`toSanctionResult` 헬퍼 추출**: 완료(core 0.4 이행 PR). `format.ts`의 공유 헬퍼로 단일화.
- **공유 테스트 유틸 추출**: 완료(core 0.4 이행 PR). `src/test-helpers.ts`로 통합(`makeTestClient`·`routed`·`result`·`FAR_FUTURE`/`FAR_PAST`). fetch 주입 실클라이언트 방식이라 가짜 클라이언트 캐스트도 소멸.
- **팬아웃 프리미티브 검토**: 결정 완료 — core `fanOut` 미채택, 현행 유지. fanOut은 동질 컬렉션의 label 결과맵이라 이질 facet(반환 타입이 facet마다 다름)에 쓰면 `Outcome<unknown>`으로 타입이 죽는다. `fetchFacet`(FacetError 격리) + `Promise.allSettled`가 같은 부분실패 보장을 타입 보존으로 제공한다.
- **truncated caveat 헬퍼**: 잘림 거짓음성 안내 블록이 업종·공급물품으로 near-duplicate. 세 번째 facet에 필요해지면 파라미터화한다.

## 발행 파이프라인 잔여

- **MCP 레지스트리 등재**: 완료. v0.2.0 OIDC 릴리스 워크플로가 npm 발행과 레지스트리 발행까지 성공.
- **dependabot dev-deps PR CI 실패 검토**.

## MCP 표준 감사 후속 (2026-07-14 워크스페이스 감사)

- **server.json icons 누락**: 완료(core 0.4 이행 PR에서 조직 통일 icons 추가).
- **core 0.4 이행**: 완료(공통 작업 + 팬아웃 검토 결정. 체크리스트는 core 리포 `docs/roadmap/2026-07-14-typed-transport-followups.md` B4).

## core 0.4 이행 후속 (2026-07-14 이식 리뷰)

- **라이브 재검증 1회**: 라이브 검증(2026-07-13)이 invalid 개념 도입보다 앞서 `invalid > 0` 승격이 실 API로 밟힌 적 없다. 승인 키로 전 도구를 구동해 스키마 정합을 확인하고 결과를 `.superpowers/sdd/probe-findings.md`에 기록.

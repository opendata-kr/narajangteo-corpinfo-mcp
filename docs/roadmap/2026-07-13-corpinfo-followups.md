# corpinfo 후속 백로그 (도구 구현 후)

도구 2종 구현·검증 완료 후 최종 코드리뷰가 남긴 항목이다. 라이브 검증 결과와 교차 정합 리팩터로 나뉜다.

## 라이브 검증 결과 (2026-07-13, 승인 인증키로 실 API 구동)

인증 정상(code 30 아님), 4 오퍼레이션 응답·필드 매핑 정합 확인. 두 도구가 실데이터로 정확히 동작.

- **필드 매핑·응답 구조**: 확인 완료. `get_company_profile`의 4 facet(기본·업종·공급물품·부정당)과 `check_company_qualification`이 실데이터로 동작. 부정당 필드 매핑(`rsttBgnDate`→`sanctionBgnDt`, `insttNm`→`sanctionInstitution`, `lawordNm`→`legalBasis`, `rsttProgrsNm`→`sanctionStatus` 등)을 제재 업체(bizno 1489901590)로 확정. `inqryDiv` 맵 정확(전 facet 정상 응답).
- **업종 유효 판정**: 확인 완료. 활성 업종은 `statusName` ""/"정상"·`expiryDate` 빈값이라 `valid:true`. 만료 업종(bizno 3068134668)은 "유효기간 경과"·과거 만료일이라 `valid:false`. `INVALID_STATUS_SET` 시드 "유효기간 경과"가 실 상태 문자열과 일치. 정지·말소류는 샘플에서 미관측(발생 시 expiry 검사가 방어). 새 무효 상태명이 관측되면 그때 denylist에 추가.
- **동일 업종코드 중복행**: 샘플 업체들에서 코드당 중복행 미관측. `find()`-first 실무 위험 낮음. 잔여 관찰 항목이다(중복 발견 시 `toIndustryChecks`에서 유효·최신 행 우선).

## 교차 정합·리팩터 (동작 무변)

- **`toSanctionResult` 헬퍼 추출**: 부정당 결과 조립(`"error" in x ? x : {sanctioned, records}`)이 두 도구에 verbatim 중복. 공유 헬퍼로 뽑아 `SanctionResult` 형태 변경 시 한 곳만 고치게 한다.
- **공유 테스트 유틸 추출**: `fakeClient`·`routed`·`result` 팩토리와 `FAR_FUTURE`·`FAR_PAST` 상수가 세 테스트 파일에 중복. 공유 test util로 뽑는다.
- **팬아웃 프리미티브 검토**: 두 도구가 `Promise.allSettled` + 손수 `settle`로 facet 팬아웃을 재구현. 형제 리포는 core `fanOut`을 쓰지만 그건 동질 업무구분 팬아웃이고 여기 facet은 이질(기본·업종·공급물품·부정당)이라 바로 들어맞지 않는다. core에 이질 facet 팬아웃 프리미티브를 승격할지, 현행 유지할지 결정한다.
- **truncated caveat 헬퍼**: 잘림 거짓음성 안내 블록이 업종·공급물품으로 near-duplicate. 세 번째 facet에 필요해지면 파라미터화한다.

## 발행 파이프라인 잔여

- **MCP 레지스트리 등재**: 다음 OIDC 릴리스에서 자동. 부트스트랩 태그 run은 npm 중복 발행에서 멈춰 레지스트리 단계에 못 갔다.
- **dependabot dev-deps PR CI 실패 검토**.

## MCP 표준 감사 후속 (2026-07-14 워크스페이스 감사)

- **server.json icons 누락**: prespec·opening과 달리 조직 통일 `icons`(정본 URL)가 없다. 발행 전 체크리스트 항목이라 다음 릴리스 전에 추가한다.
- **core 0.4.0 이행**: 공통 이행 작업 + facet 팬아웃 재구현의 fanOut 채택 재검토(위 [팬아웃 프리미티브 검토]와 병합). 체크리스트는 core 리포 `docs/roadmap/2026-07-14-typed-transport-followups.md` B4.

# corpinfo 후속 백로그 (도구 구현 후)

도구 2종 구현·검증 완료 후 최종 코드리뷰가 남긴 항목이다. 라이브 검증(활용신청 승인 후 실 API 구동) 단계에서 먼저 확인할 것과 교차 정합 리팩터로 나뉜다.

## 라이브 검증에서 확인할 것 (정확성, API 실동작 의존)

- **무효 업종상태 집합 확장**: `INVALID_STATUS_SET`은 docx 확인값 "유효기간 경과" 하나만 시드다. 정지·말소·취소 등 다른 무효 상태명이 실제로 어떤 문자열인지 라이브 응답으로 확인해 denylist에 추가한다. 확장 전에는 미확인 무효 상태가 유효기간이 남았거나 무기한이면 `valid:true`로 낙관될 수 있다. 원신호(`statusName`)를 항상 반환하므로 소비 측이 재판정할 수 있으나, 판정 정확도를 위해 라이브로 집합을 채운다. 근거: `src/format.ts` `INVALID_STATUS_SET`.
- **동일 업종코드 중복행 해소**: `check_company_qualification`의 코드 매칭이 `find`(첫 매칭)이라, 같은 `indstrytyCd`가 여러 행으로(예: 만료행 + 현행) 오면 첫 행에서 valid를 읽는다. 업종 응답이 코드당 중복행을 주는지 라이브로 확인하고, 준다면 유효·최신 행을 우선하도록 매칭을 바꾼다. 근거: `src/tools/checkCompanyQualification.ts` `toIndustryChecks`.
- **오퍼레이션별 응답·페이징 확정**: `inqryDiv` 의미, `pageSize` 상한, 응답 구조, 필드 패딩을 오퍼레이션마다 실 호출로 확정한다(형제 서비스로 가정 금지). `get_company_profile`·`check_company_qualification`을 실사용 시나리오(자사 자격 대조·경쟁사 프로파일링·부정당 스크리닝)로 전 도구 구동한다.

## 교차 정합·리팩터 (동작 무변)

- **`toSanctionResult` 헬퍼 추출**: 부정당 결과 조립(`"error" in x ? x : {sanctioned, records}`)이 두 도구에 verbatim 중복. 공유 헬퍼로 뽑아 `SanctionResult` 형태 변경 시 한 곳만 고치게 한다.
- **공유 테스트 유틸 추출**: `fakeClient`·`routed`·`result` 팩토리와 `FAR_FUTURE`·`FAR_PAST` 상수가 세 테스트 파일에 중복. 공유 test util로 뽑는다.
- **팬아웃 프리미티브 검토**: 두 도구가 `Promise.allSettled` + 손수 `settle`로 facet 팬아웃을 재구현. 형제 리포는 core `fanOut`을 쓰지만 그건 동질 업무구분 팬아웃이고 여기 facet은 이질(기본·업종·공급물품·부정당)이라 바로 들어맞지 않는다. core에 이질 facet 팬아웃 프리미티브를 승격할지, 현행 유지할지 결정한다.
- **truncated caveat 헬퍼**: 잘림 거짓음성 안내 블록이 업종·공급물품으로 near-duplicate. 세 번째 facet에 필요해지면 파라미터화한다.

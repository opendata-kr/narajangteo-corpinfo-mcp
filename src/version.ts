// 버전은 release-please가 릴리스마다 이 마커 사이 값을 교체한다.
// release-please-config.json의 extra-files에 { type: "generic", path: "src/version.ts" }로 등록돼 있다.
// 초기값 0.0.0은 첫 릴리스에서 실제 버전으로 대체된다.
// x-release-please-start-version
export const VERSION = "0.1.0";
// x-release-please-end

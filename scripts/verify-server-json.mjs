// server.json이 package.json과 어긋나지 않는지 검증한다(레지스트리 발행 전 게이트).
// 버전 동기화는 release-please extra-files가 담당하고, 이 스크립트는 그 결과를 확인한다.
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const srv = JSON.parse(readFileSync("server.json", "utf8"));
const errs = [];

if (srv.version !== pkg.version) {
  errs.push(`server.json version ${srv.version} != package.json version ${pkg.version}`);
}
if (srv.name !== pkg.mcpName) {
  errs.push(`server.json name ${srv.name} != package.json mcpName ${pkg.mcpName}`);
}
for (const p of srv.packages ?? []) {
  if (p.version !== pkg.version) {
    errs.push(`packages[].version ${p.version} != package.json version ${pkg.version}`);
  }
  if (p.identifier !== pkg.name) {
    errs.push(`packages[].identifier ${p.identifier} != package name ${pkg.name}`);
  }
}

if (errs.length) {
  console.error("server.json 정합 실패:\n- " + errs.join("\n- "));
  process.exit(1);
}
console.log("server.json <-> package.json 정합 OK");

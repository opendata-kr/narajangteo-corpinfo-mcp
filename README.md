<!-- mcp-name: io.github.opendata-kr/narajangteo-corpinfo -->

# narajangteo-corpinfo-mcp

[![npm version](https://img.shields.io/npm/v/@opendata-kr/narajangteo-corpinfo-mcp.svg)](https://www.npmjs.com/package/@opendata-kr/narajangteo-corpinfo-mcp)
[![license](https://img.shields.io/npm/l/@opendata-kr/narajangteo-corpinfo-mcp.svg)](./LICENSE)

나라장터 사용자정보서비스 Open API를 위한 로컬 MCP 서버

> [!NOTE]
> 이 README는 스캐폴딩 골격이다. 전체 클라이언트별 설정 매트릭스, 원클릭 설치 버튼, 인증키 발급 그림 가이드(`docs/service-key-guide.md`)는 발행 전 채운다(README 작성 표준 원형 A).

## Prerequisites

- Node.js 24+ (`.nvmrc` = `lts/krypton`)
- data.go.kr(공공데이터포털) **나라장터 사용자정보서비스** 활용신청 후 발급받은 **Decoding(원본) 인증키**. 발급 절차는 [`docs/service-key-guide.md`](./docs/service-key-guide.md) 참조.

## Configuration

MCP 클라이언트 설정에 아래 블록을 추가한다. `@latest`로 핀한다.

```json
{
  "mcpServers": {
    "narajangteo-corpinfo": {
      "command": "npx",
      "args": ["-y", "@opendata-kr/narajangteo-corpinfo-mcp@latest"],
      "env": {
        "DATA_GO_KR_SERVICE_KEY": "여기에_Decoding_인증키"
      }
    }
  }
}
```

> [!IMPORTANT]
> `DATA_GO_KR_SERVICE_KEY`는 필수 시크릿이다. 원클릭·env 미지원 클라이언트는 설치 후 셸 환경변수로 키를 설정한다.

## 환경변수

| 이름 | 필수 | 비밀 | 기본값 | 설명 |
|---|---|---|---|---|
| `DATA_GO_KR_SERVICE_KEY` | 예 | 예 | | 공공데이터포털 Decoding(원본) 인증키 |
| `DATA_GO_KR_BASE_URL` | 아니오 | 아니오 | `https://apis.data.go.kr` | 게이트웨이 base URL 오버라이드 |

## Tools

구현 예정(설계 확정 후 구현 계획에서 등록). 자세한 파라미터·응답 필드는 발행 전 문서화한다.

## 개발

```bash
nvm use
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

## License

MIT. [`LICENSE`](./LICENSE) 참조.

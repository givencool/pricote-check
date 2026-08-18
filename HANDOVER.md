# pricote - 프로젝트 인수인계 문서 (AI Handover Document)

> **이 문서는 다른 AI 어시스턴트(또는 개발자)가 이 프로젝트의 배경, 아키텍처, 핵심 제약 조건, 코드 구조를 즉시 파악하고 원활하게 이어서 작업할 수 있도록 작성된 인수인계 가이드입니다.**

---

## 1. 프로젝트 개요 및 핵심 철학

### 1.1 프로젝트 목표
- 백준 온라인 저지(BOJ) 스타일의 C++ 알고리즘 코딩테스트 문제를 개인이 직접 풀고 채점할 수 있는 **순수 클라이언트 기반 정적 웹 애플리케이션(SPA)**입니다.
- 정적 프론트엔드는 GitHub Pages로 배포되며, 실제 코드 컴파일 및 실행은 사용자가 개인 클라우드(Oracle Cloud Always Free 등)에 자체 구축한 **Piston** 또는 **Judge0 CE** 서버와 통신합니다.

### 1.2 ⚠️ 절대 원칙 및 설계 제약 조건 (Non-Negotiable Rules)
1. **문제 데이터 분리 (저작권 보호)**:
   - 레포지토리 및 배포 사이트에는 **어떠한 문제 데이터도 하드코딩되거나 저장되어서는 안 됩니다**.
   - 사용자가 로컬 기기에서 본인의 `.md` 문제 파일을 선택하면, 브라우저 메모리(`FileReader`) 내에서만 파싱되어 표시됩니다. (서버 전송/DB 저장 없음)
2. **자격 증명 노출 금지 (Public Repo 보안)**:
   - 채점 서버의 URL, 접근 토큰, API Key는 소스코드나 설정 파일에 절대 하드코딩하지 않습니다.
   - 사용자가 앱 상단의 설정(⚙️) 모달에서 직접 입력하며, 이 값은 사용자 브라우저의 `localStorage`(`mybac_judge_config`)에만 안전하게 저장됩니다.
3. **무서버/정적 웹앱 유지**:
   - 프론트엔드 자체를 위한 별도의 백엔드/DB/유료 서비스를 도입하지 않고, 순수 정적 웹(HTML/CSS/JS)으로 유지합니다.
4. **결과 데이터 로컬 저장**:
   - 채점 결과 및 제출 코드는 서버에 저장되지 않으며, [결과 내보내기] 버튼을 통해 브라우저에서 `result_{id}_{timestamp}.md` 형태의 로컬 마크다운 파일로 다운로드합니다.

---

## 2. 기술 스택 및 외부 라이브러리

- **Language & Runtime**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Hosting**: GitHub Pages (자동 배포: `.github/workflows/deploy.yml`)
- **Code Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/) (CDN - RequireJS AMD Loader 방식)
- **Parsers & Markdown**:
  - `js-yaml` (CDN): YAML Frontmatter 파싱
  - `marked.js` (CDN): 문제 마크다운 본문 HTML 렌더링
  - `DOMPurify` (CDN): 마크다운 렌더링 XSS 보안 살균
- **Grading Backend Engine**:
  - **Piston** (`POST /api/v2/execute`, `X-Grading-Token`) - 주 채점 엔진 (검증 완료)
  - **Judge0 CE** (`POST /submissions?base64_encoded=false&wait=true`, `X-Auth-Token`) - 대체 엔진

---

## 3. 디렉토리 및 파일별 역할 분석

```
pricote/
├── index.html                 # 메인 SPA 진입점 (설정 모달, 2분할 워크스페이스, 반응형 탭)
├── css/
│   └── main.css              # 다크/라이트 테마 변수, 모달, 뱃지, 반응형 분기 스타일
├── js/
│   ├── app.js                # 앱 오케스트레이터 (상태 관리, 이벤트 바인딩, 워크플로우 제어)
│   ├── judge-client.js       # Piston / Judge0 통합 채점 클라이언트 & 연결 테스트
│   ├── parser.js             # YAML Frontmatter + Markdown 본문 파서 (메모리 전용)
│   ├── editor.js             # Monaco Editor C++ 래퍼, 테마/폰트/단축키(Ctrl+Enter) 관리
│   └── exporter.js           # 결과 마크다운 리포트 생성 및 Blob 로컬 다운로더
├── sample_template/
│   └── example_problem.md    # 문제 작성 표준 템플릿 마크다운 파일
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Pages 정적 배포 워크플로우
├── .gitignore                 # problems/, *.local.json, .env 등 제외 규칙
├── LICENSE                    # MIT License
├── README.md                  # 사용자 및 서버 구축 가이드
└── HANDOVER.md                # (본 문서) 인수인계 가이드
```

### 3.1 모듈별 상세 역할

#### `js/judge-client.js`
- `JudgeClient.getConfig()` / `saveConfig(config)`: `localStorage`에서 서버 설정 조회 및 저장.
- `JudgeClient.testConnection(customConfig)`: 입력된 URL 및 토큰으로 ping/런타임 조회 테스트.
- `JudgeClient.execute(code, stdin)`: Piston 또는 Judge0로 비동기 POST 요청 전송.
- `JudgeClient.gradeTestcase(code, example)`: 예제 실행 후 `stdout`과 `expected`를 공백/개행 정규화(`compareOutput`)하여 채점 판정(`PASSED`, `WRONG_ANSWER`, `COMPILE_ERROR`, `RUNTIME_ERROR`, `TIME_LIMIT_EXCEEDED`, `AUTH_ERROR`).
- 401/403 상태 코드 수신 시 `isAuthError: true`로 분류하여 설정 확인 유도.

#### `js/parser.js`
- `ProblemParser.parse(rawText)`: 정규식으로 Frontmatter(`--- ... ---`)와 Markdown 본문을 분리.
- Frontmatter에서 `id`, `title`, `time_limit`, `memory_limit`, `difficulty`, `tags`, `examples` 파싱.
- 본문에 `## 예제 입력 1` / `## 예제 출력 1` 형태로 작성된 경우도 정규식 fallback으로 파싱 지원.
- `marked.parse` + `DOMPurify.sanitize`로 안전하게 HTML 변환.

#### `js/editor.js`
- AMD Loader(`require(['vs/editor/editor.main'])`)로 Monaco Editor 동적 초기화.
- C++ 빠른 입출력 보일러플레이트(`ios::sync_with_stdio(0); cin.tie(0);`) 기본 로드.
- `Ctrl + Enter` (Mac: `Cmd + Enter`) 실행 단축키 바인딩.
- 테마(`vs-dark` / `vs`) 및 폰트 크기 변경, 자동 `layout()` 리사이즈 지원.

#### `js/exporter.js`
- `ResultExporter.exportResult(problem, code, overallVerdict, results)`:
  - 문제 정보, 최종 판정, 각 테스트케이스별 실행 시간 및 에러 diff, 제출된 C++ 소스 코드를 마크다운으로 구성.
  - `Blob` 생성 후 `<a download="result_{id}_{timestamp}.md">`를 트리거하여 로컬 다운로드.

#### `js/app.js`
- 전체 애플리케이션의 이벤트 및 상태 중계기:
  - 다중 `.md` 파일 로드 및 상단 문제 전환 셀렉트 박스 관리.
  - 설정 모달 열기/닫기, 저장, 연결 테스트 UI 인터랙션.
  - HTTPS 환경에서 `http://` 입력 시 Mixed Content 실시간 경고 표시.
  - [채점 실행] 시 전체 테스트케이스 순차 채점 및 상태(AC, WA, CE 등) 실시간 렌더링.
  - [임의 입력 테스트] 탭의 커스텀 stdin 실행.

---

## 4. 문제 마크다운 표준 스펙

사용자가 로컬에서 불러오는 `.md` 파일의 표준 규격입니다:

```markdown
---
id: 1000
title: "A+B"
time_limit: "1초"
memory_limit: "256MB"
difficulty: "Bronze V"
tags: ["구현", "사칙연산", "수학"]
examples:
  - input: "1 2"
    output: "3"
  - input: "3 4"
    output: "7"
---
## 문제
두 정수 A와 B를 입력받은 다음, A+B를 출력하는 프로그램을 작성하시오.

## 입력
첫째 줄에 A와 B가 주어진다. (0 < A, B < 10)

## 출력
첫째 줄에 A+B를 출력한다.
```

---

## 5. 자체 호스팅 채점 서버 아키텍처

- **운영 환경**: Oracle Cloud Always Free (`VM.Standard.E2.1.Micro`, 1 OCPU, 1GB RAM)
- **실행 컨테이너**: Docker Compose 기반 Piston (`ghcr.io/engineer-man/piston`, 포트 2000)
- **HTTPS & 보안 프록시**: Caddy Reverse Proxy
  - Caddyfile에서 `X-Grading-Token` 헤더를 검증하여 토큰 없는 요청은 401 차단.
  - Let's Encrypt를 통해 `yourname.duckdns.org`에 자동 SSL/TLS 인증서 발급.

---

## 6. 향후 개선 및 확장 가능한 작업 (Roadmap / Next Steps)

다음 AI 어시스턴트가 추가 개발을 진행할 때 참고할 수 있는 유용한 아이디어 목록입니다:

1. **문제별 작성 코드 임시 보관 (Draft Auto-save)**:
   - 문제 전환 시 작성 중이던 코드가 사라지지 않도록 브라우저 `sessionStorage`에 문제 `id`별로 임시 보관하는 기능.
2. **커스텀 테스트케이스 추가/수정 UI**:
   - 기본 제공된 예제 외에 사용자가 직접 테스트케이스(입력/출력 쌍)를 추가하여 함께 채점할 수 있는 UI.
3. **수식 렌더링 지원 (KaTeX / MathJax)**:
   - 마크다운 본문에 `$O(N \log N)$` 등의 LaTeX 수식이 있을 경우 수식 렌더링.
4. **다중 언어 확장 (Python, Java, Rust 등)**:
   - 현재는 C++ 전용이나, 필요 시 언어 셀렉터를 추가하고 Piston/Judge0의 `language_id`와 Monaco 언어 모델을 동적으로 변경하는 확장.

---

## 7. 다음 AI 어시스턴트를 위한 작업 수칙

- **단순성 유지**: 복잡한 프레임워크(React, Next.js 등)로 불필요하게 전환하지 마시고, 가볍고 빠른 순수 정적 웹 구조를 유지하세요.
- **수술적 변경 (Surgical Change)**: 변경이 필요한 부분만 최소한으로 수정하고, 기존 스타일과 코드 컨벤션을 존중하세요.
- **보안 및 저작권 준수**: 레포지토리에 문제 데이터나 개인 서버 토큰이 하드코딩되지 않도록 주의하세요.

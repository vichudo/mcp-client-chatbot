# MCP Client Chatbot

[![Local First](https://img.shields.io/badge/Local-First-blueviolet)](#)
[![MCP Supported](https://img.shields.io/badge/MCP-Supported-00c853)](https://modelcontextprotocol.io/introduction)

**MCP Client Chatbot**은 [OpenAI](https://openai.com/), [Anthropic](https://www.anthropic.com/), [Google](https://ai.google.dev/), [Ollama](https://ollama.com/)와 같은 다양한 AI 모델 제공업체를 지원하는 다목적 채팅 인터페이스입니다. **복잡한 설정 없이 100% 로컬 환경에서 즉시 실행되도록 설계**되어 사용자가 개인 컴퓨터나 서버의 컴퓨팅 리소스를 완전히 제어할 수 있습니다.

> [Vercel AI SDK](https://sdk.vercel.ai)와 [Next.js](https://nextjs.org/)로 구축된 이 앱은 AI 채팅 인터페이스 구축을 위한 현대적인 패턴을 채택했습니다. [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction)의 강력한 기능을 활용하여 외부 도구를 채팅 경험에 원활하게 통합할 수 있습니다.

**🌟 오픈소스 프로젝트**
MCP Client Chatbot은 커뮤니티 주도의 100% 오픈소스 프로젝트입니다.

## 목차

- [MCP Client Chatbot](#mcp-client-chatbot)
  - [목차](#목차)
  - [데모](#데모)
    - [🧩 Playwright MCP를 통한 브라우저 자동화](#-playwright-mcp를-통한-브라우저-자동화)
    - [⚡️ 빠른 도구 언급 (`@`)](#️-빠른-도구-언급-)
    - [🔌 MCP 서버 쉽게 추가하기](#-mcp-서버-쉽게-추가하기)
    - [🛠️ 독립적인 도구 테스트](#️-독립적인-도구-테스트)
  - [✨ 주요 기능](#-주요-기능)
  - [🚀 시작하기](#-시작하기)
    - [환경 변수](#환경-변수)
    - [MCP 서버 설정](#mcp-서버-설정)
  - [💡 사용 사례](#-사용-사례)
  - [🗺️ 로드맵: 향후 기능](#️-로드맵-향후-기능)
  - [🙌 기여하기](#-기여하기)

---

## 데모

MCP Client Chatbot을 사용할 수 있는 몇 가지 빠른 예시입니다:

---

### 🧩 Playwright MCP를 통한 브라우저 자동화

![playwright-demo](./images/preview-1.gif)

**예시:** Microsoft의 [playwright-mcp](https://github.com/microsoft/playwright-mcp) 도구를 사용하여 웹 브라우저를 제어합니다.

샘플 프롬프트:

```prompt
GitHub로 이동하여 cgoinglove 프로필을 방문해주세요.
mcp-client-chatbot 프로젝트를 열어주세요.
그런 다음, README.md 파일을 클릭 하세요.
완료 후, 브라우저를 닫아주세요.
마지막으로, 패키지 설치 방법을 알려주세요.
```
---

### ⚡️ 빠른 도구 언급 (`@`)

![mention](https://github.com/user-attachments/assets/45d26beb-2143-4b29-b229-8ed2d765fe2b)

채팅 중에 `@도구이름`을 입력하여 등록된 MCP 도구를 빠르게 호출할 수 있습니다. 외울 필요 없이 `@`를 입력하고 목록에서 선택하세요!

---

### 🔌 MCP 서버 쉽게 추가하기

![mcp-server-install](https://github.com/user-attachments/assets/c71fd58d-b16e-4517-85b3-160685a88e38)

UI를 통해 새로운 MCP 서버를 쉽게 추가하고, 앱을 재시작하지 않고도 새로운 도구를 사용할 수 있습니다.

---

### 🛠️ 독립적인 도구 테스트

![tool-test](https://github.com/user-attachments/assets/980dd645-333f-4e5c-8ac9-3dc59db19e14)

더 쉬운 개발과 디버깅을 위해 채팅 세션과 독립적으로 MCP 도구를 테스트할 수 있습니다.

---

## ✨ 주요 기능

* **💻 100% 로컬 실행:** 복잡한 배포 없이 PC나 서버에서 직접 실행하여 컴퓨팅 리소스를 완전히 활용하고 제어합니다.
* **🤖 다중 AI 모델 지원:** OpenAI, Anthropic, Google AI, Ollama와 같은 제공업체 간에 유연하게 전환할 수 있습니다.
* **🛠️ 강력한 MCP 통합:** Model Context Protocol을 통해 외부 도구(브라우저 자동화, 데이터베이스 작업 등)를 채팅에 원활하게 연결합니다.
* **🚀 독립 도구 테스터:** 주 채팅 인터페이스와 별도로 MCP 도구를 테스트하고 디버깅할 수 있습니다.
* **💬 직관적인 멘션:** 입력 필드에서 `@`로 사용 가능한 도구를 트리거합니다.
* **⚙️ 쉬운 서버 설정:** UI 또는 `.mcp-config.json` 파일을 통해 MCP 연결을 구성합니다.
* **📄 마크다운 UI:** 깔끔하고 읽기 쉬운 마크다운 기반 인터페이스로 소통합니다.
* **💾 설정 필요 없는 로컬 DB:** 기본적으로 로컬 저장소로 SQLite를 사용합니다(PostgreSQL도 지원).
* **🧩 커스텀 MCP 서버 지원:** 내장된 MCP 서버 로직을 수정하거나 직접 만들 수 있습니다.

## 🚀 시작하기

이 프로젝트는 [pnpm](https://pnpm.io/)을 권장 패키지 매니저로 사용합니다.

```bash
# 1. 의존성 설치
pnpm i

# 2. 프로젝트 초기화(.env 생성, DB 설정)
pnpm initial

# 3. 개발 서버 시작
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 시작하세요.

-----

### 환경 변수

`pnpm initial` 명령은 `.env` 파일을 생성합니다. 여기에 API 키를 추가하세요:

```dotenv
GOOGLE_GENERATIVE_AI_API_KEY=****
OPENAI_API_KEY=****
# ANTHROPIC_API_KEY=****
```

SQLite가 기본 DB(`db.sqlite`)입니다. PostgreSQL을 사용하려면 `.env`에서 `USE_FILE_SYSTEM_DB=false`로 설정하고 `DATABASE_URL`을 정의하세요.

-----

### MCP 서버 설정

다음과 같은 방법으로 MCP 도구를 연결할 수 있습니다:

1. **UI 설정:** http://localhost:3000/mcp로 이동하여 인터페이스를 통해 구성합니다.
2. **직접 파일 편집:** 프로젝트 루트의 `.mcp-config.json`을 수정합니다.
3. **커스텀 로직:** `./custom-mcp-server/index.ts`를 편집하여 자체 로직을 구현합니다.

-----

## 💡 사용 사례

* [Supabase 통합](./docs/use-cases/supabase.md): MCP를 사용하여 Supabase DB, 인증 및 실시간 기능을 관리합니다.

-----

## 🗺️ 로드맵: 향후 기능

다음과 같은 계획된 기능으로 MCP Client Chatbot을 더욱 강력하게 만들고 있습니다:

* **🎨 캔버스 모드:** LLM + 사용자 협업을 위한 실시간 편집 인터페이스(예: 코드, 블로그).
* **🧩 LLM UI 생성:** LLM이 차트, 테이블, 양식을 동적으로 렌더링할 수 있게 합니다.
* **📜 규칙 엔진:** 세션 전체에 걸쳐 지속되는 시스템 프롬프트/규칙.
* **🖼️ 이미지 및 파일 업로드:** 업로드 및 이미지 생성을 통한 멀티모달 상호작용.
* **🐙 GitHub 마운팅:** 질문하고 코드 작업을 위해 로컬 GitHub 저장소를 마운트합니다.
* **📚 RAG 에이전트:** 자신의 문서를 사용한 검색 증강 생성(Retrieval-Augmented Generation).
* **🧠 계획 에이전트:** 복잡한 작업을 계획하고 실행하는 더 스마트한 에이전트.
* **🧑‍💻 에이전트 빌더:** 특정 목표를 위한 커스텀 AI 에이전트를 만드는 도구.

👉 전체 로드맵은 [ROADMAP.md](./docs/ROADMAP.md)에서 확인하세요.

-----

## 🙌 기여하기

모든 기여를 환영합니다! 버그 보고, 기능 아이디어, 코드 개선 - 모든 것이 최상의 로컬 AI 어시스턴트를 구축하는 데 도움이 됩니다.

함께 만들어 나갑시다 🚀
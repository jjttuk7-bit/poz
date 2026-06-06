---
name: pozi-openai-integration
description: POZI의 server.ts에서 OpenAI API 통합, 프롬프트 엔지니어링, Structured Outputs(json_schema), 멀티모달 이미지 입력, .env 키 관리 작업 시 반드시 사용. 현재 코드는 @google/genai(Gemini)지만 사용자는 OpenAI로 마이그레이션할 계획이므로 새 AI 기능, 프롬프트 개선, 응답 스키마 변경, Gemini→OpenAI 전환은 모두 이 스킬로 처리. "OpenAI API", "GPT-4o", "포즈 추출 프롬프트", "json_schema", "gemini 마이그레이션", "이미지 비전" 같은 표현은 이 스킬을 트리거한다. UI/화면 작업은 pozi-frontend-development 스킬을 사용할 것.
---

# POZI OpenAI Integration

POZI의 AI 백엔드는 Express 서버(`server.ts`) 안에 있다. 현재는 `@google/genai`의 Gemini로 이미지에서 PoseTemplate을 추출한다. 사용자는 OpenAI API로 전환할 계획이므로, 이 스킬은 **OpenAI 기반 설계를 기본**으로 한다.

## 빠른 컨텍스트

| 항목 | 값 |
|------|------|
| 서버 | Express 4 (`server.ts`) — 포트 3000 |
| 현재 SDK | `@google/genai` (`gemini-3.5-flash`) |
| 목표 SDK | `openai` (npm) — `gpt-4o`/`gpt-4o-mini` 이미지 입력 가능 모델 |
| 엔드포인트 | `POST /api/gemini/extract-pose` (마이그레이션 시 `/api/openai/extract-pose` 권장) |
| 인증 | `process.env.OPENAI_API_KEY` (또는 GEMINI_API_KEY 병행) |
| 페이로드 | base64 이미지, 최대 15mb (express.json limit) |
| 응답 스키마 | `src/types.ts`의 `PoseTemplate` (단일 진실) |

## OpenAI API 마이그레이션 청사진

### 1. 의존성 추가

```bash
npm install openai
```

`@google/genai`는 즉시 제거하지 말 것 — 사용자가 명시적으로 요청할 때만 교체, 그 전엔 병행 운영.

### 2. 클라이언트 초기화

```ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
```

`OPENAI_API_KEY`가 없으면 500 + 한국어 메시지. 키 자체는 로그/응답에 노출 금지.

### 3. Vision + Structured Outputs 호출

```ts
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${imageBase64}` }
        }
      ]
    }
  ],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "pose_template",
      strict: true,
      schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          overlayEmoji: { type: "string" },
          personCount: { type: "string", enum: ["1", "2", "group"] },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
          tags: { type: "array", items: { type: "string" } },
          guidePoints: { type: "array", items: { type: "string" } },
          tips: { type: "array", items: { type: "string" } },
          silhouettePath: { type: "string" }
        },
        required: ["name", "description", "overlayEmoji", "personCount", "difficulty", "tags", "guidePoints", "tips", "silhouettePath"],
        additionalProperties: false
      }
    }
  }
});

const text = response.choices[0]?.message?.content;
if (!text) throw new Error("Empty response from OpenAI");
const parsed = JSON.parse(text);
```

### 4. Structured Outputs strict 모드 규칙

OpenAI의 `strict: true`는 **모든 properties가 required**이고 **additionalProperties: false**여야 통과한다. PoseTemplate의 선택적 필드(`imageUrl?`, `silhouettePath?`)를 응답에 포함시키려면 required로 올리든가, 응답 스키마에서 빼고 서버에서 후처리.

### 5. Gemini → OpenAI 매핑 치트시트

| Gemini (`@google/genai`) | OpenAI (`openai`) |
|---|---|
| `ai.models.generateContent` | `openai.chat.completions.create` |
| `contents: { parts: [imagePart, promptPart] }` | `messages: [{ role: "user", content: [{type:"text",...}, {type:"image_url",...}] }]` |
| `inlineData: { mimeType, data }` | `image_url: { url: "data:image/jpeg;base64,..." }` |
| `responseMimeType: "application/json"` | `response_format: { type: "json_schema", ... }` |
| `responseSchema: { type: Type.OBJECT, ... }` | `json_schema: { name, strict, schema: { ... } }` |
| `Type.STRING/ARRAY/OBJECT` | `"type": "string"/"array"/"object"` |
| `response.text` | `response.choices[0].message.content` |
| `model: "gemini-3.5-flash"` | `model: "gpt-4o"` 또는 `"gpt-4o-mini"` |

### 6. 모델 선택 가이드

- **gpt-4o**: 이미지 이해 품질 최고, 비싸고 느림. 프로덕션 기본값
- **gpt-4o-mini**: 빠르고 저렴, 단순 포즈는 충분. 대량 처리 적합
- **gpt-3.5-turbo**: 비전 미지원, 사용 금지
- **gpt-4.1 / o1 계열**: 비전 지원 여부와 가격 확인 후 결정

## 프롬프트 설계 원칙

기존 server.ts의 프롬프트(라인 54-65 참조)는 다음 구조:

1. **분석 지시**: 인물, 방향, 제스처, 정렬 식별
2. **출력 형식 지정**: 필드별 구체 예시 + 한국어 출력
3. **silhouettePath 좌표계 명시**: (0,0,200,200) 박스, SVG `d` 속성 문법

이 구조를 유지하되, OpenAI에 옮길 때:
- `Type.STRING` 대신 JSON Schema `enum` 활용 — `personCount`, `difficulty`는 enum으로 좁히면 정확도 ↑
- 톤 가이드는 pose-curator에게 요청 (예: "트렌디한 한국어, MZ감성 키워드 활용")

## 보안 / 환경 변수

- `.env` 파일은 `.gitignore`되어야 함 (확인 후 누락 시 추가)
- `.env.example`을 만들어 키 이름만 노출 (값은 placeholder)
- 코드/로그/에러 응답에 키 절대 노출 금지
- `apiKey` 변수 console.log 금지 — 슬쩍이라도

## 에러 핸들링

| 상황 | 처리 |
|------|------|
| API 키 누락 | 500 + `"서버에 OPENAI_API_KEY가 설정되지 않았습니다."` |
| 429 rate limit | 1회 지수 backoff(1s) 후 재시도, 재실패 시 503 + `"잠시 후 다시 시도해주세요."` |
| 5xx OpenAI | 1회 재시도, 재실패 시 그대로 502 + 메시지 |
| 응답 JSON 파싱 실패 | 1회 재호출, 재실패 시 500 + `"AI 응답을 파싱하지 못했습니다."` |
| 이미지 누락 | 400 + `"이미지 데이터가 누락되었습니다."` (기존 로직 유지) |
| silhouettePath 유효성 | 응답 후 정규식 검사 — 시작 `M`, 허용 명령 `[MLHVCSQTAZmlhvcsqtaz0-9.,\- ]+`. 실패 시 빈 path로 폴백 |

## 점진적 마이그레이션 절차

사용자가 "OpenAI로 전환해줘" 요청 시:

1. `openai` 패키지 추가
2. 새 엔드포인트 `/api/openai/extract-pose` 추가 (기존 Gemini 엔드포인트는 보존)
3. 프론트엔드의 API 호출 URL 변경 여부 결정 — frontend-engineer와 SendMessage로 협의
4. 둘 다 동작 확인 후 사용자에게 "기존 Gemini 엔드포인트 제거할까요?" 확인
5. 승인 시 Gemini 엔드포인트 + `@google/genai` 의존성 제거

## 금지 사항

- ❌ 키를 코드에 하드코딩
- ❌ 응답에 키 또는 stack trace에 키 포함
- ❌ `gpt-3.5-turbo`로 이미지 입력 시도
- ❌ `src/types.ts` 임의 수정 — frontend-engineer와 협의
- ❌ `src/data.ts` 편집 — pose-curator의 영역
- ❌ UI 컴포넌트 편집 — frontend-engineer의 영역

## 검증

엔드포인트 변경 후 pozi-qa에게:
- 실제 base64 이미지로 curl/브라우저 호출
- 응답이 `PoseTemplate` shape과 일치
- silhouettePath SVG 유효성

이걸 요청한다.

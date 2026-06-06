---
name: pozi-verification
description: POZI의 변경 사항을 검증할 때 반드시 사용. npm run lint(tsc --noEmit) 실행, npm run dev 브라우저 실행 및 흐름 확인, server.ts↔types.ts↔data.ts↔컴포넌트 경계면 정합성 교차 비교, AI 엔드포인트 응답 shape 검증을 다룬다. 각 모듈 완성 직후 점진적으로 호출되며 전체 완성 후 1회가 아님. "검증", "타입체크", "lint", "동작 확인", "QA", "shape 비교" 같은 표현은 이 스킬을 트리거한다.
---

# POZI Verification

POZI의 QA는 단순 "파일 존재 확인"이 아니라 **경계면 교차 비교**가 핵심이다. 가장 흔한 버그는 server.ts 응답과 types.ts의 PoseTemplate, components의 prop, data.ts의 mockPoses 항목이 서로 어긋날 때 발생한다. 이 스킬은 그 어긋남을 잡는다.

## 검증 3단계

### 1. 정적 검증 (모든 변경 후 필수)

```bash
npm run lint
```

이건 `tsc --noEmit`이다. 통과해야 다음 단계로.

추가로:
- 변경된 타입이 `src/types.ts`에 있고 모든 consumer가 동기화되었는지 grep
- `mockPoses`의 각 항목이 PoseTemplate의 required 필드를 모두 가지는지

### 2. 경계면 교차 비교 (핵심)

**Pattern A — 서버 응답 ↔ 타입**:
- `server.ts`의 JSON schema (responseSchema 또는 json_schema)를 열고
- `src/types.ts`의 `PoseTemplate`을 동시에 열고
- 필드명 + 필드 타입 + required 여부를 양쪽 비교
- 불일치 발견 → 어느 쪽이 진실인지 확인 후 담당 에이전트에 라우팅

**Pattern B — 데이터 항목 ↔ 타입**:
- `src/data.ts`의 새 mockPoses 항목을 열고
- `PoseTemplate` 인터페이스와 비교
- 누락된 required 필드, 잘못된 타입, 잘못된 카테고리 enum 값을 찾기

**Pattern C — 컴포넌트 props ↔ 호출부**:
- 컴포넌트 파일의 props interface
- `App.tsx`의 호출부 (`<BrowseScreen ... />`)
- 양쪽 prop 이름과 타입 매칭 확인

**왜 한 파일씩 안 보는가**: 단일 파일 안에서는 tsc가 잡지만, 파일 간 인터페이스 불일치는 종종 타입이 너무 느슨하게 선언되어 통과한다. 사람 눈으로 양쪽을 비교해야 의도와 일치하는지 확인 가능.

### 3. 런타임 검증

#### UI 변경 시

```bash
npm run dev
```

`run_in_background: true`로 띄우고 (절대 foreground 금지), 핵심 흐름 확인:

- [ ] http://localhost:3000 응답 200
- [ ] BrowseScreen 카테고리 필터 동작 (전체/트렌딩/커플/솔로/그룹)
- [ ] 포즈 카드 클릭 → DetailScreen 진입, 가이드 표시
- [ ] DetailScreen "카메라" 버튼 → CameraScreen 진입, 권한 프롬프트
- [ ] 카메라 화면에 실루엣 SVG 오버레이 표시
- [ ] 캡처 후 ResultScreen에 사진 표시
- [ ] favorites 토글 후 새로고침 시 유지 (localStorage `pozi_favorites`)
- [ ] custom pose 추가 후 새로고침 시 유지 (`pozi_custom_poses`)

자동화 환경에서 카메라 권한이 안 잡히는 부분은 "수동 검증 필요"로 명시 후 패스.

#### AI 엔드포인트 변경 시

```bash
curl -X POST http://localhost:3000/api/gemini/extract-pose \
  -H "Content-Type: application/json" \
  -d '{"imageBase64":"<test image base64>","mimeType":"image/jpeg"}'
```

(OpenAI 마이그레이션 시 엔드포인트 URL 변경)

응답 검증:
- [ ] HTTP 200
- [ ] JSON 파싱 가능
- [ ] `PoseTemplate`의 required 필드가 모두 존재
- [ ] `personCount` 값이 `"1" | "2" | "group"`
- [ ] `difficulty` 값이 `"easy" | "medium" | "hard"`
- [ ] `silhouettePath`가 `M`으로 시작하는 유효 SVG 문자열
- [ ] `tags`/`guidePoints`/`tips` 배열 길이가 프롬프트 명세에 맞는지

## 보고 포맷

### 통과
```
[QA OK] {모듈명}: 통과
- 정적: npm run lint 통과
- 경계면: server.ts ↔ PoseTemplate 일치, App.tsx ↔ BrowseScreen props 일치
- 런타임: browse → detail → camera 흐름 동작 확인
```

### 실패
```
[QA FAIL] {모듈명}: {문제 요약}
재현: {절차 — 1줄씩}
관측: {정확한 에러 메시지 또는 동작 차이}
파일: {경로}:{라인}
라우팅: {frontend-engineer | openai-integration-engineer | pose-curator}
근거: {왜 이 에이전트인지}
```

## 점진적 검증 패턴

전체 완성 후 1회 검증하는 게 아니다. 각 에이전트가 모듈 단위로 완성하면 **즉시** 그 부분만 검증한다.

예시 흐름:
1. pose-curator가 새 포즈 3개 추가 → **즉시 검증**: PoseTemplate shape, id 중복, SVG 유효성
2. frontend-engineer가 카테고리 필터 UI 수정 → **즉시 검증**: lint + 브라우저 흐름
3. openai-integration-engineer가 OpenAI 엔드포인트 추가 → **즉시 검증**: 엔드포인트 호출, shape 비교
4. 모두 끝난 뒤 통합 흐름 1회 추가 검증

이 패턴의 이유: 마지막에 모아서 보면 어느 변경이 깬 건지 추적 어렵다. 모듈 직후 검증해야 회귀를 빨리 잡는다.

## 자동 검증 vs 수동 검증

자동:
- npm run lint
- 파일 비교 (Read + 시각적 비교)
- curl 호출 + JSON 검증

수동 안내가 필요한 경우:
- 카메라 권한 (자동화 환경에서 잡기 어려움)
- 모바일 디바이스 실제 동작
- AI 응답의 의미적 품질 (한국어 톤이 자연스러운가)

수동 항목은 보고서에 "수동 검증 권장:" 섹션으로 분리.

## 금지 사항

- ❌ 코드 직접 수정 — QA는 라우팅만, 수정은 담당 에이전트
- ❌ `npm run dev` foreground 실행 — 반드시 background
- ❌ "동작 안 됨" 같은 모호한 보고
- ❌ 정적 검증 건너뛰고 런타임만 보기 (또는 그 반대)
- ❌ 경계면 비교 생략 (가장 흔한 버그 원천)

## 검증 환경 준비

처음 검증 시 환경 확인:
```bash
ls node_modules > /dev/null 2>&1 || npm install
test -f .env || echo "WARNING: .env 누락 — API 호출 불가"
```

`.env`가 없으면 AI 엔드포인트 검증은 skip하고 정적 검증 + UI 흐름만 수행.

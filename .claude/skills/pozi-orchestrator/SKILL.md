---
name: pozi-orchestrator
description: POZI(포즈 가이드 모바일 웹앱) 작업을 다중 에이전트 팀으로 조율할 때 반드시 사용. "POZI [무엇] 추가/수정/개선", "포즈 카테고리 추가", "새 화면 추가", "Gemini를 OpenAI로 마이그레이션", "포즈 데이터 큐레이션", "UI 폴리시", "AI 프롬프트 개선", "카메라 화면 개선", "검증/QA"를 포함한 요청 시 트리거. 후속 작업("다시 실행", "재실행", "이전 결과 개선", "수정", "보완", "[부분]만 다시")도 이 스킬로 처리. 단순 단일 파일 수정이나 질문은 이 오케스트레이터를 거치지 않고 직접 응답 가능.
---

# POZI Orchestrator

POZI 작업을 4인 에이전트 팀으로 조율하는 오케스트레이터다. **에이전트 팀 모드**가 기본 실행 모드이며, Phase별 작업 흐름과 에이전트 간 통신 프로토콜을 정의한다.

## 팀 구성

| 에이전트 | 정의 파일 | 책임 영역 |
|----------|----------|----------|
| `frontend-engineer` | `.claude/agents/frontend-engineer.md` | React/TS UI, 화면, 컴포넌트, 상태, localStorage, 카메라 |
| `openai-integration-engineer` | `.claude/agents/openai-integration-engineer.md` | server.ts, OpenAI/Gemini API, 프롬프트, JSON schema |
| `pose-curator` | `.claude/agents/pose-curator.md` | data.ts, 한국어 카피, SVG silhouettePath, 카테고리 |
| `pozi-qa` | `.claude/agents/pozi-qa.md` | 경계면 정합성, lint, 브라우저 검증, AI 응답 검증 |

모든 에이전트는 `general-purpose` 타입, `model: opus`.

## 실행 모드

- **기본**: 에이전트 팀 (TeamCreate + TaskCreate + SendMessage)
- **단순 단일 영역 작업**: 해당 에이전트 1명만 Agent 도구로 직접 호출 (서브 모드)

## Phase 0: 컨텍스트 확인 (모든 실행 시작)

작업 시작 전 다음을 확인하여 실행 모드 결정:

1. **`pozi/_workspace/` 존재 여부 확인**
   ```
   ls pozi/_workspace/ 2>&1
   ```
2. **모드 분기**:
   - `_workspace/` 없음 → **초기 실행** (Phase 1부터)
   - `_workspace/` 있음 + 사용자가 부분 수정 요청 → **부분 재실행** (해당 에이전트만 호출, 이전 산출물 유지)
   - `_workspace/` 있음 + 사용자가 새 입력 제공 → **새 실행** (`_workspace/`를 `_workspace_prev/`로 이동 후 Phase 1)

3. **`.env` 확인** (AI 작업 시):
   - `OPENAI_API_KEY` 또는 `GEMINI_API_KEY` 존재 여부 확인
   - 누락 시 사용자에게 알리고 진행 여부 확인

## Phase 1: 요구사항 분석 및 작업 분해

오케스트레이터(메인)가 직접 수행:

1. 사용자 요청을 읽고 영향 영역 식별:
   - **UI 변경**: frontend-engineer
   - **AI/서버 변경**: openai-integration-engineer
   - **포즈 데이터 변경**: pose-curator
   - **여러 영역 교차**: 팀 협업 필요

2. **단일 영역인가?** → 서브 모드로 해당 에이전트 1명 직접 호출, Phase 5로 이동
3. **2개 이상 영역?** → 팀 모드로 Phase 2 진행

## Phase 2: 팀 구성 및 작업 할당

**실행 모드:** 에이전트 팀

1. `TeamCreate`로 팀 구성. 영향 영역 + `pozi-qa`를 포함:
   ```
   team_name: "pozi-dev-team"
   members: [frontend-engineer, openai-integration-engineer, pose-curator, pozi-qa]
   ```
   *영향 없는 에이전트는 제외 가능 — 예: UI만 바뀌면 pose-curator 제외*

2. `TaskCreate`로 작업 분해:
   - 각 작업은 한 에이전트가 소유
   - 의존성을 `addBlockedBy`로 명시 (예: 타입 변경 → 데이터 동기화 → UI 사용)
   - QA 작업은 각 작업 완료에 의존시켜 점진적 검증

3. 일반적인 작업 의존성 패턴:
   ```
   [타입 정의 수정 (frontend-engineer)] 
     ↓ blocks
   [데이터 동기화 (pose-curator)] + [API 스키마 동기화 (openai-engineer)]
     ↓ blocks
   [UI 사용 (frontend-engineer)]
     ↓ blocks
   [통합 검증 (pozi-qa)]
   ```

## Phase 3: 협업 실행

팀원들이 자체 조율:

- **SendMessage**: 한 에이전트가 다른 에이전트에게 요청/통보
  - 예: pose-curator → frontend-engineer: "PoseTemplate에 X 필드 추가 필요"
- **TaskUpdate**: 작업 상태 갱신 (pending → in_progress → completed)
- **파일 기반 산출물**: 코드 변경은 직접 파일에 반영. 중간 산출물은 `_workspace/`에

오케스트레이터는 모니터링만:
- `TaskList`로 진행 상황 주기적 확인
- 작업 정체 시(작업이 in_progress 상태로 오래) 해당 에이전트에 SendMessage로 상태 확인
- 충돌 발생 시 (두 에이전트가 같은 파일 동시 편집) 조정

## Phase 4: 점진적 검증

각 작업 완료 직후 `pozi-qa` 호출:

- **단일 모듈 완성 시**: 해당 모듈만 검증
- **여러 모듈 완성 시**: 경계면 교차 비교 우선

pozi-qa가 실패 보고 시:
- 오케스트레이터가 라우팅 정보(`라우팅: {에이전트}`)를 읽고 해당 에이전트에 작업 재할당
- 1회 재시도 후 재실패 시 사용자에게 보고

## Phase 5: 최종 통합 및 보고

1. 모든 작업 completed 확인
2. 통합 흐름 1회 추가 검증 (pozi-qa)
3. `_workspace/` 안의 중간 산출물 정리 (남길 것 + 폐기할 것)
4. 사용자에게 결과 요약:
   - 변경된 파일 목록
   - 추가/변경된 기능
   - 검증 결과
   - 알려진 제약 (예: 카메라 권한 수동 테스트 필요)

## Phase 6: 피드백 수집 및 진화

작업 완료 후 사용자에게:
> "결과에서 개선할 부분이 있나요? 에이전트 구성이나 워크플로우에 바꾸고 싶은 점이 있나요?"

피드백 유형에 따라:
| 피드백 | 수정 대상 |
|--------|----------|
| 결과물 품질 | 해당 에이전트의 스킬 |
| 에이전트 역할 | 에이전트 정의 `.md` |
| 워크플로우 순서 | 이 오케스트레이터 스킬 |
| 트리거 누락 | 스킬 description |

모든 변경은 `pozi/CLAUDE.md`의 변경 이력 테이블에 기록.

## 데이터 전달 프로토콜

| 전략 | 방식 | 적용 |
|------|------|------|
| 태스크 기반 | `TaskCreate`/`TaskUpdate` | 작업 조율, 의존성 관리 |
| 메시지 기반 | `SendMessage` | 실시간 통보 (타입 변경, API 변경) |
| 파일 기반 | `_workspace/` 폴더 | 중간 산출물 |
| 코드 직접 | 실제 파일 편집 | 최종 결과물 |

**`_workspace/` 파일명 컨벤션**: `{phase}_{agent}_{artifact}.{ext}`
- 예: `01_pose-curator_summer-poses.md`, `02_openai-engineer_prompt-v2.md`

## 에러 핸들링

| 에러 유형 | 처리 |
|---------|------|
| 에이전트 응답 없음 | SendMessage로 ping. 2회 무응답 시 사용자에 보고 |
| 작업 결과 누락 | 1회 재시도, 재실패 시 그 부분 누락 명시하고 진행 |
| 에이전트 간 충돌 (같은 파일 동시 편집) | 한쪽 결과 채택 + 다른쪽에 재작업 요청 |
| QA 실패 반복 (3회) | 사용자에게 보고, 작업 중단 |
| 사용자 입력 부족 | AskUserQuestion으로 요청 |

상충 데이터가 있을 때: 삭제하지 않고 출처 병기하여 사용자에게 결정 위임.

## 트리거 예시

### Should trigger (이 오케스트레이터 사용)

- "POZI에 운동 포즈 카테고리 추가해줘" — 데이터 + 타입 + UI 교차
- "Gemini를 OpenAI로 전환해줘" — 서버 + 의존성 + 검증
- "포즈 추출 프롬프트를 더 한국어답게 다듬어줘" — AI + 콘텐츠 톤
- "여름 포즈 5개 추가해줘" — 데이터 (단일이라도 검증 흐름 필요)
- "검증해줘" / "QA 돌려줘"
- "이전 작업 다시 실행해줘" / "포즈 카피만 다시 다듬어줘"

### Should NOT trigger (직접 응답 또는 다른 도구)

- "POZI가 뭐야?" — 단순 질문, 직접 응답
- "이 파일 보여줘" — Read 도구로 직접
- "package.json의 dependencies 알려줘" — Read로 직접
- "data.ts에 있는 포즈 개수" — Grep으로 직접

경계 케이스: 단일 영역 변경이라도 사용자가 "에이전트 팀으로 진행해줘"라고 명시하면 팀 모드 사용.

## 후속 작업 키워드

description에 포함된 후속 키워드:
- "다시 실행", "재실행", "업데이트", "수정", "보완"
- "[부분]만 다시", "이전 결과 기반", "결과 개선"

이런 표현 감지 시 Phase 0의 컨텍스트 확인에서 `_workspace/` 검사 후 부분 재실행 또는 새 실행 결정.

## 테스트 시나리오

### 정상 흐름: "여름 트렌딩 포즈 3개 추가"
1. Phase 0: `_workspace/` 없음 → 초기 실행
2. Phase 1: 데이터 변경 + 카테고리 확인 → pose-curator + frontend-engineer 영향, pozi-qa 검증
3. Phase 2: 팀 구성 (pose-curator, frontend-engineer, pozi-qa)
4. 작업:
   - T1: pose-curator가 3개 PoseTemplate 작성 (data.ts)
   - T2: frontend-engineer가 BrowseScreen에서 트렌딩 필터 동작 확인 (코드 변경 거의 없음)
   - T3: pozi-qa가 새 항목 PoseTemplate shape 검증 + 브라우저 흐름 확인
5. Phase 5: 보고

### 에러 흐름: OpenAI 전환 중 응답 스키마 불일치
1. openai-integration-engineer가 새 엔드포인트 작성 (server.ts)
2. pozi-qa 검증 → server.ts 응답에 `imageUrl` 없는데 frontend-engineer가 사용 → FAIL
3. pozi-qa가 라우팅: openai-integration-engineer
4. openai-integration-engineer가 `imageUrl` 옵셔널 처리 또는 응답 후처리로 채움
5. 재검증 → 통과

## 금지 사항

- ❌ 에이전트가 자기 영역 밖 파일 직접 편집 (예: pose-curator가 server.ts 편집)
- ❌ pozi-qa가 코드 수정 (라우팅만)
- ❌ 전체 완성 후 1회 QA — 점진적 검증 원칙 위반
- ❌ `_workspace/`를 사용자에게 보이는 최종 산출물에 포함
- ❌ Agent 호출 시 `model: "opus"` 누락

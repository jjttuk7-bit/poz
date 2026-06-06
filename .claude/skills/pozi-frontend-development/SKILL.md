---
name: pozi-frontend-development
description: POZI 앱의 React 19 + TypeScript + Vite + Tailwind v4 프론트엔드 개발 시 반드시 사용. 화면(BrowseScreen/DetailScreen/CameraScreen/ResultScreen/MobileFrame) 추가/수정, 새 컴포넌트, useState 상태, localStorage 영속화, motion 애니메이션, lucide-react 아이콘, navigator.mediaDevices 카메라 통합, canvas 이미지 캡처, TypeScript 타입 추가/변경 시 사용. "POZI UI", "포즈 화면", "카메라 컴포넌트", "favorites/custom poses 상태" 같은 표현은 이 스킬을 트리거한다. 서버/API/프롬프트 작업은 pozi-openai-integration 스킬을 사용할 것.
---

# POZI Frontend Development

POZI는 한국어 포즈 가이드 모바일 웹앱이다. 사용자는 카테고리에서 포즈를 고르고 → 디테일에서 가이드 확인 → 카메라 화면에서 SVG 실루엣 오버레이를 보며 촬영 → 결과를 본다. 이 스킬은 그 흐름의 모든 UI 작업을 다룬다.

## 빠른 컨텍스트

| 항목 | 위치 |
|------|------|
| 엔트리 | `src/main.tsx` → `src/App.tsx` |
| 화면 | `src/components/{BrowseScreen,DetailScreen,CameraScreen,ResultScreen,MobileFrame}.tsx` |
| 타입 (단일 진실) | `src/types.ts` |
| 포즈 데이터 | `src/data.ts` — `mockPoses`, `PoseCategoriesList` |
| 스타일 | Tailwind v4 (`src/index.css`) |
| 모션 | `motion` 패키지 |
| 아이콘 | `lucide-react` |
| 영속성 | `localStorage` — 키 `pozi_favorites`, `pozi_custom_poses` |
| Dev | `npm run dev` → http://localhost:3000 |

## 작업 원칙

### 1. 타입은 단일 진실에서만 정의

`PoseTemplate`, `PoseCategory`, `PoseDifficulty`, `ScreenState`, `CaptureResult`는 모두 `src/types.ts`에만 있다. 컴포넌트 안에서 다시 정의하거나 인라인 타입으로 위장하지 말 것. **이유**: 백엔드(server.ts)의 응답 스키마와 데이터(data.ts)와 화면이 모두 같은 인터페이스를 공유해야 경계면 버그가 안 생긴다.

타입을 바꿔야 한다면:
1. `src/types.ts`만 수정
2. 모든 consumer(App.tsx, components/*, data.ts) 확인
3. `pose-curator`와 `openai-integration-engineer`에게 SendMessage로 통보 — 그들도 동기화해야 함

### 2. 화면 라우팅은 App.tsx의 useState로

```ts
const [screen, setScreen] = useState<ScreenState>('browse');
```

이게 라우터다. React Router 도입 금지. 새 화면을 추가하려면:
1. `ScreenState`에 새 값 추가 (types.ts)
2. `App.tsx`의 `renderScreen()` switch에 case 추가
3. 화면 전환 handler를 App.tsx에 추가 (예: `handleStartCamera`)
4. 자식 컴포넌트에 prop으로 핸들러 전달

### 3. localStorage 영속화 패턴

```ts
useEffect(() => {
  try {
    const saved = localStorage.getItem('pozi_xxx');
    if (saved) setXxx(JSON.parse(saved));
  } catch (e) {
    console.warn('LocalStorage load failed:', e);
  }
}, []);

// 저장 시
try {
  localStorage.setItem('pozi_xxx', JSON.stringify(updated));
} catch (err) {
  console.warn('LocalStorage save failed:', err);
}
```

이 try/catch 패턴을 유지하는 이유: iOS Safari 프라이빗 모드, 용량 초과(QuotaExceededError) 등 실패가 잦은 환경이라 silent fallback이 필요하다. throw하면 앱 전체가 멈춘다.

### 4. 카메라/Canvas 패턴

`CameraScreen.tsx`의 기존 패턴 준수:
- `navigator.mediaDevices.getUserMedia({ video: { facingMode: ... } })`
- 권한 거부 시 사용자 친화 한국어 안내 UI (alert 금지)
- 캡처: 비디오 → canvas drawImage → `canvas.toDataURL('image/jpeg', 0.9)` → base64 dataURL
- 스트림 정리: 화면 이탈 시 `track.stop()` 호출

### 5. 모바일 퍼스트 viewport

`MobileFrame`이 약 390x844px(아이폰 14 Pro) 비율을 강제한다. 새 화면은 이 좁은 viewport에 맞춰 설계. 데스크탑 큰 화면 패턴(2-column, sidebar) 금지.

### 6. 디자인 토큰

- Tailwind 유틸리티 클래스 인라인 사용. CSS 모듈/styled-components 도입 금지
- 동적 색상은 데이터 필드(`thumbnailColor: 'linear-gradient(...)'`)로만 — 코드에 hex 인라인 작성 금지
- 다크 모드는 현재 미지원 — `dark:` 클래스 사용 금지

## 작업 흐름

### 새 기능/화면 추가 시

1. **타입 확장 우선**: 새 필드/상태 필요 시 `src/types.ts` 먼저 수정
2. **데이터 정합 확인**: `mockPoses`가 새 타입과 맞는지 확인. 불일치면 pose-curator에게 라우팅
3. **컴포넌트 추가/수정**: `src/components/` 아래에 PascalCase 파일명으로
4. **App.tsx 통합**: screen state, handlers, prop 전달
5. **즉시 검증 요청**: pozi-qa에게 "검증 부탁" — 전체 완성 후가 아니라 모듈 단위로

### 기존 화면 수정 시

1. 해당 컴포넌트 파일만 수정
2. props가 바뀌면 App.tsx 호출부도 함께
3. 부수 영향 (다른 컴포넌트에 같은 prop 사용 여부) 확인

## 자주 막히는 경계면

- **server.ts 응답 ↔ PoseTemplate**: 서버가 새 필드 추가했는데 타입에 반영 안 됨 → 화면에서 `undefined` 접근
- **App.tsx ↔ 자식 컴포넌트 props**: handler 시그니처 변경 시 한쪽만 업데이트
- **mockPoses 항목 누락 필드**: required 필드 안 채우면 런타임에 `undefined.length` 같은 에러

이 셋은 `npm run lint`(tsc --noEmit)로 대부분 잡힌다. 작업 후 항상 실행.

## 금지 사항

- ❌ `any` 타입 사용
- ❌ React Router, Zustand, Redux 같은 라이브러리 추가 (현재 스택 유지)
- ❌ Next.js 패턴 (서버 컴포넌트, `use client` 디렉티브)
- ❌ alert/confirm 사용 (커스텀 UI로 대체)
- ❌ data.ts의 mockPoses 직접 편집 — pose-curator의 영역
- ❌ server.ts 편집 — openai-integration-engineer의 영역

## 검증

작업 완료 시 `npm run lint` 통과 + pozi-qa에게 점진적 검증 요청. UI 변경이면 npm run dev 띄워 브라우저로 흐름 확인.

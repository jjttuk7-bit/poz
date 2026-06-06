---
name: pozi-pose-content
description: POZI의 src/data.ts에서 PoseTemplate 항목 추가/수정, 한국어 카피(name/description/guidePoints/tips/tags) 작성, SVG silhouettePath 디자인, 카테고리(커플/솔로/그룹/여행/트렌딩) 큐레이션 작업 시 반드시 사용. "포즈 추가", "여름 포즈", "커플 포즈 보강", "실루엣 SVG", "포즈 카테고리", "한국어 카피 톤" 같은 표현은 이 스킬을 트리거한다. AI 프롬프트의 한국어 톤 가이드를 openai-integration-engineer에게 제공할 때도 사용.
---

# POZI Pose Content Curation

POZI의 포즈 라이브러리는 `src/data.ts`의 `mockPoses` 배열이다. 이 스킬은 새 포즈 추가, 카피 다듬기, SVG 실루엣 디자인을 담당한다.

## 빠른 컨텍스트

| 항목 | 위치 |
|------|------|
| 데이터 | `src/data.ts` — `mockPoses`, `PoseCategoriesList` |
| 타입 (참조 전용) | `src/types.ts` — `PoseTemplate`, `PoseCategory`, `PoseDifficulty`, `PersonCount` |
| 카테고리 | `couples`, `solo`, `group`, `travel`, `trending` |

## PoseTemplate 필드 작성 가이드

```ts
{
  id: 'category-NN',                        // 예: 'couple-03'
  name: '한 손 커피 일상 포즈',                  // 트렌디 한국어 8-14자
  category: 'solo',
  tags: ['셀카', '카페소품', 'MZ감성', '일상'], // 3-4개
  thumbnailColor: 'linear-gradient(135deg, #A88BEB 0%, #F1A7F1 100%)',
  overlayEmoji: '☕',                         // 1개, 포즈 대표 이모지
  personCount: 1,                            // 1 | 2 | 'group'
  difficulty: 'easy',                        // 'easy' | 'medium' | 'hard'
  popularity: 88,                            // 신규는 80-92
  description: '...',                        // 1-2 문장, 시각 각도/감정/소품
  guidePoints: ['...', '...'],               // 2-3개 명령형 정렬 가이드
  tips: ['...'],                             // 1-2개 촬영 환경/장비 팁
  silhouettePath: 'M 100,45 A 15,15 ...',   // (0,0,200,200) SVG path
  imageUrl: 'https://images.unsplash.com/...'  // 합법 무료 출처
}
```

## 한국어 카피 톤 원칙

### name (이름)
- 트렌디 키워드 + 동작 결합
- 예시: "어깨동무 볼 맞댐샷", "턱 괴고 윙크 바이브", "바다 향해 달리는 뒷모습", "시크한 기둥 기대기"
- 금지: 과한 외래어("쿨한 시밀러"), 영어만 ("Aesthetic Pose"), 너무 평범("기본 포즈")

### description
- 1-2 문장. 시각적 각도 + 감정 + 소품을 균형
- 예: "테이블에 한 손을 걸치고 자연스럽게 턱을 괴며 윙크를 건네는 싱그러운 감성의 단독 셀피 포즈입니다."
- 금지: 영어 직역체 ("이것은 ~한 포즈입니다"), 너무 추상적("멋진 분위기")

### guidePoints
- 명령형 종결("~하세요", "~합니다")
- 신체 정렬 기준 구체화: 어깨선/수직선/3분할/황금분할/머리 각도
- 예: "어깨선 높이가 수평을 이뤄야 잘 어울립니다.", "몸이 살짝 왼쪽으로 치우쳐 3분의 1 황금 분할을 지킵니다."
- 2-3개. 너무 많으면 사용자가 못 따라옴

### tips
- 촬영 환경(광각/역광/시간대/소품)이나 결과 효과 강조
- 예: "광각 카메라 모드로 세로 구도를 길게 잡아주시면 다리가 한층 더 길어 보이는 효과가 있습니다."
- 1-2개. 핵심 한 가지면 충분

### tags
- 3-4개. 인스타/유튜브에서 실제 검색되는 키워드
- 예: ['커플', '데이트', '밀착', '스냅'], ['셀카', '러블리', '정방형', '클로즈업']
- 카테고리 라벨과 중복 피함

## SVG silhouettePath 디자인 가이드

### 좌표계
- ViewBox: `0 0 200 200`
- 모든 좌표는 0-200 사이 정수 또는 소수점 1자리
- 화면 위쪽(y 작음)에 머리, 아래(y 큼)에 다리

### 표준 구성 요소

**머리 (원)**:
```
M cx,cy A r,r 0 1,1 cx+0.01,cy
```
예: `M 100,45 A 15,15 0 1,1 100,75` — 중심 (100, 60), 반지름 15

**목/척추 (직선)**:
```
M x,y L x',y'
```

**팔/다리 (직선 또는 곡선)**:
- 직선: `L`
- 부드러운 곡선: `Q control_x,control_y end_x,end_y`

**여러 stroke 합치기**:
하나의 path 문자열 안에 `M` 명령으로 새 시작점 지정. 예: 머리 + 척추 + 양팔 + 양다리는 모두 하나의 string.

### 복잡도 가이드

- 너무 단순(머리+막대): 사용자가 포즈 파악 어려움
- 너무 복잡(손가락/얼굴): 카메라 오버레이에서 노이즈됨
- 적정선: 머리 + 척추 + 어깨선 + 양팔 + 양다리 (5-7개 stroke)

### 검증

작성 후 자체 확인:
- [ ] viewBox 0-200 범위 안
- [ ] 명령 문자는 `M/L/H/V/C/S/Q/T/A/Z` (대/소문자) 만 사용
- [ ] 좌표 사이는 공백 또는 쉼표
- [ ] 모든 좌표가 숫자 (NaN, undefined 없음)
- [ ] (선택) 브라우저에서 `<path d="...">` 렌더 후 모양 확인

## id 컨벤션

- `{category}-{NN}` — 예: `couple-03`, `solo-07`, `travel-12`
- 카테고리별로 2자리 순번. 100을 넘으면 3자리
- 기존 mockPoses에 사용된 id와 중복 금지 — 추가 전에 grep으로 확인

## 카테고리 분포 유지

신규 포즈를 한 카테고리에 몰지 말 것. 사용자 요청이 "트렌딩 포즈 5개"라도 한 카테고리만 채우는 게 명시적 요구가 아니면 분포를 본다.

`PoseCategoriesList`(data.ts 상단)에 새 카테고리를 추가하려면:
1. `PoseCategory` 타입(types.ts)에 새 리터럴 추가 — **frontend-engineer에게 SendMessage 필수**
2. `PoseCategoriesList`에 `{ id, label }` 추가 (이모지 + 한글)
3. 새 카테고리 포즈 최소 2-3개 함께 추가 (빈 카테고리 금지)

## 이미지 URL 정책

- Unsplash, Pexels, Pixabay 같은 무료 라이선스 사이트만
- 라이선스 불확실(개인 블로그, 인스타) 절대 금지
- URL에 `?auto=format&fit=crop&q=80&w=600` 같은 파라미터로 리사이즈
- imageUrl이 비어도 됨 (PoseTemplate의 imageUrl은 `?` 선택적). 단, 트렌딩 포즈는 가급적 채움

## AI 프롬프트 톤 가이드 (openai-integration-engineer 협업)

`server.ts`의 LLM 프롬프트가 한국어 카피를 생성할 때 위 원칙을 따르도록 지시문을 다듬는다.

`openai-integration-engineer`에게 SendMessage로 전달할 카피 가이드 예시:

> 프롬프트에 다음 톤 기준을 추가해주세요:
> - name: 트렌디 한국어 키워드(MZ감성/카페소품/시크/일상) + 동작 결합, 8-14자
> - guidePoints: 명령형 종결("~하세요"), 신체 정렬 기준(어깨선/수직/3분할) 구체화
> - tips: 촬영 환경(광각/역광/시간대) 강조
> - 영어 직역체("이것은 ~한 포즈입니다") 금지

## 금지 사항

- ❌ `src/types.ts` 임의 수정 — frontend-engineer 영역
- ❌ 컴포넌트/server.ts 편집
- ❌ 라이선스 불확실 이미지 URL 사용
- ❌ 영어만으로 카피 작성
- ❌ required 필드 누락된 PoseTemplate 항목

## 검증

데이터 추가/수정 후 pozi-qa에게:
- 모든 새 항목이 `PoseTemplate` 인터페이스의 required 필드를 가지는지
- silhouettePath가 유효한 SVG인지
- 카테고리 값이 `PoseCategory` 리터럴에 있는지

이걸 요청한다.

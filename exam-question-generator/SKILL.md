---
name: exam-question-generator
description: 수능·모의평가형 직업탐구 문항(공업 일반, 성공적인 직업생활)을 참조 문항 없이 새로 출제하고 정답을 모르는 상태로 다시 풀어 검토한 뒤 시험지(JSON·Markdown)로 내보낸다. "성직 15~17단원 상 난이도 5문항 만들어줘", "공일 7단원 계산 문제 출제", "직업탐구 모의고사 문항 생성"처럼 문항·시험지 출제를 요청받으면 사용한다. 출제 계획·계산값·정답 위치·검증·문체 보정은 번들된 엔진(Node 18+)이 정하고, 에이전트는 지시서대로 문항을 쓰고 검토한다.
---

# 직업탐구 문항 출제 (exam-question-generator)

실제 기출 940문항에서 뽑은 출제 프로필·단원 가이드 40개·단원 특징 계산 모듈·법적 정합성 규칙·평가원 문체 보정을 묶은 스킬이다.
**글쓰기(출제·검토)는 에이전트가, 판정은 엔진이** 한다. 외부 API 키가 필요 없다.

엔진 CLI: `node <skill-dir>/scripts/exam.cjs` (이하 `exam`). `<skill-dir>`는 이 SKILL.md가 있는 폴더.

## 1. 요청 해석

| 항목 | 값 | 기본 |
|---|---|---|
| 과목 `--subject` | `success`(성공적인 직업생활, 성직) / `kongil`(공업 일반, 공일) | 물어본다 |
| 단원 `--units` | `15-17`, `7` (1~20) | 물어본다 |
| 문항 수 `--count` | 1~30 | 5 |
| 난이도 `--difficulty` | `LOW`(하, 전부 2점) / `MIDDLE`(중, 실제 시험의 단원별 3점 비율) / `HIGH`(상, 전부 3점 고난도) / `INTERGRATE`(통합) / `ULTRA`(초고난도, 아래 참고) | MIDDLE |
| 개념 `--concepts` | 쉼표 구분 개념명(선택) | 없음 |

과목·단원이 없으면 한 번만 묻는다. 작업 폴더는 `--work ./exam-work/<짧은-이름>`처럼 새 폴더로 정한다.

## 2. 진행 순서

```
exam plan   --work W --subject S --units A-B --count N --difficulty D [--seed X]
  └ 문항마다: brief.md 읽기 → candidate.json 쓰기 → exam check → (통과) review-brief.md → review.json → exam review
exam status --work W
exam refill --work W      # 3회 모두 반려(failed)된 자리를 같은 형식·정답 위치의 새 명세로 다시 연다(자리당 최대 2번)
exam refresh --work W     # 엔진을 갱신했다면: 통과 문항의 해설만 새 엔진으로 다시 조립(보이는 내용이 바뀌면 거부)
exam export --work W      # W/exam.json(앱 형식), W/exam.md(미리보기)
```

### 문항 쓰기 (문항마다)
1. `W/items/NN/brief.md`를 끝까지 읽는다. 시스템 지시 + 출제 명세 + JSON 스키마가 들어 있다.
2. 스키마에 맞는 **JSON 객체 하나**를 `W/items/NN/candidate.json`에 저장한다(설명·코드블록 없이 JSON만).
   - 정답 위치, <보기> 참/거짓, 배점, 계산 자료(표·[조건]·계산 진술·수치 선지)는 엔진이 정했다. 지시서 지정값을 바꾸지 않는다.
   - 계산 자료가 있으면 지시서의 표와 문장을 그대로 옮긴다(어차피 엔진이 덮어쓴다).
3. `exam check --work W --item NN`
   - `✗`이면 출력된 사유가 반영된 새 brief.md가 생긴다. 그 지시서로 처음부터 다시 쓴다(최대 3회, 2회차부터는 개념·자료가 바뀐 대체 명세).
   - `✓`이면 `review-brief.md`가 생긴다.

### 블라인드 검토 (문항마다, 필수)
4. **출제할 때 본 내용(brief.md, candidate.json, 정답)을 모르는 상태로** `review-brief.md`만 보고 푼다.
   - 하위 에이전트를 만들 수 있으면 새 하위 에이전트에게 review-brief.md 경로만 주고 결과 JSON을 받는다(권장).
   - 그럴 수 없으면 직접 하되, 의도한 정답을 떠올리지 말고 제시문·선지만으로 풀고 결함을 적극적으로 찾는다.
5. 결과 JSON을 `W/items/NN/review.json`에 저장하고 `exam review --work W --item NN`.
   - 정답 불일치·모호성·교과/법적 오류·정답 노출·단순 읽기 진술·(3점) 쉬움이면 반려되고 새 brief.md가 생긴다 → 3단계부터 다시.

### 마무리
6. `failed` 문항이 있으면 `exam refill --work W`로 그 자리를 다시 열어 3단계부터 다시 쓴다. 요청한 문항 수를 채우는 것이 원칙이며, 다시 연 자리도 실패하면 제외한다.
7. 모든 문항이 `accepted` 또는 `failed`가 되면 `exam export --work W`.
8. 사용자에게 `exam.md`(문항·정답·해설 미리보기)와 `exam.json` 경로, 통과 문항 수, 제외된 문항과 사유를 알린다.

### 초고난도 모드 (`--difficulty ULTRA` 또는 `초고난도`)
"모든 선지를 두 번 이상 생각해야 하는" 문항을 요청받으면 이 모드를 쓴다.
- **소거 지름길 없는 선지 조합:** <보기>형은 정답 조합에서 보기 하나씩만 참/거짓을 뒤집은 조합을 모두 선지에 둔다. 어느 <보기> 하나라도 판정하지 않으면 정답 후보가 둘 남는다. 이 구조에서는 정답이 ③~⑤에만 올 수 있어, 여러 문항이면 약 40%를 단일 정답형으로 섞어 ①·②를 채운다.
- **계산 고정 진술 없음:** 엔진이 고정하는 계산 진술은 한 단계로 풀리는 경우가 많아 쓰지 않는다. 모든 <보기>·선지를 에이전트가 쓴다.
- **쓰기 규칙(지시서 "초고난도" 절):**
  - 모든 진술은 두 단계 이상 판단해야 판정된다(예: 휴게 차감 → 기준 비교 → 한도·금액 계산).
  - 규칙 하나만으로 판정되는 진술, 앞 구절만으로 거짓이 되는 복합 진술은 쓰지 않는다.
  - 참 진술은 흔한 실수로 계산하면 다른 값이 나와야 한다.
  - 거짓 진술의 값은 그 흔한 실수로 나오는 값으로 만든다.
- **검토:** 블라인드 검토 지시서에 보기별 사고 단계와 소거 경로 점검이 붙는다. 검토자가 hard로 매기지 않으면 반려된다. 검토 하위 에이전트에게는 기본 모델(가능하면 가장 강한 모델)을 쓴다.

### 해설 카드
문항마다 공부 화면의 "이 개념이 문제에서 어떻게 나왔나"와 같은 단계별 해설(풀이 흐름 → 지문 단서 → 선택지 분석 → 핵심 교훈)이 `explanation.conceptHighlightV2`로 만들어진다. 재료는 후보 JSON의 `explanation.clues`(제시문에서 글자 그대로 복사한 10~40자 인용), `steps`(3~5단계), `takeaway`와 각 보기·선지의 `basis`다. 인용이 제시문과 다르면 카드가 빠지므로 반드시 그대로 복사한다. `exam.md` 해설과 앱 해설 화면·PDF 해설지가 이 카드를 쓴다.

여러 문항은 순서대로 해도 되고, 하위 에이전트로 나누어 병렬로 써도 된다(같은 문항을 쓴 에이전트가 그 문항을 검토하지 않게 한다).

## 3. 출력 형식

`exam.json`의 `questions[]`는 앱 `questions` 테이블과 같은 필드다: `questionStem`, `stimulusData`(TPL_SOURCE_BLOCKS: text/table/dialogue 블록), `optionsList`, `comboBlock`(<보기>), `correctAnswer`, `explanation.judgment`(출제 의도·해설·오답 피하기·계산 근거), `explanation.conceptHighlightV2`(풀이 흐름·지문 단서·선택지 O/X·핵심 정리), `points`, `unitNumber`. 자세한 필드는 [references/output-format.md](references/output-format.md).

## 4. 지켜야 할 것

- 엔진 판정을 우회하지 않는다. `check`/`review`를 건너뛰거나 결과 JSON을 손으로 고쳐 통과시키지 않는다.
- 블라인드 검토를 생략하지 않는다. 검토 없이 내보낸 문항은 오답·복수 정답 위험이 크다.
- 실존 기업·인물·통계를 쓰지 않는다(○○기업, A 씨 등 기출 관례).
- 법·제도 단원(성직 15~19)은 지시서의 "법적 정합성" 항목을 반드시 지킨다. 사례 설정이 법상 성립해야 한다.
- 문체 판단 기준과 검토 기준은 [references/review-rubric.md](references/review-rubric.md).

## 5. 엔진 갱신

엔진(`scripts/engine/`)은 GAP 백엔드 소스에서 빌드된다. 출제 규칙을 바꾼 뒤에는 저장소 `backend`에서 `npm run build:skill`로 다시 빌드한다.

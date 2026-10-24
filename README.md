# jiks — 직업탐구 문항 출제 에이전트 스킬

수능·모의평가형 직업탐구 문항(**성공적인 직업생활**, **공업 일반**)을 참조 문항 없이 새로 출제하는 Claude 에이전트 스킬입니다.
에이전트가 문항을 쓰고, 정답을 모르는 별도 에이전트가 다시 풀어 검토한 뒤, 통과한 문항만 시험지(JSON·Markdown)로 내보냅니다.

- **글쓰기는 에이전트, 판정은 엔진**: 출제 계획·정답 위치·배점·계산 자료·문체 보정·검증·검토 판정은 번들된 엔진이 정합니다.
- **외부 API 키 없음**: Node 18 이상만 있으면 됩니다(외부 패키지도 없음).
- **기출 기반 규칙**: 기출 문항에서 뽑은 출제 프로필, 단원 가이드 40개, 단원 특징 계산 모듈(근로 조건·해고 구제·야간 근로·구직급여, 퍼트·재고·6시그마·파레토·재해율), 법적 정합성 점검 규칙, 평가원 문체 보정을 담았습니다.
- **단계별 해설**: 문항마다 "이 개념이 문제에서 어떻게 나왔나" 해설(풀이 흐름 → 지문 단서 → 선택지 O/X → 핵심 교훈)을 함께 만듭니다.

## 설치

Claude Code에서 쓰려면 스킬 폴더를 스킬 디렉터리에 넣습니다.

```bash
git clone https://github.com/officeshinyujun/jiks.git
# 모든 프로젝트에서 쓰기
cp -R jiks/exam-question-generator ~/.claude/skills/
# 특정 프로젝트에서만 쓰기
cp -R jiks/exam-question-generator <프로젝트>/.claude/skills/
```

셸과 Node를 쓸 수 있는 다른 에이전트에서도 `exam-question-generator/SKILL.md`의 지시대로 쓸 수 있습니다.

## 사용

에이전트에게 이렇게 요청합니다.

- "성직 15~18단원 상 난이도 20문항 만들어줘"
- "공일 7단원 계산 문제 3개 출제해줘"

에이전트는 아래 순서로 엔진 CLI(`node exam-question-generator/scripts/exam.cjs`)를 씁니다.

| 명령 | 하는 일 |
|---|---|
| `plan` | 과목·단원·문항 수·난이도로 출제 계획을 세우고 문항별 출제 지시서(`brief.md`)를 만듭니다. |
| `check` | 에이전트가 쓴 후보 JSON을 검증합니다(문체 보정, 계산값 반영, 형식·정답 노출·길이·중복). 통과하면 블라인드 검토 지시서가 나옵니다. |
| `review` | 정답을 모르는 검토 결과로 통과·반려를 정합니다(정답 일치, 모호성, 교과·법적 오류, 난도). 반려되면 고친 지시서가 나옵니다(최대 3회). |
| `refill` | 3회 모두 반려된 자리를 같은 형식·정답 위치의 새 명세로 다시 엽니다. |
| `refresh` | 엔진을 갱신했을 때 통과 문항의 해설만 다시 만듭니다(보이는 내용이 바뀌면 거부). |
| `status` | 진행 상황을 보여 줍니다. |
| `export` | 통과 문항을 `exam.json`(앱 문항 형식)과 `exam.md`(문항·정답·해설 미리보기)로 내보냅니다. |

| 옵션 | 값 |
|---|---|
| `--subject` | `success`(성직) / `kongil`(공일) |
| `--units` | `15-18`, `7` (1~20) |
| `--count` | 1~30 |
| `--difficulty` | `LOW`(하, 전부 2점) / `MIDDLE`(중, 실제 시험의 단원별 3점 비율) / `HIGH`(상, 전부 3점) / `INTERGRATE`(통합) |

자세한 작업 순서와 규칙은 [`exam-question-generator/SKILL.md`](exam-question-generator/SKILL.md), 검토 기준은 [`references/review-rubric.md`](exam-question-generator/references/review-rubric.md), 출력 형식은 [`references/output-format.md`](exam-question-generator/references/output-format.md)에 있습니다.

## 폴더 구조

```
exam-question-generator/
├─ SKILL.md              에이전트용 작업 순서·규칙
├─ references/           검토 기준·평가원 문체, exam.json 형식
└─ scripts/
   ├─ exam.cjs           CLI
   └─ engine/            출제 엔진(빌드 결과물, Node 표준 모듈만 사용) + 출제 프로필·단원 가이드 데이터
```

`scripts/engine/`은 GAP(2830) 서비스 백엔드의 출제 엔진 소스에서 빌드한 결과물입니다. 서비스의 AI 출제 파이프라인과 같은 계획·검증·판정 규칙을 씁니다.

## 알아 둘 점

- 문항 품질은 스킬을 쓰는 에이전트의 모델에 달려 있습니다. 엔진 검증과 블라인드 검토는 오류를 걸러 주지만 글의 수준까지 정해 주지는 않습니다.
- 블라인드 검토는 출제한 에이전트가 아닌 별도 하위 에이전트로 하는 것이 원칙입니다.
- 법·제도 단원(성직 15~19)의 법정 수치와 판단 기준은 교과서·기출 해설 확인치를 따릅니다. 실제 사용 전 교사 검토를 권장합니다.

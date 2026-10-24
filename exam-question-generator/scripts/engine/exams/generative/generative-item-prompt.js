"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generativeSystemPrompt = generativeSystemPrompt;
exports.buildGenerativeItemPrompt = buildGenerativeItemPrompt;
exports.generativeItemResponseFormat = generativeItemResponseFormat;
exports.ultraInstructions = ultraInstructions;
exports.blindSolveUserPrompt = blindSolveUserPrompt;
exports.blindSolveSystemPrompt = blindSolveSystemPrompt;
exports.blindSolveResponseFormat = blindSolveResponseFormat;
const concept_leak_1 = require("./concept-leak");
const exam_style_knowledge_1 = require("./exam-style-knowledge");
const legal_review_rules_1 = require("./legal-review-rules");
const SUBJECT_NAMES = { kongil: '공업 일반', success: '성공적인 직업생활' };
function generativeSystemPrompt() {
    return [
        '당신은 대학수학능력시험 직업탐구 영역(공업 일반, 성공적인 직업생활) 출제위원이자 검토위원입니다.',
        '참조 문항 없이, 주어진 출제 명세만으로 실제 수능·모의평가와 구별되지 않는 새 5지선다 문항 1개를 만듭니다.',
        '',
        '[작업 순서] design(상황 설계와 단서 목록) → blocks(제시문) → stem(발문) → 진술/선지 → explanation(해설).',
        '단서 목록을 먼저 확정하고, 제시문에 그 단서를 분산해 심은 뒤, 각 진술의 참/거짓이 그 단서로만 판정되도록 쓰십시오.',
        '',
        '[기출 문항 제작 원리]',
        ...exam_style_knowledge_1.EXAM_CRAFT_RULES.map((rule, index) => `${index + 1}. ${rule}`),
        '',
        '[형식 규칙]',
        '- 제시문 블록은 명세가 요구한 블록 구성을 정확히 따르십시오. text 블록은 text만, table 블록은 title/headers/rows만, dialogue 블록은 lines만 채우고 나머지 필드는 빈 문자열/빈 배열로 두십시오.',
        '- 표의 모든 행은 headers와 같은 칸 수를 가져야 합니다. 빈칸 문항이면 해당 칸에 (가), (나)를 쓰십시오.',
        '- 제시문에서 언급한 자료(도입 전후 비교, 그래프, 명단 등)는 반드시 실제로 제시하고, 본문·표·진술의 수치와 사실이 서로 맞아야 합니다.',
        '- 제시문에 (가), (나), ㉠ 같은 라벨을 붙였다면 발문·<보기>·선지에서 반드시 그 라벨로 물으십시오. 묻지 않을 라벨은 붙이지 마십시오.',
        '- 모든 진술은 교과 개념 판단이 있어야 참/거짓이 정해져야 합니다. 표의 값이나 제시문 문장을 그대로 읽기만 하면 판정되는 진술(예: "선호 비율이 더 높다")은 쓰지 마십시오. 수치를 쓰려면 계산하거나 개념과 연결하십시오.',
        '- 표·본문에 이미 적힌 값(예: 누적 비율 74%)을 그대로 다시 묻는 진술도 단순 읽기입니다. 수치 진술은 표에 없는 값(합계, 비율, 차이, 순위 변화 등)을 계산해야 판정되게 쓰십시오.',
        '- 제시문은 "다음은 …"으로 시작하지 마십시오. 자료를 소개하는 문장은 발문의 몫입니다. 제시문은 자료 자체(보고서 제목, 사례, 대화 등)로 바로 시작합니다.',
        '- 개념의 분류(상위·하위 범주)는 교과서 분류 체계와 정확히 일치시키십시오. 예: 반도체 집적 회로 배치 설계권·데이터베이스·컴퓨터 프로그램은 "신지식 재산권"의 하위이므로 "산업 재산권"이라 부르지 않습니다.',
        '- 표의 범주 칸(회사 형태, 산업 분류, 재해 유형 등)에는 그 범주에 속하는 교과 용어만 쓰십시오. (예: 회사 형태 칸에 "벤처기업" 금지 — 벤처기업은 법적 회사 형태가 아님)',
        '- 그림을 그릴 수 없으므로 기출에서 그림·그래프·도식으로 나오던 자료(파레토도, 공정도, 그래프 등)는 그 수치를 표로, 모양·흐름은 글로 바꾸어 제시하십시오.',
        '- 대화 화자는 "교사", "학생 A", "A 씨", "직업 상담사", "기자"처럼 기출 관례로 쓰고, 화자 이름을 text에 반복하지 마십시오.',
        '- 제시문에 발문·지시문("다음 중", "고르시오", "<보기>")이나 정답 개념명을 쓰지 마십시오.',
        '- <보기> 문장 앞에 "ㄱ." 같은 기호를, 선지 앞에 "①" 같은 번호를 붙이지 마십시오. 번호와 정답 위치는 서버가 붙입니다.',
        '- 모든 문장은 평가원 시험지 문체로 씁니다. 마크다운 기호(*, #, **)는 쓰지 말고, 개조식 자료의 항목 기호는 기출처럼 ■, •, - 를 씁니다.',
        '- 명세에 인용된 예시 문장(작성 방식·기법 설명 속 따옴표 문장)은 패턴 참고용입니다. 그대로 쓰지 말고 이 문항의 상황에 맞게 새로 쓰십시오.',
        '- 출력은 요청된 JSON 하나뿐입니다.',
    ].join('\n');
}
function buildGenerativeItemPrompt(spec, repairNotes = []) {
    const lines = [];
    lines.push(`# 출제 명세 (${spec.id})`);
    lines.push(`과목: ${SUBJECT_NAMES[spec.subject]} / ${spec.unitNumber}단원 ${spec.unitTitle}`);
    if (spec.examFocus !== '')
        lines.push(`단원 출제 초점: ${spec.examFocus}`);
    lines.push(`배점: ${spec.points}점 / 난이도: ${spec.difficulty}`);
    lines.push(`단원 난도(기출 기준): ${UNIT_TIER_GUIDE[spec.unitDifficultyTier ?? 'standard'][spec.points]}`);
    lines.push('');
    lines.push('## 정답 판단의 중심 개념');
    lines.push(describeConcept(spec.targetConcept, true));
    if (spec.companionConcepts.length > 0) {
        lines.push('');
        lines.push('## 오답·다른 진술의 재료가 될 같은 단원 개념');
        for (const concept of spec.companionConcepts)
            lines.push(describeConcept(concept, false));
    }
    if (spec.confusionPairs.length > 0) {
        lines.push('');
        lines.push('## 혼동 쌍과 판별 기준 (오답 설계에 사용)');
        for (const pair of spec.confusionPairs) {
            lines.push(`- ${pair.a} ↔ ${pair.b}: ${pair.boundary}`);
        }
    }
    lines.push('');
    lines.push('## 제시문');
    lines.push(`- 자료 장르: ${spec.material.genre}`);
    if (spec.material.construction !== '')
        lines.push(`- 구성 방식: ${spec.material.construction}`);
    if (spec.material.labelling !== '')
        lines.push(`- 라벨 관례: ${spec.material.labelling}`);
    lines.push(`- 블록 구성(필수): ${shapeInstruction(spec.stimulusShape)}`);
    lines.push(...registerInstructions(spec));
    lines.push(`- 정답 개념 숨기기(필수): 제시문에 ${(0, concept_leak_1.conceptAliases)(spec.targetConcept.name).map((alias) => `"${alias}"`).join(', ')} 및 그 정의를 거의 그대로 옮긴 표현을 쓰지 마십시오. 학생이 행동·수치·상황 단서로 개념을 추론해야 합니다.`);
    lines.push('- 단서 심기(필수): 단서는 개념을 가리키는 행동·상황·수치로 문장 속에 녹이고, 서로 다른 문장·발화에 흩어 두십시오. "학생 A는 돈, 학생 B는 안정"처럼 한 사람(한 줄)에 개념 하나를 대응시키는 나열식은 금지합니다.');
    lines.push('- 실제 기출처럼 판정에 직접 쓰이지 않는 맥락 정보(인물 배경, 일의 경과, 계획 등)를 1~2개 섞어 자료를 읽어야 단서가 보이게 하십시오.');
    lines.push(`- 상황 틀: ${spec.scenarioArchetype}`);
    lines.push(`- 소재(필수, 다른 문항과 겹치지 않게): ${spec.diversityHint}`);
    lines.push(`- 분량: 제시문 전체 ${band(spec.lengths.stimulus, spec.points === 3 ? 1.3 : 1)}자 내외`);
    if (spec.numericConventions !== '')
        lines.push(`- 수치 관례: ${spec.numericConventions}`);
    if (spec.toneAndRegister !== '')
        lines.push(`- 문체: ${spec.toneAndRegister}`);
    if (spec.calculation !== undefined)
        lines.push(...calculationInstructions(spec));
    lines.push('');
    lines.push('## 발문');
    lines.push(spec.stemOpening === 'declarative'
        ? '- "다음은 …이다." 문장으로 자료를 소개한 뒤 질문하는 형식 (예: "다음은 ○○ 기업의 회의록이다. 이에 대한 …")'
        : '- "다음 …에 나타난 / 다음 …을 통해 알 수 있는 …" 처럼 한 문장으로 질문하는 형식');
    lines.push(`- 질문 부분은 반드시 정확히 "${spec.stemEnding}"로 끝나야 합니다.`);
    if (spec.conditionClause) {
        lines.push('- 판정에 쓰는 이론·분류 기준·법적 기준이 있으면 질문 뒤에 "(단, …)"으로 명시하십시오. (예: "(단, 생애 발달 단계는 해비거스트의 이론에 근거한다.)") 그런 기준이 없으면 붙이지 마십시오.');
    }
    lines.push('- "(단, 제시문에 드러난 내용만으로 판단한다.)"처럼 판정 기준을 주지 않는 형식적 조건은 쓰지 마십시오.');
    lines.push(`- 분량: ${band(spec.lengths.stem)}자 내외`);
    if (spec.stemExamples.length > 0) {
        lines.push('- 기출 발문 틀(문구 참고용, [자료]/[대상] 자리를 이 문항 내용으로):');
        for (const example of spec.stemExamples)
            lines.push(`  · ${example}`);
    }
    lines.push('');
    lines.push('## 응답 형식');
    lines.push(...responseInstructions(spec));
    if (spec.trueStatementPatterns.length > 0) {
        lines.push('- 참 진술 작성 방식:');
        for (const pattern of spec.trueStatementPatterns)
            lines.push(`  · ${pattern}`);
    }
    lines.push('');
    if (spec.points === 3) {
        lines.push('## 3점 난도 (필수)');
        lines.push('- 아래 장치 중 하나 이상을 실제로 쓰고, design.difficultyDevices에 무엇을 썼는지 적으십시오.');
        lines.push('  · 표 수치 해석·계산(두 단계 이상: 비율, 누적, 비교 등)  · 정답 단서를 본문과 표 두 곳 이상에 분산');
        lines.push('  · 서로 다른 개념 2개 이상을 함께 판단  · 예외 조건·(단, …) 조건 적용  · 혼동 쌍의 경계 판별');
        for (const lever of spec.difficultyLevers)
            lines.push(`  · ${lever}`);
        if (spec.difficulty === 'HIGH' || spec.difficulty === 'INTERGRATE') {
            lines.push('- 상 난이도 시험: 개념 이름이나 정의 하나만 알면 바로 풀리는 단순 개념 확인형은 금지입니다. 모든 <보기>·선지가 사례의 조건(인원, 기간, 수치, 예외 등)을 개념 기준에 적용해야 판정되게 하십시오.');
        }
        if (spec.ultra)
            lines.push(...ultraInstructions(spec));
    }
    else {
        lines.push('## 난도');
        lines.push('- 2점 기본 문항이지만 개념명을 제시문에서 바로 찾아 맞히는 수준이면 안 됩니다. 단서 → 개념 추론 한 단계는 반드시 필요합니다.');
    }
    lines.push('- 금지: 표의 수를 단순히 더하기만 하는 진술, 제시문 문장을 그대로 옮긴 참 진술, 제시문에 쓰인 개념명을 그대로 묻는 진술.');
    const legalRules = (0, legal_review_rules_1.legalReviewRules)(spec.subject, spec.unitNumber);
    if (legalRules.length > 0) {
        lines.push('');
        lines.push('## 법적 정합성 (필수 — 어기면 수능에서 문제 오류가 되는 항목)');
        for (const rule of legalRules)
            lines.push(`- ${rule}`);
    }
    if (spec.pitfallsToAvoid.length > 0) {
        lines.push('');
        lines.push('## 이 단원 생성 시 주의');
        for (const pitfall of spec.pitfallsToAvoid)
            lines.push(`- ${pitfall}`);
    }
    lines.push('');
    lines.push('## 해설');
    lines.push('- intent: 출제 의도 한 문장 ("…을 이해하고 적용할 수 있는가?")');
    lines.push('- solution: 제시문 단서 → 개념 → 판정 순서로 정답 근거를 설명 (보기형이면 각 보기의 참/거짓을 ㄱ, ㄴ… 순서로 모두 판정)');
    lines.push('- distractorNotes: 오답(거짓 진술 또는 오답 선지)마다 한 항목, 무엇이 왜 틀렸는지 교과 개념으로 설명');
    lines.push('- 단계별 해설(학생 복습 화면에 그대로 보임):');
    lines.push('  · clues: 정답 판단에 쓰이는 제시문 단서 2~4개. quote는 제시문(본문·표 칸·발화)에서 10~40자를 글자 그대로 복사하고(바꿔 쓰면 버려짐), why는 그 단서가 어떤 개념·기준을 가리키는지 한 문장');
    lines.push('  · steps: 학생이 따라 할 풀이 순서 3~5단계("① 표에서 … 확인 → ② … 기준 적용 → ③ …"처럼 행동 단위, 계산 문항은 계산식 포함)');
    lines.push('  · takeaway: 이 문항에서 꼭 기억할 개념·함정 한 문장');
    lines.push('- 각 <보기>·선지의 basis는 복습 화면의 선지별 해설로 쓰입니다. 왜 옳은지/틀린지를 한두 문장으로 쓰십시오.');
    if (repairNotes.length > 0) {
        lines.push('');
        lines.push('## 이전 시도 반려 사유 (모두 고쳐서 처음부터 다시 출제)');
        for (const note of repairNotes)
            lines.push(`- ${note}`);
    }
    return lines.join('\n');
}
function responseInstructions(spec) {
    const choice = band(spec.lengths.choice);
    switch (spec.responseMode) {
        case 'truth_combination': {
            const keys = spec.viewKeys ?? [];
            const truths = new Set(spec.trueViewKeys ?? []);
            let falseIndex = 0;
            return [
                `- <보기> 진술 ${keys.length}개를 viewItems로 작성합니다. 각 진술의 참/거짓은 아래로 고정되어 있습니다(바꾸지 마십시오).`,
                ...keys.map((key) => {
                    if (truths.has(key))
                        return `  · ${key}: 참 — 제시문 단서로 확실히 참이 되게`;
                    const technique = spec.falseTechniques[falseIndex++] ?? '개념 바꿔치기';
                    return `  · ${key}: 거짓 — 기법: ${technique}`;
                }),
                `- 각 진술 ${band(spec.lengths.viewItem)}자 내외, 서로 다른 판단 포인트를 다루고 정답 개념을 중심으로 1~2개 진술은 함께 제시된 개념을 다룹니다.`,
                '- truth 필드에 위 지정값을, basis에 그 판정 근거(제시문 단서)를 쓰십시오.',
            ];
        }
        case 'statement':
            return spec.polarity === 'negative'
                ? [
                    '- 부정형 문항입니다. keyedChoice = 유일하게 옳지 않은(거짓) 진술, otherChoices = 옳은(참) 진술 4개.',
                    `- keyedChoice의 오류 기법: ${spec.falseTechniques[0] ?? '조건·방향 반전'}`,
                    `- 모든 선지는 ${choice}자 내외의 완결된 평서문, 같은 문형과 비슷한 길이로.`,
                ]
                : [
                    '- keyedChoice = 유일하게 옳은(참) 진술, otherChoices = 거짓 진술 4개.',
                    ...spec.falseTechniques.slice(0, 4).map((technique, index) => `  · 오답 ${index + 1} 기법: ${technique}`),
                    `- 모든 선지는 ${choice}자 내외의 완결된 평서문, 같은 문형과 비슷한 길이로.`,
                ];
        case 'short_label':
            return [
                '- 선지는 개념명·용어(또는 짧은 값)입니다. keyedChoice = 제시문이 가리키는 정답 용어, otherChoices = 혼동 가능한 같은 범주의 용어 4개.',
                `- 선지 길이 ${choice}자 내외. 정답 용어와 그 동의어는 제시문과 발문에 절대 쓰지 마십시오.`,
                '- 제시문의 단서는 정답 용어의 정의·특징을 일상·현장 언어로 풀어 보여 주어야 합니다.',
            ];
        case 'pair_table': {
            const [left, right] = spec.pairHeaders ?? ['(가)', '(나)'];
            return [
                `- 짝짓기 표 선지입니다. pairTable.headers = ["${left}", "${right}"] (그대로 사용).`,
                `- 제시문에서 ${left}와 ${right}에 해당하는 것을 각각 추론할 수 있어야 합니다${left.startsWith('(') ? `(제시문에 ${left}, ${right} 라벨을 표시)` : ''}.`,
                '- keyedRow = 정답 짝, otherRows = 오답 짝 4개. 각 열의 값은 2~3개 용어가 행마다 조합되어 반복되는 기출 방식으로, 모든 행은 서로 달라야 합니다.',
                `- 각 칸 ${choice}자 이내의 용어. 정답 용어는 제시문에 직접 쓰지 마십시오.`,
            ];
        }
    }
}
/** 기출 배점·위치로 매긴 단원 난도와 배점에 맞춘 난도 지시(쉬운 단원 2점을 억지로 꼬지 않게) */
const UNIT_TIER_GUIDE = {
    easy: {
        2: '하 — 실제 기출에서 대부분 2점 기본 문항인 단원입니다. 개념 하나를 사례에 적용하는 수준으로 쓰고 과도한 함정을 넣지 마십시오.',
        3: '하 — 기출에서 드문 3점입니다. 개념 두 개를 함께 판단하게 하는 정도로 난도를 올리십시오.',
    },
    standard: {
        2: '중 — 개념 적용 한 단계가 필요한 기본 문항으로 쓰십시오.',
        3: '중 — 단서 분산이나 개념 결합으로 한 단계 더 생각하게 하십시오.',
    },
    hard: {
        2: '상 — 기출에서 3점이 많은 단원이지만 이 문항은 2점입니다. 계산·판단은 한 단계로 제한하십시오.',
        3: '상 — 실제 기출 3점 문항처럼 계산, 기준 적용, 단서 결합 중 둘 이상이 필요하게 하십시오.',
    },
};
/** 문서형 장르: 기출에서 ■ 소제목 + • 개조식 줄(~함/~임, 명사 끝)로 쓰는 자료 */
const DOCUMENT_GENRE = /보고서|계획서|계획|안내|공고|기록|회의록|활동지|일지|현황|분석|메모|게시판|협약서|명세|카드 뉴스|포스터|홍보|자료|결과|조사/u;
/**
 * 평가원 문체(기출 540문항 측정): 제시문 줄의 41%가 •·■ 개조식, "~다"로 끝나는 줄은 19%,
 * 서술 문장 중앙값 32자, 과거형은 "하였다·되었다·하여"(했다·됐다·해서는 드묾).
 */
function registerInstructions(spec) {
    const documentLike = DOCUMENT_GENRE.test(spec.material.genre) && !/사례|기사|인터뷰|수업|대화/u.test(spec.material.genre);
    return [
        '- 평가원 문체(필수):',
        documentLike
            ? '  · 문서형 자료이므로 개조식으로 쓰십시오: 첫 줄 자료 제목, "■ 항목명" 소제목 줄, "• 내용" 줄. 줄 끝은 "~함/~임/~음" 또는 명사(예: "• 2025년 3월 2일 입사, 주 5일 근무함"). 줄글 문단은 쓰더라도 1~2문장만.'
            : '  · 서술문은 한 문장 25~45자(길어도 60자)로 짧게, 한 문장에 정보 1~2개만 담으십시오.',
        '  · 과거형은 문어체 "-하였다·-되었다·-하여·-하였고"를 쓰십시오("했다·됐다·해서"는 쓰지 않음). 대화 발화만 구어(합니다체·해요체)를 씁니다.',
        '  · 표기: 용어·명칭 인용은 ‘ ’, 말 인용은 “ ”, 법률명은 ｢근로기준법｣처럼 ｢ ｣, 날짜는 "2024년 12월 10일", 금액은 "36,000원·60만 원·2,860만 원", 인물은 "A 씨", 기관은 "○○기업·△△사".',
        '  · <보기>·선지 진술은 "~한다, ~할 수 있다, ~에 해당한다, ~하였다"처럼 서술어로 끝내고 30~35자 안팎으로 쓰십시오. "…은 …이다" 정의형은 꼭 필요할 때만 씁니다.',
    ];
}
function calculationInstructions(spec) {
    const plan = spec.calculation;
    if (plan === undefined)
        return [];
    const lines = ['', '## 단원 특징 자료 (서버가 규칙으로 계산해 확정함 — 수치·문장 변경 금지)'];
    for (const table of plan.tables) {
        lines.push(`- table 블록으로 아래 표를 그대로 출력하십시오. 제목: "${table.title}", headers: ${JSON.stringify(table.headers)}`);
        lines.push(...table.rows.map((row) => `  | ${row.join(' | ')} |`));
    }
    if (plan.conditions.length > 0) {
        lines.push('- 아래 [조건]은 서버가 제시문 끝에 붙입니다. 제시문에 다시 쓰지 말고, text 블록이 [조건]과 어긋나지 않게 하십시오.');
        lines.push(...plan.conditions.map((condition) => `  ∙ ${condition}`));
    }
    lines.push(`- text 블록: ${plan.context}`);
    if (plan.format === 'statements') {
        const calcKeys = plan.statements.map((statement) => statement.key).join(', ');
        lines.push(`- <보기> ${calcKeys}은(는) 서버가 확정한 계산 진술입니다. viewItems에 아래 문장과 참/거짓을 그대로 쓰십시오.`);
        lines.push(...plan.statements.map((statement) => `  · ${statement.key} (${statement.truth ? '참' : '거짓'}): ${statement.text}\n      근거: ${statement.rationale}`));
        lines.push(`- 나머지 보기는 ${plan.otherHint}을(를) 이 사례에 적용한 진술로 쓰고, 계산 진술(${calcKeys})과 같은 내용을 반복하지 마십시오.`);
    }
    else if (plan.format === 'choices' && plan.choices !== undefined) {
        lines.push(`- keyedChoice(정답 선지)는 아래 문장을 그대로 쓰십시오: ${plan.choices.keyed.text}`);
        lines.push(`    근거: ${plan.choices.keyed.rationale}`);
        lines.push(`- otherChoices의 첫 번째 선지는 아래 문장을 그대로 쓰십시오: ${plan.choices.distractor.text}`);
        lines.push(`    근거: ${plan.choices.distractor.rationale}`);
        lines.push(`- 나머지 오답 선지 3개는 ${plan.otherHint}을(를) 이 사례에 적용한 진술로 쓰고, 위 두 문장과 길이를 비슷하게 맞추십시오.`);
    }
    else if (plan.format === 'numeric' && plan.numeric !== undefined) {
        const keyed = plan.numeric.choices[spec.answerIndex - 1] ?? '';
        lines.push(`- 발문은 서버가 확정합니다. stem에 다음 문장을 그대로 쓰십시오: ${plan.numeric.stem}`);
        lines.push(`- 선지는 서버가 확정한 수치입니다. keyedChoice는 "${keyed}", otherChoices는 ${plan.numeric.choices.filter((_, index) => index !== spec.answerIndex - 1).map((choice) => `"${choice}"`).join(', ')}를 이 순서대로 쓰십시오.`);
        lines.push(`- 계산 근거: ${plan.numeric.rationale}`);
        if (plan.numeric.distractorNotes.length > 0)
            lines.push(`- 오답 수치의 이유: ${plan.numeric.distractorNotes.join(' / ')}`);
    }
    lines.push('- 해설에서 계산이 필요한 판단은 위 근거의 계산 과정을 그대로 쓰십시오.');
    return lines;
}
function describeConcept(concept, primary) {
    const parts = [`- ${concept.name}`];
    if (concept.definition !== '')
        parts.push(`: ${concept.definition}`);
    const details = [];
    if (concept.keyFacts.length > 0)
        details.push(`핵심 사실: ${concept.keyFacts.slice(0, primary ? 5 : 2).join(' / ')}`);
    if (primary && concept.diagnosticCues.length > 0) {
        details.push(`제시문 단서 예: ${concept.diagnosticCues.slice(0, 4).join(' / ')}`);
    }
    return details.length === 0 ? parts.join('') : `${parts.join('')}\n    ${details.join('\n    ')}`;
}
function shapeInstruction(shape) {
    switch (shape) {
        case 'text':
            return 'text 블록 1~2개. 배경(누가·어디서·왜) → 경과(무엇을 하였는지, 조건·수치) → 결과·계획 흐름(문서형 장르면 같은 흐름을 ■·• 개조식 항목으로)';
        case 'table':
            return 'table 블록 1개 (표 제목 포함 가능)';
        case 'table+text':
            return 'text 블록(도입·상황) 1개 + table 블록 1개 (순서는 자연스럽게)';
        case 'dialogue':
            return 'dialogue 블록 1개, 발화 2~4개. 질문자(교사·기자·상담사)는 짧게, 핵심 인물은 70~130자 길이로 자기 상황·동기·행동·결과를 이어서 말하는 발화를 1~2개 포함';
        case 'dialogue+text':
            return 'text 블록(상황 소개) 1개 + dialogue 블록 1개(발화 2~4개, 핵심 인물의 70~130자 서술형 발화 1~2개 포함)';
    }
}
function band(length, scale = 1) {
    return `${Math.round(length.p25 * scale)}~${Math.round(length.p75 * scale)}`;
}
const STRING = { type: 'string' };
const BLOCK_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['type', 'text', 'title', 'headers', 'rows', 'lines'],
    properties: {
        type: { type: 'string', enum: ['text', 'table', 'dialogue'] },
        text: STRING,
        title: STRING,
        headers: { type: 'array', items: STRING, maxItems: 6 },
        rows: { type: 'array', maxItems: 8, items: { type: 'array', items: STRING, maxItems: 6 } },
        lines: {
            type: 'array',
            maxItems: 8,
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['speaker', 'text'],
                properties: { speaker: STRING, text: STRING },
            },
        },
    },
};
const CHOICE_SCHEMA = {
    type: 'object',
    additionalProperties: false,
    required: ['text', 'basis'],
    properties: { text: STRING, basis: STRING },
};
function generativeItemResponseFormat(spec) {
    const properties = {
        design: {
            type: 'object',
            additionalProperties: false,
            required: ['scenario', 'clues', 'difficultyDevices'],
            properties: {
                scenario: STRING,
                clues: { type: 'array', items: STRING, minItems: spec.points === 3 ? 4 : 3, maxItems: 6 },
                difficultyDevices: {
                    type: 'array',
                    items: STRING,
                    minItems: spec.points === 3 ? 1 : 0,
                    maxItems: 4,
                },
            },
        },
        blocks: { type: 'array', items: BLOCK_SCHEMA, minItems: 1, maxItems: 4 },
        stem: STRING,
    };
    const required = ['design', 'blocks', 'stem'];
    if (spec.responseMode === 'truth_combination') {
        const keys = spec.viewKeys ?? ['ㄱ', 'ㄴ', 'ㄷ'];
        properties.viewItems = {
            type: 'array',
            minItems: keys.length,
            maxItems: keys.length,
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['key', 'text', 'truth', 'basis'],
                properties: {
                    key: { type: 'string', enum: [...keys] },
                    text: STRING,
                    truth: { type: 'boolean' },
                    basis: STRING,
                },
            },
        };
        required.push('viewItems');
    }
    else if (spec.responseMode === 'pair_table') {
        const pair = { type: 'array', items: STRING, minItems: 2, maxItems: 2 };
        properties.pairTable = {
            type: 'object',
            additionalProperties: false,
            required: ['headers', 'keyedRow', 'otherRows'],
            properties: {
                headers: pair,
                keyedRow: pair,
                otherRows: { type: 'array', items: pair, minItems: 4, maxItems: 4 },
            },
        };
        required.push('pairTable');
    }
    else {
        properties.keyedChoice = CHOICE_SCHEMA;
        properties.otherChoices = { type: 'array', items: CHOICE_SCHEMA, minItems: 4, maxItems: 4 };
        required.push('keyedChoice', 'otherChoices');
    }
    properties.explanation = {
        type: 'object',
        additionalProperties: false,
        required: ['intent', 'solution', 'distractorNotes', 'clues', 'steps', 'takeaway'],
        properties: {
            intent: STRING,
            solution: STRING,
            distractorNotes: { type: 'array', items: STRING, minItems: 1, maxItems: 5 },
            clues: {
                type: 'array',
                minItems: 2,
                maxItems: 4,
                items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['quote', 'why'],
                    properties: { quote: STRING, why: STRING },
                },
            },
            steps: { type: 'array', items: STRING, minItems: 3, maxItems: 5 },
            takeaway: STRING,
        },
    };
    required.push('explanation');
    return {
        type: 'json_schema',
        json_schema: {
            name: `generative_item_${spec.responseMode}`,
            strict: true,
            schema: { type: 'object', additionalProperties: false, required, properties },
        },
    };
}
/** 블라인드 검토 사용자 프롬프트: 학생 화면 + (법·제도 단원) 정합성 점검 항목 */
/** 초고난도 문항 지시: 모든 <보기>·선지가 두 단계 이상, 한 단계 판정·소거 지름길 금지 */
function ultraInstructions(spec) {
    return [
        '',
        '## 초고난도 (필수 — 하나라도 어기면 블라인드 검토에서 반려됨)',
        '- 모든 <보기>·선지는 두 단계 이상의 판단을 거쳐야 참/거짓이 정해져야 합니다. 한 단계란 규칙 하나를 떠올리거나 값 하나를 확인하는 것입니다. 예: (1) 휴게 시간을 빼서 실제 근로 시간을 구하고 (2) 연령·사업장 규모 기준과 비교하고 (3) 남은 한도나 금액을 계산하는 진술.',
        '- 규칙 하나만 알면 판정되는 진술은 금지입니다(예: "5명 미만이므로 가산 수당이 없다"만으로 거짓이 되는 진술). 규칙을 알아도 사례의 수치를 계산해야 결론이 나게 쓰십시오.',
        '- 복합 진술의 앞 구절 하나만 보고 거짓이 되게 쓰지 마십시오. 거짓 진술의 오류는 끝까지 계산·판단해야 드러나는 마지막 결론(금액·시간·기한·적용 여부)에 두십시오.',
        '- 참 진술은 흔한 실수(휴게 시간 미차감, 가산 누락·이중 가산, 기준 연령·인원 혼동, 기간 계산 착오)로 계산하면 다른 값이 나오게 하십시오. 대충 계산해도 맞는 참 진술은 변별력이 없습니다.',
        '- 거짓 진술의 값은 그 흔한 실수로 나오는 값으로 만드십시오(예: 가산율을 100%로 본 금액, 휴게를 빼지 않은 시간).',
        '- 판정에 필요한 수치·조건(인원, 연령, 시각, 기간, 금액)은 모두 제시문에 두고, 서로 다른 블록·줄에 나누어 두십시오.',
        ...(spec.responseMode === 'truth_combination'
            ? ['- 선지 조합은 엔진이 소거 지름길이 없도록 정했습니다: 정답 조합에서 보기 하나만 다른 조합이 모두 선지에 있어 모든 <보기>를 판정해야 정답이 정해집니다. 그러니 어느 <보기>도 쉬우면 안 됩니다.']
            : ['- 단일 정답형이므로 정답 선지를 찾는 것만으로 끝나지 않게, 오답 선지 4개도 각각 두 단계 이상 판단해야 오답임이 드러나게 하십시오.']),
    ];
}
function blindSolveUserPrompt(rendered, legalRules = [], ultra = false) {
    const sections = [rendered];
    if (legalRules.length > 0) {
        sections.push('', '[법적 정합성 점검 항목] 아래를 하나라도 어기면 curriculumIssues에 적고, 그 때문에 정답이 흔들리면 ambiguity를 major로 하십시오.', ...legalRules.map((rule) => `- ${rule}`));
    }
    if (ultra) {
        sections.push('', '[초고난도 점검] 이 문항은 모든 <보기>·선지가 두 단계 이상 생각해야 판정되는 초고난도를 목표로 합니다.', '- reasoning에 <보기>·선지마다 판정에 필요한 최소 사고 단계 수와 내용을 적으십시오.', '- 규칙 하나·값 하나만 확인해도 판정되는 <보기>·선지, 복합 진술의 앞 구절만으로 판정되는 진술, 대충 계산해도 맞는 참 진술은 trivialStatements에 넣으십시오.', '- 일부 <보기>만 판정하고 소거로 정답에 도달하는 경로가 있으면 reasoning에 적고 perceivedDifficulty를 moderate 이하로 하십시오.', '- perceivedDifficulty는 실제 수능 3점 최고난도 문항과 비교해 그 수준이면 hard로 하십시오.');
    }
    return sections.join('\n');
}
function blindSolveSystemPrompt() {
    return [
        '당신은 수능 직업탐구 영역(공업 일반, 성공적인 직업생활) 검토위원입니다.',
        '정답을 모르는 상태에서 문항을 직접 풀고, 문항 자체의 결함을 찾습니다.',
        '- 고등학교 해당 교과서의 개념과 제시문의 정보만으로 판단하십시오.',
        '- <보기>형이면 각 보기의 참/거짓을 먼저 판정한 뒤 선지를 고르십시오.',
        '- ambiguity: none(정답이 하나로 확정), minor(표현이 조금 모호하지만 정답은 확정), major(복수 정답·정답 없음·제시문만으로 판정 불가).',
        '- curriculumIssues: 다음이 있으면 각각 짧게, 없으면 빈 배열.',
        '  · 교과서 내용과 다른 사실·틀린 정의·틀린 법정 수치',
        '  · 내부 모순(본문과 표 수치 불일치, 계산이 맞지 않음)',
        '  · 제시문이 언급만 하고 실제로 제시하지 않은 자료(예: "도입 전후를 비교했다"는데 비교 자료가 없음)',
        '  · 범주 오류(예: 회사 형태 칸에 "벤처기업", 산업 분류 칸에 기업명)',
        '  · 상·하위 분류 혼용(예: 신지식 재산권에 속하는 반도체 배치 설계권을 제시문이 "산업 재산권"이라 부름, 하위 개념을 다른 상위 범주에 넣음)',
        '  · 법·제도 사례의 성립 문제: 사례 설정 자체가 법상 성립하지 않음(금지된 고용 형태 등), 판정에 필요한 사실(상시 근로자 수, 계약 당사자, 요건 충족 사실)의 누락, 급여·지원금의 수급 주체나 신청 기관 오류, 제시문 표현이 진술의 참/거짓과 모순(예: 수급 자격이 없는 사람이 "실업 인정"을 받는 중)',
        '  · 의도와 다르게 판정될 여지: 위 결함 때문에 어떤 <보기>·선지의 참/거짓이 달라질 수 있으면 그 결과 정답 조합이 선지에 없거나 둘이 되는지 확인',
        '- curriculumIssues에는 실제 결함만 적으십시오. 어느 해석으로 보아도 참/거짓이 같은 사항(기간 계산 방식 차이, 표현 취향), 판정과 무관한 맥락 정보, 제시문 단서로 충분히 추론되는 사실은 적지 말고 reasoning에만 쓰십시오.',
        '- 법·제도 해석이 갈릴 때는 조문 문언과 고등학교 교과서 서술을 기준으로 하고, 발문의 (단, …)·[조건]이 판단 기준을 정하면 그 기준을 따르십시오. 기준이 정해진 사항은 결함으로 보지 않습니다.',
        '- answerGivenAway: 제시문이 정답 판단의 핵심 개념명이나 그 정의를 사실상 그대로 써서, 추론 없이 단어 대조만으로 풀리면 true.',
        '- perceivedDifficulty: 수능 기준 easy(단서 대조만으로 즉시 풀림) / moderate(개념 추론 1~2단계) / hard(계산·복합 개념·분산 단서).',
        '- trivialStatements: 교과 개념을 전혀 몰라도 제시문의 값·문장을 그대로 읽기만 하면 참/거짓이 정해지는 <보기>·선지의 표지(예: "ㄴ", "③"). 계산이나 개념 적용이 필요하면 포함하지 마십시오. 표·본문에 이미 적힌 값이나 문장을 그대로 다시 확인하는 진술(예: 표에 74%가 있는데 "누적 비율은 74%이다")은 계산처럼 보여도 포함하십시오. 없으면 빈 배열.',
        '- 출력은 요청된 JSON 하나뿐입니다.',
    ].join('\n');
}
function blindSolveResponseFormat() {
    return {
        type: 'json_schema',
        json_schema: {
            name: 'generative_blind_solve_verification',
            strict: true,
            schema: {
                type: 'object',
                additionalProperties: false,
                required: ['reasoning', 'answerIndex', 'ambiguity', 'curriculumIssues', 'answerGivenAway', 'perceivedDifficulty', 'trivialStatements'],
                properties: {
                    reasoning: STRING,
                    answerIndex: { type: 'integer', enum: [1, 2, 3, 4, 5] },
                    ambiguity: { type: 'string', enum: ['none', 'minor', 'major'] },
                    curriculumIssues: { type: 'array', items: STRING, maxItems: 5 },
                    answerGivenAway: { type: 'boolean' },
                    perceivedDifficulty: { type: 'string', enum: ['easy', 'moderate', 'hard'] },
                    trivialStatements: { type: 'array', items: STRING, maxItems: 5 },
                },
            },
        },
    };
}

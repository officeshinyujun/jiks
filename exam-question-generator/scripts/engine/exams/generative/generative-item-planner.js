"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STEM_ENDINGS = void 0;
exports.planGenerativeExam = planGenerativeExam;
exports.planGenerativeReserves = planGenerativeReserves;
exports.replanGenerativeItem = replanGenerativeItem;
exports.isHardExam = isHardExam;
exports.allocatePoints = allocatePoints;
exports.largestRemainder = largestRemainder;
exports.spreadAnswers = spreadAnswers;
exports.seededRandom = seededRandom;
exports.shuffle = shuffle;
const difficulty_1 = require("../../entities/difficulty");
const stable_hash_1 = require("../../common/stable-hash");
const signature_registry_1 = require("./calculation/signature-registry");
const legal_review_rules_1 = require("./legal-review-rules");
const exam_style_knowledge_1 = require("./exam-style-knowledge");
const generative_types_1 = require("./generative.types");
exports.STEM_ENDINGS = {
    combo_all_correct: '옳은 것만을 <보기>에서 있는 대로 고른 것은?',
    combo_all_appropriate: '적절한 것만을 <보기>에서 있는 대로 고른 것은?',
    combo_correct: '옳은 것만을 <보기>에서 고른 것은?',
    combo_appropriate: '적절한 것만을 <보기>에서 고른 것은?',
    best_appropriate: '가장 적절한 것은?',
    correct: '옳은 것은?',
    appropriate: '적절한 것은?',
    not_correct: '옳지 않은 것은?',
    not_appropriate: '적절하지 않은 것은?',
};
const ENDINGS_BY_FORMAT = {
    'truth_combination:positive': ['combo_all_correct', 'combo_all_appropriate', 'combo_correct', 'combo_appropriate'],
    'statement:positive': ['best_appropriate', 'correct', 'appropriate'],
    'statement:negative': ['not_correct', 'not_appropriate'],
    'short_label:positive': ['best_appropriate', 'correct'],
    'pair_table:positive': ['best_appropriate', 'correct'],
};
const VIEW_KEYS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ'];
const MAX_NEGATIVE_PER_EXAM = 2;
const MAX_SIGNATURE_PER_EXAM = 2;
const HARD_SIGNATURE_SHARE_SCALE = 1.5;
const DIVERSITY_HINTS = {
    kongil: [
        '식품 가공 공장', '자동차 부품 제조 기업', '반도체·전자 부품 기업', '섬유·의류 업체', '물류 센터',
        '석유 화학 공장', '가구 제조 기업', '철강·금속 가공 업체', '건설·플랜트 현장', '제약·바이오 기업',
        '조선·기계 장비 기업', '친환경 에너지 기업', '중소 부품 협력 업체', '스마트 공장 도입 기업', '특성화고 실습실',
    ],
    success: [
        '특성화고 3학년 학생', '카페·외식업 아르바이트생', 'IT 스타트업 신입 사원', '요양·돌봄 서비스 종사자',
        '플랫폼 배달 노동자', '호텔·관광 서비스 직원', '중소기업 인사 담당자', '청년 창업자', '고용 센터 직업 상담사',
        '제조업 생산직 근로자', '공공 기관 신규 채용 지원자', '현장 실습 중인 학생', '경력 단절 후 재취업자',
        '사회적 기업 운영자', '소규모 공방 운영자',
    ],
};
function planGenerativeExam(request) {
    const rng = seededRandom(`${request.seed}:plan`);
    const units = allocateUnits(request, rng);
    const sourceStats = statsForDifficulty(request.subject, request.difficulty);
    const modes = shuffle(largestRemainder(modeDistribution(sourceStats, request.difficulty), request.questionCount), rng);
    const answers = spreadAnswers(largestRemainder(sourceStats.answerPositions, request.questionCount).map(Number), rng);
    const statementSlots = modes.filter((mode) => mode === 'statement').length;
    let negativeLeft = Math.min(MAX_NEGATIVE_PER_EXAM, Math.round(statementSlots * sourceStats.negativeShareOfSingle));
    const points = allocatePoints(request.subject, units, request.difficulty, seededRandom(`${request.seed}:points`));
    const usage = new PlanUsage();
    for (const concept of request.avoidConcepts ?? [])
        usage.concepts.add(concept);
    return units.map((unitNumber, index) => {
        const mode = modes[index] ?? 'truth_combination';
        let polarity = 'positive';
        if (mode === 'statement' && negativeLeft > 0) {
            polarity = 'negative';
            negativeLeft -= 1;
        }
        return planItem({
            request,
            unitNumber,
            ordinal: index + 1,
            mode,
            polarity,
            answerIndex: (answers[index] ?? 1),
            points: points[index] ?? 2,
            usage,
            salt: '',
        });
    });
}
/** 한 슬롯이 끝내 실패했을 때: 형식·정답 위치는 유지하고 개념·자료·소재를 바꾼 대체 명세. */
/**
 * 예비 문항 계획: 본 시험의 약 30%(1~6개)를 같은 단원 범위에서 다른 개념으로 계획한다.
 * 순번은 본 문항 뒤(N+1…)로 매겨 시험지 배열 때 단원 자리에 끼워 넣는다.
 */
function planGenerativeReserves(request, main) {
    const count = Math.min(6, Math.max(1, Math.ceil(request.questionCount * 0.3)));
    return planGenerativeExam({
        ...request,
        questionCount: count,
        seed: `${request.seed}:reserve`,
        avoidConcepts: main.map((spec) => spec.targetConcept.name),
    }).map((spec, index) => ({ ...spec, ordinal: main.length + index + 1 }));
}
function replanGenerativeItem(request, failed, attempt, usedConcepts) {
    const usage = new PlanUsage();
    for (const concept of [...usedConcepts, failed.targetConcept.name])
        usage.concepts.add(concept);
    usage.genres.set(failed.material.genre, 3);
    return planItem({
        request,
        unitNumber: failed.unitNumber,
        ordinal: failed.ordinal,
        mode: failed.responseMode,
        polarity: failed.polarity,
        answerIndex: failed.answerIndex,
        points: failed.points,
        usage,
        salt: `:replan:${attempt}`,
    });
}
class PlanUsage {
    concepts = new Set();
    genres = new Map();
    shapes = new Map();
    hints = new Map();
    scenarios = new Map();
    signatures = new Map();
}
function planItem(input) {
    const { request, unitNumber, mode, polarity, answerIndex, usage } = input;
    const rng = seededRandom(`${request.seed}:item:${input.ordinal}${input.salt}`);
    const guide = (0, exam_style_knowledge_1.loadUnitGuide)(request.subject, unitNumber);
    const subjectProfile = (0, exam_style_knowledge_1.loadExamStyleProfile)().subjects[request.subject];
    const sourceStats = statsForDifficulty(request.subject, request.difficulty);
    const unitStats = subjectProfile.units[String(unitNumber)] ?? sourceStats;
    // 단원 특징 문항(계산·판정형) 여부는 별도 난수로 정해 다른 계획 요소의 난수 흐름을 바꾸지 않는다.
    const calcRng = seededRandom(`${request.seed}:calc:${input.ordinal}${input.salt}`);
    // 같은 모듈은 한 시험에 2번까지(같은 자료 틀이 반복되지 않게)
    const signatureChoice = (0, signature_registry_1.chooseSignature)(request.subject, unitNumber, mode, polarity, calcRng, signature_registry_1.SIGNATURE_MODULES.filter((module) => (usage.signatures.get(module.kind) ?? 0) < MAX_SIGNATURE_PER_EXAM), 
    // 상·통합 시험은 계산·판정형 특징 문항을 더 많이 넣는다.
    isHardExam(request.difficulty) ? HARD_SIGNATURE_SHARE_SCALE : 1);
    // statements 형식 특징 문항은 계산 진술과 맞는 개념 안에서 정답 개념을 고른다(요청 개념이 없을 때).
    // 맞는 개념을 이미 다 썼으면 겹치더라도 그 안에서 고른다: 무관한 개념이 붙는 것보다 낫다.
    const statementConcepts = (request.targetConcepts ?? []).length === 0 ? (0, signature_registry_1.signatureStatementConcepts)(guide, signatureChoice) : [];
    const pickedConcept = pickConcept(statementConcepts.length > 0 ? { ...guide, concepts: statementConcepts } : guide, request.targetConcepts, usage, rng);
    const signaturePreferred = (request.targetConcepts ?? []).length === 0 ? (0, signature_registry_1.signatureConcept)(guide, signatureChoice) : undefined;
    // 이미 쓴 개념(본 문항·이전 시도)이면 겹치지 않게 일반 선택으로 돌린다.
    const preferredConcept = signaturePreferred !== undefined && !usage.concepts.has(signaturePreferred.name) ? signaturePreferred : undefined;
    const targetConcept = preferredConcept ?? pickedConcept;
    usage.concepts.add(targetConcept.name);
    const companionConcepts = companionsFor(guide, targetConcept, rng);
    // 자료 형식은 실제 기출의 단원·출처별 블록 구성 분포에서 먼저 뽑고(같은 시험 안 반복은 감점),
    // 그 형식에 맞는 장르를 고른다. 장르 비중만 따르면 대화형으로 쏠린다.
    const shapeWeights = blend(unitStats.textualShapes, sourceStats.textualShapes);
    const stimulusShape = pickWeighted(generative_types_1.GENERATIVE_STIMULUS_SHAPES.map((shape) => ({
        value: shape,
        weight: (shapeWeights[shape] ?? 0) * Math.pow(0.45, usage.shapes.get(shape) ?? 0),
    })), rng, 'text');
    usage.shapes.set(stimulusShape, (usage.shapes.get(stimulusShape) ?? 0) + 1);
    const matchingGenres = guide.materialGenres.filter((genre) => shapeFor(genre, mode) === stimulusShape);
    const material = pickWeighted((matchingGenres.length > 0 ? matchingGenres : guide.materialGenres).map((genre) => ({
        value: genre,
        weight: genre.share * Math.pow(0.35, usage.genres.get(genre.genre) ?? 0),
    })), rng);
    usage.genres.set(material.genre, (usage.genres.get(material.genre) ?? 0) + 1);
    const endingKey = pickWeighted((ENDINGS_BY_FORMAT[`${mode}:${polarity}`] ?? ['best_appropriate']).map((key) => ({
        value: key,
        weight: (blend(unitStats.stemEndings, sourceStats.stemEndings)[key] ?? 0) + 0.01,
    })), rng);
    const openings = blend(unitStats.stemOpenings, sourceStats.stemOpenings);
    const stemOpening = pickWeighted([
        { value: 'direct', weight: openings.direct ?? 0.5 },
        { value: 'declarative', weight: openings.declarative ?? 0.4 },
    ], rng);
    let viewKeys;
    let comboChoiceSet;
    let trueViewKeys;
    if (mode === 'truth_combination') {
        const viewCount = pickWeighted(['3', '4'].map((count) => ({
            value: count,
            weight: (blend(unitStats.viewItemCounts, sourceStats.viewItemCounts)[count] ?? 0) + 0.01,
        })), rng);
        viewKeys = VIEW_KEYS.slice(0, Number(viewCount));
        const sets = sourceStats.comboChoiceSets[viewCount] ??
            subjectProfile.overall.comboChoiceSets[viewCount] ?? {};
        const signature = pickWeighted(Object.entries(sets)
            .filter(([set]) => set.split('|').length === 5)
            .map(([set, weight]) => ({ value: set, weight })), rng, viewCount === '3' ? 'ㄱ|ㄴ|ㄱㄷ|ㄴㄷ|ㄱㄴㄷ' : 'ㄱㄴ|ㄱㄷ|ㄴㄷ|ㄴㄹ|ㄷㄹ');
        comboChoiceSet = signature.split('|');
        trueViewKeys = [...(comboChoiceSet[answerIndex - 1] ?? 'ㄱ')];
    }
    const pairHeaders = mode === 'pair_table' ? pickPairHeaders(unitStats, rng) : undefined;
    // 단원 특징 문항: 자료 표·[조건]과 정답이 갈리는 진술·수치를 서버 규칙으로 확정한다.
    const calculation = signatureChoice === undefined
        ? undefined
        : (0, signature_registry_1.buildSignaturePlan)(signatureChoice, calcRng, { viewKeys, trueViewKeys, answerIndex, polarity });
    if (calculation !== undefined)
        usage.signatures.set(calculation.kind, (usage.signatures.get(calculation.kind) ?? 0) + 1);
    const falseCount = mode === 'truth_combination'
        ? (viewKeys?.length ?? 0) - (trueViewKeys?.length ?? 0)
        : polarity === 'negative'
            ? 1
            : 4;
    // 법·제도 단원은 노동법 시험식 오답 기법(기관·주체, 의무 강도, 기한, 적용 범위, 요건 누락)을 먼저 쓴다.
    const lawTechniques = shuffle((0, legal_review_rules_1.laborFalseTechniques)(request.subject, unitNumber), rng);
    const techniques = [
        ...lawTechniques,
        ...shuffle([...new Set([...guide.falseStatementTechniques, ...exam_style_knowledge_1.COMMON_FALSE_TECHNIQUES])].filter((technique) => !lawTechniques.includes(technique)), rng),
    ];
    const points = input.points;
    const unitDifficulty = (0, exam_style_knowledge_1.loadUnitDifficulty)(request.subject, unitNumber);
    const hintPool = DIVERSITY_HINTS[request.subject];
    const diversityHint = pickWeighted(hintPool.map((hint) => ({ value: hint, weight: Math.pow(0.2, usage.hints.get(hint) ?? 0) })), rng);
    usage.hints.set(diversityHint, (usage.hints.get(diversityHint) ?? 0) + 1);
    const scenarioArchetype = guide.scenarioArchetypes.length === 0
        ? `${material.genre}을(를) 통해 ${targetConcept.name}의 단서가 드러나는 상황`
        : pickWeighted(guide.scenarioArchetypes.map((scenario) => ({
            value: scenario,
            weight: Math.pow(0.25, usage.scenarios.get(scenario) ?? 0),
        })), rng);
    usage.scenarios.set(scenarioArchetype, (usage.scenarios.get(scenarioArchetype) ?? 0) + 1);
    const choiceBand = sourceStats.lengths.choiceByMode[mode] ??
        subjectProfile.overall.lengths.choiceByMode[mode] ??
        { p25: 20, median: 30, p75: 40 };
    const id = (0, stable_hash_1.stableHash)(`${request.seed}:${input.ordinal}${input.salt}:${targetConcept.name}:${mode}`);
    return {
        id: `gen_${id}`,
        ordinal: input.ordinal,
        subject: request.subject,
        unitNumber,
        unitTitle: guide.unitTitle,
        examFocus: guide.examFocus,
        targetConcept,
        companionConcepts,
        confusionPairs: guide.confusionPairs
            .filter((pair) => [pair.a, pair.b].some((name) => [targetConcept.name, ...companionConcepts.map((concept) => concept.name)].includes(name)))
            .slice(0, 6),
        responseMode: mode,
        polarity,
        stemEnding: calculation?.format === 'numeric'
            ? exports.STEM_ENDINGS.correct
            : exports.STEM_ENDINGS[endingKey] ?? '가장 적절한 것은?',
        stemOpening,
        stemExamples: [
            ...(sourceStats.stemShellsByMode[mode] ?? []).slice(0, 4),
            ...guide.stemVariants.slice(0, 3),
        ],
        conditionClause: rng() < sourceStats.conditionClauseShare,
        material: calculation === undefined
            ? material
            : { ...material, genre: calculation.genre, blockShape: 'text+table' },
        stimulusShape: calculation === undefined ? stimulusShape : 'table+text',
        scenarioArchetype,
        ...(viewKeys === undefined ? {} : { viewKeys, comboChoiceSet, trueViewKeys }),
        ...(pairHeaders === undefined ? {} : { pairHeaders }),
        ...(calculation === undefined ? {} : { calculation }),
        answerIndex,
        falseTechniques: techniques.slice(0, Math.max(1, falseCount)),
        trueStatementPatterns: guide.trueStatementPatterns.slice(0, 4),
        difficulty: request.difficulty,
        points,
        difficultyLevers: points === 3 ? guide.difficultyLevers.slice(0, 4) : [],
        lengths: {
            stem: sourceStats.lengths.stem,
            stimulus: sourceStats.lengths.stimulus,
            viewItem: sourceStats.lengths.viewItem,
            choice: choiceBand,
        },
        toneAndRegister: guide.toneAndRegister,
        numericConventions: guide.numericConventions,
        pitfallsToAvoid: guide.pitfallsToAvoid,
        diversityHint,
        unitDifficultyTier: unitDifficulty.tier,
    };
}
function statsForDifficulty(subject, difficulty) {
    const profile = (0, exam_style_knowledge_1.loadExamStyleProfile)().subjects[subject];
    // 수능특강(suteck)은 전부 2점 기본형, 모의평가·수능(moi)은 2·3점 반반이다.
    return difficulty === difficulty_1.Difficulty.HIGH || difficulty === difficulty_1.Difficulty.INTERGRATE
        ? profile.bySource.moi
        : profile.bySource.suteck;
}
/** 상·통합 난이도에서 빼는 응답 형식: 개념명 하나를 고르는 단답형은 개념 확인 수준이라 고난도가 되지 않는다. */
const HARD_EXCLUDED_MODES = new Set(['short_label']);
function isHardExam(difficulty) {
    return difficulty === difficulty_1.Difficulty.HIGH || difficulty === difficulty_1.Difficulty.INTERGRATE;
}
function modeDistribution(stats, difficulty) {
    const hard = isHardExam(difficulty);
    return Object.fromEntries(generative_types_1.GENERATIVE_RESPONSE_MODES.map((mode) => [
        mode,
        hard && HARD_EXCLUDED_MODES.has(mode) ? 0 : stats.responseModes[mode] ?? 0,
    ]));
}
/** 단원 통계가 희소하므로 단원 60% + 과목/출처 40%로 섞는다. */
function blend(unit, source) {
    const keys = new Set([...Object.keys(unit ?? {}), ...Object.keys(source)]);
    return Object.fromEntries([...keys].map((key) => [key, 0.6 * (unit?.[key] ?? 0) + 0.4 * (source[key] ?? 0)]));
}
/**
 * 난이도별 3점 배정.
 * - 하(LOW): 전부 2점
 * - 중(MIDDLE): 실제 모의평가·수능과 같은 단원별 3점 비율(공일 4단원 0% … 10단원 86%)
 * - 상(HIGH)·통합(INTERGRATE): 전부 3점 고난도(단원과 무관)
 */
const POINTS3_SCALE = {
    [difficulty_1.Difficulty.LOW]: 0,
    [difficulty_1.Difficulty.MIDDLE]: 1,
    [difficulty_1.Difficulty.HIGH]: Number.POSITIVE_INFINITY,
    [difficulty_1.Difficulty.INTERGRATE]: Number.POSITIVE_INFINITY,
};
/**
 * 중(MIDDLE): 시험 전체 3점 문항 수를 단원별 기출 3점 비율의 합으로 정하고(반올림),
 * 3점 자리는 그 비율에 비례해 고른다. 상·통합은 전부 3점, 하는 전부 2점.
 */
function allocatePoints(subject, units, difficulty, rng) {
    const scale = POINTS3_SCALE[difficulty] ?? 1;
    if (scale === Number.POSITIVE_INFINITY)
        return units.map(() => 3);
    if (scale === 0)
        return units.map(() => 2);
    const weights = units.map((unit) => Math.min(0.95, (0, exam_style_knowledge_1.loadUnitDifficulty)(subject, unit).points3Share * scale));
    const target = Math.round(weights.reduce((sum, weight) => sum + weight, 0));
    const points = units.map(() => 2);
    const open = weights.map((weight, index) => ({ value: index, weight }));
    for (let count = 0; count < target; count += 1) {
        const candidates = open.filter((entry) => entry.weight > 0 && points[entry.value] === 2);
        if (candidates.length === 0)
            break;
        points[pickWeighted(candidates, rng)] = 3;
    }
    return points;
}
function allocateUnits(request, rng) {
    const profile = (0, exam_style_knowledge_1.loadExamStyleProfile)().subjects[request.subject];
    const units = [];
    for (let unit = request.startUnitNum; unit <= request.endUnitNum; unit += 1)
        units.push(unit);
    // 기출 문항 수의 제곱근 가중: 많이 나온 단원을 더 내되 희소 단원도 빠지지 않게.
    const weights = Object.fromEntries(units.map((unit) => [String(unit), Math.sqrt(profile.units[String(unit)]?.count ?? 5)]));
    const allocation = largestRemainder(weights, request.questionCount).map(Number);
    // 단원 순서대로(실제 시험지처럼) 정렬하되 같은 단원 안 순서는 섞는다.
    return allocation
        .map((unit) => ({ unit, tie: rng() }))
        .sort((left, right) => left.unit - right.unit || left.tie - right.tie)
        .map((entry) => entry.unit);
}
/** 분포를 n개 슬롯으로 정수화(최대 잉여법). */
function largestRemainder(distribution, count) {
    const entries = Object.entries(distribution).filter(([, weight]) => weight > 0);
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    if (entries.length === 0 || total === 0 || count <= 0)
        return [];
    const raw = entries.map(([key, weight]) => ({ key, exact: (weight / total) * count }));
    const result = raw.map((entry) => ({ ...entry, floor: Math.floor(entry.exact) }));
    let remaining = count - result.reduce((sum, entry) => sum + entry.floor, 0);
    for (const entry of [...result].sort((left, right) => (right.exact - right.floor) - (left.exact - left.floor) || left.key.localeCompare(right.key))) {
        if (remaining <= 0)
            break;
        entry.floor += 1;
        remaining -= 1;
    }
    return result.flatMap((entry) => Array(entry.floor).fill(entry.key));
}
/** 정답 번호를 섞되 같은 번호가 세 번 연속 나오지 않게 한다. */
function spreadAnswers(answers, rng) {
    for (let attempt = 0; attempt < 50; attempt += 1) {
        const shuffled = shuffle(answers, rng);
        if (!shuffled.some((answer, index) => index >= 2 && answer === shuffled[index - 1] && answer === shuffled[index - 2])) {
            return shuffled;
        }
    }
    return shuffle(answers, rng);
}
function pickConcept(guide, requested, usage, rng) {
    const requestedSet = new Set((requested ?? []).map(normalizeName));
    const concepts = guide.concepts.length > 0
        ? guide.concepts
        : [{
                name: guide.unitTitle,
                definition: '',
                keyFacts: [],
                diagnosticCues: [],
                confusableWith: [],
                weight: 1,
            }];
    // 이미 쓴 개념은 안 쓴 개념이 남아 있으면 후보에서 뺀다(예비 문항·대체 명세가 본 문항과 겹치지 않게).
    const unused = concepts.filter((concept) => !usage.concepts.has(concept.name));
    const pool = unused.length > 0 ? unused : concepts;
    return pickWeighted(pool.map((concept) => ({
        value: concept,
        weight: concept.weight * (requestedSet.has(normalizeName(concept.name)) ? 6 : 1),
    })), rng);
}
function companionsFor(guide, target, rng) {
    const byName = new Map(guide.concepts.map((concept) => [normalizeName(concept.name), concept]));
    const preferred = [
        ...target.confusableWith,
        ...guide.confusionPairs.flatMap((pair) => pair.a === target.name ? [pair.b] : pair.b === target.name ? [pair.a] : []),
    ];
    const result = [];
    const seen = new Set([normalizeName(target.name)]);
    for (const name of preferred) {
        const key = normalizeName(name);
        if (seen.has(key))
            continue;
        seen.add(key);
        result.push(byName.get(key) ?? {
            name,
            definition: '',
            keyFacts: [],
            diagnosticCues: [],
            confusableWith: [],
            weight: 1,
        });
    }
    const rest = shuffle(guide.concepts.filter((concept) => !seen.has(normalizeName(concept.name))), rng).sort((left, right) => right.weight - left.weight);
    return [...result, ...rest].slice(0, 5);
}
function shapeFor(material, mode) {
    const shape = material.blockShape.toLowerCase();
    const hasTable = shape.includes('table');
    const hasDialogue = shape.includes('dialogue');
    const hasText = shape.includes('text') || (!hasTable && !hasDialogue);
    if (hasTable)
        return hasText || hasDialogue || mode === 'truth_combination' ? 'table+text' : 'table';
    if (hasDialogue)
        return hasText ? 'dialogue+text' : 'dialogue';
    return 'text';
}
function pickPairHeaders(stats, rng) {
    const candidates = Object.entries(stats.choiceTableHeaders ?? {})
        .map(([header, weight]) => ({ parts: header.split(' | '), weight }))
        .filter((entry) => entry.parts.length === 2);
    if (candidates.length === 0 || rng() < 0.5)
        return ['(가)', '(나)'];
    const picked = pickWeighted(candidates.map((entry) => ({ value: entry.parts, weight: entry.weight })), rng);
    return [picked[0], picked[1]];
}
function normalizeName(name) {
    return name.normalize('NFKC').replace(/\s+/gu, '');
}
function seededRandom(seed) {
    let state = Number.parseInt((0, stable_hash_1.stableHash)(seed), 16) || 1;
    return () => {
        state = (state + 0x6d2b79f5) | 0;
        let value = Math.imul(state ^ (state >>> 15), 1 | state);
        value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}
function shuffle(values, rng) {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(rng() * (index + 1));
        [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
}
function pickWeighted(options, rng, fallback) {
    const valid = options.filter((option) => Number.isFinite(option.weight) && option.weight > 0);
    const total = valid.reduce((sum, option) => sum + option.weight, 0);
    if (valid.length === 0 || total <= 0) {
        if (fallback !== undefined)
            return fallback;
        if (options.length > 0)
            return options[0].value;
        throw new Error('선택할 후보가 없습니다.');
    }
    let roll = rng() * total;
    for (const option of valid) {
        roll -= option.weight;
        if (roll <= 0)
            return option.value;
    }
    return valid[valid.length - 1].value;
}

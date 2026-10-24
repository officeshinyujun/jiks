"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GenerativeOutputError = void 0;
exports.parseGenerativeCandidate = parseGenerativeCandidate;
exports.validateGenerativeCandidate = validateGenerativeCandidate;
exports.assembleGenerativeQuestion = assembleGenerativeQuestion;
exports.buildConceptHighlight = buildConceptHighlight;
exports.pairRowReason = pairRowReason;
exports.renderForSolver = renderForSolver;
exports.duplicateCheckText = duplicateCheckText;
exports.stimulusPlainText = stimulusPlainText;
exports.applyCalculationPlan = applyCalculationPlan;
exports.repairUnusedLabels = repairUnusedLabels;
exports.unusedStimulusLabels = unusedStimulusLabels;
exports.normalizeStem = normalizeStem;
exports.dialogueShapeIssue = dialogueShapeIssue;
const source_blocks_stimulus_1 = require("../source-blocks-stimulus");
const stable_hash_1 = require("../../common/stable-hash");
const calculation_kit_1 = require("./calculation/calculation-kit");
const concept_leak_1 = require("./concept-leak");
const exam_register_1 = require("./exam-register");
const NUMERALS = ['①', '②', '③', '④', '⑤'];
const FORBIDDEN_IN_STIMULUS = /<보기>|고르시오|고른 것은|정답|[①②③④⑤]/u;
const DEGENERATE_CHOICE = /모두 (옳|맞|틀)|정답 ?없음|알 수 없다|이상 모두/u;
class GenerativeOutputError extends Error {
    issues;
    name = 'GenerativeOutputError';
    constructor(issues) {
        super(issues.map((issue) => `${issue.code}: ${issue.message}`).join('; '));
        this.issues = issues;
    }
}
exports.GenerativeOutputError = GenerativeOutputError;
/** JSON 파싱 + 모양 정규화. 스키마 위반은 GEN_SCHEMA_INVALID. */
function parseGenerativeCandidate(content, spec) {
    let raw;
    try {
        raw = JSON.parse(content);
    }
    catch {
        throw new GenerativeOutputError([{ code: 'GEN_SCHEMA_INVALID', message: 'JSON이 아닙니다.' }]);
    }
    if (!isRecord(raw)) {
        throw new GenerativeOutputError([{ code: 'GEN_SCHEMA_INVALID', message: '객체가 아닙니다.' }]);
    }
    const design = isRecord(raw.design) ? raw.design : {};
    const explanation = isRecord(raw.explanation) ? raw.explanation : {};
    const blocks = Array.isArray(raw.blocks) ? raw.blocks.map(parseBlock) : [];
    if (blocks.some((block) => block === null)) {
        throw new GenerativeOutputError([{ code: 'GEN_SCHEMA_INVALID', message: '제시문 블록 형식이 잘못되었습니다.' }]);
    }
    const candidate = {
        design: {
            scenario: text(design.scenario),
            clues: texts(design.clues),
            difficultyDevices: texts(design.difficultyDevices),
        },
        blocks: blocks,
        stem: normalizeStem(text(raw.stem)),
        explanation: {
            intent: text(explanation.intent),
            solution: text(explanation.solution),
            distractorNotes: texts(explanation.distractorNotes),
            clues: Array.isArray(explanation.clues)
                ? explanation.clues.filter(isRecord).map((clue) => ({ quote: text(clue.quote), why: text(clue.why) }))
                : [],
            steps: texts(explanation.steps),
            takeaway: text(explanation.takeaway),
        },
    };
    if (spec.responseMode === 'truth_combination') {
        candidate.viewItems = Array.isArray(raw.viewItems)
            ? raw.viewItems.filter(isRecord).map((item) => ({
                key: text(item.key),
                text: stripViewPrefix(text(item.text)),
                truth: item.truth === true,
                basis: text(item.basis),
            }))
            : [];
    }
    else if (spec.responseMode === 'pair_table') {
        const table = isRecord(raw.pairTable) ? raw.pairTable : {};
        candidate.pairTable = {
            headers: pair(table.headers),
            keyedRow: pair(table.keyedRow),
            otherRows: Array.isArray(table.otherRows) ? table.otherRows.map(pair) : [],
        };
    }
    else {
        const keyed = isRecord(raw.keyedChoice) ? raw.keyedChoice : {};
        candidate.keyedChoice = { text: stripNumeral(text(keyed.text)), basis: text(keyed.basis) };
        candidate.otherChoices = Array.isArray(raw.otherChoices)
            ? raw.otherChoices.filter(isRecord).map((choice) => ({
                text: stripNumeral(text(choice.text)),
                basis: text(choice.basis),
            }))
            : [];
    }
    return applyExamRegister(candidate);
}
/**
 * 평가원 문체·표기 보정(exam-register): 서술문은 문어체("하였다·되었다·하여")와 표기 관례를,
 * 대화 발화·발문·짝짓기 칸은 표기 관례만 맞춘다.
 */
function applyExamRegister(candidate) {
    const prose = exam_register_1.normalizeExamRegister;
    const notation = exam_register_1.normalizeExamNotation;
    return {
        ...candidate,
        stem: notation(candidate.stem),
        blocks: candidate.blocks.map((block) => ({
            ...block,
            text: prose(block.text),
            title: notation(block.title),
            headers: block.headers.map(prose),
            rows: block.rows.map((row) => row.map(prose)),
            lines: block.lines.map((line) => ({ speaker: notation(line.speaker), text: notation(line.text) })),
        })),
        ...(candidate.viewItems === undefined
            ? {}
            : { viewItems: candidate.viewItems.map((item) => ({ ...item, text: prose(item.text), basis: prose(item.basis) })) }),
        ...(candidate.keyedChoice === undefined
            ? {}
            : { keyedChoice: { text: prose(candidate.keyedChoice.text), basis: prose(candidate.keyedChoice.basis) } }),
        ...(candidate.otherChoices === undefined
            ? {}
            : { otherChoices: candidate.otherChoices.map((choice) => ({ text: prose(choice.text), basis: prose(choice.basis) })) }),
        ...(candidate.pairTable === undefined
            ? {}
            : {
                pairTable: {
                    headers: [notation(candidate.pairTable.headers[0]), notation(candidate.pairTable.headers[1])],
                    keyedRow: [notation(candidate.pairTable.keyedRow[0]), notation(candidate.pairTable.keyedRow[1])],
                    otherRows: candidate.pairTable.otherRows.map((row) => [notation(row[0]), notation(row[1])]),
                },
            }),
        explanation: {
            ...candidate.explanation,
            intent: prose(candidate.explanation.intent),
            solution: prose(candidate.explanation.solution),
            distractorNotes: candidate.explanation.distractorNotes.map(prose),
            // 단서 인용(quote)은 표기만 맞추고, 제시문(문어체 보정)과의 대조는 buildConceptHighlight에서 두 형태로 한다.
            clues: candidate.explanation.clues.map((clue) => ({ quote: notation(clue.quote), why: prose(clue.why) })),
            steps: candidate.explanation.steps.map(prose),
            takeaway: prose(candidate.explanation.takeaway),
        },
    };
}
/** 결정론적 품질 게이트. 빈 배열이면 통과. */
function validateGenerativeCandidate(spec, candidate) {
    const issues = [];
    const push = (code, message) => issues.push({ code, message });
    // 발문
    const stem = candidate.stem;
    const endingAt = stem.indexOf(spec.stemEnding);
    if (endingAt < 0) {
        push('GEN_STEM_INVALID', `발문이 "${spec.stemEnding}"로 끝나지 않습니다.`);
    }
    else {
        const tail = stem.slice(endingAt + spec.stemEnding.length).trim();
        if (tail !== '' && !/^\(단,.+\)$/u.test(tail)) {
            push('GEN_STEM_INVALID', `발문 끝 뒤에 허용되지 않는 문구가 있습니다: ${tail.slice(0, 30)}`);
        }
    }
    if (!stem.startsWith('다음'))
        push('GEN_STEM_INVALID', '발문은 "다음"으로 시작해야 합니다.');
    if (VACUOUS_CONDITION.test(stem)) {
        push('GEN_STEM_INVALID', '"(단, 제시문에 드러난 내용만으로 판단한다.)"처럼 판정 기준을 주지 않는 조건은 빼십시오.');
    }
    if (/\n/u.test(stem))
        push('GEN_STEM_INVALID', '발문에 줄바꿈이 있습니다.');
    // 수치형 특징 문항은 서버가 정한 기출형 발문("다음 … [조건]에 따라 …")을 쓰므로 분량 검사를 하지 않는다.
    if (spec.calculation?.format !== 'numeric')
        checkLength(push, '발문', stem.length, spec.lengths.stem, 0.5, 2);
    const fixedTexts = calculationFixedTexts(spec);
    // 제시문
    const shapeKinds = new Set(spec.stimulusShape.split('+'));
    const blockKinds = new Set(candidate.blocks.map((block) => block.type));
    if (shapeKinds.size !== blockKinds.size || [...shapeKinds].some((kind) => !blockKinds.has(kind))) {
        push('GEN_STIMULUS_INVALID', `제시문 블록 구성이 ${spec.stimulusShape}가 아닙니다 (${[...blockKinds].join('+')}).`);
    }
    for (const block of candidate.blocks) {
        if (block.type === 'text' && block.text === '')
            push('GEN_STIMULUS_INVALID', '빈 text 블록이 있습니다.');
        if (block.type === 'table') {
            if (block.rows.length === 0)
                push('GEN_STIMULUS_INVALID', '표에 행이 없습니다.');
            const width = block.headers.length > 0 ? block.headers.length : block.rows[0]?.length ?? 0;
            if (width < 2 || block.rows.some((row) => row.length !== width)) {
                push('GEN_STIMULUS_INVALID', '표의 칸 수가 머리행과 맞지 않습니다.');
            }
            if (block.rows.some((row) => row.every((cell) => cell.trim() === ''))) {
                push('GEN_STIMULUS_INVALID', '표에 빈 행이 있습니다.');
            }
        }
        if (block.type === 'dialogue') {
            const speakers = new Set(block.lines.map((line) => line.speaker));
            if (block.lines.length < 2 || speakers.size < 2) {
                push('GEN_STIMULUS_INVALID', '대화는 두 명 이상이 두 번 이상 발화해야 합니다.');
            }
            if (block.lines.some((line) => line.speaker === '' || line.text === '')) {
                push('GEN_STIMULUS_INVALID', '화자나 발화가 빈 대화 줄이 있습니다.');
            }
            const issue = dialogueShapeIssue(block.lines.map((line) => line.text));
            if (issue !== null)
                push('GEN_STIMULUS_INVALID', issue);
        }
    }
    const stimulusText = stimulusPlainText(candidate.blocks);
    if (FORBIDDEN_IN_STIMULUS.test(stimulusText)) {
        push('GEN_STIMULUS_INVALID', '제시문에 발문·선지 표지(<보기>, ①, 정답 등)가 있습니다.');
    }
    // 특징 문항은 서버 표·[조건]이 더해져 기출 계산 문항처럼 길다.
    const stimulusHigh = spec.calculation !== undefined ? 3 : spec.points === 3 ? 2.4 : 2;
    checkLength(push, '제시문', stimulusLength(candidate.blocks), spec.lengths.stimulus, 0.8, stimulusHigh);
    // 서버가 확정한 표(제목 포함)·[조건]은 모델이 쓴 글이 아니므로 개념명 노출 검사에서 뺀다.
    const leakedConcept = (0, concept_leak_1.findConceptLeak)(spec.targetConcept.name, stimulusPlainText(modelWrittenBlocks(spec, candidate.blocks)));
    if (leakedConcept !== null) {
        push('GEN_ANSWER_LEAK', `제시문에 정답 개념 "${leakedConcept}"이(가) 드러납니다. 개념명 없이 행동·수치·상황 단서로만 보여 주십시오.`);
    }
    const firstText = candidate.blocks.find((block) => block.type === 'text')?.text ?? '';
    if (candidate.blocks[0]?.type === 'text' && /^다음(은|과|의)?\s/u.test(firstText)) {
        push('GEN_STIMULUS_INVALID', '제시문이 "다음은 …"으로 시작합니다. 자료 소개는 발문에서 하고 제시문은 자료 자체로 시작하십시오.');
    }
    const unusedLabels = unusedStimulusLabels(stimulusText, questionSideText(candidate));
    if (unusedLabels.length > 0) {
        push('GEN_STIMULUS_INVALID', `제시문 라벨 ${unusedLabels.join(', ')}이(가) 발문·<보기>·선지 어디에서도 쓰이지 않습니다. 라벨을 쓰면 그 라벨로 묻고, 묻지 않을 라벨은 빼십시오.`);
    }
    if (spec.points === 3 && candidate.design.difficultyDevices.length === 0) {
        push('GEN_TOO_EASY', '3점 문항인데 난도 장치(계산·단서 분산·복합 개념 등)가 없습니다.');
    }
    // 응답 형식
    if (spec.responseMode === 'truth_combination') {
        const items = candidate.viewItems ?? [];
        const keys = spec.viewKeys ?? [];
        const byKey = new Map(items.map((item) => [item.key, item]));
        if (items.length !== keys.length || keys.some((key) => !byKey.has(key))) {
            push('GEN_SCHEMA_INVALID', `<보기>는 ${keys.join(', ')} 각각 하나씩이어야 합니다.`);
        }
        else {
            const truths = new Set(spec.trueViewKeys ?? []);
            const mismatched = keys.filter((key) => byKey.get(key)?.truth !== truths.has(key));
            if (mismatched.length > 0) {
                push('GEN_TRUTH_PLAN_MISMATCH', `<보기> ${mismatched.join(', ')}의 참/거짓이 지정값과 다릅니다.`);
            }
            const texts = keys.map((key) => normalize(byKey.get(key)?.text ?? ''));
            if (texts.some((value) => value === '') || new Set(texts).size !== texts.length) {
                push('GEN_CHOICES_INVALID', '<보기> 진술이 비었거나 중복입니다.');
            }
            for (const key of keys) {
                const text = byKey.get(key)?.text ?? '';
                if (!fixedTexts.has(text))
                    checkLength(push, `<보기> ${key}`, text.length, spec.lengths.viewItem, 0.4, 2.2);
            }
        }
        if (!keys.every((key) => candidate.explanation.solution.includes(key))) {
            push('GEN_EXPLANATION_INVALID', '해설이 모든 <보기>를 판정하지 않습니다.');
        }
    }
    else if (spec.responseMode === 'pair_table') {
        const table = candidate.pairTable;
        const headers = spec.pairHeaders ?? ['(가)', '(나)'];
        const rows = table === undefined ? [] : [table.keyedRow, ...table.otherRows];
        if (table === undefined || rows.length !== 5 || rows.some((row) => row.length !== 2 || row.some((cell) => cell === ''))) {
            push('GEN_SCHEMA_INVALID', '짝짓기 표는 2칸짜리 행 5개여야 합니다.');
        }
        else {
            if (normalize(table.headers.join('|')) !== normalize(headers.join('|'))) {
                push('GEN_CHOICES_INVALID', `짝짓기 표 머리행은 ${headers.join(' | ')}여야 합니다.`);
            }
            const keys = rows.map((row) => normalize(row.join('|')));
            if (new Set(keys).size !== 5)
                push('GEN_CHOICES_INVALID', '짝짓기 행이 중복됩니다.');
            const leaked = table.keyedRow.filter((cell) => containsTerm(stimulusText + candidate.stem, cell));
            if (leaked.length > 0)
                push('GEN_ANSWER_LEAK', `정답 용어가 제시문/발문에 노출되었습니다: ${leaked.join(', ')}`);
        }
    }
    else {
        const keyed = candidate.keyedChoice?.text ?? '';
        const others = (candidate.otherChoices ?? []).map((choice) => choice.text);
        const all = [keyed, ...others];
        if (others.length !== 4 || all.some((choice) => choice === '')) {
            push('GEN_SCHEMA_INVALID', '선지는 정답 1개와 나머지 4개여야 합니다.');
        }
        else {
            if (new Set(all.map(normalize)).size !== 5)
                push('GEN_CHOICES_INVALID', '선지가 중복됩니다.');
            if (all.some((choice) => DEGENERATE_CHOICE.test(choice))) {
                push('GEN_CHOICES_INVALID', '"모두 옳다/정답 없음" 류 선지는 허용되지 않습니다.');
            }
            const otherMedian = median(others.map((choice) => choice.length));
            if (spec.responseMode === 'statement' && !fixedTexts.has(keyed) && otherMedian > 0 && keyed.length > otherMedian * 1.6 && keyed.length - otherMedian > 12) {
                push('GEN_CHOICES_INVALID', '정답 선지만 눈에 띄게 깁니다(길이 단서).');
            }
            if (spec.responseMode === 'short_label' && containsTerm(stimulusText + candidate.stem, keyed)) {
                push('GEN_ANSWER_LEAK', `정답 용어 "${keyed}"가 제시문/발문에 노출되었습니다.`);
            }
            for (const choice of all) {
                if (fixedTexts.has(choice))
                    continue;
                checkLength(push, '선지', choice.length, spec.lengths.choice, spec.responseMode === 'short_label' ? 0.2 : 0.4, 2.4);
            }
        }
    }
    if (candidate.explanation.intent === '' || candidate.explanation.solution === '') {
        push('GEN_EXPLANATION_INVALID', '해설(출제 의도·정답 근거)이 비었습니다.');
    }
    if (candidate.explanation.distractorNotes.length === 0) {
        push('GEN_EXPLANATION_INVALID', '오답 해설이 없습니다.');
    }
    return issues;
}
/** 검증을 통과한 후보를 서버가 정한 정답 위치·조합으로 조립한다. */
function assembleGenerativeQuestion(spec, candidate) {
    let optionBodies;
    let comboBlock = null;
    let choiceTable = null;
    if (spec.responseMode === 'truth_combination') {
        const keys = spec.viewKeys ?? [];
        const byKey = new Map((candidate.viewItems ?? []).map((item) => [item.key, item]));
        comboBlock = {
            title: '<보기>',
            items: keys.map((key) => ({ key, text: byKey.get(key)?.text ?? '' })),
        };
        optionBodies = (spec.comboChoiceSet ?? []).map((signature) => [...signature].join(', '));
    }
    else if (spec.responseMode === 'pair_table') {
        const table = candidate.pairTable;
        if (table === undefined)
            throw new GenerativeOutputError([{ code: 'GEN_SCHEMA_INVALID', message: '짝짓기 표가 없습니다.' }]);
        const rows = placeAt([...table.otherRows], table.keyedRow, spec.answerIndex);
        choiceTable = { headers: [...(spec.pairHeaders ?? table.headers)], rows: rows.map((row) => [...row]) };
        optionBodies = rows.map((row) => `${row[0]} / ${row[1]}`);
    }
    else {
        optionBodies = placeAt((candidate.otherChoices ?? []).map((choice) => choice.text), candidate.keyedChoice?.text ?? '', spec.answerIndex);
    }
    const stimulusData = (0, source_blocks_stimulus_1.sanitizeSourceBlocksStimulus)({
        blocks: candidate.blocks.map(toSourceBlock),
        figures: {},
        choice_table: choiceTable,
    });
    if (stimulusData === null) {
        throw new GenerativeOutputError([{ code: 'GEN_STIMULUS_INVALID', message: 'TPL_SOURCE_BLOCKS 계약을 만족하지 않습니다.' }]);
    }
    const optionsList = optionBodies.map((body, index) => `${NUMERALS[index]} ${body}`);
    const explanation = [
        `[출제 의도] ${candidate.explanation.intent}`,
        `[해설] ${candidate.explanation.solution}`,
        `[오답 피하기] ${candidate.explanation.distractorNotes.join(' ')}`,
        ...calculationExplanation(spec),
    ].join('\n');
    return {
        targetConcept: spec.targetConcept.name,
        itemType: `ai_generative_${spec.responseMode}`,
        difficulty: spec.difficulty,
        recommendedTemplate: source_blocks_stimulus_1.SOURCE_BLOCKS_TPL,
        questionStem: candidate.stem,
        stimulusData,
        optionsList,
        comboBlock,
        explanation: (() => {
            const highlight = buildConceptHighlight(spec, candidate);
            return highlight === null ? { judgment: explanation } : { judgment: explanation, conceptHighlightV2: highlight };
        })(),
        correctAnswer: spec.answerIndex,
        points: spec.points,
        fingerprint: (0, stable_hash_1.stableHash)(normalize([candidate.stem, stimulusPlainText(candidate.blocks), ...optionsList,
            ...(comboBlock?.items.map((item) => item.text) ?? [])].join('|'))),
    };
}
/**
 * 공부 화면(conceptHighlightV2)과 같은 단계별 해설을 만든다.
 * O/X는 서버가 아는 정답·참거짓으로 확정하고(모델 판단을 쓰지 않음), 단서 인용은 제시문에 글자 그대로 있는 것만 남긴다.
 * 조건을 못 맞추면 null(기존 문자열 해설만 저장, 문항은 버리지 않는다).
 */
function buildConceptHighlight(spec, candidate) {
    const plain = compactSpaces(stimulusPlainText(candidate.blocks));
    // 글은 문어체로 보정되고 대화는 구어로 남으므로, 인용이 어느 쪽에서 왔든 제시문에 실제로 있는 형태를 쓴다.
    const stimulusClues = candidate.explanation.clues
        .map((clue) => {
        const quote = clue.quote.trim();
        const formal = (0, exam_register_1.normalizeExamRegister)(quote);
        const found = [quote, formal].find((form) => form.length >= 2 && plain.includes(compactSpaces(form)));
        return found === undefined ? null : { quote: found, why: clue.why.trim() };
    })
        .filter((clue) => clue !== null && clue.why !== '')
        .slice(0, 4);
    const solvingFlow = candidate.explanation.steps
        .map((action) => action.replace(/^\s*(?:[①-⑨]|\d+[.)])\s*/u, '').trim())
        .filter((action) => action !== '')
        .map((action, index) => ({ step: index + 1, action }));
    const takeaway = candidate.explanation.takeaway.trim();
    const optionAnalysis = buildOptionAnalysis(spec, candidate);
    if (stimulusClues.length === 0 || solvingFlow.length < 3 || takeaway === '' || optionAnalysis.length === 0)
        return null;
    return { stimulusClues, optionAnalysis, solvingFlow, takeaway };
}
function buildOptionAnalysis(spec, candidate) {
    const reason = (value, verdict) => value?.trim() || (verdict === 'O' ? '제시문 단서와 교과 개념에 비추어 옳은 진술이다.' : '제시문 단서와 교과 개념에 비추어 옳지 않은 진술이다.');
    if (spec.responseMode === 'truth_combination') {
        const truths = new Set(spec.trueViewKeys ?? []);
        const byKey = new Map((candidate.viewItems ?? []).map((item) => [item.key, item]));
        return (spec.viewKeys ?? []).map((key) => {
            const verdict = truths.has(key) ? 'O' : 'X';
            return { optionKey: key, verdict, reasoning: reason(byKey.get(key)?.basis, verdict) };
        });
    }
    // 단일 정답형: 정답 선지가 "옳은 것"이면 O, "옳지 않은 것"이면 X, 나머지는 반대.
    const keyedVerdict = spec.polarity === 'negative' ? 'X' : 'O';
    const otherVerdict = keyedVerdict === 'O' ? 'X' : 'O';
    let keyedReason;
    let otherReasons;
    if (spec.responseMode === 'pair_table' && candidate.pairTable !== undefined) {
        const table = candidate.pairTable;
        keyedReason = candidate.explanation.solution;
        otherReasons = table.otherRows.map((row) => pairRowReason(table.headers, table.keyedRow, row, candidate.explanation.distractorNotes));
    }
    else {
        keyedReason = candidate.keyedChoice?.basis;
        otherReasons = (candidate.otherChoices ?? []).map((choice) => choice.basis || numericDistractorNote(spec, choice.text));
    }
    const ordered = placeAt(otherReasons.map((value) => ({ verdict: otherVerdict, reasoning: reason(value, otherVerdict) })), { verdict: keyedVerdict, reasoning: reason(keyedReason, keyedVerdict) }, spec.answerIndex);
    return ordered.map((entry, index) => ({ optionNum: index + 1, ...entry }));
}
/**
 * 짝짓기 오답 행의 해설: 어느 칸이 정답 짝과 다른지 밝히고, 틀린 칸 값을 언급한 오답 피하기 문장을 붙인다.
 * (오답 피하기 문장은 행 순서가 아니라 값별로 쓰이므로 순서대로 붙이면 다른 선지에 붙는다.)
 */
function pairRowReason(headers, keyedRow, row, notes) {
    const wrong = row.flatMap((cell, index) => (cell === keyedRow[index] ? [] : [index]));
    if (wrong.length === 0)
        return '';
    const fix = wrong
        .map((index) => {
        const answer = keyedRow[index] ?? '';
        return `${headers[index] ?? ''}에는 ‘${row[index]}’ 대신 ‘${answer}’${(0, calculation_kit_1.josa)(answer, '이/가').slice(answer.length)} 들어가야 한다.`;
    })
        .join(' ');
    const related = notes.filter((note) => wrong.some((index) => note.includes(row[index] ?? '\u0000')));
    return [fix, ...related].join(' ');
}
/** 수치 선지형: 서버가 만든 오답 수치 이유("39분은 …")를 선지에 붙인다. */
function numericDistractorNote(spec, choice) {
    return spec.calculation?.numeric?.distractorNotes.find((note) => note.startsWith(choice));
}
function compactSpaces(value) {
    return value.replace(/\s+/gu, '');
}
/** 검토 모델에게 학생 화면과 같은 정보만 텍스트로 보여 준다(정답·해설 제외). */
function renderForSolver(question) {
    const lines = ['[제시문]'];
    for (const block of question.stimulusData.blocks) {
        if (block.type === 'text')
            lines.push(block.text);
        if (block.type === 'table') {
            if (block.title)
                lines.push(`<${block.title}>`);
            for (const header of block.headers)
                lines.push(`| ${header.join(' | ')} |`);
            for (const row of block.rows)
                lines.push(`| ${row.join(' | ')} |`);
            if (block.caption)
                lines.push(block.caption);
        }
        if (block.type === 'dialogue') {
            for (const line of block.lines)
                lines.push(`${line.speaker}: ${line.text}`);
        }
    }
    lines.push('', `[발문] ${question.questionStem}`);
    if (question.comboBlock !== null) {
        lines.push('', '<보기>');
        for (const item of question.comboBlock.items)
            lines.push(`${item.key}. ${item.text}`);
    }
    if (question.stimulusData.choice_table !== null) {
        lines.push('', `[선지 표 머리행] ${question.stimulusData.choice_table.headers.join(' / ')}`);
    }
    lines.push('', '[선지]', ...question.optionsList);
    return lines.join('\n');
}
/**
 * 중복 검사용 제시문: 특징 문항은 서버 표·[조건]이 같은 틀이라 모델이 쓴 블록만 비교한다.
 * (서버 자료는 매번 다른 수치로 만들어지므로 실제 중복이 아니다.)
 */
/** 서버 확정 자료(계산 표·[조건])를 뺀, 모델이 직접 쓴 제시문 블록 */
function modelWrittenBlocks(spec, blocks) {
    const plan = spec.calculation;
    if (plan === undefined)
        return blocks;
    const fixedTitles = new Set(plan.tables.map((table) => table.title));
    return blocks.filter((block) => !(block.type === 'table' && fixedTitles.has(block.title)) && !(block.type === 'text' && block.text.startsWith('[조건]')));
}
function duplicateCheckText(spec, blocks) {
    if (spec.calculation === undefined)
        return stimulusPlainText(blocks);
    return stimulusPlainText(blocks.filter((block) => block.type !== 'table' && !(block.type === 'text' && block.text.startsWith('[조건]'))));
}
function stimulusPlainText(blocks) {
    return blocks
        .map((block) => block.type === 'text'
        ? block.text
        : block.type === 'table'
            ? [block.title, ...block.headers, ...block.rows.flat()].join(' ')
            : block.lines.map((line) => `${line.speaker} ${line.text}`).join(' '))
        .join('\n');
}
/**
 * 단원 특징 문항: 서버가 확정한 자료 표·[조건]·계산 진술·수치 선지로 덮어쓴다.
 * 모델이 표 수치나 계산 진술을 바꿔 써도 정답 근거는 항상 서버 계산과 일치한다.
 */
function applyCalculationPlan(spec, candidate) {
    const plan = spec.calculation;
    if (plan === undefined)
        return candidate;
    const tables = plan.tables.map((table) => ({
        type: 'table',
        text: '',
        title: table.title,
        headers: [...table.headers],
        rows: table.rows.map((row) => [...row]),
        lines: [],
    }));
    // 모델이 쓴 표는 서버 표로 바꾸고(첫 표 자리에), 나머지 블록 순서는 유지한다.
    const firstTable = candidate.blocks.findIndex((block) => block.type === 'table');
    const kept = candidate.blocks.filter((block) => block.type !== 'table');
    const blocks = firstTable < 0
        ? [...kept, ...tables]
        : [
            ...candidate.blocks.slice(0, firstTable).filter((block) => block.type !== 'table'),
            ...tables,
            ...candidate.blocks.slice(firstTable).filter((block) => block.type !== 'table'),
        ];
    if (plan.conditions.length > 0) {
        blocks.push({
            type: 'text',
            text: ['[조건]', ...plan.conditions.map((condition) => `∙ ${condition}`)].join('\n'),
            title: '',
            headers: [],
            rows: [],
            lines: [],
        });
    }
    const fixed = new Map(plan.statements.map((statement) => [statement.key, statement]));
    const next = {
        ...candidate,
        blocks,
        ...(candidate.viewItems === undefined
            ? {}
            : {
                viewItems: candidate.viewItems.map((item) => {
                    const statement = fixed.get(item.key);
                    return statement === undefined
                        ? item
                        : { key: item.key, text: statement.text, truth: statement.truth, basis: statement.rationale };
                }),
            }),
    };
    if (plan.format === 'choices' && plan.choices !== undefined) {
        const others = [...(candidate.otherChoices ?? [])];
        others[0] = { text: plan.choices.distractor.text, basis: plan.choices.distractor.rationale };
        next.keyedChoice = { text: plan.choices.keyed.text, basis: plan.choices.keyed.rationale };
        next.otherChoices = others;
    }
    if (plan.format === 'numeric' && plan.numeric !== undefined) {
        const values = plan.numeric.choices;
        next.stem = plan.numeric.stem;
        next.keyedChoice = { text: values[spec.answerIndex - 1] ?? '', basis: plan.numeric.rationale };
        next.otherChoices = values
            .filter((_, index) => index !== spec.answerIndex - 1)
            .map((text) => ({ text, basis: '' }));
    }
    return next;
}
/** 서버가 확정한 선지·보기 문장(기출 분량 검사에서 제외) */
function calculationFixedTexts(spec) {
    const plan = spec.calculation;
    if (plan === undefined)
        return new Set();
    return new Set([
        ...plan.statements.map((statement) => statement.text),
        ...(plan.choices === undefined ? [] : [plan.choices.keyed.text, plan.choices.distractor.text]),
        ...(plan.numeric?.choices ?? []),
    ]);
}
/** [계산 근거] 해설: 서버 계산 과정을 보기·선지 번호에 붙여 남긴다. */
function calculationExplanation(spec) {
    const plan = spec.calculation;
    if (plan === undefined)
        return [];
    if (plan.format === 'statements') {
        return [`[계산 근거] ${plan.statements.map((statement) => `${statement.key}. ${statement.rationale}`).join(' / ')}`];
    }
    if (plan.format === 'choices' && plan.choices !== undefined) {
        // 오답 고정 선지는 otherChoices[0]이므로 정답이 1번이면 2번, 아니면 1번 자리에 놓인다.
        const distractorAt = spec.answerIndex === 1 ? 2 : 1;
        return [
            `[계산 근거] ${NUMERALS[spec.answerIndex - 1]} ${plan.choices.keyed.rationale} / ${NUMERALS[distractorAt - 1]} ${plan.choices.distractor.rationale}`,
        ];
    }
    if (plan.format === 'numeric' && plan.numeric !== undefined) {
        return [
            `[계산 근거] ${plan.numeric.rationale}`,
            ...(plan.numeric.distractorNotes.length === 0 ? [] : [`[오답 수치] ${plan.numeric.distractorNotes.join(' / ')}`]),
        ];
    }
    return [];
}
/**
 * 발문·보기·선지에서 묻지 않는 제시문 라벨((가)·㉠ 등)을 지운다.
 * 이 이유 하나로 60~90초짜리 출제 결과를 통째로 버리던 것을 막는다.
 * 표 칸 전체가 라벨인 빈칸은 내용이 빠진 것이므로 고치지 않고 검증에서 반려되게 둔다.
 */
function repairUnusedLabels(candidate) {
    const unused = unusedStimulusLabels(stimulusPlainText(candidate.blocks), questionSideText(candidate));
    if (unused.length === 0)
        return candidate;
    const isBlankCell = (cell) => unused.includes(cell.trim());
    if (candidate.blocks.some((block) => block.type === 'table' && block.rows.some((row) => row.some(isBlankCell)))) {
        return candidate;
    }
    const strip = (value) => {
        let result = value;
        for (const label of unused) {
            result = result.split(label).join(' ');
        }
        return result
            .replace(/[ \t]{2,}/gu, ' ')
            .replace(/ ([,.:;)])/gu, '$1')
            .replace(/\( /gu, '(')
            .split('\n')
            .map((line) => line.trim())
            .join('\n')
            .trim();
    };
    return {
        ...candidate,
        blocks: candidate.blocks.map((block) => ({
            ...block,
            text: strip(block.text),
            title: strip(block.title),
            headers: block.headers.map(strip),
            rows: block.rows.map((row) => row.map(strip)),
            lines: block.lines.map((line) => ({ speaker: line.speaker, text: strip(line.text) })),
        })),
    };
}
const LABEL_PATTERN = /\(([가나다라마바])\)|([㉠㉡㉢㉣㉤㉥])/gu;
/** 제시문에 붙인 (가)·㉠ 라벨 중 발문·보기·선지에서 한 번도 쓰이지 않은 것. */
function unusedStimulusLabels(stimulusText, questionText) {
    const labels = new Set();
    for (const match of stimulusText.matchAll(LABEL_PATTERN)) {
        labels.add(match[1] === undefined ? match[2] : `(${match[1]})`);
    }
    return [...labels].filter((label) => !questionText.includes(label));
}
function questionSideText(candidate) {
    return [
        candidate.stem,
        ...(candidate.viewItems ?? []).map((item) => item.text),
        candidate.keyedChoice?.text ?? '',
        ...(candidate.otherChoices ?? []).map((choice) => choice.text),
        ...(candidate.pairTable === undefined
            ? []
            : [...candidate.pairTable.headers, ...candidate.pairTable.keyedRow, ...candidate.pairTable.otherRows.flat()]),
    ].join('\n');
}
/**
 * 기출의 "(단, …)" 조건은 질문 뒤에 온다. 모델이 앞이나 중간에 붙인 경우 맨 뒤로 옮긴다.
 * 조건 안의 괄호(예: 하렌(Harren, V. A.))를 고려해 짝이 맞는 닫는 괄호까지를 조건으로 본다.
 */
function normalizeStem(stem) {
    return fixStemOpening(moveConditionToEnd(stem));
}
/**
 * 기출 단독 문항 발문은 "다음"으로 시작한다. 모델이 세트 문항식 "위 …"나 자료 이름으로 시작하면 고친다
 * (이 형식 하나로 1~2분짜리 출제를 버리던 반려를 없앤다).
 */
function fixStemOpening(stem) {
    if (stem === '' || stem.startsWith('다음'))
        return stem;
    const withoutAbove = stem.replace(/^위(?:의)?\s+/u, '');
    if (withoutAbove !== stem)
        return `다음 ${withoutAbove}`;
    // "○○ 기업의 사례이다. 이에 대한 …" 같은 서술형 도입은 "다음은 …"으로
    const firstSentence = stem.split(/(?<=다\.)\s/u)[0] ?? '';
    return /이다\.$/u.test(firstSentence) ? `다음은 ${stem}` : `다음 ${stem}`;
}
function moveConditionToEnd(stem) {
    const trimmed = stem.trim();
    const start = trimmed.indexOf('(단,');
    if (start < 0)
        return trimmed;
    let depth = 0;
    for (let index = start; index < trimmed.length; index += 1) {
        if (trimmed[index] === '(')
            depth += 1;
        if (trimmed[index] === ')')
            depth -= 1;
        if (depth === 0) {
            const condition = trimmed.slice(start, index + 1);
            const rest = `${trimmed.slice(0, start)} ${trimmed.slice(index + 1)}`.replace(/\s+/gu, ' ').trim();
            if (rest === '' || index === trimmed.length - 1)
                return trimmed;
            return `${rest} ${condition}`;
        }
    }
    return trimmed;
}
const VACUOUS_CONDITION = /\(단,[^)]*(드러난 내용만으로|제시문만으로|제시된 내용만으로) 판단/u;
/**
 * 실제 기출 대화형 132개: 발화 수 중앙값 2(90%가 4개 이하), 블록 안 최장 발화 중앙값 70자(하위 25% 47자).
 * 짧은 한 줄 발화를 여러 개 나열한 "한 사람 = 한 단서" 형태를 걸러낸다.
 */
function dialogueShapeIssue(turns) {
    const lengths = turns.map((turn) => turn.replace(/\s+/gu, '').length);
    if (lengths.length > 5) {
        return `대화 발화가 ${lengths.length}개로 너무 잘게 나뉘었습니다. 2~4개로 줄이고 핵심 인물의 서술형 발화로 묶으십시오.`;
    }
    const longest = Math.max(0, ...lengths);
    if (longest < 45) {
        return `가장 긴 발화가 ${longest}자뿐입니다. 핵심 인물이 상황·동기·행동을 이어서 말하는 70자 이상 발화를 넣으십시오.`;
    }
    return null;
}
function stimulusLength(blocks) {
    return blocks.reduce((sum, block) => {
        if (block.type === 'text')
            return sum + block.text.length;
        if (block.type === 'table') {
            return sum + [...block.headers, ...block.rows.flat()].reduce((cells, cell) => cells + cell.length, 0);
        }
        return sum + block.lines.reduce((total, line) => total + line.text.length, 0);
    }, 0);
}
function toSourceBlock(block) {
    switch (block.type) {
        case 'text':
            return { type: 'text', text: block.text };
        case 'table':
            return {
                type: 'table',
                title: block.title === '' ? null : block.title,
                headers: block.headers.length === 0 ? [] : [[...block.headers]],
                rows: block.rows.map((row) => [...row]),
                caption: null,
            };
        case 'dialogue':
            return { type: 'dialogue', lines: block.lines.map((line) => ({ ...line })) };
    }
}
function parseBlock(value) {
    if (!isRecord(value))
        return null;
    const type = value.type;
    if (type !== 'text' && type !== 'table' && type !== 'dialogue')
        return null;
    return {
        type,
        text: text(value.text),
        title: text(value.title),
        headers: texts(value.headers, true),
        rows: Array.isArray(value.rows) ? value.rows.map((row) => texts(row, true)) : [],
        lines: Array.isArray(value.lines)
            ? value.lines.filter(isRecord).map((line) => ({
                speaker: text(line.speaker),
                text: text(line.text).replace(new RegExp(`^${escapeRegExp(text(line.speaker))}\\s*[:：]\\s*`, 'u'), ''),
            }))
            : [],
    };
}
function placeAt(others, keyed, answerIndex) {
    const result = [...others];
    result.splice(answerIndex - 1, 0, keyed);
    return result;
}
function checkLength(push, label, length, band, lowScale, highScale) {
    const low = Math.floor(band.p25 * lowScale);
    const high = Math.ceil(band.p75 * highScale);
    if (length < low || length > high) {
        push('GEN_LENGTH_OUT_OF_RANGE', `${label} 길이 ${length}자가 기출 범위(${low}~${high}자)를 벗어납니다.`);
    }
}
function containsTerm(haystack, term) {
    const needle = normalize(term).replace(/\(.*?\)/gu, '');
    return needle.length >= 2 && normalize(haystack).includes(needle);
}
function median(values) {
    if (values.length === 0)
        return 0;
    const sorted = [...values].sort((left, right) => left - right);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}
function stripViewPrefix(value) {
    return value.replace(/^[ㄱ-ㅎ]\s*[.)]\s*/u, '').trim();
}
function stripNumeral(value) {
    return value.replace(/^[①②③④⑤]\s*/u, '').trim();
}
function pair(value) {
    const values = texts(value, true);
    return [values[0] ?? '', values[1] ?? ''];
}
function normalize(value) {
    return value.normalize('NFKC').replace(/\s+/gu, '').toLowerCase();
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
function text(value) {
    return typeof value === 'string' ? value.trim() : '';
}
function texts(value, keepEmpty = false) {
    if (!Array.isArray(value))
        return [];
    const mapped = value.map(text);
    return keepEmpty ? mapped : mapped.filter((item) => item !== '');
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

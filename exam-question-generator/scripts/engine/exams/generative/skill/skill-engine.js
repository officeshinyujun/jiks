"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SKILL_ENGINE_VERSION = exports.Difficulty = void 0;
exports.toPlanRequest = toPlanRequest;
exports.planExam = planExam;
exports.replanItem = replanItem;
exports.writingBrief = writingBrief;
exports.checkCandidate = checkCandidate;
exports.reviewBrief = reviewBrief;
exports.judgeReview = judgeReview;
exports.toAppQuestion = toAppQuestion;
exports.unitTitle = unitTitle;
/**
 * 에이전트 스킬(exam-question-generator)용 출제 엔진 진입점.
 *
 * 서버 파이프라인은 LLM API를 직접 부르지만, 스킬에서는 스킬을 쓰는 에이전트가 출제·검토 모델 역할을 한다.
 * 여기에는 API·DB·Nest 의존이 없는 결정론적 부분만 모은다:
 * 출제 계획 → 출제 지시서 → 후보 검증·서버 확정값 반영·조립 → 블라인드 검토 지시서 → 검토 판정 → 앱 형식 변환.
 */
const difficulty_1 = require("../../../entities/difficulty");
Object.defineProperty(exports, "Difficulty", { enumerable: true, get: function () { return difficulty_1.Difficulty; } });
const generative_item_assembler_1 = require("../generative-item-assembler");
const generative_gates_1 = require("../generative-gates");
const generative_item_planner_1 = require("../generative-item-planner");
const generative_item_prompt_1 = require("../generative-item-prompt");
const exam_style_knowledge_1 = require("../exam-style-knowledge");
const legal_review_rules_1 = require("../legal-review-rules");
const text_similarity_1 = require("../text-similarity");
exports.SKILL_ENGINE_VERSION = 'exam-skill-engine-v2';
const NEAR_DUPLICATE_THRESHOLD = 0.55;
function toPlanRequest(args) {
    if (args.startUnit < 1 || args.endUnit > 20 || args.startUnit > args.endUnit) {
        throw new Error('단원 범위는 1~20 사이에서 시작 ≤ 끝이어야 합니다.');
    }
    if (!Number.isInteger(args.count) || args.count < 1 || args.count > 30) {
        throw new Error('문항 수는 1~30이어야 합니다.');
    }
    return {
        subject: args.subject,
        startUnitNum: args.startUnit,
        endUnitNum: args.endUnit,
        questionCount: args.count,
        difficulty: args.difficulty,
        seed: args.seed ?? `skill-${Date.now()}`,
        ...(args.concepts === undefined || args.concepts.length === 0 ? {} : { targetConcepts: args.concepts }),
    };
}
function planExam(request) {
    return (0, generative_item_planner_1.planGenerativeExam)(request);
}
/** 같은 형식·정답 위치로 개념·자료를 바꾼 대체 명세(같은 명세로 계속 실패할 때) */
function replanItem(request, failed, attempt, usedConcepts) {
    return (0, generative_item_planner_1.replanGenerativeItem)(request, failed, attempt, usedConcepts);
}
/** 출제 지시서: 에이전트가 이 지시와 JSON 스키마에 맞춰 후보 JSON 하나를 쓴다. */
function writingBrief(spec, repairNotes = []) {
    return {
        system: (0, generative_item_prompt_1.generativeSystemPrompt)(),
        user: (0, generative_item_prompt_1.buildGenerativeItemPrompt)(spec, repairNotes),
        schema: (0, generative_item_prompt_1.generativeItemResponseFormat)(spec).json_schema.schema,
    };
}
/**
 * 후보 검증: 문체 보정 → 묻지 않는 라벨 정리 → 서버 확정값(계산 표·진술·수치 선지) 반영 → 결정론적 검증 → 조립.
 * otherTexts는 이미 통과한 문항들의 duplicateText(지문 중복 검사용).
 */
function checkCandidate(spec, content, otherTexts = []) {
    try {
        const candidate = (0, generative_item_assembler_1.applyCalculationPlan)(spec, (0, generative_item_assembler_1.repairUnusedLabels)((0, generative_item_assembler_1.parseGenerativeCandidate)(content, spec)));
        const issues = (0, generative_item_assembler_1.validateGenerativeCandidate)(spec, candidate);
        if (issues.length > 0)
            return { ok: false, issues };
        const question = (0, generative_item_assembler_1.assembleGenerativeQuestion)(spec, candidate);
        const duplicateText = (0, generative_item_assembler_1.duplicateCheckText)(spec, candidate.blocks);
        if (otherTexts.some((other) => (0, text_similarity_1.similarity)(other, duplicateText) >= NEAR_DUPLICATE_THRESHOLD)) {
            return { ok: false, issues: [{ code: 'GEN_DUPLICATE', message: '이미 통과한 문항과 제시문이 거의 같습니다. 다른 상황·소재·수치로 새로 쓰십시오.' }] };
        }
        return { ok: true, question, duplicateText };
    }
    catch (error) {
        if (error instanceof generative_item_assembler_1.GenerativeOutputError)
            return { ok: false, issues: error.issues };
        throw error;
    }
}
/** 블라인드 검토 지시서: 정답·해설 없이 학생 화면과 같은 정보 + (법·제도 단원) 정합성 점검 항목 */
function reviewBrief(spec, question) {
    return {
        system: (0, generative_item_prompt_1.blindSolveSystemPrompt)(),
        user: (0, generative_item_prompt_1.blindSolveUserPrompt)((0, generative_item_assembler_1.renderForSolver)(question), (0, legal_review_rules_1.legalReviewRules)(spec.subject, spec.unitNumber)),
        schema: (0, generative_item_prompt_1.blindSolveResponseFormat)().json_schema.schema,
    };
}
/** 검토 결과(JSON 문자열)를 서버 파이프라인과 같은 기준으로 판정한다. */
function judgeReview(spec, content) {
    let solve;
    try {
        solve = (0, generative_gates_1.parseBlindSolveResult)(content);
    }
    catch (error) {
        return { accepted: false, invalid: error instanceof Error ? error.message : String(error) };
    }
    const rejection = (0, generative_gates_1.blindSolveRejection)(spec, solve);
    return rejection === null ? { accepted: true } : { accepted: false, rejection };
}
/** 앱(questions 테이블·시험지 렌더러)과 같은 문항 형식 */
function toAppQuestion(spec, question, orderIndex) {
    return {
        orderIndex,
        subject: spec.subject,
        unitNumber: spec.unitNumber,
        unitTitle: spec.unitTitle,
        targetConcept: question.targetConcept,
        itemType: question.itemType,
        difficulty: question.difficulty,
        points: question.points,
        recommendedTemplate: question.recommendedTemplate,
        questionStem: question.questionStem,
        stimulusData: question.stimulusData,
        optionsList: question.optionsList,
        comboBlock: question.comboBlock,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        fingerprint: question.fingerprint,
        generation: { engine: exports.SKILL_ENGINE_VERSION, specId: spec.id, profileVersion: (0, exam_style_knowledge_1.loadExamStyleProfile)().version },
    };
}
function unitTitle(subject, unitNumber) {
    return (0, exam_style_knowledge_1.loadUnitGuide)(subject, unitNumber).unitTitle;
}

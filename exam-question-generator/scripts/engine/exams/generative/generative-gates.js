"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requiresNonTrivial = requiresNonTrivial;
exports.blindSolveRejection = blindSolveRejection;
exports.parseBlindSolveResult = parseBlindSolveResult;
/** 3점 문항만 쉬운(easy) 판정을 반려한다(상 난이도 시험은 전부 3점이라 모든 문항에 적용된다). */
function requiresNonTrivial(spec) {
    return spec.points === 3;
}
/**
 * 블라인드 풀이(정답을 모르는 검토) 결과로 문항을 받을지 정한다. null이면 통과.
 * 서버 파이프라인과 에이전트 스킬이 같은 기준을 쓴다.
 */
function blindSolveRejection(spec, solve) {
    if (solve.answerIndex !== spec.answerIndex) {
        return {
            code: 'GEN_BLIND_SOLVE_MISMATCH',
            message: `검토 풀이 정답 ${solve.answerIndex}번 ≠ 의도 정답 ${spec.answerIndex}번`,
            notes: [
                `독립 검토자가 의도와 다른 선지(${solve.answerIndex}번)를 정답으로 판단했습니다. 검토 근거: ${solve.reasoning.slice(0, 400)}`,
                '정답 판정이 제시문 단서로 하나로 확정되도록 단서와 진술을 다시 설계하십시오.',
            ],
        };
    }
    if (solve.ambiguity === 'major' || solve.curriculumIssues.length > 0) {
        return {
            code: 'GEN_AMBIGUOUS',
            message: [`모호성 ${solve.ambiguity}`, ...solve.curriculumIssues].join(' / '),
            notes: [
                '검토자가 다음 결함을 지적했습니다. 모두 해소하십시오.',
                ...solve.curriculumIssues,
                ...(solve.ambiguity === 'major' ? [`모호성: ${solve.reasoning.slice(0, 300)}`] : []),
            ],
        };
    }
    if (solve.answerGivenAway) {
        return {
            code: 'GEN_TOO_EASY',
            message: '검토자: 제시문이 정답 개념을 사실상 그대로 알려 줌',
            notes: [
                '검토자가 제시문만 보고 단어 대조로 정답을 찾았습니다. 개념명·정의 표현을 빼고 행동·수치·상황 단서로 바꾸십시오.',
                `검토 근거: ${solve.reasoning.slice(0, 300)}`,
            ],
        };
    }
    const trivialLimit = spec.points === 3 ? 0 : 1;
    if (solve.trivialStatements.length > trivialLimit) {
        return {
            code: 'GEN_TOO_EASY',
            message: `검토자: 단순 읽기 진술 ${solve.trivialStatements.join(', ')}`,
            notes: [
                `검토자가 ${solve.trivialStatements.join(', ')}을(를) 교과 개념 없이 제시문 값만 읽어도 판정되는 진술로 판단했습니다.`,
                '해당 진술을 개념 적용이나 계산이 필요한 진술로 바꾸십시오.',
            ],
        };
    }
    if (spec.ultra && solve.perceivedDifficulty !== 'hard') {
        return {
            code: 'GEN_TOO_EASY',
            message: `검토자: 초고난도 문항인데 난도가 ${solve.perceivedDifficulty}`,
            notes: [
                '검토자가 실제 수능 3점 최고난도 수준이 아니라고 판단했습니다. 모든 <보기>·선지에 계산과 기준 적용을 둘 이상 결합하고, 흔한 실수로 계산하면 판정이 뒤집히게 하십시오.',
                `검토 근거: ${solve.reasoning.slice(0, 400)}`,
            ],
        };
    }
    if (solve.perceivedDifficulty === 'easy' && requiresNonTrivial(spec)) {
        return {
            code: 'GEN_TOO_EASY',
            message: `검토자: ${spec.points}점·${spec.difficulty} 문항인데 난도가 easy`,
            notes: [
                '검토자가 즉시 풀리는 쉬운 문항으로 판단했습니다. 계산이 필요한 표 수치, 두 곳 이상에 분산된 단서, 복수 개념 결합 중 하나 이상을 넣으십시오.',
            ],
        };
    }
    return null;
}
/** 블라인드 풀이 응답(JSON 문자열) 해석. 형식이 틀리면 Error. */
function parseBlindSolveResult(content) {
    let raw;
    try {
        raw = JSON.parse(content);
    }
    catch {
        throw new Error('검토 응답이 JSON이 아닙니다.');
    }
    const value = typeof raw === 'object' && raw !== null ? raw : {};
    const answer = Number(value.answerIndex);
    if (![1, 2, 3, 4, 5].includes(answer))
        throw new Error('검토 응답에 정답 번호가 없습니다.');
    const ambiguity = value.ambiguity === 'minor' || value.ambiguity === 'major' ? value.ambiguity : 'none';
    return {
        answerIndex: answer,
        ambiguity,
        curriculumIssues: Array.isArray(value.curriculumIssues)
            ? value.curriculumIssues.filter((issue) => typeof issue === 'string' && issue.trim() !== '')
            : [],
        answerGivenAway: value.answerGivenAway === true,
        trivialStatements: Array.isArray(value.trivialStatements)
            ? value.trivialStatements.filter((label) => typeof label === 'string' && label.trim() !== '')
            : [],
        perceivedDifficulty: value.perceivedDifficulty === 'easy' || value.perceivedDifficulty === 'hard'
            ? value.perceivedDifficulty
            : 'moderate',
        reasoning: typeof value.reasoning === 'string' ? value.reasoning.slice(0, 2000) : '',
    };
}

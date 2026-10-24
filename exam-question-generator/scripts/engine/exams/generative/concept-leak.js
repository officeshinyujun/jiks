"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.conceptAliases = conceptAliases;
exports.findConceptLeak = findConceptLeak;
/**
 * 정답 개념 노출 검사.
 * 기출은 제시문에서 정답 개념명을 숨기고 행동·수치·상황 단서로 추론하게 한다.
 * 제시문(발문 제외)에 개념명·별칭이 그대로 있거나, 한 문장 안에 개념명의 핵심 낱말이
 * 모두 들어 있으면(예: "통계적 … 품질 … 관리" → 통계적 품질 관리) 노출로 본다.
 */
const GENERIC_SUFFIXES = ['방식', '제도', '기법', '방법', '활동', '시스템'];
const GENERIC_TOKENS = new Set([
    '관리', '활동', '방식', '제도', '기법', '방법', '종류', '유형', '특징', '개념', '기업', '시스템',
    '과정', '단계', '원칙', '요소', '구성', '형태', '분류', '사례', '의미', '역할',
]);
function conceptAliases(name) {
    const aliases = new Set();
    const add = (value) => {
        const trimmed = value.replace(/\s+/gu, ' ').trim();
        if (compact(trimmed).length >= 2)
            aliases.add(trimmed);
    };
    const outer = name.replace(/\([^)]*\)/gu, ' ').trim();
    const inner = [...name.matchAll(/\(([^)]*)\)/gu)].map((match) => match[1]);
    for (const part of [outer, ...inner]) {
        add(part);
        for (const piece of part.split(/[·,/]|(?<=\S)(?:과|와|및)\s+/u)) {
            add(piece);
            const base = piece.trim();
            for (const suffix of GENERIC_SUFFIXES) {
                if (base.endsWith(suffix) && compact(base.slice(0, -suffix.length)).length >= 4) {
                    add(base.slice(0, -suffix.length));
                }
            }
        }
    }
    return [...aliases];
}
function findConceptLeak(name, text) {
    const haystack = compact(text);
    for (const alias of conceptAliases(name)) {
        if (haystack.includes(compact(alias)))
            return alias;
    }
    const sentences = text.split(/[.!?。\n]|다\.\s*/u).map(compact).filter((sentence) => sentence !== '');
    for (const alias of conceptAliases(name)) {
        const tokens = alias
            .split(/\s+/u)
            .map((token) => token.replace(/(의|과|와|을|를|은|는)$/u, ''))
            .filter((token) => token.length >= 2 && !GENERIC_TOKENS.has(token));
        if (tokens.length < 2)
            continue;
        if (sentences.some((sentence) => tokens.every((token) => sentence.includes(token)))) {
            return alias;
        }
    }
    return null;
}
function compact(value) {
    return value.normalize('NFKC').replace(/\s+/gu, '').toLowerCase();
}
